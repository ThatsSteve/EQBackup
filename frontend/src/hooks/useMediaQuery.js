/**
 * useMediaQuery.js — Fase 4: hook `useMediaQuery(name)` su window.matchMedia
 * con i valori di tokens.breakpoints (mobile: 640 / tablet: 768 / desktop: 1024).
 *
 * Disponibile per gli adattamenti JS che serviranno (il suo uso non è
 * obbligatorio in questa fase: gli adattamenti responsive avvengono via CSS).
 * Non usato da componenti finché non serve davvero.
 */

import { useEffect, useState } from 'react';
import { tokens } from '../design-tokens/tokens';

export function useMediaQuery(name) {
  const query = `(max-width: ${tokens.breakpoints[name]}px)`;
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}