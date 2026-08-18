/**
 * EqFiltersTable.jsx — Tabella filtri parametrici dello Step 4
 * (estratto identico da App.jsx:2468-2505, pre-Fase 4).
 */
export function EqFiltersTable({ activeTabEq, baselineEqData, eqData }) {
  return (
    <div className="table-glass-container mt-4">
      <h3 className="table-title">
        {activeTabEq === 'A' ? "Filtri Parametrici Iniziali (Baseline Originale)" : "Filtri Parametrici Attuali (Con Rifinitura AI)"}
      </h3>
      <div className="eq-table-wrapper">
        <table className="eq-table">
          <thead>
            <tr>
              <th>Filtro #</th>
              <th>Tipo</th>
              <th>Freq (Hz)</th>
              <th>Gain (dB)</th>
              <th>Q-Factor</th>
            </tr>
          </thead>
          <tbody>
            {((activeTabEq === 'A' && baselineEqData) ? baselineEqData : eqData)?.filters.map((f, i) => (
              <tr key={i} style={{ background: f.isManual ? 'rgba(0, 240, 255, 0.08)' : 'transparent' }}>
                <td>{i + 1}</td>
                <td>{f.type}
                  {f.origin === 'AUTOEQ' && <span className="badge-origin badge-autoeq">AUTOEQ</span>}
                  {f.origin?.startsWith('ARTISTA') && <span className="badge-origin badge-artista">{f.origin}</span>}
                  {f.origin === 'MANUALE' && <span className="badge-origin badge-manuale">MANUALE</span>}
                </td>
                <td>{f.freq}</td>
                <td style={{ color: f.gain > 0 ? '#ff3366' : '#3b82f6' }}>
                  {f.gain > 0 ? '+' : ''}{f.gain.toFixed(2)}
                </td>
                <td>{f.q}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="preamp-footer">
         Pre-Amp Sicurezza (No Clipping): <strong>{((activeTabEq === 'A' && baselineEqData) ? baselineEqData : eqData)?.preamp.toFixed(2)} dB</strong>
      </div>
    </div>
  );
}
