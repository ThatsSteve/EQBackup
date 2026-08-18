'use strict';

/**
 * eqIntentSchema.js — UNICA fonte di verità dei 6 intenti semantici.
 *
 * Il layer IA (adapter, capabilityProbe, jsonRepair, test) produce/consuma
 * ESCLUSIVAMENTE questo contratto. Nessuna seconda copia dello schema è
 * ammessa altrove nel codice (né hardcoded nei test).
 *
 * Contratto:
 *   parsed = { message: string, desiderata: { <6 chiavi> } }
 *   desiderata: esattamente le 6 chiavi sotto, ognuna number in [-5.0, 5.0].
 *
 * I provider IA NON devono mai emettere frequenze/Q/gain fisici: quella è
 * competenza esclusiva di engine/dspEngine/coreCalculator.js.
 *
 * Helper puri senza dipendenze esterne:
 *   - validateDesiderata(obj)          -> { valid, errors }
 *   - validateIntentPayload(obj)       -> { valid, errors }
 *   - normalizeParsed(obj)             -> { valid, errors, parsed }
 */

const INTENT_KEYS = [
  'sub_bass_intent',
  'mid_bass_intent',
  'low_mids_intent',
  'high_mids_intent',
  'presence_intent',
  'brilliance_intent'
];

const INTENT_MIN = -5.0;
const INTENT_MAX = 5.0;

// JSON Schema del solo oggetto desiderata (usato per structured output nativo,
// es. response_format json_schema di OpenAI/LM Studio, input_schema di Claude).
const intentSchema = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    INTENT_KEYS.map((k) => [k, { type: 'number', minimum: INTENT_MIN, maximum: INTENT_MAX }])
  ),
  required: [...INTENT_KEYS]
};

// JSON Schema dell'oggetto completo { message, desiderata }.
const intentPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
    desiderata: intentSchema
  },
  required: ['message', 'desiderata']
};

/**
 * Valida il solo oggetto desiderata (le 6 chiavi, valori numerici in range,
 * nessuna chiave extra). Helper puro.
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateDesiderata(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, errors: ['desiderata non è un oggetto'] };
  }
  const errors = [];
  const keys = Object.keys(value);

  for (const k of INTENT_KEYS) {
    if (!(k in value)) {
      errors.push(`chiave mancante: ${k}`);
    }
  }
  for (const k of keys) {
    if (!INTENT_KEYS.includes(k)) {
      errors.push(`chiave extra non ammessa: ${k}`);
      continue;
    }
    const v = value[k];
    if (typeof v !== 'number' || Number.isNaN(v)) {
      errors.push(`tipo non numerico per ${k}: ${JSON.stringify(v)}`);
    } else if (v < INTENT_MIN || v > INTENT_MAX) {
      errors.push(`valore fuori range per ${k}: ${v} (atteso [${INTENT_MIN}, ${INTENT_MAX}])`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Valida l'oggetto completo { message, desiderata }. Helper puro.
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateIntentPayload(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { valid: false, errors: ['payload non è un oggetto'] };
  }
  const errors = [];
  if (typeof obj.message !== 'string') {
    errors.push('message deve essere una stringa');
  }
  const d = validateDesiderata(obj.desiderata);
  if (!d.valid) {
    errors.push(...d.errors);
  }
  // Chiavi extra a livello di payload non ammesse (additionalProperties: false).
  for (const k of Object.keys(obj)) {
    if (k !== 'message' && k !== 'desiderata') {
      errors.push(`chiave extra non ammessa nel payload: ${k}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Normalizza un JSON arbitrario proveniente da un provider nel contratto
 * `{ message, desiderata }`. Accetta sia la forma completa sia un oggetto
 * che è direttamente un desiderata (es. structured output con solo le 6
 * chiavi). La validazione è demandata a validateDesiderata.
 * @returns {{valid: boolean, errors: string[], parsed: object|null}}
 */
function normalizeParsed(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { valid: false, errors: ['payload non è un oggetto'], parsed: null };
  }
  let message = '';
  let desiderata = null;

  if ('desiderata' in obj) {
    desiderata = obj.desiderata;
    const rawMessage = obj.message;
    if (rawMessage !== undefined && rawMessage !== null) {
      if (typeof rawMessage === 'string') {
        message = rawMessage;
      } else if (typeof rawMessage === 'object' && rawMessage.message && typeof rawMessage.message === 'string') {
        message = rawMessage.message;
      } else {
        // Mai propagare contenuti non stringa: fallback neutro.
        message = '';
      }
    }
  } else if (INTENT_KEYS.some((k) => k in obj)) {
    desiderata = obj;
    message = 'Profilo ricalibrato.';
  } else {
    return { valid: false, errors: ['JSON privo di "desiderata" o delle 6 chiavi intent'], parsed: null };
  }

  const d = validateDesiderata(desiderata);
  if (!d.valid) {
    return { valid: false, errors: d.errors, parsed: null };
  }
  return { valid: true, errors: [], parsed: { message, desiderata } };
}

module.exports = {
  INTENT_KEYS,
  INTENT_MIN,
  INTENT_MAX,
  intentSchema,
  intentPayloadSchema,
  validateDesiderata,
  validateIntentPayload,
  normalizeParsed
};