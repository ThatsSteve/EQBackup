import { LOCAL_PROVIDERS } from '../../ai/aiConfig';
import { ProfileForm } from './ProfileForm';

/**
 * LocalView.jsx — Fase 4: opzione Locale dell'onboarding IA
 * (estratto da OnboardingAiStep.jsx:565-624, pre-Fase 4).
 * Quick-start auto-detect LM Studio / Ollama + endpoint manuale.
 */
export function LocalView({ onQuickStart, onManualSubmit, creatingId, messages, existingActive, onUseExisting }) {
  return (
    <div>
      <h2 className="step-title" style={{ fontSize: '1.4rem' }}>IA Locale (Auto-Detect)</h2>
      <p className="step-subtitle">
        Collega un motore IA in esecuzione sul tuo computer (LM Studio :1234, Ollama :11434)
        oppure inserisci un endpoint OpenAI-compatibile locale. Nessuna chiave richiesta.
      </p>

      <div className="aionb-quickstart-grid">
        {LOCAL_PROVIDERS.map(p => (
          <button
            key={p.id}
            type="button"
            className="option-card aionb-option-card"
            disabled={creatingId === p.id}
            onClick={() => onQuickStart(p)}
          >
            <div className="aionb-option-icon">🖥️</div>
            <h3 style={{ margin: '10px 0 6px 0', fontSize: '1.05rem' }}>{p.label}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{p.description}</p>
            <div className="aionb-code" style={{ marginTop: '10px' }}>{p.baseUrl}</div>
          </button>
        ))}
      </div>

      <div className="aionb-form-card">
        <h3>Endpoint Manuale (OpenAI-compatibile)</h3>
        <ProfileForm
          preset={{ type: 'openai-compatible', baseUrl: '', model: '' }}
          submitLabel={creatingId === 'manual' ? 'Creazione...' : 'Crea Profilo Locale'}
          submitting={creatingId === 'manual'}
          messages={messages}
          onSubmit={(form) => onManualSubmit(form, 'manual')}
        />
      </div>

      {existingActive && (
        <div className="aionb-existing">
          <span>Hai già un profilo attivo: <strong>{existingActive.name}</strong></span>
          <button type="button" className="btn-primary" onClick={onUseExisting}>
            Usa profilo esistente
          </button>
        </div>
      )}
    </div>
  );
}