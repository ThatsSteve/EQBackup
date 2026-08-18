/**
 * aiConfig.js — Fase 3: presets provider IA, badge tier, mascheratura chiave
 * e validazione del form profilo.
 *
 * Modulo PURAMENTE ES (nessuna dipendenza, nessun accesso al DOM): ogni helper
 * è testabile con Vitest senza jsdom. Nessun helper contiene, logga o
 * trasmette valori segreti: la chiave API vive solo nel body della singola
 * POST /api/ai/profiles di creazione (gestita dal componente, non qui).
 */

// Preset provider con baseUrl di default verificate sul backend Fase 2
// (engine/ai/adapters/*). I locali hanno apiKey vuota; i cloud la richiedono.
export const PROVIDER_PRESETS = [
  {
    id: 'lmstudio',
    label: 'LM Studio',
    type: 'openai-compatible',
    baseUrl: 'http://localhost:1234/v1',
    model: '',
    keyRequired: false,
    kind: 'local',
    description: 'Auto-detect LM Studio in esecuzione su :1234'
  },
  {
    id: 'ollama',
    label: 'Ollama',
    type: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    model: '',
    keyRequired: false,
    kind: 'local',
    description: 'Auto-detect Ollama in esecuzione su :11434'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    type: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyRequired: true,
    kind: 'cloud',
    description: 'API OpenAI (modello di default: gpt-4o-mini)'
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-latest',
    keyRequired: true,
    kind: 'cloud',
    description: 'API Anthropic (modello di default: claude-3-5-sonnet-latest)'
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    type: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: '',
    keyRequired: true,
    kind: 'cloud',
    description: 'API OpenRouter (campo modello libero)'
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    type: 'google-gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: '',
    keyRequired: true,
    kind: 'cloud',
    experimental: true,
    description:
      'Adapter SPERIMENTALE (stub backend Fase 2): il test degrada sempre a 🔴 Solo chat, nessuna generazione EQ.'
  }
];

export const LOCAL_PROVIDERS = PROVIDER_PRESETS.filter((p) => p.kind === 'local');
export const CLOUD_PROVIDERS = PROVIDER_PRESETS.filter((p) => p.kind === 'cloud');

// Tipi supportati dal backend (engine/ai/registry.js:31) — specchio esatto.
export const SUPPORTED_TYPES = ['openai-compatible', 'anthropic', 'google-gemini'];

/**
 * Mappa tier → badge. Semantica del backend (engine/ai/capabilityProbe.js):
 *   1 = Ottimale (generazione EQ diretta)
 *   2 = Compatibile (generazione EQ con retry guidato)
 *   3 = Solo chat (conversazionale; resto con motore deterministico)
 *   null/undefined = profilo creato ma mai testato → "Non testato".
 * Il testo è SEMPRE presente: il colore non è l'unico canale informativo
 * (accessibilità, WCAG 1.4.1).
 */
export function tierToBadge(tier) {
  switch (tier) {
    case 1:
      return { label: '🟢 Ottimale', cls: 'aionb-tier-1' };
    case 2:
      return { label: '🟡 Compatibile', cls: 'aionb-tier-2' };
    case 3:
      return { label: '🔴 Solo chat', cls: 'aionb-tier-3' };
    default:
      return { label: 'Non testato', cls: 'aionb-tier-0' };
  }
}

/**
 * Una chiave è obbligatoria quando il provider è un servizio cloud.
 * Gli endpoint locali (localhost / 127.0.0.1) non la richiedono; per
 * 'openai-compatible' la decisione dipende quindi dalla baseUrl.
 */
export function isKeyRequired(type, baseUrl = '') {
  if (type === 'anthropic' || type === 'google-gemini') return true;
  if (type === 'openai-compatible') {
    const url = String(baseUrl || '').trim();
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?([/]|$)/i.test(url)) return false;
    return true;
  }
  return false;
}

/**
 * Validazione del form profilo. Errori come stringhe fisse generiche
 * (allineate ai messaggi sanitizzati del backend); mai valori segreti.
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateProfileForm({ name = '', type = '', baseUrl = '', apiKey = '', model = '' } = {}) {
  const errors = {};
  if (!String(name).trim()) {
    errors.name = 'Campo "name" obbligatorio.';
  }
  if (!SUPPORTED_TYPES.includes(type)) {
    errors.type = 'Tipo provider non supportato.';
  }
  if (!String(baseUrl).trim()) {
    errors.baseUrl = 'Indirizzo del server obbligatorio.';
  }
  if (isKeyRequired(type, baseUrl) && !String(apiKey).trim()) {
    errors.apiKey = 'Chiave API obbligatoria per i provider cloud.';
  }
  // model è un campo libero e opzionale: si limita solo la lunghezza.
  if (String(model || '').length > 200) {
    errors.model = 'Modello troppo lungo (max 200 caratteri).';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Nome di default leggibile e non vuoto (il backend richiede name). */
export function defaultProfileName(type) {
  switch (type) {
    case 'anthropic':
      return 'Anthropic Cloud';
    case 'google-gemini':
      return 'Google Gemini';
    case 'openai-compatible':
    default:
      return 'OpenAI Compatibile';
  }
}

/**
 * Stato mascherato della chiave dopo il salvataggio: pilotato esclusivamente
 * da `hasApiKey` restituito dal backend (la chiave non viene mai riletta).
 */
export function maskedKeyLabel(hasApiKey) {
  return hasApiKey ? 'Chiave salvata ••••••••' : 'Nessuna chiave salvata';
}