/**
 * EqCurveTooltip.jsx — Tooltip Recharts per la curva EQ (identico a App.jsx:158-185).
 */
export function EqCurveTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const manualVal = payload.find(p => p.dataKey === 'manualGain')?.value;
    const aiVal = payload.find(p => p.dataKey === 'aiGain')?.value;
    const baselineVal = payload.find(p => p.dataKey === 'baselineGain')?.value;
    return (
      <div className="custom-tooltip" style={{ background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(0,240,255,0.3)', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <p className="label" style={{ margin: '0 0 6px 0', color: '#fff', fontWeight: 'bold' }}>{`${label} Hz`}</p>
        {manualVal !== undefined && (
          <p className="intro" style={{ margin: 0, color: '#00f0ff', fontSize: '0.9rem' }}>
            {`Manuale: ${manualVal > 0 ? '+' : ''}${manualVal} dB`}
          </p>
        )}
        {aiVal !== undefined && aiVal !== manualVal && (
          <p className="intro" style={{ margin: '4px 0 0 0', color: '#ffb142', fontSize: '0.85rem' }}>
            {`AI (Generato): ${aiVal > 0 ? '+' : ''}${aiVal} dB`}
          </p>
        )}
        {baselineVal !== undefined && baselineVal !== aiVal && (
          <p className="intro" style={{ margin: '4px 0 0 0', color: '#ff3366', fontSize: '0.85rem', opacity: 0.8 }}>
            {`Hardware (Originale): ${baselineVal > 0 ? '+' : ''}${baselineVal} dB`}
          </p>
        )}
      </div>
    );
  }
  return null;
}