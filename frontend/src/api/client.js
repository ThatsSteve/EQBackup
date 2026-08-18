/**
 * client.js — Fase 4: unico host di rete del frontend (Fase 2 §3.1).
 *
 * `API_BASE = 'http://localhost:3001'`: TUTTI i fetch del frontend usano
 * `${API_BASE}/api/...` (18 occorrenze in App.jsx + 4 in OnboardingAiStep
 * pre-Fase 4, spostate nei rispettivi moduli). Mai fetch verso provider
 * esterni o locali dal browser. Header/body identici a oggi.
 */

export const API_BASE = 'http://localhost:3001';

/** GET con lo stesso comportamento dell'originale (response non parsata). */
export function apiGet(path) {
  return fetch(`${API_BASE}${path}`);
}

/** POST JSON con gli stessi header/body di oggi. */
export function apiPost(path, body) {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}