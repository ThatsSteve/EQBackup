// Test E2E della Fase 1 (Stabilizzazione critica della pipeline backend).
// Demonstra end-to-end via HTTP su POST /api/calculate-eq:
//   hardware + 2 artisti  ->  curva EQ non vuota e coerente con i guardrails.
//
// REQUISITI:
// - Deterministico e OFFLINE: nessuna chiamata a rete esterna.
//   * artisti (daft_punk, hans_zimmer) presenti nel grafo locale con
//     recommended_modifiers -> nessuna ingestion da iTunes/MusicBrainz;
//   * hardware che NON matcha in engine/autoeq_db.json -> fetchHeadphoneProfile
//     cade sul fallback locale dummy_autoeq.txt (nessun fetch AutoEq remoto);
//   * LM Studio non viene contattato (profilo wizard 'local-graph', Fase 1).
// - destination: 'clipboard' -> il test non scrive MAI su Equalizer APO.
//
// Modulo CommonJS (root): describe/it/expect sono globali (vitest.config.js).
const supertest = require('supertest');
const app = require('../server');

describe('Fase 1 — E2E POST /api/calculate-eq (deterministico, OFFLINE)', () => {
  it('hardware + daft_punk + hans_zimmer produce una curva EQ valida e coerente', async () => {
    const res = await supertest(app)
      .post('/api/calculate-eq')
      .send({
        state: {
          headphone: 'acme test hp 9000',
          targetCurve: 'Harman',
          selectedArtists: ['daft_punk', 'hans_zimmer'],
          selectedGenres: [],
          bass: 'neutro',
          mids: 'piatte',
          treble: 'smooth'
        },
        destination: 'clipboard'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const payload = res.body.payload;
    expect(payload).toBeDefined();

    // Curva non vuota
    expect(Array.isArray(payload.filters)).toBe(true);
    expect(payload.filters.length).toBeGreaterThan(0);

    // Guardrails fisici: gain [-12, +9] dB, Q [0.5, 3.5]
    for (const f of payload.filters) {
      expect(f.gain).toBeGreaterThanOrEqual(-12.0);
      expect(f.gain).toBeLessThanOrEqual(9.0);
      if (f.q !== undefined) {
        expect(f.q).toBeGreaterThanOrEqual(0.5);
        expect(f.q).toBeLessThanOrEqual(3.5);
      }
    }

    // Preamp mai positivo
    expect(payload.preamp).toBeLessThanOrEqual(0);

    // Il profilo ponderato artisti deve raggiungere il calcolo:
    // almeno un filtro deve avere origin contenente ARTISTA.
    const artistFilters = payload.filters.filter(f => String(f.origin || '').includes('ARTISTA'));
    expect(artistFilters.length).toBeGreaterThan(0);
  });
});