/**
 * eqReducer.test.js — Fase 4: test puri per il reducer EQ (Vitest, zero DOM).
 *
 * Tutti e 7 gli action type: SET_STEP, NEXT_STEP, PREV_STEP, UPDATE,
 * UPDATE_PREF, TOGGLE_GENRE, TOGGLE_ARTIST, APPEND_CHAT.
 * Clamps: step mai < 0, mai > 4. Max 5 artisti.
 */
import { describe, it, expect } from 'vitest';
import { initialState, reducer } from './eqReducer';

describe('eqReducer — initialState', () => {
  it('ha step 0 e setupMode null', () => {
    expect(initialState.step).toBe(0);
    expect(initialState.setupMode).toBeNull();
  });

  it('ha targetCurve harman di default', () => {
    expect(initialState.targetCurve).toBe('harman');
  });

  it('listeningPreferences ha 6 gain a 0', () => {
    const prefs = initialState.listeningPreferences;
    expect(prefs.sub_bass_gain).toBe(0);
    expect(prefs.mid_bass_gain).toBe(0);
    expect(prefs.low_mids_gain).toBe(0);
    expect(prefs.high_mids_gain).toBe(0);
    expect(prefs.presence_gain).toBe(0);
    expect(prefs.brilliance_gain).toBe(0);
  });

  it('chatHistory ha messaggio iniziale AI', () => {
    expect(initialState.chatHistory).toHaveLength(1);
    expect(initialState.chatHistory[0].role).toBe('ai');
  });
});

describe('eqReducer — SET_STEP', () => {
  it('imposta step a valore specifico', () => {
    const state = reducer(initialState, { type: 'SET_STEP', payload: 2 });
    expect(state.step).toBe(2);
  });

  it('non muta lo stato originale', () => {
    const state = reducer(initialState, { type: 'SET_STEP', payload: 3 });
    expect(initialState.step).toBe(0);
    expect(state.step).toBe(3);
  });
});

describe('eqReducer — NEXT_STEP / PREV_STEP (clamps)', () => {
  it('NEXT_STEP incrementa da 0 a 1', () => {
    const state = reducer(initialState, { type: 'NEXT_STEP' });
    expect(state.step).toBe(1);
  });

  it('NEXT_STEP clamp max 4 (non sale sopra 4)', () => {
    const stateAt4 = { ...initialState, step: 4 };
    const state = reducer(stateAt4, { type: 'NEXT_STEP' });
    expect(state.step).toBe(4);
  });

  it('PREV_STEP decrementa da 4 a 3', () => {
    const stateAt4 = { ...initialState, step: 4 };
    const state = reducer(stateAt4, { type: 'PREV_STEP' });
    expect(state.step).toBe(3);
  });

  it('PREV_STEP clamp min 0 (non scende sotto 0)', () => {
    const state = reducer(initialState, { type: 'PREV_STEP' });
    expect(state.step).toBe(0);
  });

  it('clamps funzionano in catena', () => {
    let state = initialState;
    for (let i = 0; i < 10; i++) state = reducer(state, { type: 'NEXT_STEP' });
    expect(state.step).toBe(4);
    for (let i = 0; i < 10; i++) state = reducer(state, { type: 'PREV_STEP' });
    expect(state.step).toBe(0);
  });
});

describe('eqReducer — UPDATE (merge shallow)', () => {
  it('aggiorna campi multipli', () => {
    const state = reducer(initialState, {
      type: 'UPDATE',
      payload: { headphone: 'HD600', dac: 'Modi 3' }
    });
    expect(state.headphone).toBe('HD600');
    expect(state.dac).toBe('Modi 3');
  });

  it('preserva campi non specificati', () => {
    const state = reducer(initialState, { type: 'UPDATE', payload: { headphone: 'HD600' } });
    expect(state.targetCurve).toBe('harman');
    expect(state.step).toBe(0);
  });
});

describe('eqReducer — UPDATE_PREF (merge parziale listeningPreferences)', () => {
  it('aggiorna solo i gain specificati', () => {
    const state = reducer(initialState, {
      type: 'UPDATE_PREF',
      payload: { sub_bass_gain: 3.5, presence_gain: 2.0 }
    });
    expect(state.listeningPreferences.sub_bass_gain).toBe(3.5);
    expect(state.listeningPreferences.presence_gain).toBe(2.0);
    expect(state.listeningPreferences.mid_bass_gain).toBe(0);
  });

  it('non tocca altri campi dello stato', () => {
    const state = reducer(initialState, {
      type: 'UPDATE_PREF',
      payload: { sub_bass_gain: 3.5 }
    });
    expect(state.headphone).toBe('');
    expect(state.step).toBe(0);
  });
});

describe('eqReducer — TOGGLE_GENRE (aggiungi/rimuovi + derivazione targetCurve)', () => {
  it('aggiunge genere se non presente', () => {
    const state = reducer(initialState, { type: 'TOGGLE_GENRE', payload: 'Rock' });
    expect(state.selectedGenres).toContain('Rock');
    expect(state.selectedGenres).toHaveLength(1);
  });

  it('rimuove genere se già presente', () => {
    const withRock = { ...initialState, selectedGenres: ['Rock'] };
    const state = reducer(withRock, { type: 'TOGGLE_GENRE', payload: 'Rock' });
    expect(state.selectedGenres).not.toContain('Rock');
    expect(state.selectedGenres).toHaveLength(0);
  });

  it('deriva targetCurve dal primo genere selezionato', () => {
    let state = reducer(initialState, { type: 'TOGGLE_GENRE', payload: 'Rock' });
    expect(state.targetCurve).toBe('rock');

    state = reducer(state, { type: 'TOGGLE_GENRE', payload: 'Pop' });
    expect(state.targetCurve).toBe('rock'); // primo resta

    state = reducer(state, { type: 'TOGGLE_GENRE', payload: 'Rock' });
    expect(state.targetCurve).toBe('pop'); // ora primo è Pop
  });

  it('targetCurve torna a harman se lista vuota', () => {
    const withRock = { ...initialState, selectedGenres: ['Rock'], targetCurve: 'rock' };
    const state = reducer(withRock, { type: 'TOGGLE_GENRE', payload: 'Rock' });
    expect(state.targetCurve).toBe('harman');
  });

  it('genere con "harman" nel nome forza harman', () => {
    const state = reducer(initialState, { type: 'TOGGLE_GENRE', payload: 'Harman Target' });
    expect(state.targetCurve).toBe('harman');
  });
});

describe('eqReducer — TOGGLE_ARTIST (max 5 + toggle-off)', () => {
  it('aggiunge artista se < 5', () => {
    const state = reducer(initialState, { type: 'TOGGLE_ARTIST', payload: 'artist1' });
    expect(state.selectedArtists).toContain('artist1');
    expect(state.selectedArtists).toHaveLength(1);
  });

  it('rimuove artista se già presente', () => {
    const withArtist = { ...initialState, selectedArtists: ['artist1'] };
    const state = reducer(withArtist, { type: 'TOGGLE_ARTIST', payload: 'artist1' });
    expect(state.selectedArtists).not.toContain('artist1');
    expect(state.selectedArtists).toHaveLength(0);
  });

  it('blocca aggiunta se già 5 artisti (max 5)', () => {
    const fiveArtists = { ...initialState, selectedArtists: ['a', 'b', 'c', 'd', 'e'] };
    const state = reducer(fiveArtists, { type: 'TOGGLE_ARTIST', payload: 'f' });
    expect(state.selectedArtists).toHaveLength(5);
    expect(state.selectedArtists).not.toContain('f');
  });

  it('permette toggle-off anche a 5', () => {
    const fiveArtists = { ...initialState, selectedArtists: ['a', 'b', 'c', 'd', 'e'] };
    const state = reducer(fiveArtists, { type: 'TOGGLE_ARTIST', payload: 'c' });
    expect(state.selectedArtists).toHaveLength(4);
    expect(state.selectedArtists).not.toContain('c');
  });
});

describe('eqReducer — APPEND_CHAT', () => {
  it('accoda messaggio alla chatHistory', () => {
    const state = reducer(initialState, {
      type: 'APPEND_CHAT',
      payload: { role: 'user', content: 'Ciao' }
    });
    expect(state.chatHistory).toHaveLength(2);
    expect(state.chatHistory[1]).toEqual({ role: 'user', content: 'Ciao' });
  });

  it('preserva messaggi precedenti', () => {
    const state = reducer(initialState, {
      type: 'APPEND_CHAT',
      payload: { role: 'user', content: 'Test' }
    });
    expect(state.chatHistory[0].content).toContain('ingegnere del suono');
  });
});

describe('eqReducer — default case', () => {
  it('azione sconosciuta restituisce stato invariato', () => {
    const state = reducer(initialState, { type: 'UNKNOWN_ACTION' });
    expect(state).toBe(initialState);
  });
});