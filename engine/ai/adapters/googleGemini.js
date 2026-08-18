'use strict';

/**
 * googleGemini.js — STUB DOCUMENTATO (Fase 2).
 *
 * Il piano (sezione 1.2) marca l'adapter Google Gemini come OPZIONALE. In
 * questa fase NON è implementato: le classi sotto estendono il contratto
 * astratto (engine/ai/ProviderInterface.js) ma lanciano NotImplemented.
 *
 * Conseguenza progettuale esplicita: un profilo di tipo 'google-gemini'
 * creato via `POST /api/ai/profiles` resta persistito nel vault, ma il probe
 * (`POST /api/ai/profiles/:id/test`) e la giuntura con `generateAIFilters`
 * degradano sempre a tier 3 → fallback deterministico (`graphEngine.js`),
 * MAI un errore bloccante per l'utente.
 *
 * Implementazione futura (stesso contratto, stessi test dei criteri di
 * accettazione): endpoint `{baseUrl}/v1beta/models/{model}:generateContent`,
 * auth header `x-goog-api-key`, output strutturato via `responseSchema`
 * (generationConfig.responseMimeType = "application/json").
 */

const { AIProvider } = require('../ProviderInterface');

class GoogleGeminiProvider extends AIProvider {
  constructor(profile = {}) {
    super();
    this.id = profile.id;
    this.name = profile.name;
    this.type = 'google-gemini';
    this.baseUrl = String(profile.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
    this.model = profile.model || '';
    this.apiKey = profile.apiKey || '';
  }

  async testConnection() {
    return { ok: false, latencyMs: 0, modelName: null };
  }

  async getCapabilities() {
    return { structuredOutput: false, functionCalling: false, streaming: false };
  }

  async chat() {
    throw new Error('NotImplemented: Google Gemini adapter non implementato (stub documentato, Fase 2).');
  }
}

module.exports = { GoogleGeminiProvider };