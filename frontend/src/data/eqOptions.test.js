/**
 * eqOptions.test.js — Fase 4: test puri per le costanti dati (Vitest, zero DOM).
 *
 * Verifica: liste non vuote, id univoci, valori numerici validi.
 */
import { describe, it, expect } from 'vitest';
import { GENRES_LIST, BASS_OPTIONS, MIDS_OPTIONS, TREBLE_OPTIONS } from '../data/eqOptions';

describe('GENRES_LIST', () => {
  it('non è vuota e ha 9 generi', () => {
    expect(GENRES_LIST).toHaveLength(9);
  });

  it('ogni genere ha id, name, desc non vuoti', () => {
    GENRES_LIST.forEach(g => {
      expect(g.id).toBeDefined();
      expect(typeof g.id).toBe('string');
      expect(g.id.length).toBeGreaterThan(0);
      expect(g.name).toBeDefined();
      expect(typeof g.name).toBe('string');
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.desc).toBeDefined();
      expect(typeof g.desc).toBe('string');
      expect(g.desc.length).toBeGreaterThan(0);
    });
  });

  it('id sono univoci', () => {
    const ids = GENRES_LIST.map(g => g.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('include i generi attesi', () => {
    const ids = GENRES_LIST.map(g => g.id);
    expect(ids).toContain('Rock');
    expect(ids).toContain('Pop');
    expect(ids).toContain('Jazz');
    expect(ids).toContain('Hip-Hop / EDM');
    expect(ids).toContain('Classica');
    expect(ids).toContain('Metal');
    expect(ids).toContain("R&B");
    expect(ids).toContain('Acustico / Folk');
    expect(ids).toContain('Gaming / Spatial');
  });
});

describe('BASS_OPTIONS', () => {
  it('ha 4 opzioni', () => {
    expect(BASS_OPTIONS).toHaveLength(4);
  });

  it('ogni opzione ha id, title, desc, sub_bass, mid_bass numerici', () => {
    BASS_OPTIONS.forEach(opt => {
      expect(opt.id).toBeDefined();
      expect(opt.title).toBeDefined();
      expect(opt.desc).toBeDefined();
      expect(typeof opt.sub_bass).toBe('number');
      expect(typeof opt.mid_bass).toBe('number');
      expect(Number.isFinite(opt.sub_bass)).toBe(true);
      expect(Number.isFinite(opt.mid_bass)).toBe(true);
    });
  });

  it('id univoci', () => {
    const ids = BASS_OPTIONS.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('valori attesi per ogni preset', () => {
    const byId = Object.fromEntries(BASS_OPTIONS.map(o => [o.id, o]));
    expect(byId.explosive.sub_bass).toBe(4.5);
    expect(byId.explosive.mid_bass).toBe(3.5);
    expect(byId.punchy.sub_bass).toBe(2.5);
    expect(byId.punchy.mid_bass).toBe(2.0);
    expect(byId.neutral.sub_bass).toBe(0);
    expect(byId.neutral.mid_bass).toBe(0);
    expect(byId.light.sub_bass).toBe(-2.0);
    expect(byId.light.mid_bass).toBe(-1.5);
  });
});

describe('MIDS_OPTIONS', () => {
  it('ha 4 opzioni', () => {
    expect(MIDS_OPTIONS).toHaveLength(4);
  });

  it('ogni opzione ha id, title, desc, low_mids, high_mids numerici', () => {
    MIDS_OPTIONS.forEach(opt => {
      expect(opt.id).toBeDefined();
      expect(opt.title).toBeDefined();
      expect(opt.desc).toBeDefined();
      expect(typeof opt.low_mids).toBe('number');
      expect(typeof opt.high_mids).toBe('number');
      expect(Number.isFinite(opt.low_mids)).toBe(true);
      expect(Number.isFinite(opt.high_mids)).toBe(true);
    });
  });

  it('id univoci', () => {
    const ids = MIDS_OPTIONS.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('valori attesi per ogni preset', () => {
    const byId = Object.fromEntries(MIDS_OPTIONS.map(o => [o.id, o]));
    expect(byId.forward.low_mids).toBe(1.5);
    expect(byId.forward.high_mids).toBe(3.0);
    expect(byId.warm.low_mids).toBe(2.0);
    expect(byId.warm.high_mids).toBe(1.0);
    expect(byId.neutral.low_mids).toBe(0);
    expect(byId.neutral.high_mids).toBe(0);
    expect(byId.vshape.low_mids).toBe(-1.5);
    expect(byId.vshape.high_mids).toBe(-2.0);
  });
});

describe('TREBLE_OPTIONS', () => {
  it('ha 4 opzioni', () => {
    expect(TREBLE_OPTIONS).toHaveLength(4);
  });

  it('ogni opzione ha id, title, desc, presence, brilliance numerici', () => {
    TREBLE_OPTIONS.forEach(opt => {
      expect(opt.id).toBeDefined();
      expect(opt.title).toBeDefined();
      expect(opt.desc).toBeDefined();
      expect(typeof opt.presence).toBe('number');
      expect(typeof opt.brilliance).toBe('number');
      expect(Number.isFinite(opt.presence)).toBe(true);
      expect(Number.isFinite(opt.brilliance)).toBe(true);
    });
  });

  it('id univoci', () => {
    const ids = TREBLE_OPTIONS.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('valori attesi per ogni preset', () => {
    const byId = Object.fromEntries(TREBLE_OPTIONS.map(o => [o.id, o]));
    expect(byId.crystal.presence).toBe(2.5);
    expect(byId.crystal.brilliance).toBe(3.5);
    expect(byId.clear.presence).toBe(1.5);
    expect(byId.clear.brilliance).toBe(1.5);
    expect(byId.neutral.presence).toBe(0);
    expect(byId.neutral.brilliance).toBe(0);
    expect(byId.relaxed.presence).toBe(-2.0);
    expect(byId.relaxed.brilliance).toBe(-2.5);
  });
});

describe('Cross-check: tutte le liste esportate', () => {
  it('tutte e 4 le costanti sono esportate', () => {
    expect(GENRES_LIST).toBeDefined();
    expect(BASS_OPTIONS).toBeDefined();
    expect(MIDS_OPTIONS).toBeDefined();
    expect(TREBLE_OPTIONS).toBeDefined();
  });
});