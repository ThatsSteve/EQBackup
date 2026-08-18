/**
 * hardening.test.js — Fase 7: error handler JSON globale, CORS ristretto,
 * rate-limit sugli endpoint verso terzi, rimozione deficit fittizi,
 * stime marcate `estimated`, README/LICENCE allineati.
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../server');

const ROOT = path.join(__dirname, '..');

describe('Fase 7 — Hardening finale', () => {
  describe('Error handler JSON globale', () => {
    it('404 per route sconosciute in JSON (mai HTML)', async () => {
      const res = await request(app).get('/api/questa-route-non-esiste');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.error).toBe('Risorsa non trovata.');
    });

    it('JSON malformato su una route JSON → 400 JSON (error handler finale)', async () => {
      const res = await request(app)
        .post('/api/chat/stream')
        .set('Content-Type', 'application/json')
        .send('{ questo non è json');
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/json');
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('CORS ristretto', () => {
    it('origine frontend autorizzata riceve Access-Control-Allow-Origin', async () => {
      const res = await request(app)
        .get('/api/engine-status')
        .set('Origin', 'http://localhost:5173');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('origine estranea viene rifiutata con 403 JSON', async () => {
      const res = await request(app)
        .get('/api/engine-status')
        .set('Origin', 'https://evil.example.com');
      expect(res.status).toBe(403);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.error).toBe('Origine non autorizzata.');
    });
  });

  describe('Rate-limit endpoint verso terzi', () => {
    it('/api/resolve-artist: 400 senza name, poi 429 oltre il budget (nessuna rete)', async () => {
      const first = await request(app).post('/api/resolve-artist').send({});
      expect(first.status).toBe(400);

      let lastStatus = 0;
      for (let i = 0; i < 35; i++) {
        const res = await request(app).post('/api/resolve-artist').send({ name: '' });
        lastStatus = res.status;
        if (res.status === 429) break;
      }
      expect(lastStatus).toBe(429);
    });

    it('/api/sync-autoeq risponde JSON su errore interno (nessuna rete)', async () => {
      const res = await request(app).get('/api/sync-autoeq');
      expect(res.status).toBe(429);
      expect(res.headers['content-type']).toContain('application/json');
    });
  });

  describe('Deficit fittizi rimossi e stime marcate', () => {
    it('knowledge_graph.json non contiene più deficit di auto-apprendimento fittizi', () => {
      const raw = fs.readFileSync(path.join(ROOT, 'engine', 'knowledge_graph.json'), 'utf8');
      expect(raw).not.toContain('compensazione_generica_auto_apprendimento');
      const graph = JSON.parse(raw);
      for (const node of graph.hardware) {
        for (const d of node.deficits || []) {
          if (d.issue) {
            expect(d.issue).not.toContain('auto_apprendimento');
          }
        }
      }
    });

    it('i nodi risolti online nel grafo sono marcati estimated', () => {
      const graph = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'engine', 'knowledge_graph.json'), 'utf8')
      );
      for (const node of graph.hardware) {
        if (node.source === 'online_web_search_auto_learning') {
          expect(node.estimated).toBe(true);
        }
      }
    });

    it('autoeqDownloader marca estimated le specifiche stimate da euristiche', () => {
      const src = fs.readFileSync(path.join(ROOT, 'engine', 'autoeqDownloader.js'), 'utf8');
      expect(src).toContain('estimated = true');
      expect(src).toContain('estimated,');
    });
  });

  describe('User-Agent MusicBrainz reale', () => {
    it('artistResolver.js non contiene più l\'email placeholder', () => {
      const src = fs.readFileSync(path.join(ROOT, 'engine', 'dspEngine', 'artistResolver.js'), 'utf8');
      expect(src).not.toContain('myemail@example.com');
      expect(src).toContain('REQUEST_TIMEOUT_MS');
    });
  });

  describe('README e LICENSE allineati', () => {
    it('README riporta 78 profili DAC/Amp e non dichiara OCR', () => {
      const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
      expect(readme).toContain('78 Profili DAC & Amplificatori');
      expect(readme).not.toContain('220+ Profili DAC');
      expect(readme).not.toContain('(OCR)');
    });

    it('esiste un file LICENSE MIT', () => {
      const license = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
      expect(license).toContain('MIT License');
      expect(license).toContain('Copyright (c) 2026');
    });
  });
});