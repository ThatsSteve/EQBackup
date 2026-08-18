/**
 * tokens.test.js — Fase 4: test puri per i design token (Vitest, zero DOM).
 *
 * Verifica: shape sezioni non vuote, breakpoint mobile-first positivi,
 * contrasto AA (≥ 4.5:1) coppie testo-su-superficie principali,
 * tokensToCssVars genera stringa con :root e 10 alias legacy identici.
 */
import { describe, it, expect } from 'vitest';
import { tokens, luminance, contrastRatio, tokensToCssVars } from './tokens';

describe('tokens — shape e struttura', () => {
  it('tutte le sezioni principali esistono e non sono vuote', () => {
    expect(tokens.colors).toBeDefined();
    expect(Object.keys(tokens.colors).length).toBeGreaterThan(0);
    expect(tokens.gradients).toBeDefined();
    expect(tokens.typography).toBeDefined();
    expect(tokens.spacing).toBeDefined();
    expect(tokens.breakpoints).toBeDefined();
    expect(tokens.radii).toBeDefined();
    expect(tokens.shadows).toBeDefined();
    expect(tokens.blurs).toBeDefined();
    expect(tokens.motion).toBeDefined();
    expect(tokens.focus).toBeDefined();
  });

  it('breakpoints mobile-first positivi e ordinati', () => {
    const { mobile, tablet, desktop } = tokens.breakpoints;
    expect(mobile).toBeGreaterThan(0);
    expect(tablet).toBeGreaterThan(mobile);
    expect(desktop).toBeGreaterThan(tablet);
    expect(mobile).toBe(640);
    expect(tablet).toBe(768);
    expect(desktop).toBe(1024);
  });

  it('typography.display è definito (stack di sistema, zero nuove dipendenze)', () => {
    expect(tokens.typography.display).toBeDefined();
    expect(typeof tokens.typography.display).toBe('string');
    expect(tokens.typography.display.length).toBeGreaterThan(0);
  });

  it('gradient.waveform è definito (135deg cyan→blue coerente con .btn-primary)', () => {
    expect(tokens.gradients.waveform).toBe('linear-gradient(135deg, #00f0ff, #3b82f6)');
  });
});

describe('tokens — contrasto WCAG 2.1 AA (funzioni pure)', () => {
  it('luminance calcola correttamente per hex noti', () => {
    // #000000 → 0, #ffffff → 1
    expect(luminance('#000000')).toBeCloseTo(0, 5);
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
    // #f8fafc (text-main) ≈ 0.93, #07080a (bg-dark) ≈ 0.005
    expect(luminance('#f8fafc')).toBeGreaterThan(0.9);
    expect(luminance('#07080a')).toBeLessThan(0.01);
  });

  it('contrastRatio simmetrico e ≥ 1', () => {
    const r1 = contrastRatio('#fff', '#000');
    const r2 = contrastRatio('#000', '#fff');
    expect(r1).toBe(r2);
    expect(r1).toBeGreaterThanOrEqual(1);
    // bianco su nero = 21:1
    expect(r1).toBeCloseTo(21, 0);
  });

  it('text-main su bg-dark ≥ 4.5:1 (AA testo normale)', () => {
    const ratio = contrastRatio(tokens.colors.text.main, tokens.colors.bg.dark);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('text-muted su bg-dark ≥ 4.5:1 (AA testo normale)', () => {
    const ratio = contrastRatio(tokens.colors.text.muted, tokens.colors.bg.dark);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('tokensToCssVars — output CSS con alias legacy', () => {
  it('genera stringa che inizia con :root {', () => {
    const css = tokensToCssVars(tokens);
    expect(css.trim().startsWith(':root {')).toBe(true);
  });

  it('contiene tutti i 10 nomi legacy di index.css con valori identici', () => {
    const css = tokensToCssVars(tokens);
    const legacy = [
      '--bg-dark: #07080a;',
      '--bg-panel: rgba(15, 18, 25, 0.85);',
      '--text-main: #f8fafc;',
      '--text-muted: #94a3b8;',
      '--accent-blue: #3b82f6;',
      '--accent-blue-glow: rgba(59, 130, 246, 0.45);',
      '--accent-cyan: #00f0ff;',
      '--accent-cyan-glow: rgba(0, 240, 255, 0.45);',
      '--border-color: rgba(255, 255, 255, 0.08);',
      '--border-active: rgba(0, 240, 255, 0.4);'
    ];
    legacy.forEach(line => {
      expect(css).toContain(line);
    });
  });

  it('contiene i breakpoint come custom properties', () => {
    const css = tokensToCssVars(tokens);
    expect(css).toContain('--breakpoint-mobile: 640px;');
    expect(css).toContain('--breakpoint-tablet: 768px;');
    expect(css).toContain('--breakpoint-desktop: 1024px;');
  });
});