/**
 * FaqSection.jsx — Guida rapida all'acustica parametrica dello Step 4
 * (estratto identico da App.jsx:2507-2541, pre-Fase 4).
 */
const FAQ_ITEMS = [
  { id: 'pk', label: 'Filtro PK (Peak/Bell)', text: 'Interviene su una specifica campana di frequenze. Un Q-Factor alto (es. 2.0 o superiore) stringe la campana per correzioni chirurgiche (come sibilanti o risonanze di cuffia), mentre un Q basso (es. 0.7 - 1.4) crea modifiche ampie e musicali sul timbro globale.' },
  { id: 'ls_hs', label: 'Filtri LS / HS (Shelving)', text: 'I filtri Low Shelf (LS) e High Shelf (HS) operano come controlli di tono da studio: sollevano o attenuano uniformemente tutte le frequenze al di sotto (o al di sopra) della soglia specificata, perfetti per dare corpo al basso profondo o aria alle frequenze altissime.' },
  { id: 'preamp', label: 'Pre-Amp di Sicurezza (Anti-Clipping)', text: 'Nel dominio digitale, superare lo 0 dBFS causa distorsione da clipping irreversibile. Il nostro motore DSP calcola preventivamente il picco massimo generato dalla somma dei filtri e imposta automaticamente un guadagno negativo per mantenere il segnale puro e dinamico al 100%.' }
];

export function FaqSection({ activeFaq, setActiveFaq }) {
  return (
    <div className="faq-section mt-4" style={{ background: 'rgba(15, 18, 25, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '1.2rem', color: 'var(--color-accent-blue)' }}>ℹ️</span>
        <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: 600 }}>Guida Rapida all'Acustica Parametrica</h4>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Clicca su un concetto per capire come opera l'IA:</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {FAQ_ITEMS.map(faq => (
          <button
            key={faq.id}
            type="button"
            className="faq-pill"
            onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
            style={{ background: activeFaq === faq.id ? 'rgba(59, 130, 246, 0.4)' : undefined, color: activeFaq === faq.id ? '#fff' : undefined, borderColor: activeFaq === faq.id ? 'var(--color-accent-blue)' : undefined }}
          >
            {faq.label} {activeFaq === faq.id ? '▲' : '▼'}
          </button>
        ))}
      </div>

      {activeFaq && (
        <div className="faq-accordion-box">
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5 }}>
            {FAQ_ITEMS.find(f => f.id === activeFaq)?.text}
          </p>
        </div>
      )}
    </div>
  );
}
