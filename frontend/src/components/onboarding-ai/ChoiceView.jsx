import { TierBadge } from './shared';

/**
 * ChoiceView.jsx — Fase 4: scelta iniziale dell'onboarding IA
 * (estratto da OnboardingAiStep.jsx:507-563, pre-Fase 4).
 * Tre opzioni: Locale / Cloud / Nessuna IA (sempre percorribile).
 */
export function ChoiceView({ onChooseLocal, onChooseCloud, onNoAi, existingActive, onUseExisting }) {
  return (
    <div>
      <h2 className="step-title" style={{ fontSize: '1.5rem' }}>Configura la tua IA</h2>
      <p className="step-subtitle">
        Scegli la potenza di calcolo per il tuo ingegnere del suono virtuale.
        Puoi cambiare profilo in qualsiasi momento dalle Impostazioni IA.
      </p>

      {existingActive && (
        <div className="aionb-existing">
          <div>
            <div>Hai già un profilo attivo: <strong>{existingActive.name}</strong></div>
            <div className="aionb-muted" style={{ marginTop: '4px' }}>
              Tipo: {existingActive.type} · <TierBadge tier={existingActive.tier} />
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={onUseExisting}>
            Usa profilo esistente
          </button>
        </div>
      )}

      <div className="options-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <button type="button" className="option-card aionb-option-card" onClick={onChooseLocal}>
          <span className="badge" style={{ background: '#00f0ff', color: '#000', fontWeight: 'bold' }}>🖥️ Locale</span>
          <h3 style={{ margin: '12px 0 8px 0' }}>IA sul tuo PC</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            LM Studio o Ollama in esecuzione locale. Nessuna chiave, nessun invio dati
            verso il cloud: la massima privacy.
          </p>
        </button>

        <button type="button" className="option-card aionb-option-card" onClick={onChooseCloud}>
          <span className="badge" style={{ background: '#ffb142', color: '#000', fontWeight: 'bold' }}>☁️ Cloud</span>
          <h3 style={{ margin: '12px 0 8px 0' }}>IA Cloud (API Key)</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            OpenAI, Anthropic, Gemini o OpenRouter. Più potenza di calcolo; richiede
            una chiave API (il backend locale la custodisce).
          </p>
        </button>

        <button type="button" className="option-card aionb-option-card" onClick={onNoAi}>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 'bold' }}>🚫 Nessuna IA</span>
          <h3 style={{ margin: '12px 0 8px 0' }}>Motore Deterministico</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Procedi senza IA: il motore a regole (Grafo Locale) calibra comunque il tuo
            EQ. Puoi attivare un profilo IA quando vuoi dalle Impostazioni.
          </p>
        </button>
      </div>

      <div className="aionb-info">
        💡 Il tier del provider (🟢/🟡/🔴) determina cosa può fare l'IA: dalla generazione
        EQ diretta (tier 1) alla sola chat conversazionale (tier 3). Senza profilo attivo
        l'app funziona comunque al 100% con il motore deterministico.
      </div>
    </div>
  );
}