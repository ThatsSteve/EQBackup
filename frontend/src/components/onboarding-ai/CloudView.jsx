import { CLOUD_PROVIDERS, PROVIDER_PRESETS } from '../../ai/aiConfig';
import { ProfileForm } from './ProfileForm';

/**
 * CloudView.jsx — Fase 4: opzione Cloud dell'onboarding IA
 * (estratto da OnboardingAiStep.jsx:626-672, pre-Fase 4).
 * Quick-start OpenAI/Anthropic/Gemini/OpenRouter + endpoint
 * OpenAI-compatibile personalizzato (baseUrl editabile).
 */
export function CloudView({ onQuickStart, onManualSubmit, creatingId, messages, existingActive, onUseExisting }) {
  const customOpenAi = PROVIDER_PRESETS.find(p => p.id === 'openai');

  return (
    <div>
      <h2 className="step-title" style={{ fontSize: '1.4rem' }}>IA Cloud (Chiave API)</h2>
      <p className="step-subtitle">
        Scegli un provider cloud e inserisci la tua chiave API (mai salvata in chiaro:
        viene usata solo per la creazione del profilo sul backend locale).
      </p>

      <div className="aionb-quickstart-grid">
        {CLOUD_PROVIDERS.map(p => (
          <button
            key={p.id}
            type="button"
            className="option-card aionb-option-card"
            disabled={creatingId === p.id}
            onClick={() => onQuickStart(p)}
          >
            <div className="aionb-option-icon">☁️</div>
            <h3 style={{ margin: '10px 0 6px 0', fontSize: '1.05rem' }}>{p.label}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{p.description}</p>
            <div className="aionb-code" style={{ marginTop: '10px' }}>{p.baseUrl}</div>
          </button>
        ))}
      </div>

      <div className="aionb-form-card">
        <h3>Endpoint OpenAI-Compatibile Personalizzato</h3>
        <ProfileForm
          preset={{ type: 'openai-compatible', baseUrl: customOpenAi.baseUrl, model: '' }}
          submitLabel={creatingId === 'manual-cloud' ? 'Creazione...' : 'Crea Profilo Cloud'}
          submitting={creatingId === 'manual-cloud'}
          messages={messages}
          onSubmit={(form) => onManualSubmit(form, 'manual-cloud')}
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