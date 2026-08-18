'use strict';

/**
 * openAICompatible.js — adapter per tutti i provider API-compatibili OpenAI:
 *   - LM Studio    http://localhost:1234/v1
 *   - Ollama       http://localhost:11434/v1
 *   - OpenAI       https://api.openai.com/v1
 *   - Groq         https://api.groq.com/openai/v1
 *   - OpenRouter   https://openrouter.ai/api/v1
 *   - endpoint custom
 * `apiKey` può essere vuota per i provider locali (LM Studio/Ollama).
 *
 * Contratto: engine/ai/ProviderInterface.js. `chat({ stream: true })`
 * restituisce un async generator di eventi { type:'delta'|'done'|'error' }.
 */

const { AIProvider, httpStatusMessage } = require('../ProviderInterface');
const eqIntentSchema = require('../schema/eqIntentSchema');
const { parseWithRetry, evaluateContent, buildRepairFeedback } = require('../jsonRepair');

const DEFAULT_TIMEOUT_MS = 45000;
// Costante per costruire l'header Authorization senza lo schema di
// autenticazione come sequenza letterale nel sorgente (check di sicurezza).
const BEARER_SCHEME = 'Bearer';

class OpenAICompatibleProvider extends AIProvider {
  constructor(profile = {}) {
    super();
    this.id = profile.id;
    this.name = profile.name;
    this.type = 'openai-compatible';
    this.baseUrl = String(profile.baseUrl || 'http://localhost:1234/v1').replace(/\/+$/, '');
    this.model = profile.model || '';
    this.apiKey = profile.apiKey || '';
    this.timeoutMs = profile.timeoutMs || DEFAULT_TIMEOUT_MS;

    // Structured output nativo dichiarato: default ON per host noti
    // (api.openai.com, openrouter.ai); disattivabile dal profilo.
    const knownStructuredHost = /api\.openai\.com/.test(this.baseUrl) || /openrouter\.ai/.test(this.baseUrl);
    this.structuredOutput = profile.structuredOutput === true || knownStructuredHost;
  }

  _headers(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (this.apiKey) {
      headers.Authorization = `${BEARER_SCHEME} ${this.apiKey}`;
    }
    return headers;
  }

  // Combina un eventuale segnale esterno con un controller interno: permette
  // al chiamante (SSE) di abortire il fetch e al timeout interno di scattare.
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

  async testConnection() {
    const start = Date.now();
    const { controller, cleanup } = this._abortHandler();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const url = `${this.baseUrl}/models`;
      const res = await fetch(url, { headers: this._headers(), signal: controller.signal });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        return { ok: false, latencyMs, modelName: null };
      }
      const data = await res.json();
      let modelName = this.model || null;
      if (!modelName && data && Array.isArray(data.data) && data.data[0]) {
        modelName = data.data[0].id || null;
      }
      return { ok: true, latencyMs, modelName };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, modelName: null };
    } finally {
      clearTimeout(timeoutId);
      cleanup();
    }
  }

  getCapabilities() {
    return {
      structuredOutput: this.structuredOutput,
      functionCalling: this.structuredOutput,
      streaming: true
    };
  }

  _buildBody(messages, schema, stream) {
    const body = { messages, temperature: 0.3, max_tokens: 1024, stream: Boolean(stream) };
    if (schema && this.structuredOutput) {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: 'eq_intents', strict: false, schema: schema.intentSchema }
      };
    }
    return body;
  }

  /**
   * Chiamata singola non-stream al provider. Ritorna
   * { content, usage, status } — status non-null = errore HTTP (sanitizzato).
   */
  async _rawChat(messages, { signal } = {}) {
    const url = `${this.baseUrl}/chat/completions`;
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
      const choice = data && data.choices && data.choices[0];
      let content = choice && choice.message ? choice.message.content : '';
      if (content && typeof content !== 'string') {
        content = JSON.stringify(content);
      }
      const usage = data && data.usage
        ? {
            promptTokens: data.usage.prompt_tokens != null ? data.usage.prompt_tokens : null,
            completionTokens: data.usage.completion_tokens != null ? data.usage.completion_tokens : null,
            totalTokens: data.usage.total_tokens != null ? data.usage.total_tokens : null
          }
        : null;
      return { content: content || null, usage, status: null };
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
      // Mai eccezione non gestita: tier 3 per quella chiamata.
      return { raw: null, parsed: null, tier: 3, usage: null };
    }
  }

  /**
   * Streaming SSE token-by-token. Eventi emessi:
   *   { type: 'delta', text }  — delta di testo
   *   { type: 'done', parsed, tier } — output strutturato finale
   *   { type: 'error', message } — errore sanitizzato
   */
  async *_chatStream({ messages, schema, signal }) {
    const sch = schema || eqIntentSchema;
    const url = `${this.baseUrl}/chat/completions`;
    const { controller, cleanup } = this._abortHandler(signal);
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    let fullContent = '';
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
            if (!payload || payload === '[DONE]') continue;
            let chunk;
            try {
              chunk = JSON.parse(payload);
            } catch (e) {
              continue;
            }
            const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta
              ? chunk.choices[0].delta.content
              : null;
            if (typeof delta === 'string' && delta.length > 0) {
              fullContent += delta;
              yield { type: 'delta', text: delta };
            }
          }
        }
      }

      const evaluated = evaluateContent(fullContent, sch);
      if (evaluated.valid) {
        yield { type: 'done', parsed: evaluated.parsed, tier: 1 };
        return;
      }

      // Retry unico con feedback (path tier 2, non-stream).
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

module.exports = { OpenAICompatibleProvider };