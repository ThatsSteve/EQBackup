/**
 * tokens.js — Fase 4: design token centralizzati (unica sorgente di verità).
 *
 * Modulo PURAMENTE ES (testabile con Vitest senza DOM). Raccoglie i valori
 * realmente in uso nell'app (index.css `:root`, classi riusabili, stili inline
 * di App.jsx/componenti) senza inventare palette nuove: la Fase 5 farà il
 * restyling completo partendo da qui.
 *
 * `tokensToCssVars(tokens)` genera la stringa `:root { ... }` che include gli
 * alias con i 10 nomi legacy di index.css (--bg-dark, --text-muted, ecc.)
 * con valori IDENTICI a oggi: App.css, AudioPlayerAB.jsx, OnboardingAiStep.css
 * e gli inline in App.jsx li usano; rimuoverli romperebbe la resa.
 */

export const tokens = {
  colors: {
    // Superfici / vetro con livelli di profondità (valori reali dell'app).
    bg: {
      dark: '#07080a',                    // --bg-dark (body, sfondo base)
      panel: 'rgba(15, 18, 25, 0.85)',    // --bg-panel (glass-panel, pannelli)
      panelSolid: 'rgba(14, 16, 22, 0.85)', // .main-wizard (App.css)
      inputField: '#13131f',              // input hardware (inline)
      inputSurface: '#0c1016'             // timeline-node-btn / select (inline)
    },
    text: {
      main: '#f8fafc',                    // --text-main
      muted: '#94a3b8',                   // --text-muted
      subtle: '#888',
      faint: '#aaa'
    },
    accent: {
      blue: '#3b82f6',                    // --accent-blue
      'blue-glow': 'rgba(59, 130, 246, 0.45)', // --accent-blue-glow
      cyan: '#00f0ff',                    // --accent-cyan
      'cyan-glow': 'rgba(0, 240, 255, 0.45)'   // --accent-cyan-glow
    },
    border: {
      color: 'rgba(255, 255, 255, 0.08)', // --border-color
      active: 'rgba(0, 240, 255, 0.4)'    // --border-active
    },
    // Semantici (già in uso nell'app, non inventati).
    semantic: {
      success: '#00ff87',                 // badge "Ascolto Live", toggle Live Sync
      successAlt: '#10b981',              // engine badge LM Studio, RESOLVED_ONLINE
      warning: '#ffb142',                 // badge Data-Driven, AI parametrico
      warningAlt: '#ffa500',              // Undo, #ff9900 badge-origin affine
      danger: '#ff3366',                  // punto luce 3D, AI chat avatar, curva baseline
      error: '#ff4757'                    // .error-text, rimozione artisti
    },
    // Bande timbriche step 3 (analytical tuning).
    timbre: {
      bass: '#ff416c',
      mids: '#d452d1',
      treble: '#00ff87'
    }
  },

  gradients: {
    // Accento a gradiente ispirato alla forma d'onda — coerente con
    // .timeline-track-fill e .btn-primary "export" (135deg cyan→blue).
    waveform: 'linear-gradient(135deg, #00f0ff, #3b82f6)',
    // Gradiente testuale di .title (index.css:82).
    textTitle: 'linear-gradient(135deg, #ffffff 0%, #00f0ff 50%, #3b82f6 100%)'
  },

  typography: {
    // Sans tecnico per UI (stack attuale di index.css:17, identico).
    ui: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    // Display per i titoli: stack di sistema (nessun font caricato, zero nuove
    // dipendenze — DA CHIARIRE 2 del prompt). Fallback sul sans attuale → resa invariata.
    display: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    },
    sizes: {
      xs: '0.75rem',
      sm: '0.85rem',
      base: '0.9rem',
      md: '1rem',
      lg: '1.15rem',
      xl: '1.2rem',
      title: '1.8rem',    // .step-title (index.css:254)
      hero: '2.2rem'      // .title (index.css:78)
    }
  },

  spacing: {
    // Scala reale in uso (gap 8/10/12/14/16/20/24).
    gap: { xxs: 8, xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24 },
    // Padding reali (14/16/20/24/32/48).
    pad: { sm: 14, md: 16, lg: 20, xl: 24, xxl: 32, hero: 48 }
  },

  // Unica sorgente di verità per i breakpoint: nessuna NUOVA media query con
  // valori diversi da questi (le esistenti 500/640/768/900 non si toccano in Fase 4).
  breakpoints: {
    mobile: 640,
    tablet: 768,
    desktop: 1024
  },

  radii: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px'
  },

  shadows: {
    // Profondità riprendendo i box-shadow reali.
    panel: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 45px rgba(0, 240, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)', // .glass-panel
    card: '0 8px 20px rgba(0, 0, 0, 0.4)', // .option-card
    glowCyan: '0 8px 30px rgba(0, 240, 255, 0.4)'
  },

  blurs: {
    glass: '28px', // .glass-panel / .main-wizard
    soft: '12px'
  },

  motion: {
    durations: { fast: '0.2s', base: '0.3s', slow: '0.4s' },
    easings: {
      standard: 'cubic-bezier(0.16, 1, 0.3, 1)', // timeline / option-card
      easeOut: 'easeOut'
    },
    // Rispetto preferisce-movimento ridotto: query tokenizzata per Fase 5.
    reducedMotion: 'prefers-reduced-motion'
  },

  focus: {
    // Stato di focus visibile (WCAG 2.4.7): spessore/colore/offset standard.
    width: '2px',
    color: '#00f0ff',
    offset: '2px'
  }
};

/**
 * Luminanza relativa di un colore hex (#rgb/#rrggbb), formula WCAG 2.1 §1.4.3.
 * Pura, nessun DOM.
 */
export function luminance(hex) {
  const raw = String(hex).replace('#', '').trim();
  const full = raw.length === 3
    ? raw.split('').map((c) => c + c).join('')
    : raw.padEnd(6, '0').slice(0, 6);
  const toLin = (v) => {
    const c = parseInt(v, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * toLin(full.slice(0, 2)) +
    0.7152 * toLin(full.slice(2, 4)) +
    0.0722 * toLin(full.slice(4, 6))
  );
}

/**
 * Rapporto di contrasto WCAG 2.1 tra due colori hex (≥ 4.5:1 = AA per testo normale).
 */
export function contrastRatio(hexA, hexB) {
  const l1 = luminance(hexA);
  const l2 = luminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Genera la stringa `:root { ... }` completa per le custom properties,
 * incluse le variabili semantiche derivate dalla struttura e gli alias
 * con i 10 nomi legacy di index.css (valori identici a oggi).
 */
export function tokensToCssVars(tokens) {
  const lines = [];
  const push = (name, value) => lines.push(`  ${name}: ${value};`);

  const flatten = (obj, prefix) => {
    Object.entries(obj).forEach(([key, value]) => {
      const name = prefix ? `${prefix}-${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value, name);
      } else {
        push(`--${name}`, value);
      }
    });
  };

  flatten(tokens.colors, 'color');
  flatten(tokens.gradients, 'gradient');
  flatten(tokens.typography, 'font');
  flatten(tokens.spacing, 'space');
  flatten(tokens.radii, 'radius');
  flatten(tokens.shadows, 'shadow');
  flatten(tokens.blurs, 'blur');
  flatten(tokens.motion, 'motion');
  flatten(tokens.focus, 'focus');
  push('--breakpoint-mobile', `${tokens.breakpoints.mobile}px`);
  push('--breakpoint-tablet', `${tokens.breakpoints.tablet}px`);
  push('--breakpoint-desktop', `${tokens.breakpoints.desktop}px`);

  // --- Alias legacy: i 10 nomi di index.css `:root` di oggi, valori identici ---
  push('--bg-dark', tokens.colors.bg.dark);
  push('--bg-panel', tokens.colors.bg.panel);
  push('--text-main', tokens.colors.text.main);
  push('--text-muted', tokens.colors.text.muted);
  push('--accent-blue', tokens.colors.accent.blue);
  push('--accent-blue-glow', tokens.colors.accent['blue-glow']);
  push('--accent-cyan', tokens.colors.accent.cyan);
  push('--accent-cyan-glow', tokens.colors.accent['cyan-glow']);
  push('--border-color', tokens.colors.border.color);
  push('--border-active', tokens.colors.border.active);

  return `:root {\n${lines.join('\n')}\n}`;
}

export default tokens;