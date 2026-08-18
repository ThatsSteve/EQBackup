// Test degli adapter (Fase 2, punto 2 e criterio di accettazione (a)).
// Con lo stesso input semantico (stessi messages + stesso schema),
// openAICompatible.chat() e anthropic.chat() devono produrre lo STESSO
// identico parsed.desiderata (deep-equal) e validato da eqIntentSchema.js.
// I mock dei provider rispondono con wire format diversi
// (choices[0].message.content vs content blocks/tool_use) ma stesso contenuto
// semantico. Nessuna chiave API reale: placeholder fittizi marcati.
const { OpenAICompatibleProvider } = require('../engine/ai/adapters/openAICompatible');
const { AnthropicProvider } = require('../engine/ai/adapters/anthropic');
const eqIntentSchema = require('../engine/ai/schema/eqIntentSchema');

const SEMANTIC = {
  message: 'Profilo calibrato per bassi profondi e punch.',
  desiderata: {
    sub_bass_intent: 3.0,
    mid_bass_intent: 1.5,
    low_mids_intent: 0.0,
    high_mids_intent: 0.0,
    presence_intent: -1.0,
    brilliance_intent: 1.0
  }
};

// Stub globale di fetch con routing per URL. Il wire format è deciso dal test.
function installFetchMock(handler) {
  const fn = vi.fn(async (url, init) => handler(String(url), init));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Fase 2 — criterio (a): contratto di output fisso tra adapter diversi', () => {
  it('openAICompatible normalizza choices[0].message.content in parsed unico', async () => {
    installFetchMock(async (url) => {
      if (url.endsWith('/chat/completions')) {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(SEMANTIC) } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ data: [{ id: 'mock-model' }] }), { status: 200 });
    });

    const provider = new OpenAICompatibleProvider({
      id: 'p1', name: 'Mock OpenAI-compatible', type: 'openai-compatible',
      baseUrl: 'http://mock-local/v1', model: 'mock-model', apiKey: ''
    });
    const result = await provider.chat({
      messages: [{ role: 'user', content: 'più bassi' }],
      schema: eqIntentSchema
    });
    expect(result.tier).toBe(1);
    expect(result.parsed.desiderata).toEqual(SEMANTIC.desiderata);
    expect(eqIntentSchema.validateDesiderata(result.parsed.desiderata).valid).toBe(true);
  });

  it('anthropic normalizza i content blocks tool_use in parsed unico', async () => {
    installFetchMock(async (url) => {
      if (url.endsWith('/v1/messages')) {
        return new Response(
          JSON.stringify({
            content: [{ type: 'tool_use', name: 'produce_eq_intents', input: SEMANTIC }],
            usage: { input_tokens: 8, output_tokens: 4 }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    });

    const provider = new AnthropicProvider({
      id: 'p2', name: 'Mock Claude', type: 'anthropic',
      baseUrl: 'https://api.anthropic.com', model: 'claude-mock', apiKey: 'FAKE-PLACEHOLDER-KEY'
    });
    const result = await provider.chat({
      messages: [{ role: 'user', content: 'più bassi' }],
      schema: eqIntentSchema
    });
    expect(result.tier).toBe(1);
    expect(result.parsed.desiderata).toEqual(SEMANTIC.desiderata);
    expect(eqIntentSchema.validateDesiderata(result.parsed.desiderata).valid).toBe(true);
  });

  it('CRITERIO (a): stesso input semantico → stesso identico parsed.desiderata', async () => {
    installFetchMock(async (url) => {
      if (url.endsWith('/chat/completions')) {
        return new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify(SEMANTIC) } }], usage: {} }),
          { status: 200 }
        );
      }
      if (url.endsWith('/v1/messages')) {
        return new Response(
          JSON.stringify({ content: [{ type: 'tool_use', name: 'produce_eq_intents', input: SEMANTIC }], usage: {} }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    });

    const messages = [
      { role: 'system', content: 'Sei un audio engineer.' },
      { role: 'user', content: 'Voglio più bassi e punch per hip-hop.' }
    ];

    const openAi = new OpenAICompatibleProvider({
      baseUrl: 'http://mock-local/v1', model: 'mock-model', apiKey: ''
    });
    const anthropic = new AnthropicProvider({
      baseUrl: 'https://api.anthropic.com', model: 'claude-mock', apiKey: 'FAKE-PLACEHOLDER-KEY'
    });

    const r1 = await openAi.chat({ messages, schema: eqIntentSchema });
    const r2 = await anthropic.chat({ messages, schema: eqIntentSchema });

    expect(r1.parsed.desiderata).toEqual(r2.parsed.desiderata); // deep-equal
    expect(r1.parsed.desiderata).toEqual(SEMANTIC.desiderata);
    expect(eqIntentSchema.validateDesiderata(r1.parsed.desiderata).valid).toBe(true);
    expect(eqIntentSchema.validateDesiderata(r2.parsed.desiderata).valid).toBe(true);
  });

  it('provider senza structured output: 1 retry con feedback → tier 2', async () => {
    let calls = 0;
    installFetchMock(async (url) => {
      calls++;
      if (calls === 1) {
        // Prima risposta invalida (JSON parziale)
        return new Response(
          JSON.stringify({ choices: [{ message: { content: 'Ecco il JSON: {"message":"manca desiderata"}' } }] }),
          { status: 200 }
        );
      }
      // Seconda risposta (dopo il feedback) valida
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(SEMANTIC) } }] }),
        { status: 200 }
      );
    });

    const provider = new OpenAICompatibleProvider({
      baseUrl: 'http://mock-local/v1', model: 'mock-model', apiKey: ''
    });
    const result = await provider.chat({
      messages: [{ role: 'user', content: 'più bassi' }],
      schema: eqIntentSchema
    });
    expect(result.tier).toBe(2);
    expect(calls).toBe(2); // esattamente 1 retry
    expect(result.parsed.desiderata).toEqual(SEMANTIC.desiderata);
  });

  it('output invalido anche dopo il retry → tier 3, nessuna eccezione', async () => {
    installFetchMock(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'non-json-risposta' } }] }), { status: 200 })
    );
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'http://mock-local/v1', model: 'mock-model', apiKey: ''
    });
    const result = await provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      schema: eqIntentSchema
    });
    expect(result.tier).toBe(3);
    expect(result.parsed).toBeNull();
  });

  it('HTTP 500 dal provider → tier 3, nessuna eccezione', async () => {
    installFetchMock(async () => new Response('Internal Server Error', { status: 500 }));
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'http://broken.test/v1', model: 'm', apiKey: 'FAKE-PLACEHOLDER-KEY'
    });
    const result = await provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      schema: eqIntentSchema
    });
    expect(result.tier).toBe(3);
    expect(result.parsed).toBeNull();
  });

  it('testConnection con provider non raggiungibile → ok:false (mai crash)', async () => {
    installFetchMock(async () => {
      throw new Error('ECONNREFUSED');
    });
    const provider = new OpenAICompatibleProvider({ baseUrl: 'http://localhost:59999/v1', model: 'm' });
    const conn = await provider.testConnection();
    expect(conn.ok).toBe(false);
    expect(typeof conn.latencyMs).toBe('number');
  });
});