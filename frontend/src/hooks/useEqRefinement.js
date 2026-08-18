/**
 * useEqRefinement.js — Fase 4: rifinitura EQ (guidata/parametrica/AI/undo/restore).
 *
 * Estratto da App.jsx:1093-1291 (pre-Fase 4) senza modifiche di contenuto:
 * applyOrAddFilter, handleUndoRefinement, handleRefineEQ, handleApplyParametric,
 * handleAiParametric, handleRestoreBaseline, handleRestoreAI + stati
 * paramEq/aiPrompt/isAiProcessing/activeTabEq/activeAccordionTab/historyLog/
 * refinementHistory/isRefining/activeFaq. I 6 console.error pre-esistenti
 * sono spostati identici (nessun dato sensibile).
 */

import { useState } from 'react';
import { apiPost } from '../api/client';

export function useEqRefinement({ state, dispatch, eqData, setEqData, setExportRawData, baselineEqData, aiGeneratedEqData, isLiveSyncEnabled }) {
  const [paramEq, setParamEq] = useState({ freq: 1000, gain: 0, q: 1.41, type: 'PK' });
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [activeTabEq, setActiveTabEq] = useState('B'); // 'A' = Prima (Baseline), 'B' = Dopo (Affinato)
  const [activeAccordionTab, setActiveAccordionTab] = useState('bass');
  const [historyLog, setHistoryLog] = useState([]);
  const [refinementHistory, setRefinementHistory] = useState([]);
  const [isRefining, setIsRefining] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const applyOrAddFilter = (filters, type, targetFreq, gainDelta, qVal) => {
    // Aggiungi sempre come nuovo filtro manuale
    filters.push({ type, freq: targetFreq, gain: gainDelta, q: qVal, isManual: true });
    filters.sort((a, b) => a.freq - b.freq);
  };

  const handleUndoRefinement = async () => {
    if (refinementHistory.length === 0 || isRefining) return;
    setIsRefining(true);
    const previousEq = refinementHistory[refinementHistory.length - 1];
    try {
      const response = await apiPost('/api/eq/refine', {
        filters: previousEq.filters,
        destination: isLiveSyncEnabled ? 'e-apo' : 'export',
        basePreamp: previousEq.preamp
      });
      const data = await response.json();
      if (data.success && data.payload) {
        setEqData(data.payload);
        if (data.fileContent) setExportRawData(data.fileContent);
        setHistoryLog(prev => ["↩️ Undo effettuato (Tornato allo step precedente)", ...prev]);
        setRefinementHistory(prev => prev.slice(0, -1));
      }
    } catch (err) {
      console.error("Errore undo:", err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleRefineEQ = async (symptom) => {
    if (!eqData || isRefining) return;
    setIsRefining(true);

    // Save history state before mutating
    setRefinementHistory(prev => [...prev, JSON.parse(JSON.stringify(eqData))]);

    let updatedFilters = eqData.filters.map(f => ({ ...f }));
    let logMsg = "";

    if (symptom === 'voci_scure') {
      applyOrAddFilter(updatedFilters, 'PK', 500, -1.5, 1.41);
      applyOrAddFilter(updatedFilters, 'PK', 2000, 1.0, 1.41);
      logMsg = "🎙️ +1.0dB @ 2kHz (Chiarezza), -1.5dB @ 500Hz (Mud)";
    } else if (symptom === 'sibilanti') {
      applyOrAddFilter(updatedFilters, 'PK', 6000, -2.0, 2.0);
      applyOrAddFilter(updatedFilters, 'PK', 8000, -1.5, 2.0);
      logMsg = "🥁 -2.0dB @ 6kHz, -1.5dB @ 8kHz (De-Esser)";
    } else if (symptom === 'chitarre_medi') {
      applyOrAddFilter(updatedFilters, 'PK', 1000, -1.5, 1.41);
      applyOrAddFilter(updatedFilters, 'PK', 3000, +1.5, 1.41);
      logMsg = "🎸 +1.5dB @ 3kHz (Presenza), -1.5dB @ 1kHz (Nasale)";
    } else if (symptom === 'bassi_rimbombo') {
      applyOrAddFilter(updatedFilters, 'PK', 120, -2.0, 1.0);
      applyOrAddFilter(updatedFilters, 'LS', 60, +1.0, 0.7);
      logMsg = "🔊 -2.0dB @ 120Hz (Boom), +1.0dB @ 60Hz (Sub)";
    } else if (symptom === 'manca_aria') {
      applyOrAddFilter(updatedFilters, 'HS', 10000, +1.5, 0.7);
      applyOrAddFilter(updatedFilters, 'PK', 16000, +1.0, 1.41);
      logMsg = "📉 +1.5dB @ 10kHz (Aria), +1.0dB @ 16kHz (Sparkle)";
    }

    try {
      const response = await apiPost('/api/eq/refine', {
        filters: updatedFilters,
        destination: isLiveSyncEnabled ? 'e-apo' : 'export',
        basePreamp: baselineEqData ? baselineEqData.preamp : eqData.preamp
      });
      const data = await response.json();
      if (data.success && data.payload) {
        setEqData(data.payload);
        if (data.fileContent) setExportRawData(data.fileContent);
        setHistoryLog(prev => [logMsg, ...prev]);
        setActiveTabEq('B');
      }
    } catch (err) {
      console.error("Errore rifinitura:", err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleApplyParametric = async () => {
    if (!eqData || isRefining) return;
    setIsRefining(true);
    setRefinementHistory(prev => [...prev, JSON.parse(JSON.stringify(eqData))]);

    let updatedFilters = eqData.filters.map(f => ({ ...f }));
    applyOrAddFilter(updatedFilters, paramEq.type, Number(paramEq.freq), Number(paramEq.gain), Number(paramEq.q));

    const logMsg = `🎛️ Parametrico: ${paramEq.gain > 0 ? '+' : ''}${paramEq.gain}dB @ ${paramEq.freq}Hz (Q: ${paramEq.q})`;

    try {
      const response = await apiPost('/api/eq/refine', {
        filters: updatedFilters,
        destination: isLiveSyncEnabled ? 'e-apo' : 'export',
        basePreamp: baselineEqData ? baselineEqData.preamp : eqData.preamp
      });
      const data = await response.json();
      if (data.success && data.payload) {
         setEqData(data.payload);
         if (data.fileContent) setExportRawData(data.fileContent);
         setHistoryLog(prev => [logMsg, ...prev]);
         setActiveTabEq('B');
      }
    } catch (err) {
      console.error("Errore parametrico:", err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleAiParametric = async () => {
    if (!aiPrompt.trim() || !eqData || isAiProcessing || isRefining) return;
    setIsAiProcessing(true);
    setIsRefining(true);
    setRefinementHistory(prev => [...prev, JSON.parse(JSON.stringify(eqData))]);

    // Sincronizza con la cronologia chat globale
    dispatch({ type: 'APPEND_CHAT', payload: { role: 'user', content: aiPrompt } });

    try {
      const response = await apiPost('/api/chat', {
        message: aiPrompt,
        aiPayload: state,
        destination: isLiveSyncEnabled ? 'e-apo' : 'export'
      });
      const data = await response.json();
      if (data.success && data.payload) {
        setEqData(data.payload);
        if (data.fileContent) setExportRawData(data.fileContent);
        setHistoryLog(prev => [`🤖 AI Parametrico: "${aiPrompt}" -> ${data.message}`, ...prev]);
        dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: data.message } });
        setActiveTabEq('B');
        setAiPrompt("");
      }
    } catch (err) {
      console.error("Errore AI refinement:", err);
    } finally {
      setIsAiProcessing(false);
      setIsRefining(false);
    }
  };

  const handleRestoreBaseline = () => {
    if (baselineEqData) {
      setEqData(baselineEqData);
      setHistoryLog(prev => ["🔄 Ripristinato Hardware Originale Neutro", ...prev]);
      setRefinementHistory([]);
      setActiveTabEq('A');
      apiPost('/api/eq/refine', {
        filters: baselineEqData.filters,
        destination: isLiveSyncEnabled ? 'e-apo' : 'export',
        basePreamp: baselineEqData.preamp
      }).then(r => r.json()).then(data => {
        if (data.fileContent) setExportRawData(data.fileContent);
      });
    }
  };

  const handleRestoreAI = () => {
    if (aiGeneratedEqData) {
      setEqData(aiGeneratedEqData);
      setHistoryLog(prev => ["🔄 Ripristinato Profilo Intelligenza Artificiale", ...prev]);
      setRefinementHistory([]);
      setActiveTabEq('B');
      apiPost('/api/eq/refine', {
        filters: aiGeneratedEqData.filters,
        destination: state.destination || 'e-apo',
        basePreamp: aiGeneratedEqData.preamp
      }).then(r => r.json()).then(data => {
        if (data.fileContent) setExportRawData(data.fileContent);
      });
    }
  };

  return {
    paramEq, setParamEq,
    aiPrompt, setAiPrompt,
    isAiProcessing,
    activeTabEq, setActiveTabEq,
    activeAccordionTab, setActiveAccordionTab,
    historyLog, setHistoryLog,
    refinementHistory, setRefinementHistory,
    isRefining,
    activeFaq, setActiveFaq,
    handleUndoRefinement,
    handleRefineEQ,
    handleApplyParametric,
    handleAiParametric,
    handleRestoreBaseline,
    handleRestoreAI
  };
}