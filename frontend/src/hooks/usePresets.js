/**
 * usePresets.js — Fase 4: presets del profilo EQ (header WizardShell + step 4).
 *
 * Estratto da App.jsx:857-896 (load/save localStorage + attivazione) e
 * 842-847 (fetch /api/presets) senza modifiche. Condiviso da WizardShell
 * (header) e StepEqFinal: lo stato risiede qui (via App) e scende come props.
 * localStorage resta SOLO per 'PersonalEQ_Presets' (flag booleano IA a parte).
 */

import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';

export function usePresets({ state, eqData, dispatch, setEqData }) {
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState("");

  const LOCAL_STORAGE_KEY = 'PersonalEQ_Presets';

  useEffect(() => {
    apiGet('/api/presets')
      .then(res => res.json())
      .then(data => {
        if(data.success) setPresets(data.presets);
      })
      .catch(err => console.error("Failed to load presets", err));
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setPresets(JSON.parse(saved));
      }
    } catch(e) {
      console.error("Errore caricamento presets locali", e);
    }
  }, []);

  const handleSavePreset = () => {
    if (!presetName.trim() || !eqData) return;

    const newPreset = {
      id: Date.now().toString(),
      name: presetName,
      hardware: state.headphone,
      filters: eqData.filters,
      preamp: eqData.preamp,
      timestamp: new Date().toISOString()
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPresets));
    setPresetName("");
  };

  const handleActivatePreset = (id) => {
    if (!id) return;
    const preset = presets.find(p => p.id === id);
    if (preset) {
      setEqData({ filters: preset.filters, preamp: preset.preamp });
      // Re-trigger the compilation of E-APO in the background
      dispatch({ type: 'SET_STEP', payload: 3 });
    }
  };

  return {
    presets, setPresets,
    presetName, setPresetName,
    handleSavePreset, handleActivatePreset
  };
}