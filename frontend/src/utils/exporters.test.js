/**
 * exporters.test.js — Fase 4: test puri per exporters (Vitest, zero DOM).
 *
 * Parti pure: generateWaveletText (127 bande 10-20kHz, stringa "GraphicEQ:"),
 * buildPassportData (shape e campi). Wrapper DOM non testati qui (richiedono jsdom).
 */
import { describe, it, expect } from 'vitest';
import { generateWaveletText, buildPassportData } from './exporters';

describe('generateWaveletText — output shape', () => {
  const mockEqData = {
    preamp: -4.5,
    filters: [
      { type: 'PK', freq: 1000, gain: 3, q: 1.41 },
      { type: 'LS', freq: 200, gain: 2 },
      { type: 'HS', freq: 8000, gain: 1.5 }
    ]
  };

  it('restituisce stringa che inizia con "GraphicEQ:"', () => {
    const text = generateWaveletText(mockEqData);
    expect(text.startsWith('GraphicEQ:')).toBe(true);
  });

  it('contiene esattamente 127 bande (coppie freq gain)', () => {
    const text = generateWaveletText(mockEqData);
    // Formato: "GraphicEQ: freq1 gain1; freq2 gain2; ..."
    const parts = text.replace('GraphicEQ:', '').trim().split(';');
    // L'ultimo split dopo l'ultimo ';' può dare stringa vuota
    const bands = parts.filter(p => p.trim().length > 0);
    expect(bands).toHaveLength(127);
  });

  it('frequenze vanno da ~10Hz a ~20000Hz (logaritmiche)', () => {
    const text = generateWaveletText(mockEqData);
    const parts = text.replace('GraphicEQ:', '').trim().split(';');
    const firstBand = parts[0].trim().split(' ');
    const lastBand = parts[126].trim().split(' ');
    expect(parseFloat(firstBand[0])).toBeCloseTo(10, 0);
    expect(parseFloat(lastBand[0])).toBeCloseTo(20000, 0);
  });

  it('gain include preamp di base', () => {
    const text = generateWaveletText(mockEqData);
    const parts = text.replace('GraphicEQ:', '').trim().split(';');
    const firstBand = parts[0].trim().split(' ');
    const gain = parseFloat(firstBand[1]);
    // A 10Hz i filtri PK/HS non influenzano, solo LS (200Hz) e preamp
    // LS a 10Hz (< 200Hz) = +2dB, preamp = -4.5dB → -2.5dB
    expect(gain).toBeCloseTo(-2.5, 1);
  });

  it('formato: ogni banda "freq gain;" con gain a 2 decimali', () => {
    const text = generateWaveletText(mockEqData);
    const bands = text.replace('GraphicEQ:', '').trim().split(';').filter(b => b.trim());
    bands.forEach(band => {
      const [freq, gain] = band.trim().split(' ');
      expect(parseFloat(freq)).toBeGreaterThan(0);
      expect(parseFloat(gain)).toBeDefined();
      // Gain ha 2 decimali
      expect(gain).toMatch(/^-?\d+\.\d{2}$/);
    });
  });

  it('frequenze strettamente crescenti', () => {
    const text = generateWaveletText(mockEqData);
    const bands = text.replace('GraphicEQ:', '').trim().split(';').filter(b => b.trim());
    const freqs = bands.map(b => parseFloat(b.trim().split(' ')[0]));
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]).toBeGreaterThan(freqs[i - 1]);
    }
  });
});

describe('generateWaveletText — calcolo filtri', () => {
  it('filtro PK al centro → gain = preamp + pkGain', () => {
    const eqData = {
      preamp: -3,
      filters: [{ type: 'PK', freq: 1000, gain: 6, q: 1.41 }]
    };
    const text = generateWaveletText(eqData);
    const parts = text.replace('GraphicEQ:', '').trim().split(';');
    // Find closest band to 1000 Hz (127-band log grid: closest is ~980 Hz at index 76)
    const at1k = parts.reduce((closest, p) => {
      const f = parseFloat(p.trim().split(' ')[0]);
      return Math.abs(f - 1000) < Math.abs(closest.freq - 1000) ? { freq: f, gain: parseFloat(p.trim().split(' ')[1]) } : closest;
    }, { freq: 0, gain: 0 });
    expect(at1k.gain).toBeCloseTo(3, 1); // -3 + 6 = 3
  });

  it('filtro LS sotto taglio → gain = preamp + lsGain', () => {
    const eqData = {
      preamp: -2,
      filters: [{ type: 'LS', freq: 200, gain: 4 }]
    };
    const text = generateWaveletText(eqData);
    const parts = text.replace('GraphicEQ:', '').trim().split(';');
    const at50 = parts[0].trim().split(' '); // ~10Hz
    const gain = parseFloat(at50[1]);
    expect(gain).toBeCloseTo(2, 1); // -2 + 4 = 2
  });

  it('filtro HS sopra taglio → gain = preamp + hsGain', () => {
    const eqData = {
      preamp: -1,
      filters: [{ type: 'HS', freq: 5000, gain: 3 }]
    };
    const text = generateWaveletText(eqData);
    const parts = text.replace('GraphicEQ:', '').trim().split(';');
    const at20k = parts[126].trim().split(' '); // ~20kHz
    const gain = parseFloat(at20k[1]);
    expect(gain).toBeCloseTo(2, 1); // -1 + 3 = 2
  });

  it('filtri multipli si sommano', () => {
    const eqData = {
      preamp: 0,
      filters: [
        { type: 'PK', freq: 1000, gain: 3, q: 1.41 },
        { type: 'PK', freq: 1000, gain: 2, q: 1.41 }
      ]
    };
    const text = generateWaveletText(eqData);
    const parts = text.replace('GraphicEQ:', '').trim().split(';');
    const at1k = parts.reduce((closest, p) => {
      const f = parseFloat(p.trim().split(' ')[0]);
      return Math.abs(f - 1000) < Math.abs(closest.freq - 1000) ? { freq: f, gain: parseFloat(p.trim().split(' ')[1]) } : closest;
    }, { freq: 0, gain: 0 });
    expect(at1k.gain).toBeCloseTo(5, 1);
  });
});

describe('buildPassportData — shape e campi', () => {
  const mockEqData = {
    preamp: -4.5,
    filters: [{ type: 'PK', freq: 1000, gain: 3, q: 1.41 }]
  };
  const mockState = {
    step: 4,
    setupMode: 'analytical',
    headphone: 'HD600',
    targetCurve: 'harman',
    selectedGenres: ['Rock'],
    selectedArtists: ['artist1']
  };

  it('restituisce oggetto con version, timestamp, hardware, profile, state', () => {
    const data = buildPassportData(mockEqData, mockState);
    expect(data).toHaveProperty('version', '1.0');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('hardware', 'HD600');
    expect(data).toHaveProperty('profile', mockEqData);
    expect(data).toHaveProperty('state', mockState);
  });

  it('timestamp è ISO string valida', () => {
    const data = buildPassportData(mockEqData, mockState);
    expect(() => new Date(data.timestamp)).not.toThrow();
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });

  it('profile è riferimento allo stesso oggetto eqData', () => {
    const data = buildPassportData(mockEqData, mockState);
    expect(data.profile).toBe(mockEqData);
  });

  it('state è riferimento allo stesso oggetto state', () => {
    const data = buildPassportData(mockEqData, mockState);
    expect(data.state).toBe(mockState);
  });
});