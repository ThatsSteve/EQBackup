/**
 * eqChart.test.js — Fase 4: test puri per calculateTripleChartData (Vitest, zero DOM).
 *
 * Verifica: input nulli → [], 51 punti logaritmici 20Hz–20kHz,
 * output con freq/manualGain/aiGain/baselineGain, calcolo PK/LS/HS.
 */
import { describe, it, expect } from 'vitest';
import { calculateTripleChartData } from './eqChart';

describe('calculateTripleChartData — input nulli', () => {
  it('restituisce array vuoto se tutti i filtri sono null/undefined', () => {
    expect(calculateTripleChartData(null, null, null)).toEqual([]);
    expect(calculateTripleChartData(undefined, undefined, undefined)).toEqual([]);
    expect(calculateTripleChartData([], [], [])).toEqual([]);
  });

  it('restituisce array vuoto se manualFilters è null e gli altri pure', () => {
    expect(calculateTripleChartData(null, [], [])).toEqual([]);
  });
});

describe('calculateTripleChartData — output shape', () => {
  it('restituisce 51 punti (indici 0-50)', () => {
    const pkFilter = { type: 'PK', freq: 1000, gain: 5, q: 1.41 };
    const points = calculateTripleChartData([pkFilter], null, null);
    expect(points).toHaveLength(51);
  });

  it('ogni punto ha freq, manualGain, aiGain, baselineGain', () => {
    const pkFilter = { type: 'PK', freq: 1000, gain: 5, q: 1.41 };
    const points = calculateTripleChartData([pkFilter], null, null);
    points.forEach(p => {
      expect(p).toHaveProperty('freq');
      expect(p).toHaveProperty('manualGain');
      expect(p).toHaveProperty('aiGain');
      expect(p).toHaveProperty('baselineGain');
      expect(typeof p.freq).toBe('number');
      expect(typeof p.manualGain).toBe('number');
    });
  });

  it('freq sono interi arrotondati, logaritmici 20Hz–20kHz', () => {
    const pkFilter = { type: 'PK', freq: 1000, gain: 5, q: 1.41 };
    const points = calculateTripleChartData([pkFilter], null, null);
    expect(points[0].freq).toBe(20);
    expect(points[50].freq).toBe(20000);
    // Verifica progressione logaritmica (non lineare)
    expect(points[1].freq).toBeGreaterThan(points[0].freq);
    expect(points[25].freq).toBeGreaterThan(points[10].freq);
  });
});

describe('calculateTripleChartData — filtri PK (Peak/Bell)', () => {
  it('gain positivo al centro frequenza', () => {
    const pkFilter = { type: 'PK', freq: 1000, gain: 6, q: 1.41 };
    const points = calculateTripleChartData([pkFilter], null, null);
    // Find closest point to 1000 Hz (log grid doesn't have exact 1000)
    const at1k = points.reduce((closest, p) => Math.abs(p.freq - 1000) < Math.abs(closest.freq - 1000) ? p : closest);
    expect(at1k.manualGain).toBeCloseTo(6, 1);
  });

  it('gain decade lontano dalla frequenza centrale', () => {
    const pkFilter = { type: 'PK', freq: 1000, gain: 6, q: 1.41 };
    const points = calculateTripleChartData([pkFilter], null, null);
    const at20 = points.find(p => p.freq === 20);
    const at20k = points.find(p => p.freq === 20000);
    expect(Math.abs(at20.manualGain)).toBeLessThan(0.5);
    expect(Math.abs(at20k.manualGain)).toBeLessThan(0.5);
  });

  it('gain negativo funziona simmetricamente', () => {
    const pkFilter = { type: 'PK', freq: 1000, gain: -6, q: 1.41 };
    const points = calculateTripleChartData([pkFilter], null, null);
    const at1k = points.reduce((closest, p) => Math.abs(p.freq - 1000) < Math.abs(closest.freq - 1000) ? p : closest);
    expect(at1k.manualGain).toBeCloseTo(-6, 1);
  });

  it('Q più alto = campana più stretta', () => {
    const narrowQ = { type: 'PK', freq: 1000, gain: 6, q: 4 };
    const wideQ = { type: 'PK', freq: 1000, gain: 6, q: 0.7 };
    const narrowPoints = calculateTripleChartData([narrowQ], null, null);
    const widePoints = calculateTripleChartData([wideQ], null, null);
    const at500 = narrowPoints.reduce((closest, p) => Math.abs(p.freq - 500) < Math.abs(closest.freq - 500) ? p : closest);
    const at500w = widePoints.reduce((closest, p) => Math.abs(p.freq - 500) < Math.abs(closest.freq - 500) ? p : closest);
    // Q alto = meno influenza a 500Hz (un'ottava sotto)
    expect(Math.abs(at500.manualGain)).toBeLessThan(Math.abs(at500w.manualGain));
  });
});

describe('calculateTripleChartData — filtri LS (Low Shelf)', () => {
  it('gain costante sotto freq di taglio', () => {
    const lsFilter = { type: 'LS', freq: 200, gain: 4 };
    const points = calculateTripleChartData([lsFilter], null, null);
    const at50 = points.reduce((closest, p) => Math.abs(p.freq - 50) < Math.abs(closest.freq - 50) ? p : closest);
    const at100 = points.reduce((closest, p) => Math.abs(p.freq - 100) < Math.abs(closest.freq - 100) ? p : closest);
    expect(at50.manualGain).toBeCloseTo(4, 1);
    expect(at100.manualGain).toBeCloseTo(4, 1);
  });

  it('gain decade sopra freq di taglio (entro 2 ottave)', () => {
    const lsFilter = { type: 'LS', freq: 200, gain: 4 };
    const points = calculateTripleChartData([lsFilter], null, null);
    const at800 = points.reduce((closest, p) => Math.abs(p.freq - 800) < Math.abs(closest.freq - 800) ? p : closest);
    expect(Math.abs(at800.manualGain)).toBeLessThan(0.5);
  });
});

describe('calculateTripleChartData — filtri HS (High Shelf)', () => {
  it('gain costante sopra freq di taglio', () => {
    const hsFilter = { type: 'HS', freq: 5000, gain: 3 };
    const points = calculateTripleChartData([hsFilter], null, null);
    const at10k = points.reduce((closest, p) => Math.abs(p.freq - 10000) < Math.abs(closest.freq - 10000) ? p : closest);
    const at20k = points.find(p => p.freq === 20000);
    expect(at10k.manualGain).toBeCloseTo(3, 1);
    expect(at20k.manualGain).toBeCloseTo(3, 1);
  });

  it('gain decade sotto freq di taglio (entro 2 ottave)', () => {
    const hsFilter = { type: 'HS', freq: 5000, gain: 3 };
    const points = calculateTripleChartData([hsFilter], null, null);
    const at1250 = points.reduce((closest, p) => Math.abs(p.freq - 1250) < Math.abs(closest.freq - 1250) ? p : closest);
    expect(Math.abs(at1250.manualGain)).toBeLessThan(0.5);
  });
});

describe('calculateTripleChartData — tre curve (manual/ai/baseline)', () => {
  it('aiGain usa aiFilters se presente, altrimenti manualFilters', () => {
    const manual = { type: 'PK', freq: 1000, gain: 6, q: 1.41 };
    const ai = { type: 'PK', freq: 1000, gain: 3, q: 1.41 };
    const points = calculateTripleChartData([manual], [ai], null);
    const at1k = points.reduce((closest, p) => Math.abs(p.freq - 1000) < Math.abs(closest.freq - 1000) ? p : closest);
    expect(at1k.manualGain).toBeCloseTo(6, 1);
    expect(at1k.aiGain).toBeCloseTo(3, 1);
  });

  it('baselineGain usa baselineFilters se presente, altrimenti aiFilters o manualFilters', () => {
    const manual = { type: 'PK', freq: 1000, gain: 6, q: 1.41 };
    const ai = { type: 'PK', freq: 1000, gain: 3, q: 1.41 };
    const base = { type: 'PK', freq: 1000, gain: 1, q: 1.41 };
    const points = calculateTripleChartData([manual], [ai], [base]);
    const at1k = points.reduce((closest, p) => Math.abs(p.freq - 1000) < Math.abs(closest.freq - 1000) ? p : closest);
    expect(at1k.baselineGain).toBeCloseTo(1, 1);
  });

  it('fallback chain: baseline → ai → manual', () => {
    const manual = { type: 'PK', freq: 1000, gain: 6, q: 1.41 };
    const points = calculateTripleChartData([manual], null, null);
    const at1k = points.reduce((closest, p) => Math.abs(p.freq - 1000) < Math.abs(closest.freq - 1000) ? p : closest);
    expect(at1k.aiGain).toBeCloseTo(6, 1);
    expect(at1k.baselineGain).toBeCloseTo(6, 1);
  });
});

describe('calculateTripleChartData — sommatoria filtri multipli', () => {
  it('somma i gain di filtri multipli alla stessa frequenza', () => {
    const filters = [
      { type: 'PK', freq: 1000, gain: 3, q: 1.41 },
      { type: 'PK', freq: 1000, gain: 2, q: 1.41 }
    ];
    const points = calculateTripleChartData(filters, null, null);
    const at1k = points.reduce((closest, p) => Math.abs(p.freq - 1000) < Math.abs(closest.freq - 1000) ? p : closest);
    expect(at1k.manualGain).toBeCloseTo(5, 1);
  });

  it('filtri a frequenze diverse si sommano correttamente', () => {
    const filters = [
      { type: 'PK', freq: 100, gain: 4, q: 1.41 },
      { type: 'PK', freq: 1000, gain: 3, q: 1.41 },
      { type: 'LS', freq: 200, gain: 2 }
    ];
    const points = calculateTripleChartData(filters, null, null);
    const at100 = points.reduce((closest, p) => Math.abs(p.freq - 100) < Math.abs(closest.freq - 100) ? p : closest);
    expect(at100.manualGain).toBeCloseTo(4 + 2, 1); // PK 100Hz + LS 200Hz
  });
});