// Smoke test frontend della Fase 0: dimostra che l'harness Vitest è attivo.
// Nessun jsdom/happy-dom in questa fase: non ci sono ancora componenti da testare.
import { describe, it, expect } from 'vitest';

describe('smoke harness frontend', () => {
  it('vitest esegue asserzioni banali in ESM', () => {
    expect([1, 2, 3].map((n) => n * 2)).toEqual([2, 4, 6]);
  });
});