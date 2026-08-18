/**
 * chatReducer.test.js — Fase 6: azioni chat del reducer
 * (CLEAR_CHAT, RELOAD_CHAT, cap APPEND_CHAT). File nuovo:
 * non modifica eqReducer.test.js esistente.
 */

import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './eqReducer';

const base = { ...initialState, chatHistory: [{ role: 'ai', content: 'benvenuto' }] };

describe('reducer chat (Fase 6)', () => {
  it('APPEND_CHAT accoda e rispetta il cap di 100 messaggi', () => {
    let s = { ...base, chatHistory: [] };
    for (let i = 0; i < 105; i++) {
      s = reducer(s, { type: 'APPEND_CHAT', payload: { role: 'user', content: `m${i}` } });
    }
    expect(s.chatHistory.length).toBe(100);
    expect(s.chatHistory[0].content).toBe('m5');
  });

  it('CLEAR_CHAT svuota la cronologia', () => {
    const s = reducer(base, { type: 'CLEAR_CHAT' });
    expect(s.chatHistory).toEqual([]);
  });

  it('RELOAD_CHAT sostituisce la cronologia se array', () => {
    const s = reducer(base, { type: 'RELOAD_CHAT', payload: [{ role: 'user', content: 'x' }] });
    expect(s.chatHistory).toEqual([{ role: 'user', content: 'x' }]);
  });

  it('RELOAD_CHAT con payload non array lascia invariato', () => {
    const s = reducer(base, { type: 'RELOAD_CHAT', payload: 'nope' });
    expect(s.chatHistory).toEqual(base.chatHistory);
  });
});
