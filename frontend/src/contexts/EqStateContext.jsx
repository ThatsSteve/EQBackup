/**
 * EqStateContext.jsx — Fase 4: context React che sostituisce il
 * `useReducer(reducer, initialState)` di App.jsx:659.
 *
 * Espone `useEqState()` → { state, dispatch }. La semantica di `state.step`
 * (0-4) e di ogni campo del reducer NON cambia rispetto al monolite.
 *
 * Fase 6: la cronologia chat è persistita localmente (localStorage,
 * debounced 400ms) e ricaricata all'init; l'utente può azzerarla.
 */

import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { initialState, reducer } from './eqReducer';
import { loadChatHistory, saveChatHistory, CHAT_STORAGE_KEY } from '../utils/chatPersistence';

const EqStateContext = createContext(null);

function initState() {
  const persisted = typeof window !== 'undefined' ? loadChatHistory(window.localStorage) : null;
  if (persisted && Array.isArray(persisted) && persisted.length > 0) {
    return { ...initialState, chatHistory: persisted };
  }
  return initialState;
}

export function EqStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, initState);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        saveChatHistory(window.localStorage, state.chatHistory);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [state.chatHistory]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CHAT_STORAGE_KEY && e.newValue) {
        dispatch({ type: 'RELOAD_CHAT', payload: loadChatHistory(window.localStorage) });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <EqStateContext.Provider value={{ state, dispatch }}>
      {children}
    </EqStateContext.Provider>
  );
}

export function useEqState() {
  const ctx = useContext(EqStateContext);
  if (!ctx) {
    throw new Error('useEqState deve essere usato dentro <EqStateProvider>.');
  }
  return ctx;
}
