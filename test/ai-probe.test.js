// Test di capabilityProbe.js (Fase 2, punto 4 e criterio di accettazione (b)).
// - assegnazione tier 1/2/3 con la semantica del punto 4;
// - il probe NON crasha mai (provider rotto → tier 3, mai eccezione non gestita).
const { probeProvider } = require('../engine/ai/capabilityProbe');
const { OpenAICompatibleProvider } = require('../engine/ai/adapters/openAICompatible');
const eqIntentSchema = require('../engine/ai/schema/eqIntentSchema');

const VALID_PARSED = {
  message: 'ok',
  desiderata: {
    sub_bass_intent: 0, mid_bass_intent: 0, low_mids_intent: 0,
    high_mids_intent: 0, presence_intent: 0, brilliance_intent: 0
  }
};

// Provider finto (non basato su fetch) che rispetta il contratto AIProvider.
function fakeProvider({ tier = 1, throwOnChat = false, connOk = true } = {}) {
  return {
    async testConnection() {
      return { ok: connOk, latencyMs: 12, modelName: 'fake-model' };
    },
    async getCapabilities() {
      return { structuredOutput: true, functionCalling: true, streaming: true };
    },
    async chat() {
      if (throwOnChat) throw new Error('boom');
      return { raw: '...', parsed: tier <= 2 ? VALID_PARSED : null, tier, usage: null };
    }
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Fase 2 — capabilityProbe (assegnazione tier, mai crash)', () => {
  it('tier 1: structured output valido al primo colpo', async () => {
    const probe = await probeProvider(fakeProvider({ tier: 1 }));
    expect(probe.tier).toBe(1);
    expect(probe.ok).toBe(true);
    expect(probe.modelName).toBe('fake-model');
  });

  it('tier 2: recuperato con retry e feedback', async () => {
    const probe = await probeProvider(fakeProvider({ tier: 2 }));
    expect(probe.tier).toBe(2);
    expect(probe.ok).toBe(true);
  });

  it('tier 3: output non valido anche dopo il retry', async () => {
    const probe = await probeProvider(fakeProvider({ tier: 3 }));
    expect(probe.tier).toBe(3);
    expect(probe.ok).toBe(false);
  });

  it('tier 3: eccezione durante la chat → mai crash', async () => {
    const probe = await probeProvider(fakeProvider({ throwOnChat: true }));
    expect(probe.tier).toBe(3);
    expect(probe.ok).toBe(false);
  });

  it('tier 3: testConnection fallita → mai crash', async () => {
    const probe = await probeProvider(fakeProvider({ connOk: false }));
    expect(probe.tier).toBe(3);
    expect(probe.ok).toBe(false);
  });

  it('tier 3: testConnection che lancia → mai crash', async () => {
    const broken = {
      async testConnection() {
        throw new Error('network down');
      },
      async getCapabilities() {
        throw new Error('nope');
      }
    };
    const probe = await probeProvider(broken);
    expect(probe.tier).toBe(3);
    expect(probe.ok).toBe(false);
  });

  it('adapter reale con HTTP 500 su chat → probe tier 3 senza crash', async () => {
    vi.stubGlobal('fetch', async (url) => {
      if (String(url).includes('/models')) {
        return new Response(JSON.stringify({ data: [{ id: 'mock-model' }] }), { status: 200 });
      }
      return new Response('Internal Server Error', { status: 500 });
    });

    const provider = new OpenAICompatibleProvider({
      baseUrl: 'http://broken.test/v1', model: 'mock-model', apiKey: 'FAKE-PLACEHOLDER-KEY'
    });
    const probe = await probeProvider(provider);
    expect(probe.tier).toBe(3);
    expect(probe.ok).toBe(false);
    expect(typeof probe.latencyMs).toBe('number');
  });

  it('adapter reale valido (wire format OpenAI) → probe tier 1', async () => {
    const semantic = {
      message: 'ok',
      desiderata: {
        sub_bass_intent: 2.0, mid_bass_intent: 0.0, low_mids_intent: 0.0,
        high_mids_intent: 0.0, presence_intent: -1.0, brilliance_intent: 1.0
      }
    };
    vi.stubGlobal('fetch', async (url) => {
      if (String(url).includes('/models')) {
        return new Response(JSON.stringify({ data: [{ id: 'mock-model' }] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(semantic) } }], usage: {} }),
        { status: 200 }
      );
    });

    const provider = new OpenAICompatibleProvider({
      baseUrl: 'http://mock-local/v1', model: 'mock-model', apiKey: ''
    });
    const probe = await probeProvider(provider, { schema: eqIntentSchema });
    expect(probe.tier).toBe(1);
    expect(probe.ok).toBe(true);
    expect(probe.modelName).toBe('mock-model');
  });
});