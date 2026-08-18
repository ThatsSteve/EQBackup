// Smoke test della Fase 0 (Governance & tooling): dimostra che l'harness
// Vitest + Supertest è attivo. NON carica ./server: farebbe partire il
// listener HTTP e testEngineAccuracy() — fuori scope in questa fase.
// Modulo CommonJS (radice del progetto): describe/it/expect sono globali
// (vitest.config.js → globals: true), supertest è caricato con require().
const supertest = require('supertest');

describe('smoke harness backend', () => {
  it('vitest esegue asserzioni banali', () => {
    expect(1 + 1).toBe(2);
  });

  it('supertest è caricabile come funzione', () => {
    expect(typeof supertest).toBe('function');
  });
});