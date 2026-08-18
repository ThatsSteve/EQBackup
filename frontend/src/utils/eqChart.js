/**
 * eqChart.js — Fase 4: helper puro della curva triple (manuale/AI/baseline).
 *
 * Estratto da App.jsx:118-156 (pre-Fase 4) senza modifiche: genera 51 punti
 * logaritmici 20Hz–20kHz calcolando il gain per filtri PK/LS/HS.
 */

export function calculateTripleChartData(manualFilters, aiFilters, baselineFilters) {
  if (!manualFilters && !aiFilters && !baselineFilters) return [];
  if (!manualFilters || manualFilters.length === 0) {
    if (!aiFilters || aiFilters.length === 0) {
      if (!baselineFilters || baselineFilters.length === 0) return [];
    }
  }
  const points = [];
  const calcGain = (filters, f) => {
    if (!filters || filters.length === 0) return 0;
    let gainSum = 0;
    filters.forEach(filter => {
         if (filter.type === 'PK') {
             const octavesDist = Math.abs(Math.log2(f / filter.freq));
             const bandwidth = 1.5 / (filter.q || 1.41); 
             const influence = Math.max(0, 1 - (octavesDist / bandwidth));
             gainSum += filter.gain * Math.pow(influence, 2);
         } else if (filter.type === 'LS') {
             if (f <= filter.freq) gainSum += filter.gain;
             else {
                 const oct = Math.log2(f / filter.freq);
                 if (oct < 2) gainSum += filter.gain * Math.pow(1 - (oct/2), 2);
             }
         } else if (filter.type === 'HS') {
             if (f >= filter.freq) gainSum += filter.gain;
             else {
                 const oct = Math.log2(filter.freq / f);
                 if (oct < 2) gainSum += filter.gain * Math.pow(1 - (oct/2), 2);
             }
         }
    });
    return parseFloat(gainSum.toFixed(2));
  };

  // Generate base log grid
  for (let i = 0; i <= 50; i++) {
      const logF = 1.30103 + (i / 50) * 3;
      const f = Math.pow(10, logF);
      points.push({ freq: Math.round(f), manualGain: 0, aiGain: 0, baselineGain: 0 });
  }

  // Snap closest points to exact filter center frequencies for accurate lookup
  const snapFrequencies = [100, 1000];
  snapFrequencies.forEach(targetFreq => {
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i <= 50; i++) {
      const diff = Math.abs(points[i].freq - targetFreq);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    points[closestIdx].freq = targetFreq;
  });

  // Calculate gains for all points
  for (let i = 0; i <= 50; i++) {
      const f = points[i].freq;
      const manualGain = calcGain(manualFilters, f);
      const aiGain = calcGain(aiFilters || manualFilters, f);
      const baselineGain = calcGain(baselineFilters || aiFilters || manualFilters, f);
      points[i].manualGain = manualGain;
      points[i].aiGain = aiGain;
      points[i].baselineGain = baselineGain;
  }
  return points;
}