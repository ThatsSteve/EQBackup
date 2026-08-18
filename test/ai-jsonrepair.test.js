// Test di jsonRepair.js (Fase 2, punto 5 e 12).
// - estrazione JSON dalla risposta testuale;
// - esattamente 1 retry con feedback per i provider tier 2, mai loop;
// - esito tier 3 se invalido anche dopo il retry o su errore HTTP.
const {
  extractJsonObject,
  buildRepairFeedback,
  evaluateContent,
  parseWithRetry
} = require('../engine/ai/jsonRepair');
const eqIntentSchema = require('../engine/ai/schema/eqIntentSchema');

const VALID_PARSED = {
  message: 'ok',
  desiderata: {
    sub_bass_intent: 2.0, mid_bass_intent: 0.0, low_mids_intent: 0.0,
    high_mids_intent: 0.0, presence_intent: -1.0, brilliance_intent: 0.5
  }
};

describe('Fase 2 — jsonRepair (estrazione + validazione + retry con feedback)', () => {
  it('estrae il JSON anche con testo attorno e fenced code block', () => {
    const raw = 'Ecco il risultato:\n```json\n' + JSON.stringify(VALID_PARSED) + '\n```\nFine.';
    const extracted = extractJsonObject(raw);
    expect(extracted).toBeTruthy();
    expect(JSON.parse(extracted).desiderata).toEqual(VALID_PARSED.desiderata);
  });

  it('evaluateContent valida un contenuto valido', () => {
    const res = evaluateContent(JSON.stringify(VALID_PARSED), eqIntentSchema);
    expect(res.valid).toBe(true);
    expect(res.parsed.desiderata).toEqual(VALID_PARSED.desiderata);
  });

  it('evaluateContent rifiuta contenuto senza JSON', () => {
    const res = evaluateContent('Mi dispiace, non posso.', eqIntentSchema);
    expect(res.valid).toBe(false);
    expect(res.errors.join()).toContain('nessun oggetto JSON');
  });

  it('buildRepairFeedback contiene errori concreti (chiave mancante)', () => {
    const feedback = buildRepairFeedback(['chiave mancante: brilliance_intent']);
    expect(feedback).toContain('brilliance_intent');
  });

  it('parseWithRetry: primo colpo valido → tier 1, un solo tentativo', async () => {
    let calls = 0;
    const result = await parseWithRetry({
      callProvider: async () => {
        calls++;
        return { content: JSON.stringify(VALID_PARSED), usage: null, status: null };
      },
      messages: [{ role: 'user', content: 'più bassi' }],
      schema: eqIntentSchema
    });
    expect(result.tier).toBe(1);
    expect(result.attempts).toBe(1);
    expect(calls).toBe(1);
    expect(result.parsed.desiderata).toEqual(VALID_PARSED.desiderata);
  });

  it('parseWithRetry: invalido poi valido → ESATTAMENTE 1 retry con feedback, tier 2', async () => {
    let calls = 0;
    let lastMessages = [];
    const result = await parseWithRetry({
      callProvider: async (msgs) => {
        calls++;
        lastMessages = msgs;
        if (calls === 1) {
          return { content: '{"message":"manca una chiave"}', usage: null, status: null };
        }
        return { content: JSON.stringify(VALID_PARSED), usage: null, status: null };
      },
      messages: [{ role: 'user', content: 'più bassi' }],
      schema: eqIntentSchema
    });
    expect(result.tier).toBe(2);
    expect(result.attempts).toBe(2);
    expect(calls).toBe(2); // mai più di 1 retry
    expect(result.parsed.desiderata).toEqual(VALID_PARSED.desiderata);
    // Il retry deve includere il feedback di validazione (chiave mancante).
    const joined = lastMessages.map((m) => m.content).join(' ');
    expect(joined).toContain('desiderata');
  });

  it('parseWithRetry: invalido anche dopo il retry → tier 3, nessun loop', async () => {
    let calls = 0;
    const result = await parseWithRetry({
      callProvider: async () => {
        calls++;
        return { content: 'non-json', usage: null, status: null };
      },
      messages: [{ role: 'user', content: 'x' }],
      schema: eqIntentSchema
    });
    expect(result.tier).toBe(3);
    expect(calls).toBe(2); // tentativo + 1 retry, poi stop
  });

  it('parseWithRetry: errore HTTP → tier 3 immediato senza retry', async () => {
    let calls = 0;
    const result = await parseWithRetry({
      callProvider: async () => {
        calls++;
        return { content: null, usage: null, status: 500 };
      },
      messages: [{ role: 'user', content: 'x' }],
      schema: eqIntentSchema
    });
    expect(result.tier).toBe(3);
    expect(calls).toBe(1);
  });

  it('parseWithRetry: eccezione del provider → tier 3 senza crash', async () => {
    const result = await parseWithRetry({
      callProvider: async () => {
        throw new Error('provider irraggiungibile');
      },
      messages: [{ role: 'user', content: 'x' }],
      schema: eqIntentSchema
    });
    expect(result.tier).toBe(3);
    expect(result.parsed).toBeNull();
  });
});