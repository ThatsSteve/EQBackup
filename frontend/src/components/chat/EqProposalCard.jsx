/**
 * EqProposalCard.jsx — Fase 6: proposta di modifica EQ della chat IA
 * mostrata come diff accettabile/rifiutabile. MAI applicata in automatico:
 * l'applicazione avviene solo con "Applica" (setEqData) o si chiude con
 * "Rifiuta". Differenza mostrata come tabella filtro per filtro (prima/ora).
 */

import { useState } from 'react';

function formatGain(g) {
  const v = typeof g === 'number' ? g : Number(g || 0);
  return `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;
}

function filterLabel(f) {
  const type = (f.type || 'PEQ').toUpperCase();
  const freq = typeof f.freq === 'number' ? f.freq : Number(f.freq || 0);
  return `${type} ${freq >= 1000 ? `${(freq / 1000).toFixed(2)}kHz` : `${freq}Hz`}`;
}

export function EqProposalCard({ currentFilters, proposal, onAccept, onReject }) {
  const [applied, setApplied] = useState(false);

  const current = Array.isArray(currentFilters) ? currentFilters : [];
  const next = Array.isArray(proposal?.filters) ? proposal.filters : [];

  const diffRows = next.map((f) => {
    const before = current.find((c) => c.type === f.type && c.freq === f.freq);
    const beforeGain = before ? before.gain : 0;
    return {
      label: filterLabel(f),
      before: formatGain(beforeGain),
      after: formatGain(f.gain),
      changed: Math.abs((before ? before.gain : 0) - f.gain) > 0.01,
      gain: f.gain
    };
  });

  const appliedCount = applied ? next.length : 0;

  return (
    <div
      role="group"
      aria-label="Proposta di modifica EQ dalla chat"
      style={{
        marginTop: '10px',
        padding: '12px',
        borderRadius: '12px',
        border: '1px solid rgba(0, 240, 255, 0.35)',
        background: 'rgba(0, 240, 255, 0.06)',
        color: '#fff'
      }}
    >
      <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '8px' }}>
        {applied ? '✔ Proposta applicata' : 'Proposta di modifica EQ (non applicata)'}
      </div>
      {!applied && (
        <table
          aria-label="Differenza tra curva attuale e proposta"
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}
        >
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--color-text-subtle)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
              <th scope="col" style={{ padding: '4px 6px' }}>Filtro</th>
              <th scope="col" style={{ padding: '4px 6px' }}>Attuale</th>
              <th scope="col" style={{ padding: '4px 6px' }}>Proposta</th>
            </tr>
          </thead>
          <tbody>
            {diffRows.map((row, i) => (
              <tr key={`${row.label}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td scope="row" style={{ padding: '4px 6px', color: 'var(--color-text-muted)' }}>{row.label}</td>
                <td style={{ padding: '4px 6px', color: 'var(--color-text-muted)' }}>{row.before}</td>
                <td style={{ padding: '4px 6px', fontWeight: row.changed ? '700' : '400', color: row.changed ? '#00f0ff' : 'var(--color-text-subtle)' }}>
                  {row.after}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!applied && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => {
              setApplied(true);
              if (onAccept) onAccept(next);
            }}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #00f0ff',
              background: 'rgba(0, 240, 255, 0.15)',
              color: '#00f0ff',
              fontWeight: '600',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Applica proposta
          </button>
          <button
            type="button"
            onClick={onReject}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              fontWeight: '600',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Rifiuta
          </button>
        </div>
      )}
      {applied && appliedCount > 0 && (
        <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '4px' }}>
          {appliedCount} filtri aggiornati.
        </div>
      )}
    </div>
  );
}

export default EqProposalCard;
