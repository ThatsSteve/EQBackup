/**
 * genreDefaults.test.js — Fase 4: test puri per mapGenresToDefaults (Vitest, zero DOM).
 *
 * Verifica i 7 mapping: hip-hop/edm, rock/metal, jazz/classica, pop/r&b,
 * acustico, gaming, default neutro.
 */
import { describe, it, expect } from 'vitest';
import { mapGenresToDefaults } from './genreDefaults';

describe('mapGenresToDefaults — hip-hop / edm', () => {
  it('hip-hop → sub-bass +4.5, mid-bass +3.5, V-shape medi/alti', () => {
    const prefs = mapGenresToDefaults(['Hip-Hop / EDM']);
    expect(prefs.sub_bass_gain).toBe(4.5);
    expect(prefs.mid_bass_gain).toBe(3.5);
    expect(prefs.low_mids_gain).toBe(-1.5);
    expect(prefs.high_mids_gain).toBe(-2.0);
    expect(prefs.presence_gain).toBe(1.5);
    expect(prefs.brilliance_gain).toBe(1.5);
  });

  it('edm (case-insensitive) stesso mapping', () => {
    const prefs = mapGenresToDefaults(['edm']);
    expect(prefs.sub_bass_gain).toBe(4.5);
    expect(prefs.mid_bass_gain).toBe(3.5);
  });
});

describe('mapGenresToDefaults — rock / metal', () => {
  it('rock → sub-bass +2.5, mid-bass +2.0, medi in avanti', () => {
    const prefs = mapGenresToDefaults(['Rock']);
    expect(prefs.sub_bass_gain).toBe(2.5);
    expect(prefs.mid_bass_gain).toBe(2.0);
    expect(prefs.low_mids_gain).toBe(1.5);
    expect(prefs.high_mids_gain).toBe(3.0);
    expect(prefs.presence_gain).toBe(0);
    expect(prefs.brilliance_gain).toBe(0);
  });

  it('metal stesso mapping', () => {
    const prefs = mapGenresToDefaults(['Metal']);
    expect(prefs.sub_bass_gain).toBe(2.5);
    expect(prefs.high_mids_gain).toBe(3.0);
  });

  it('combinazione rock+metal non raddoppia', () => {
    const prefs = mapGenresToDefaults(['Rock', 'Metal']);
    expect(prefs.sub_bass_gain).toBe(2.5);
    expect(prefs.high_mids_gain).toBe(3.0);
  });
});

describe('mapGenresToDefaults — jazz / classica', () => {
  it('jazz → medi caldi, alti dettagliati', () => {
    const prefs = mapGenresToDefaults(['Jazz']);
    expect(prefs.low_mids_gain).toBe(2.0);
    expect(prefs.high_mids_gain).toBe(1.0);
    expect(prefs.presence_gain).toBe(2.5);
    expect(prefs.brilliance_gain).toBe(3.5);
    expect(prefs.sub_bass_gain).toBe(0);
  });

  it('classica stesso mapping', () => {
    const prefs = mapGenresToDefaults(['Classica']);
    expect(prefs.low_mids_gain).toBe(2.0);
    expect(prefs.brilliance_gain).toBe(3.5);
  });
});

describe('mapGenresToDefaults — pop / r&b', () => {
  it('pop → simile a rock ma con presenza/brilliance', () => {
    const prefs = mapGenresToDefaults(['Pop']);
    expect(prefs.sub_bass_gain).toBe(2.5);
    expect(prefs.mid_bass_gain).toBe(2.0);
    expect(prefs.low_mids_gain).toBe(1.5);
    expect(prefs.high_mids_gain).toBe(3.0);
    expect(prefs.presence_gain).toBe(1.5);
    expect(prefs.brilliance_gain).toBe(1.5);
  });

  it('r&b stesso mapping', () => {
    const prefs = mapGenresToDefaults(['R&B']);
    expect(prefs.presence_gain).toBe(1.5);
    expect(prefs.brilliance_gain).toBe(1.5);
  });
});

describe('mapGenresToDefaults — acustico / folk', () => {
  it('acustico → bassi attenuati, medi intimi', () => {
    const prefs = mapGenresToDefaults(['Acustico / Folk']);
    expect(prefs.sub_bass_gain).toBe(-2.0);
    expect(prefs.mid_bass_gain).toBe(-1.5);
    expect(prefs.low_mids_gain).toBe(2.0);
    expect(prefs.high_mids_gain).toBe(1.0);
    expect(prefs.presence_gain).toBe(0);
    expect(prefs.brilliance_gain).toBe(0);
  });
});

describe('mapGenresToDefaults — gaming / spatial', () => {
  it('gaming → sub-bass + soundstage (medi arretrati, alti alti)', () => {
    const prefs = mapGenresToDefaults(['Gaming / Spatial']);
    expect(prefs.sub_bass_gain).toBe(2.5);
    expect(prefs.mid_bass_gain).toBe(2.0);
    expect(prefs.low_mids_gain).toBe(-1.5);
    expect(prefs.high_mids_gain).toBe(-2.0);
    expect(prefs.presence_gain).toBe(2.5);
    expect(prefs.brilliance_gain).toBe(3.5);
  });
});

describe('mapGenresToDefaults — default neutro', () => {
  it('genere sconosciuto → tutti gain a 0', () => {
    const prefs = mapGenresToDefaults(['Sconosciuto']);
    expect(prefs.sub_bass_gain).toBe(0);
    expect(prefs.mid_bass_gain).toBe(0);
    expect(prefs.low_mids_gain).toBe(0);
    expect(prefs.high_mids_gain).toBe(0);
    expect(prefs.presence_gain).toBe(0);
    expect(prefs.brilliance_gain).toBe(0);
  });

  it('array vuoto → tutti gain a 0', () => {
    const prefs = mapGenresToDefaults([]);
    expect(prefs.sub_bass_gain).toBe(0);
    expect(prefs.brilliance_gain).toBe(0);
  });

  it('più generi: vince il primo match nell\'ordine del codice', () => {
    // hip-hop è primo nell'if/else chain, quindi prevale su rock
    const prefs = mapGenresToDefaults(['Rock', 'Hip-Hop / EDM']);
    expect(prefs.sub_bass_gain).toBe(4.5); // hip-hop vince
  });
});

describe('mapGenresToDefaults — case-insensitive e spazi', () => {
  it('maiuscole/minuscole non contano', () => {
    const prefs1 = mapGenresToDefaults(['ROCK']);
    const prefs2 = mapGenresToDefaults(['rock']);
    const prefs3 = mapGenresToDefaults(['Rock']);
    expect(prefs1).toEqual(prefs2);
    expect(prefs2).toEqual(prefs3);
  });

  it('spazi extra non rompono il match', () => {
    const prefs = mapGenresToDefaults(['  Hip-Hop / EDM  ']);
    expect(prefs.sub_bass_gain).toBe(4.5);
  });
});