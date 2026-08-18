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

/**
 * Chat streaming (Fase 6): fetch SSE su POST (EventSource non supporta POST).
 * Events: delta / done / error / proposal / ping. Ritorna una Promise che si
 * risolve quando lo stream si chiude; `onError` riceve il messaggio sanitizzato.
 */
export async function apiChatStream(body, { onDelta, onDone, onError, onProposal } = {}) {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        let evt;
        try { evt = JSON.parse(line.slice(6)); } catch { continue; }
        if (evt.type === 'delta' && onDelta) onDelta(evt.text);
        else if (evt.type === 'done' && onDone) onDone(evt);
        else if (evt.type === 'proposal' && onProposal) onProposal(evt.proposal);
        else if (evt.type === 'error' && onError) onError(evt.message);
      }
    }
  }
}