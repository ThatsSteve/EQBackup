import { useState } from 'react';
import { isKeyRequired, validateProfileForm, defaultProfileName } from '../../ai/aiConfig';
import { FieldError, Spinner } from './shared';

/**
 * ProfileForm.jsx — Fase 4: form di creazione profilo IA
 * (estratto da OnboardingAiStep.jsx:263-332, pre-Fase 4).
 * La chiave API è un input type=password, mai loggata, azzerata al submit
 * riuscito; lo stato successivo è mascherato da hasApiKey (backend).
 */
export function ProfileForm({ preset, submitLabel = 'Crea Profilo', onSubmit, submitting, messages }) {
  const [form, setForm] = useState({
    name: defaultProfileName(preset?.type || 'openai-compatible'),
    type: preset?.type || 'openai-compatible',
    baseUrl: preset?.baseUrl || '',
    apiKey: '',
    model: preset?.model || ''
  });
  const [errors, setErrors] = useState({});

  const keyRequired = isKeyRequired(form.type, form.baseUrl);

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { valid, errors: errs } = validateProfileForm(form);
    setErrors(errs);
    if (!valid) return;
    onSubmit({ ...form, apiKey: form.apiKey.trim() });
  };

  return (
    <form className="aionb-form" onSubmit={handleSubmit}>
      <div className="input-group">
        <label className="input-label">Nome Profilo *</label>
        <input
          type="text"
          className="hardware-input"
          placeholder="Es. LM Studio locale, OpenAI cloud..."
          value={form.name}
          onChange={e => setField('name', e.target.value)}
        />
        <FieldError msg={errors.name} />
      </div>

      <div className="input-group">
        <label className="input-label">Endpoint (baseUrl) *</label>
        <input
          type="text"
          className="hardware-input"
          placeholder="http://localhost:1234/v1"
          value={form.baseUrl}
          onChange={e => setField('baseUrl', e.target.value)}
        />
        <FieldError msg={errors.baseUrl} />
      </div>

      <div className="input-group">
        <label className="input-label">Modello (opzionale)</label>
        <input
          type="text"
          className="hardware-input"
          placeholder="Es. gpt-4o-mini, claude-3-5-sonnet-latest, qwen2.5:7b..."
          value={form.model}
          onChange={e => setField('model', e.target.value)}
        />
        <FieldError msg={errors.model} />
      </div>

      <div className="input-group">
        <label className="input-label">
          API Key {keyRequired ? '*' : '(opzionale per endpoint locali)'}
        </label>
        <input
          type="password"
          autoComplete="off"
          className="hardware-input"
          placeholder={keyRequired ? 'Inserisci la chiave...' : 'Lascia vuoto per provider locali'}
          value={form.apiKey}
          onChange={e => setField('apiKey', e.target.value)}
        />
        <FieldError msg={errors.apiKey} />
        <div className="aionb-muted">La chiave viene usata solo per la creazione del profilo e mai visualizzata di nuovo.</div>
      </div>

      {messages && (
        <div style={{ marginTop: '4px' }}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.kind === 'error' ? 'error-text' : 'aionb-muted'}
              style={m.kind === 'success' ? { color: '#00ff87' } : m.kind === 'error' ? { fontSize: '0.8rem' } : undefined}
            >
              {m.text}
            </div>
          ))}
        </div>
      )}

      <div className="aionb-actions">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}