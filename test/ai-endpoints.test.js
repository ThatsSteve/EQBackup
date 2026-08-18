// Test degli endpoint REST del layer AI + streaming SSE (Fase 2, punto 8-9-12).
// Tutto offline e deterministico: fetch è stubbato globalmente; nessuna chiave
// reale (placeholder fittizi marcati). Il vault di default viene reindirizzato
// su una directory temporanea per NON toccare la posizione reale dell'utente.
const os = require('os');
const path = require('path');
const fs = require('fs');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'peq-ai-endpoints-'));
process.env.PEQ_AI_PROFILES_PATH = path.join(tmpDir, 'ai-profiles.enc');

const supertest = require('supertest');
const app = require('../server');
const { generateAIFilters } = require('../engine/aiOrchestrator');
const { defaultRegistry } = require('../engine/ai/registry');

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const SEMANTIC = {
  message: 'Profilo calibrato per bassi profondi.',
  desiderata: {
    sub_bass_intent: 3.0, mid_bass_intent: 1.5, low_mids_intent: 0.0,
    high_mids_intent: 0.0, presence_intent: -1.0, brilliance_intent: 1.0
  }
};

// Provider "rotto": testConnection ok, chat → HTTP 500.
function installBrokenProviderFetch() {
  vi.stubGlobal('fetch', async (url) => {
    if (String(url).includes('/models')) {
      return new Response(JSON.stringify({ data: [{ id: 'mock-model' }] }), { status: 200 });
    }
    return new Response('Internal Server Error', { status: 500 });
  });
}

// Provider valido: wire format OpenAI-compatible.
function installValidProviderFetch() {
  vi.stubGlobal('fetch', async (url) => {
    if (String(url).includes('/models')) {
      return new Response(JSON.stringify({ data: [{ id: 'mock-model' }] }), { status: 200 });
    }
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(SEMANTIC) } }], usage: {} }),
      { status: 200 }
    );
  });
}

const CALC_PAYLOAD = {
  state: {
    headphone: 'acme test hp 9000',
    targetCurve: 'Harman',
    selectedArtists: ['daft_punk', 'hans_zimmer'],
    selectedGenres: [],
    bass: 'neutro',
    mids: 'piatte',
    treble: 'smooth'
  },
  destination: 'clipboard'
};

describe('Fase 2 — endpoint REST /api/ai/profiles', () => {
  it('POST + GET: creazione profilo senza apiKey nel body', async () => {
    const created = await supertest(app)
      .post('/api/ai/profiles')
      .send({ name: 'LM Studio', type: 'openai-compatible', baseUrl: 'http://localhost:1234/v1', apiKey: 'FAKE-PLACEHOLDER-KEY' });
    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);
    expect(created.body.profile.apiKey).toBeUndefined();
    expect(created.body.profile.hasApiKey).toBe(true);

    const list = await supertest(app).get('/api/ai/profiles');
    expect(list.status).toBe(200);
    expect(list.body.profiles.length).toBeGreaterThanOrEqual(1);
    for (const p of list.body.profiles) {
      expect(p.apiKey).toBeUndefined();
    }
  });

  it('POST valida nome e tipo', async () => {
    const noName = await supertest(app).post('/api/ai/profiles').send({ type: 'openai-compatible' });
    expect(noName.status).toBe(400);
    const badType = await supertest(app).post('/api/ai/profiles').send({ name: 'X', type: 'alien' });
    expect(badType.status).toBe(400);
  });

  it('POST /:id/test assegna tier senza attivare il profilo', async () => {
    installBrokenProviderFetch();
    const created = await supertest(app)
      .post('/api/ai/profiles')
      .send({ name: 'Rotto', type: 'openai-compatible', baseUrl: 'http://broken.test/v1', apiKey: 'FAKE-PLACEHOLDER-KEY' });
    const id = created.body.profile.id;

    const test = await supertest(app).post(`/api/ai/profiles/${id}/test`);
    expect(test.status).toBe(200);
    expect(test.body.tier).toBe(3);
    expect(test.body.success).toBe(false);

    // Non deve essere stato reso attivo dal test.
    const list = await supertest(app).get('/api/ai/profiles');
    const prof = list.body.profiles.find((p) => p.id === id);
    expect(prof.active).toBe(false);
  });

  it('POST /:id/activate attiva e un solo profilo resta attivo', async () => {
    installBrokenProviderFetch();
    const a = await supertest(app).post('/api/ai/profiles').send({ name: 'A', type: 'openai-compatible', baseUrl: 'http://a.test/v1' });
    const b = await supertest(app).post('/api/ai/profiles').send({ name: 'B', type: 'openai-compatible', baseUrl: 'http://b.test/v1' });

    const actA = await supertest(app).post(`/api/ai/profiles/${a.body.profile.id}/activate`);
    expect(actA.status).toBe(200);
    expect(actA.body.profile.active).toBe(true);

    const actB = await supertest(app).post(`/api/ai/profiles/${b.body.profile.id}/activate`);
    expect(actB.status).toBe(200);

    const list = await supertest(app).get('/api/ai/profiles');
    const active = list.body.profiles.filter((p) => p.active);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(b.body.profile.id);

    // Endpoint su profilo inesistente → 404
    const missing = await supertest(app).post('/api/ai/profiles/not-a-real-id/activate');
    expect(missing.status).toBe(404);
  });
});

describe('Fase 2 — criterio (b): provider rotto → flusso EQ deterministico, mai crash', () => {
  it('profilo attivo tier 3: /api/calculate-eq risponde 200 con filtri deterministici', async () => {
    installBrokenProviderFetch();
    const created = await supertest(app)
      .post('/api/ai/profiles')
      .send({ name: 'Broken', type: 'openai-compatible', baseUrl: 'http://broken.test/v1', apiKey: 'FAKE-PLACEHOLDER-KEY' });
    const id = created.body.profile.id;
    await supertest(app).post(`/api/ai/profiles/${id}/activate`);

    const res = await supertest(app).post('/api/calculate-eq').send(CALC_PAYLOAD);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.payload.filters)).toBe(true);
    expect(res.body.payload.filters.length).toBeGreaterThan(0);
  });
});

describe('Fase 2 — giuntura Fase 1: profilo attivo tier 1 usato da generateAIFilters', () => {
  it('con profilo attivo valido il flusso usa il provider (desiderata dal provider)', async () => {
    installValidProviderFetch();
    const created = await supertest(app)
      .post('/api/ai/profiles')
      .send({ name: 'Valido', type: 'openai-compatible', baseUrl: 'http://mock-local/v1', model: 'mock-model' });
    const id = created.body.profile.id;
    await supertest(app).post(`/api/ai/profiles/${id}/activate`);

    const payload = {
      hardware: { headphone: 'acme test hp 9000', dac: '', amp: '' },
      uploadedFiles: [],
      musicalIdentity: { targetCurve: 'Harman', artists: ['daft_punk', 'hans_zimmer'], genres: [] },
      psychoacoustics: {},
      spatial: {},
      frequencyPreferences: { bass: 'neutro', mids: 'piatte', treble: 'smooth' }
    };
    const aiResult = await generateAIFilters(payload, 'Voglio più bassi e punch.', false);
    expect(aiResult.desiderata).toEqual(SEMANTIC.desiderata);
    expect(aiResult.message).toBe(SEMANTIC.message);
  });
});

describe('Fase 2 — SSE /api/chat/stream e regressione del contratto JSON /api/chat', () => {
  beforeEach(async () => {
    // Isolamento dal resto del file: nessun profilo attivo → il canale SSE
    // percorre il ramo deterministico (offline, nessun fetch verso provider).
    const profiles = await defaultRegistry.listProfiles();
    for (const p of profiles) {
      await defaultRegistry.deleteProfile(p.id);
    }
  });

  it('il canale SSE risponde text/event-stream, emette eventi data: e chiude', async () => {
    const res = await supertest(app)
      .post('/api/chat/stream')
      .send({ message: 'ciao', aiPayload: {} });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('data:');
    expect(res.text).toContain('"type":"done"');
  });

  it('POST /api/chat (contratto JSON) continua a funzionare: risponde data.reply', async () => {
    installBrokenProviderFetch();
    const res = await supertest(app)
      .post('/api/chat')
      .send({
        message: 'ciao',
        aiPayload: {
          headphone: 'acme test hp 9000',
          targetCurve: 'Harman',
          selectedArtists: ['daft_punk', 'hans_zimmer']
        }
      });
    expect(res.status).toBe(200);
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.filters)).toBe(true);
  });
});