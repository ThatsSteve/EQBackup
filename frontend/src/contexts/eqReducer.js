/**
 * eqReducer.js — Fase 4: reducer puro dello stato del wizard EQ.
 *
 * Copia IDENTICA riga per riga di initialState + reducer da App.jsx:47-115
 * (pre-Fase 4). Modulo ES puro: nessun import React, nessun accesso al DOM.
 * La semantica di `state.step` (0-4) e di ogni campo NON cambia.
 */

export const initialState = {
  step: 0,
  setupMode: null,
  targetCurve: 'harman',
  headphone: '',
  dac: '',
  amp: '',
  uploadedFiles: [],
  selectedGenres: [],
  selectedArtists: [],
  baseVol: 50,
  balance: 0,
  threshold: 20,
  soundstage: 'intimate',
  bass: 'neutral',
  mids: 'balanced',
  treble: 'smooth',
  listeningPreferences: {
    sub_bass_gain: 0,
    mid_bass_gain: 0,
    low_mids_gain: 0,
    high_mids_gain: 0,
    presence_gain: 0,
    brilliance_gain: 0
  },
  destination: 'e-apo',
  chatHistory: [{ role: 'ai', content: "Ciao! Sono il tuo ingegnere del suono virtuale. Iniziamo a calibrare il tuo setup." }]
};

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.payload };
    case 'NEXT_STEP': return { ...state, step: Math.min(4, state.step + 1) };
    case 'PREV_STEP': return { ...state, step: Math.max(0, state.step - 1) };
    case 'UPDATE': return { ...state, ...action.payload };
    case 'UPDATE_PREF':
      return {
        ...state,
        listeningPreferences: {
          ...state.listeningPreferences,
          ...action.payload
        }
      };
    case 'TOGGLE_GENRE':
       const genreExists = state.selectedGenres.includes(action.payload);
       const newGenres = genreExists
               ? state.selectedGenres.filter(g => g !== action.payload)
               : [...state.selectedGenres, action.payload];
       return {
           ...state,
           selectedGenres: newGenres,
           targetCurve: newGenres.length > 0 ? (newGenres[0].toLowerCase().includes('harman') ? 'harman' : newGenres[0].toLowerCase()) : 'harman'
       };
    case 'TOGGLE_ARTIST':
       const exists = state.selectedArtists.includes(action.payload);
       if (!exists && state.selectedArtists.length >= 5) {
           return state;
       }
       return {
           ...state,
           selectedArtists: exists
               ? state.selectedArtists.filter(id => id !== action.payload)
               : [...state.selectedArtists, action.payload]
       };
    case 'APPEND_CHAT':
       return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    default: return state;
  }
}