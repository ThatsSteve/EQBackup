import { useState } from 'react';

/**
 * EqCurveTable.jsx — Fase 5: vista tabellare accessibile alternativa ai grafici
 * Recharts (WCAG 2.1 AA: i dati non devono dipendere dal solo colore/grafico).
 * Il toggle è un <button> nativo (aria-pressed), la tabella ha caption, header
 * di colonna (scope="col") e header di riga (scope="row").
 */

const formatFreq = (f) => (f >= 1000 ? `${(f / 1000).toFixed(1).replace(/\.0$/, '')} kHz` : `${f} Hz`);
const formatGain = (g) => `${g > 0 ? '+' : ''}${Number(g).toFixed(2)} dB`;

const thStyle = {
  padding: '6px 10px',
  textAlign: 'right',
  color: 'var(--color-text-faint)',
  fontWeight: 700,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle = {
  padding: '4px 10px',
  fontSize: '0.8rem',
  whiteSpace: 'nowrap',
};

const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function EqCurveTable({ chartData, series, children }) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          style={{
            background: showTable ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${showTable ? 'rgba(0, 240, 255, 0.4)' : 'var(--color-border-color)'}`,
            color: showTable ? 'var(--color-accent-cyan)' : 'var(--color-text-faint)',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showTable ? '📈 Vista Grafico' : '📋 Vista Tabella'}
        </button>
      </div>

      {showTable ? (
        <div style={{ overflowX: 'auto', marginTop: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '10px 12px', border: '1px solid var(--color-border-color)' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse' }}
            aria-label="Curva EQ in formato tabellare"
          >
            <caption style={srOnly}>
              Curva EQ — {series.map((s) => s.label).join(', ')}
            </caption>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th scope="col" style={{ ...thStyle, textAlign: 'left' }}>Frequenza</th>
                {series.map((s) => (
                  <th key={s.key} scope="col" style={thStyle}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((p) => (
                <tr key={p.freq} style={{ borderBottom: '1px solid var(--color-border-color)' }}>
                  <th scope="row" style={{ ...tdStyle, textAlign: 'left', color: 'var(--color-text-faint)', fontWeight: 500 }}>
                    {formatFreq(p.freq)}
                  </th>
                  {series.map((s) => (
                    <td key={s.key} style={{ ...tdStyle, textAlign: 'right', color: s.color }}>
                      {formatGain(p[s.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </div>
  );
}