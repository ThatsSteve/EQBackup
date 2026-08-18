'use strict';

/**
 * jsonRepair.js — estrazione/validazione del JSON dei provider + retry con
 * feedback (tier 2).
 *
 * Per i provider senza structured output nativo:
 *   1. estrae il JSON dalla risposta testuale (regex /\{[\s\S]*\}/ evoluta);
 *   2. valida contro eqIntentSchema.js (UNICA fonte di verità);
 *   3. se invalido → ESATTAMENTE 1 retry aggiungendo nel messaggio di ritorno
 *      l'errore di validazione concreto ("manca la chiave x", "valore fuori
 *      range") come istruzione di correzione;
 *   4. mai loop infiniti: dopo il retry, esito tier 3 per quella chiamata.
 *
 * Contratto di `callProvider(messages)` (fornito dall'adapter):
 *   → { content: string|null, usage: object|null, status: number|null }
 *   `status` non-null = errore HTTP (non riparabile) → tier 3 immediato.
 */

const eqIntentSchema = require('./schema/eqIntentSchema');

const MAX_RETRIES = 1;
const MAX_FEEDBACK_ERRORS = 8;

/**
 * Estrae il sotto-oggetto JSON dalla risposta testuale del provider.
 * Miglioramento rispetto alla regex di aiOrchestrator.js: prova prima il
 * parse diretto, poi la regex, e ritorna null se non c'è alcun oggetto.
 */
function extractJsonObject(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith('{')) {
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch (e) {
      // cade sulla regex
    }
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/**
 * Feedback concreto per il retry: elenca gli errori di validazione.
 */
function buildRepairFeedback(errors) {
  const list = (errors || []).slice(0, MAX_FEEDBACK_ERRORS).map((e) => `- ${e}`).join('\n');
  return (
    'La risposta precedente NON rispetta il formato JSON richiesto. Errori di validazione:\n' +
    `${list}\n` +
    'Ripeti la risposta come SOLO JSON valido, con "message" (stringa) e "desiderata" ' +
    'con ESATTAMENTE le 6 chiavi numeriche in [-5.0, 5.0]. Nessun testo fuori dal JSON.'
  );
}

/**
 * Valuta il contenuto grezzo contro lo schema. Ritorna anche `raw` (l'estratto
 * JSON o il testo) e `usage` per permettere all'adapter di restituirli.
 */
function evaluateContent(content, schema) {
  const sch = schema || eqIntentSchema;
  const raw = extractJsonObject(content);
  if (raw === null) {
    return {
      valid: false,
      parsed: null,
      errors: ['nessun oggetto JSON trovato nella risposta'],
      raw: typeof content === 'string' ? content : '',
      usage: null
    };
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    return {
      valid: false,
      parsed: null,
      errors: ['JSON non valido: errore di sintassi'],
      raw,
      usage: null
    };
  }
  const normalized = sch.normalizeParsed(obj);
  if (!normalized.valid) {
    return { valid: false, parsed: null, errors: normalized.errors, raw, usage: null };
  }
  return { valid: true, parsed: normalized.parsed, errors: [], raw, usage: null };
}

/**
 * Pipeline completa: tentativo + (al più) 1 retry con feedback.
 * @param {object} opts
 * @param {(messages: Array<object>) => Promise<{content, usage, status}>} opts.callProvider
 * @param {Array<object>} opts.messages
 * @param {object} [opts.schema]
 * @returns {Promise<{parsed, tier, attempts, raw, errors, usage}>}
 */
async function parseWithRetry({ callProvider, messages, schema }) {
  const sch = schema || eqIntentSchema;

  const attempt = async (msgs) => {
    let resp;
    try {
      resp = await callProvider(msgs);
    } catch (err) {
      // Provider irraggiungibile/abort: non riparabile → tier 3.
      return { parsed: null, tier: 3, attempts: 0, raw: null, errors: ['provider non raggiungibile'], usage: null };
    }
    if (!resp || resp.status) {
      // Errore HTTP: non riparabile.
      return { parsed: null, tier: 3, attempts: 0, raw: null, errors: [`http ${resp && resp.status}`], usage: null };
    }
    const evaluated = evaluateContent(resp.content, sch);
    if (evaluated.valid) {
      return { parsed: evaluated.parsed, tier: 0, attempts: 1, raw: evaluated.raw, errors: [], usage: resp.usage };
    }
    return { parsed: null, tier: 0, attempts: 1, raw: evaluated.raw, errors: evaluated.errors, usage: resp.usage };
  };

  // Tentativo 1
  const first = await attempt(messages);
  if (first.parsed) {
    return { ...first, tier: 1 };
  }
  if (first.tier === 3) {
    return first;
  }

  // Retry unico con feedback (tier 2 path)
  const feedback = buildRepairFeedback(first.errors);
  const repairMessages = [
    ...messages,
    { role: 'assistant', content: first.raw || '' },
    { role: 'user', content: feedback }
  ];
  const second = await attempt(repairMessages);
  if (second.parsed) {
    return { ...second, tier: 2, attempts: 2 };
  }
  return { ...second, tier: 3, attempts: 2 };
}

module.exports = {
  extractJsonObject,
  buildRepairFeedback,
  evaluateContent,
  parseWithRetry,
  MAX_RETRIES
};