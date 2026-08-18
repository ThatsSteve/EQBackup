/**
 * exporters.js — Fase 4: export dei profili EQ (Appunti / E-APO / Wavelet / JSON).
 *
 * Parti PURE estratte da App.jsx:971-1024 (pre-Fase 4), testabili senza DOM:
 *  - generateWaveletText(eqData): testo GraphicEQ a 127 bande (10Hz–20kHz)
 *  - buildPassportData(eqData, state): oggetto AudioPassport JSON
 * Wrapper DOM sottili (non testabili senza jsdom, comportamento identico):
 *  - downloadFile, downloadWavelet, downloadPassportJSON, copyToClipboard
 */

/** Puro: genera il contenuto del file Wavelet (GraphicEQ a 127 bande). */
export function generateWaveletText(eqData) {
  if (!eqData || !eqData.filters || !Array.isArray(eqData.filters)) {
    return "GraphicEQ: ";
  }
  // Generazione array GraphicEQ per Wavelet interpolando i filtri parametrici
  // a 127 bande (10Hz a 20kHz)
  const bands = [];
  for (let i = 0; i < 127; i++) {
     const freq = 10 * Math.pow(10, i * Math.log10(20000/10) / 126);
     bands.push({ freq, gainSum: 0 });
  }

  // Snap closest band to 1000 Hz for exact PK filter lookup
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < 127; i++) {
    const diff = Math.abs(bands[i].freq - 1000);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  bands[closestIdx].freq = 1000;

  let waveletContent = "GraphicEQ: ";
  for (let i = 0; i < 127; i++) {
     const freq = bands[i].freq;
     let gainSum = eqData.preamp || 0; // Wavelet gestisce il preamp nei valori stessi
     eqData.filters.forEach(filter => {
         const octavesDist = Math.abs(Math.log2(freq / filter.freq));
         if (filter.type === 'PK') {
             const bandwidth = 1.5 / (filter.q || 1.41);
             const influence = Math.max(0, 1 - (octavesDist / bandwidth));
             gainSum += filter.gain * Math.pow(influence, 2);
         } else if (filter.type === 'LS') {
             if (freq <= filter.freq) gainSum += filter.gain;
             else if (octavesDist < 2) gainSum += filter.gain * Math.pow(1 - (octavesDist/2), 2);
         } else if (filter.type === 'HS') {
             if (freq >= filter.freq) gainSum += filter.gain;
             else if (octavesDist < 2) gainSum += filter.gain * Math.pow(1 - (octavesDist/2), 2);
         }
     });
     waveletContent += `${freq.toFixed(1)} ${gainSum.toFixed(2)}; `;
  }
  return waveletContent.trim();
}

/** Puro: oggetto "AudioPassport" serializzato in JSON dal wrapper DOM. */
export function buildPassportData(eqData, state) {
  return {
      version: "1.0",
      timestamp: new Date().toISOString(),
      hardware: state.headphone,
      profile: eqData,
      state: state
  };
}

/** Wrapper DOM sottile: scarica un testo come file. */
function downloadTextFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Wrapper DOM: scarica il file E-APO (contenuto grezzo di exportRawData). */
export function downloadFile(rawData) {
  if (!rawData) return;
  downloadTextFile(rawData, 'PersonalEQ.txt', 'text/plain');
}

/** Wrapper DOM: scarica il file Wavelet generato dalle parti pure. */
export function downloadWavelet(eqData) {
  if (!eqData) return;
  downloadTextFile(generateWaveletText(eqData), 'GraphicEQ.txt', 'text/plain');
}

/** Wrapper DOM: scarica l'AudioPassport JSON. */
export function downloadPassportJSON(eqData, state) {
  if (!eqData) return;
  downloadTextFile(
    JSON.stringify(buildPassportData(eqData, state), null, 2),
    'AudioPassport.json',
    'application/json'
  );
}

/**
 * Wrapper DOM: copia un testo negli appunti e notifica via callback.
 * Il timeout di reset di `copied` resta in App (comportamento identico).
 */
export function copyToClipboard(text, onCopied) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(onCopied);
}