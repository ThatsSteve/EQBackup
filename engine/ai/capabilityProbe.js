'use strict';

/**
 * capabilityProbe.js — test automatico delle capacità del provider collegato
 * e assegnazione del tier al collegamento.
 *
 * Semantica dei tier (da 1.2 del piano):
 *   Tier 1 — Nativo:      structured output/function calling reale E risposta
 *                         valida contro eqIntentSchema.js al primo colpo.
 *   Tier 2 — Prompt-guidato: nessun structured output nativo, ma risposta
 *                         recuperabile con 1 retry con feedback (jsonRepair).
 *   Tier 3 — Inaffidabile: invalido anche dopo il retry, oppure errore/
 *                         timeout/HTTP non-2xx. Resta disponibile solo per la
 *                         chat conversazionale; la generazione EQ degrada al
 *                         motore deterministico (graphEngine.js).
 *
 * Il probe NON deve MAI crashare: qualunque eccezione/timeout → tier 3.
 * Timeout esplicito su ogni fetch (gestito dagli adapter), clearTimeout in
 * finally negli adapter. Ritorna { ok, tier, latencyMs, modelName, details }.
 */

const eqIntentSchema = require('./schema/eqIntentSchema');

const PROBE_USER_PROMPT =
  'Restituisci SOLO JSON valido con la forma {"message": string, "desiderata": {...}}, ' +
  'dove "desiderata" ha ESATTAMENTE le 6 chiavi numeriche in [-5.0, 5.0]: ' +
  'sub_bass_intent, mid_bass_intent, low_mids_intent, high_mids_intent, ' +
  'presence_intent, brilliance_intent. ' +
  'CASO NOTO: l\'utente ascolta Hip-Hop/EDM e vuole bassi profondi e punch. ' +
  'Valori di esempio: sub_bass_intent 3.0, mid_bass_intent 1.5, low_mids_intent 0.0, ' +
  'high_mids_intent 0.0, presence_intent -1.0, brilliance_intent 1.0.';

/**
 * Esegue il probe completo su un provider.
 * @param {object} provider — istanza adapter (contratto AIProvider)
 * @param {object} [opts]
 * @param {object} [opts.schema] — schema eqIntentSchema (default)
 * @returns {Promise<{ok, tier, latencyMs, modelName, details}>}
 */
async function probeProvider(provider, { schema = eqIntentSchema } = {}) {
  const details = { probedAt: new Date().toISOString() };
  try {
    const conn = await provider.testConnection();
    details.latencyMs = conn.latencyMs;
    details.modelName = conn.modelName;

    if (!conn.ok) {
      return {
        ok: false,
        tier: 3,
        latencyMs: conn.latencyMs,
        modelName: conn.modelName,
        details: { ...details, reason: 'testConnection fallita' }
      };
    }

    const capabilities = await provider.getCapabilities();
    details.capabilities = capabilities;

    const probeMessages = [
      { role: 'system', content: 'Sei un validatore di formato JSON. Segui esattamente la richiesta dell\'utente.' },
      { role: 'user', content: PROBE_USER_PROMPT }
    ];

    const result = await provider.chat({ messages: probeMessages, schema });
    details.probeTier = result.tier;
    details.parsedValid = Boolean(result.parsed);

    if (result.tier === 1) {
      return {
        ok: true,
        tier: 1,
        latencyMs: conn.latencyMs,
        modelName: conn.modelName,
        details: { ...details, reason: 'structured output valido al primo colpo' }
      };
    }
    if (result.tier === 2) {
      return {
        ok: true,
        tier: 2,
        latencyMs: conn.latencyMs,
        modelName: conn.modelName,
        details: { ...details, reason: 'recuperato con retry e feedback' }
      };
    }
    return {
      ok: false,
      tier: 3,
      latencyMs: conn.latencyMs,
      modelName: conn.modelName,
      details: { ...details, reason: 'output non valido anche dopo il retry' }
    };
  } catch (err) {
    // Mai crash: qualunque eccezione/timeout → tier 3.
    return {
      ok: false,
      tier: 3,
      latencyMs: null,
      modelName: null,
      details: { ...details, reason: 'eccezione durante il probe (tier 3 di sicurezza)' }
    };
  }
}

module.exports = { probeProvider, PROBE_USER_PROMPT };