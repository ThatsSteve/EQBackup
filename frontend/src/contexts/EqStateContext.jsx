/**
 * EqStateContext.jsx — Fase 4: context React che sostituisce il
 * `useReducer(reducer, initialState)` di App.jsx:659.
 *
 * Espone `useEqState()` → { state, dispatch }. La semantica di `state.step`
 * (0-4) e di ogni campo del reducer NON cambia rispetto al monolite.
 */

import { createContext, useContext, useReducer } from 'react';
import { initialState, reducer } from './eqReducer';

const EqStateContext = createContext(null);

export function EqStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
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