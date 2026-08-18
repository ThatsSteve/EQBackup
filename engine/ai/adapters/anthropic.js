'use strict';

/**
 * anthropic.js — adapter per Claude nativo (Anthropic Messages API).
 *   Endpoint: {baseUrl}/v1/messages (default https://api.anthropic.com)
 *   Auth:     header `x-api-key` + `anthropic-version`
 *   Output strutturato: `tool_use` (tools + tool_choice forzato).
 *
 * Contratto: engine/ai/ProviderInterface.js. `chat({ stream: true })`
 * restituisce un async generator di eventi { type:'delta'|'done'|'error' }.
 */

const { AIProvider, httpStatusMessage } = require('../ProviderInterface');
const eqIntentSchema = require('../schema/eqIntentSchema');
const { parseWithRetry, evaluateContent, buildRepairFeedback } = require('../jsonRepair');

const DEFAULT_TIMEOUT_MS = 45000;
const ANTHROPIC_VERSION = '2023-06-01';
const TOOL_NAME = 'produce_eq_intents';

class AnthropicProvider extends AIProvider {
  constructor(profile = {}) {
    super();
    this.id = profile.id;
    this.name = profile.name;
    this.type = 'anthropic';
    this.baseUrl = String(profile.baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '');
    this.model = profile.model || '';
    this.apiKey = profile.apiKey || '';
    this.timeoutMs = profile.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  _headers() {
    return {
      'content-type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    };
  }

  _abortHandler(externalSignal) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', onAbort);
      }
    }
    return {
      controller,
      cleanup: () => {
        if (externalSignal) externalSignal.removeEventListener('abort', onAbort);
      }
    };
  }

  // Anthropic Messages API non espone un GET /models pubblico: la verifica di
  // raggiungibilità avviene empiricamente nella chat di probe.
  async testConnection() {
    return { ok: true, latencyMs: 0, modelName: this.model || null };
  }

  getCapabilities() {
    return { structuredOutput: true, functionCalling: true, streaming: true };
  }

  // Converte i messaggi OpenAI-style in formato Anthropic: ruolo system →
  // parametro top-level `system`; gli altri → messages (content stringa).
  _splitMessages(messages) {
    let system = '';
    const anthropicMessages = [];
    for (const m of messages || []) {
      const role = m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user';
      if (role === 'system') {
        system = [system, String(m.content || '')].filter(Boolean).join('\n');
      } else {
        anthropicMessages.push({ role, content: String(m.content || '') });
      }
    }
    if (!anthropicMessages.length) {
      anthropicMessages.push({ role: 'user', content: 'Ottimizza il mio profilo audio.' });
    }
    return { system, anthropicMessages };
  }

  _buildBody(messages, schema, stream) {
    const { system, anthropicMessages } = this._splitMessages(messages);
    const body = {
      model: this.model,
      max_tokens: 1024,
      system: system || undefined,
      messages: anthropicMessages,
      stream: Boolean(stream)
    };
    if (schema) {
      body.tools = [
        {
          name: TOOL_NAME,
          description: 'Produce i 6 intenti semantici EQ (message + desiderata).',
          input_schema: schema.intentSchema
        }
      ];
      body.tool_choice = { type: 'tool', name: TOOL_NAME };
    }
    return body;
  }

  _extractContentFromBlocks(data) {
    // Priorità al tool_use (output strutturato), poi al testo.
    const blocks = (data && data.content) || [];
    for (const block of blocks) {
      if (block.type === 'tool_use' && block.input) {
        return JSON.stringify(block.input);
      }
    }
    for (const block of blocks) {
      if (block.type === 'text' && block.text) {
        return block.text;
      }
    }
    return null;
  }

  _extractUsage(data) {
    return data && data.usage
      ? {
          promptTokens: data.usage.input_tokens != null ? data.usage.input_tokens : null,
          completionTokens: data.usage.output_tokens != null ? data.usage.output_tokens : null,
          totalTokens: null
        }
      : null;
  }

  async _rawChat(messages, { signal } = {}) {
    const url = `${this.baseUrl}/v1/messages`;
    const { controller, cleanup } = this._abortHandler(signal);
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this._headers(),
        signal: controller.signal,
        body: JSON.stringify(this._buildBody(messages, eqIntentSchema, false))
      });
      if (!res.ok) {
        return { content: null, usage: null, status: res.status };
      }
      const data = await res.json();
      return { content: this._extractContentFromBlocks(data), usage: this._extractUsage(data), status: null };
    } finally {
      clearTimeout(timeoutId);
      cleanup();
    }
  }

  async chat({ messages, schema, stream = false, signal } = {}) {
    if (stream) {
      return this._chatStream({ messages, schema, signal });
    }
    try {
      const result = await parseWithRetry({
        callProvider: (msgs) => this._rawChat(msgs, { signal }),
        messages,
        schema: schema || eqIntentSchema
      });
      return { raw: result.raw, parsed: result.parsed, tier: result.tier, usage: result.usage };
    } catch (err) {
      return { raw: null, parsed: null, tier: 3, usage: null };
    }
  }

  /**
   * Streaming SSE di Anthropic: accumula i delta di testo e, quando presente,
   * i `input_json_delta` del tool_use. Eventi emessi come da contratto.
   */
  async *_chatStream({ messages, schema, signal }) {
    const sch = schema || eqIntentSchema;
    const url = `${this.baseUrl}/v1/messages`;
    const { controller, cleanup } = this._abortHandler(signal);
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    let textBuffer = '';
    let jsonBuffer = '';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this._headers(),
        signal: controller.signal,
        body: JSON.stringify(this._buildBody(messages, sch, true))
      });
      if (!res.ok) {
        yield { type: 'error', message: httpStatusMessage(res.status) };
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let evt;
            try {
              evt = JSON.parse(payload);
            } catch (e) {
              continue;
            }
            if (evt.type === 'content_block_delta') {
              const delta = evt.delta || {};
              if (delta.type === 'text_delta' && typeof delta.text === 'string') {
                textBuffer += delta.text;
                yield { type: 'delta', text: delta.text };
              } else if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
                jsonBuffer += delta.partial_json;
              }
            }
          }
        }
      }

      const fullContent = jsonBuffer ? jsonBuffer : textBuffer;
      const evaluated = evaluateContent(fullContent, sch);
      if (evaluated.valid) {
        yield { type: 'done', parsed: evaluated.parsed, tier: 1 };
        return;
      }

      const feedback = buildRepairFeedback(evaluated.errors);
      const repairMessages = [
        ...messages,
        { role: 'assistant', content: evaluated.raw || '' },
        { role: 'user', content: feedback }
      ];
      const resp = await this._rawChat(repairMessages, { signal });
      if (resp && !resp.status && resp.content) {
        const second = evaluateContent(resp.content, sch);
        if (second.valid) {
          yield { type: 'done', parsed: second.parsed, tier: 2 };
          return;
        }
      }
      yield { type: 'error', message: 'Output del provider non valido dopo il retry.' };
    } catch (err) {
      if (!(err && err.name === 'AbortError')) {
        yield { type: 'error', message: 'Errore di comunicazione con il provider.' };
      }
    } finally {
      clearTimeout(timeoutId);
      cleanup();
    }
  }
}

module.exports = { AnthropicProvider };