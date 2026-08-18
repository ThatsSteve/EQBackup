// Test del contratto dei 6 intenti (Fase 2, punto 3 e 12).
// eqIntentSchema.js è l'UNICA fonte di verità: accetta payload validi e
// rifiuta chiavi mancanti/extra, valori fuori range e tipi non numerici.
const eqIntentSchema = require('../engine/ai/schema/eqIntentSchema');

const VALID_DESIDERATA = {
  sub_bass_intent: 3.0,
  mid_bass_intent: 1.5,
  low_mids_intent: 0.0,
  high_mids_intent: -0.5,
  presence_intent: -1.0,
  brilliance_intent: 1.0
};

const VALID_PAYLOAD = { message: 'Profilo calibrato.', desiderata: VALID_DESIDERATA };

describe('Fase 2 — eqIntentSchema (unica fonte di verità dei 6 intenti)', () => {
  it('accetta un payload valido (validateDesiderata + validateIntentPayload)', () => {
    expect(eqIntentSchema.validateDesiderata(VALID_DESIDERATA).valid).toBe(true);
    expect(eqIntentSchema.validateIntentPayload(VALID_PAYLOAD).valid).toBe(true);
  });

  it('accetta i limiti esclusi dell\'intervallo [-5.0, +5.0]', () => {
    const atLimits = { ...VALID_DESIDERATA, sub_bass_intent: -5.0, brilliance_intent: 5.0 };
    expect(eqIntentSchema.validateDesiderata(atLimits).valid).toBe(true);
  });

  it('rifiuta chiavi mancanti', () => {
    const { brilliance_intent, ...missing } = VALID_DESIDERATA;
    const result = eqIntentSchema.validateDesiderata(missing);
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain('brilliance_intent');
  });

  it('rifiuta valori fuori range (±5.0)', () => {
    expect(eqIntentSchema.validateDesiderata({ ...VALID_DESIDERATA, sub_bass_intent: 5.1 }).valid).toBe(false);
    expect(eqIntentSchema.validateDesiderata({ ...VALID_DESIDERATA, sub_bass_intent: -5.1 }).valid).toBe(false);
  });

  it('rifiuta tipi non numerici', () => {
    expect(eqIntentSchema.validateDesiderata({ ...VALID_DESIDERATA, mid_bass_intent: 'troppi' }).valid).toBe(false);
    expect(eqIntentSchema.validateDesiderata({ ...VALID_DESIDERATA, mid_bass_intent: null }).valid).toBe(false);
  });

  it('rifiuta chiavi extra', () => {
    expect(eqIntentSchema.validateDesiderata({ ...VALID_DESIDERATA, extra_intent: 1 }).valid).toBe(false);
  });

  it('rifiuta un payload non oggetto', () => {
    expect(eqIntentSchema.validateDesiderata(null).valid).toBe(false);
    expect(eqIntentSchema.validateIntentPayload('nope').valid).toBe(false);
  });

  it('validateIntentPayload richiede message stringa', () => {
    expect(eqIntentSchema.validateIntentPayload({ message: 42, desiderata: VALID_DESIDERATA }).valid).toBe(false);
  });

  it('normalizeParsed accetta sia la forma completa sia il solo desiderata', () => {
    const full = eqIntentSchema.normalizeParsed(VALID_PAYLOAD);
    expect(full.valid).toBe(true);
    expect(full.parsed.desiderata).toEqual(VALID_DESIDERATA);

    const bare = eqIntentSchema.normalizeParsed(VALID_DESIDERATA);
    expect(bare.valid).toBe(true);
    expect(bare.parsed.desiderata).toEqual(VALID_DESIDERATA);
  });

  it('normalizeParsed rifiuta JSON senza desiderata né chiavi intent', () => {
    const result = eqIntentSchema.normalizeParsed({ message: 'ciao' });
    expect(result.valid).toBe(false);
  });

  it('lo schema JSON esportato contiene le 6 chiavi richieste', () => {
    expect(eqIntentSchema.intentSchema.required.sort()).toEqual(eqIntentSchema.INTENT_KEYS.slice().sort());
    expect(eqIntentSchema.intentPayloadSchema.required).toContain('message');
    expect(eqIntentSchema.intentPayloadSchema.required).toContain('desiderata');
  });
});