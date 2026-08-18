// Fase 3 — Test del modulo puro frontend/src/ai/aiConfig.js.
// Nessun DOM, nessuna dipendenza extra: Vitest puro (zero jsdom/@testing-library).
import { describe, it, expect } from 'vitest';
import {
  tierToBadge,
  isKeyRequired,
  validateProfileForm,
  defaultProfileName,
  maskedKeyLabel,
  PROVIDER_PRESETS,
  SUPPORTED_TYPES
} from './aiConfig';

describe('tierToBadge (mapping esatto backend)', () => {
  it('tier 1 → 🟢 Ottimale', () => {
    expect(tierToBadge(1).label).toBe('🟢 Ottimale');
  });
  it('tier 2 → 🟡 Compatibile', () => {
    expect(tierToBadge(2).label).toBe('🟡 Compatibile');
  });
  it('tier 3 → 🔴 Solo chat', () => {
    expect(tierToBadge(3).label).toBe('🔴 Solo chat');
  });
  it('null → Non testato', () => {
    expect(tierToBadge(null).label).toBe('Non testato');
  });
  it('undefined → Non testato', () => {
    expect(tierToBadge(undefined).label).toBe('Non testato');
  });
  it('valori ignoti → Non testato (fallback sicuro)', () => {
    expect(tierToBadge(99).label).toBe('Non testato');
  });
});

describe('isKeyRequired', () => {
  it('provider locali → false', () => {
    expect(isKeyRequired('openai-compatible', 'http://localhost:1234/v1')).toBe(false);
    expect(isKeyRequired('openai-compatible', 'http://127.0.0.1:11434/v1')).toBe(false);
    expect(isKeyRequired('openai-compatible', 'http://localhost:1234')).toBe(false);
  });
  it('provider cloud → true', () => {
    expect(isKeyRequired('anthropic', 'https://api.anthropic.com')).toBe(true);
    expect(isKeyRequired('google-gemini', 'https://generativelanguage.googleapis.com')).toBe(true);
    expect(isKeyRequired('openai-compatible', 'https://api.openai.com/v1')).toBe(true);
    expect(isKeyRequired('openai-compatible', 'https://openrouter.ai/api/v1')).toBe(true);
  });
});

describe('validateProfileForm', () => {
  it('name mancante → errore', () => {
    const r = validateProfileForm({
      name: '   ',
      type: 'openai-compatible',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      model: ''
    });
    expect(r.valid).toBe(false);
    expect(r.errors.name).toBeDefined();
  });
  it('type non supportato → errore', () => {
    const r = validateProfileForm({
      name: 'X',
      type: 'skynet',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      model: ''
    });
    expect(r.valid).toBe(false);
    expect(r.errors.type).toBeDefined();
  });
  it('baseUrl mancante → errore', () => {
    const r = validateProfileForm({
      name: 'X',
      type: 'openai-compatible',
      baseUrl: '',
      apiKey: '',
      model: ''
    });
    expect(r.valid).toBe(false);
    expect(r.errors.baseUrl).toBeDefined();
  });
  it('model eccessivamente lungo → errore', () => {
    const r = validateProfileForm({
      name: 'X',
      type: 'openai-compatible',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      model: 'm'.repeat(201)
    });
    expect(r.valid).toBe(false);
    expect(r.errors.model).toBeDefined();
  });
  it('cloud senza apiKey → errore', () => {
    const r = validateProfileForm({
      name: 'Anthropic',
      type: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
      apiKey: '',
      model: ''
    });
    expect(r.valid).toBe(false);
    expect(r.errors.apiKey).toBeDefined();
  });
  it('openai-compatible cloud senza apiKey → errore', () => {
    const r = validateProfileForm({
      name: 'OpenAI',
      type: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: ''
    });
    expect(r.valid).toBe(false);
    expect(r.errors.apiKey).toBeDefined();
  });
  it('caso valido (locale, senza chiave) → valid true', () => {
    const r = validateProfileForm({
      name: 'LM Studio',
      type: 'openai-compatible',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      model: ''
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual({});
  });
  it('caso valido (cloud, con chiave fittizia) → valid true', () => {
    const r = validateProfileForm({
      name: 'OpenAI',
      type: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'FAKE-PLACEHOLDER-KEY',
      model: 'gpt-4o-mini'
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual({});
  });
});

describe('defaultProfileName', () => {
  it('produce nomi non vuoti e leggibili per ogni tipo supportato', () => {
    SUPPORTED_TYPES.forEach((t) => {
      const n = defaultProfileName(t);
      expect(typeof n).toBe('string');
      expect(n.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('maskedKeyLabel', () => {
  it('hasApiKey true → stato mascherato', () => {
    expect(maskedKeyLabel(true)).toBe('Chiave salvata ••••••••');
  });
  it('hasApiKey false → nessuna chiave', () => {
    expect(maskedKeyLabel(false)).toBe('Nessuna chiave salvata');
  });
});

describe('presets (coerenza contrattuale)', () => {
  it('tutti i preset hanno type supportato dal backend', () => {
    PROVIDER_PRESETS.forEach((p) => {
      expect(SUPPORTED_TYPES).toContain(p.type);
    });
  });
  it('i locali hanno baseUrl localhost e keyRequired false', () => {
    ['lmstudio', 'ollama'].forEach((id) => {
      const p = PROVIDER_PRESETS.find((x) => x.id === id);
      expect(p.baseUrl).toMatch(/^http:\/\/localhost:\d+\/v1$/);
      expect(p.keyRequired).toBe(false);
    });
  });
  it('i cloud hanno keyRequired true', () => {
    ['openai', 'anthropic', 'openrouter', 'gemini'].forEach((id) => {
      const p = PROVIDER_PRESETS.find((x) => x.id === id);
      expect(p.keyRequired).toBe(true);
    });
  });
});