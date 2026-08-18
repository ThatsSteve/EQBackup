'use strict';

/**
 * ProviderInterface.js — contratto minimo del layer di astrazione provider IA.
 *
 * Ogni adapter (openAICompatible, anthropic, googleGemini) implementa questo
 * contratto. Documentazione del contratto (scelte di design della Fase 2):
 *
 *   testConnection() → { ok, latencyMs, modelName }
 *     Verifica raggiungibilità del provider. Mai throw: ritorna ok:false.
 *
 *   getCapabilities() → { structuredOutput, functionCalling, streaming }
 *     Dichiarazione statica delle capacità. Il tier reale viene misurato
 *     empiricamente da capabilityProbe.js (con lo schema reale).
 *
 *   chat({ messages, schema, stream = false, signal }) →
 *       NON-stream: { raw, parsed, tier, usage }
 *       stream:true → async generator di eventi SSE:
 *         { type: 'delta', text }            — delta token-by-token
 *         { type: 'done', parsed, tier }     — evento finale con output
 *                                              strutturato normalizzato
 *         { type: 'error', message }         — errore sanitizzato
 *     - raw    = risposta grezza del provider (MAI loggata o restituita al
 *                frontend se contiene chiavi: per i wire format usati non la
 *                contiene; gli adapter non la loggano mai).
 *     - parsed = { message, desiderata } normalizzato e validato contro
 *                eqIntentSchema.js (unica fonte di verità).
 *     - tier   = tier effettivo di QUELLA chiamata: 1 primo colpo, 2 dopo
 *                retry con feedback, 3 irrecuperabile.
 *     - usage  = token/costo se disponibili, altrimenti null.
 *     - signal = AbortSignal esterno (es. disconnessione client SSE).
 *
 * Nessun metodo deve MAI propagare eccezioni non gestite con dettagli grezzi:
 * gli adapter ritornano tier 3 su qualunque errore/timeout/HTTP non-2xx.
 */

class AIProvider {
  async testConnection() {
    throw new Error('NotImplemented: testConnection() deve essere implementato dall\'adapter.');
  }

  async getCapabilities() {
    throw new Error('NotImplemented: getCapabilities() deve essere implementato dall\'adapter.');
  }

  async chat() {
    throw new Error('NotImplemented: chat() deve essere implementato dall\'adapter.');
  }
}

/**
 * Messaggio di errore generico: MAI err.message/err.stack, MAI URL con
 * credenziali, MAI body di risposta del provider.
 */
function sanitizeErrorMessage() {
  return 'Errore generico del provider IA.';
}

/**
 * Mappa un HTTP status del provider a un messaggio generico, senza body.
 */
function httpStatusMessage(status) {
  if (status === 401 || status === 403) {
    return 'Autenticazione fallita (401/403): verifica chiave API e permessi.';
  }
  if (status === 429) {
    return 'Rate limit del provider (429): riprova più tardi.';
  }
  if (status >= 500) {
    return 'Errore del provider (5xx): il servizio remoto non è disponibile.';
  }
  if (status >= 400) {
    return `Richiesta non valida al provider (${status}).`;
  }
  return `Errore di comunicazione con il provider (${status}).`;
}

module.exports = { AIProvider, sanitizeErrorMessage, httpStatusMessage };