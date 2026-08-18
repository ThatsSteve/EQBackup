import { tierToBadge, maskedKeyLabel } from '../../ai/aiConfig';

/**
 * shared.jsx — Fase 4: atomi UI condivisi dell'onboarding IA
 * (estratto da OnboardingAiStep.jsx:43-55 e 384-396, pre-Fase 4):
 * TierBadge, FieldError, Spinner, nota tier e messaggi.
 */

/** Badge tier: testo + classe (il testo è sempre presente, WCAG 1.4.1). */
export function TierBadge({ tier }) {
  const badge = tierToBadge(tier);
  return <span className={`aionb-badge ${badge.cls}`}>{badge.label}</span>;
}

/** Errore di campo (stringhe fisse, mai valori segreti). */
export function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="error-text" style={{ fontSize: '0.8rem', marginTop: '4px' }}>{msg}</div>;
}

/** Spinner CSS puro. */
export function Spinner() {
  return <span className="aionb-spinner" />;
}

/** Spiegazione inline del significato dei tier (backend capabilityProbe). */
export function TierNote() {
  return (
    <div className="aionb-tier-note">
      🟢 Ottimale = generazione EQ diretta · 🟡 Compatibile = EQ con retry guidato ·
      🔴 Solo chat = conversazione (il resto usa il motore deterministico) ·
      Non testato = crea il profilo e premi "Testa connessione".
    </div>
  );
}

/** Messaggi di stato/errore (generici, sanitizzati). */
export function renderMessages(messages) {
  if (!messages || messages.length === 0) return null;
  return (
    <div style={{ marginTop: '12px' }}>
      {messages.map((m, i) => (
        <div
          key={i}
          className={m.kind === 'error' ? 'error-text' : 'aionb-muted'}
          style={m.kind === 'success' ? { color: '#00ff87' } : m.kind === 'error' ? { fontSize: '0.85rem' } : undefined}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}

/** Stato chiave salvata (solo da hasApiKey, mai riletta). */
export function KeyStateLabel({ hasApiKey }) {
  return <span className="aionb-muted">{maskedKeyLabel(hasApiKey)}</span>;
}