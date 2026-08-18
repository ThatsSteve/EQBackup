import { TierBadge, KeyStateLabel } from './shared';

/**
 * SavedProfileCard.jsx — Fase 4: card di un profilo salvato
 * (estratto da OnboardingAiStep.jsx:335-382, pre-Fase 4).
 * Mostra nome, tipo, badge tier, modello e stato chiave (hasApiKey);
 * azioni: Testa connessione e (se non attivo) Attiva.
 */
export function SavedProfileCard({ profile, onTest, onActivate, testingId, activatingId }) {
  const isTesting = testingId === profile.id;
  const isActivating = activatingId === profile.id;

  return (
    <div className="aionb-form-card">
      <div className="aionb-saved-row">
        <strong style={{ color: '#fff' }}>{profile.name}</strong>
        <span className="aionb-profile-type">{profile.type}</span>
        <TierBadge tier={profile.tier} />
        {profile.active && <span className="aionb-active-mark">✓ Attivo</span>}
      </div>
      {profile.model && <div className="aionb-muted">Modello: {profile.model}</div>}
      <div className="aionb-muted">{profile.baseUrl}</div>
      <KeyStateLabel hasApiKey={profile.hasApiKey} />
      <div className="aionb-actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={isTesting || isActivating}
          onClick={() => onTest(profile.id)}
          style={{ fontSize: '0.85rem', padding: '8px 14px' }}
        >
          {isTesting ? 'Test in corso...' : 'Testa connessione'}
        </button>
        {!profile.active && (
          <button
            type="button"
            className="btn-primary"
            disabled={isTesting || isActivating}
            onClick={() => onActivate(profile.id)}
            style={{ fontSize: '0.85rem', padding: '8px 14px' }}
          >
            {isActivating ? 'Attivazione...' : 'Attiva e continua'}
          </button>
        )}
      </div>
    </div>
  );
}