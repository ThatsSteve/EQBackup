/**
 * chatPersistence.test.js — Fase 6: persistenza locale cronologia chat.
 * Storage iniettato (fake) → modulo puro, nessun window.
 */

import { describe, it, expect } from 'vitest';
import {
  CHAT_STORAGE_KEY,
  MAX_CHAT_MESSAGES,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory
} from './chatPersistence';

function fakeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _store: store
  };
}

const goodHistory = [
  { role: 'user', content: 'ciao' },
  { role: 'ai', content: 'salve!' }
];

describe('chatPersistence', () => {
  it('roundtrip salva e ricarica', () => {
    const storage = fakeStorage();
    saveChatHistory(storage, goodHistory);
    expect(loadChatHistory(storage)).toEqual(goodHistory);
  });

  it('storage mancante → null / noop senza crash', () => {
    expect(loadChatHistory(null)).toBeNull();
    expect(saveChatHistory(null, goodHistory)).toBeUndefined();
    expect(clearChatHistory(null)).toBeUndefined();
  });

  it('JSON corrotto → null (fallback al default)', () => {
    const storage = fakeStorage({ [CHAT_STORAGE_KEY]: '{not json' });
    expect(loadChatHistory(storage)).toBeNull();
  });

  it('contenuto non array o vuoto → null', () => {
    const storage = fakeStorage({ [CHAT_STORAGE_KEY]: JSON.stringify({ a: 1 }) });
    expect(loadChatHistory(storage)).toBeNull();
    storage.setItem(CHAT_STORAGE_KEY, JSON.stringify([]));
    expect(loadChatHistory(storage)).toBeNull();
  });

  it('filtra messaggi invalidi (role sconosciuto, content non stringa, vuoto)', () => {
    const storage = fakeStorage();
    saveChatHistory(storage, [
      { role: 'system', content: 'x' },
      { role: 'user', content: '' },
      { role: 'user', content: 42 },
      { role: 'user', content: 'valido' }
    ]);
    expect(loadChatHistory(storage)).toEqual([{ role: 'user', content: 'valido' }]);
  });

  it('applica il cap MAX_CHAT_MESSAGES al salvataggio', () => {
    const storage = fakeStorage();
    const big = Array.from({ length: MAX_CHAT_MESSAGES + 50 }, (_, i) => ({ role: 'user', content: `m${i}` }));
    saveChatHistory(storage, big);
    const loaded = loadChatHistory(storage);
    expect(loaded.length).toBe(MAX_CHAT_MESSAGES);
    expect(loaded[0].content).toBe('m50');
  });

  it('clearChatHistory rimuove la chiave', () => {
    const storage = fakeStorage({ [CHAT_STORAGE_KEY]: JSON.stringify(goodHistory) });
    clearChatHistory(storage);
    expect(loadChatHistory(storage)).toBeNull();
  });
});
