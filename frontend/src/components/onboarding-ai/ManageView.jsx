import { TierBadge } from './shared';
import { ProfileForm } from './ProfileForm';

/**
 * ManageView.jsx — Fase 4: gestione profili (modalità manage, pre-Fase 4
 * OnboardingAiStep.jsx:399-497). Lista profili con Attiva/Testa, form di
 * creazione, lista vuota = stato normale (nessun crash).
 */
export function ManageView({ profiles, onTest, onActivate, onCreate, creatingId, testingId, activatingId, messages }) {
  return (
    <div>
      <h2 className="step-title" style={{ fontSize: '1.5rem' }}>Impostazioni IA — Gestione Profili</h2>
      <p className="step-subtitle">
        Gestisci i tuoi provider: attiva un profilo esistente, testa la connessione
        o creane uno nuovo. Un solo profilo attivo alla volta.
      </p>

      {profiles.length === 0 ? (
        <div className="aionb-empty">
          Nessun profilo configurato. Crea il tuo primo profilo qui sotto (o scegli
          "Nessuna IA" per usare il motore deterministico).
        </div>
      ) : (
        <ul className="aionb-profile-list">
          {profiles.map(p => (
            <li key={p.id} className={`aionb-profile-row ${p.active ? 'active' : ''}`}>
              <div className="aionb-profile-main">
                <div className="aionb-profile-name">
                  <strong style={{ color: '#fff' }}>{p.name}</strong>
                  {p.active && <span className="aionb-active-mark">✓ Attivo</span>}
                </div>
                <span className="aionb-profile-type">{p.type}</span>
                <TierBadge tier={p.tier} />
                {p.model && <span className="aionb-profile-model">Modello: {p.model}</span>}
              </div>
              <div className="aionb-profile-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={testingId === p.id || activatingId === p.id}
                  onClick={() => onTest(p.id)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  {testingId === p.id ? 'Test in corso...' : 'Testa'}
                </button>
                {!p.active && (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={testingId === p.id || activatingId === p.id}
                    onClick={() => onActivate(p.id)}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    {activatingId === p.id ? 'Attivazione...' : 'Attiva'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="aionb-form-card">
        <h3>Nuovo Profilo</h3>
        <ProfileForm
          preset={{ type: 'openai-compatible', baseUrl: '', model: '' }}
          submitLabel={creatingId === 'manage' ? 'Creazione...' : 'Crea Profilo'}
          submitting={creatingId === 'manage'}
          messages={messages}
          onSubmit={(form) => onCreate(form, 'manage')}
        />
      </div>
    </div>
  );
}