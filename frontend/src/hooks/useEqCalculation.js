/**
 * useEqCalculation.js — Fase 4: sync EQ debounced verso il backend.
 *
 * Estratto da App.jsx:899-935 (sync debounced 200ms → POST /api/calculate-eq)
 * + stati 685/687-688/715-716 + chartData (1299-1303). Comportamento identico:
 * debounce 200ms con cleanup, setIsServerConnected true/false, baselineEqData e
 * aiGeneratedEqData valorizzati SOLO a state.step === 4, chartData derivato.
 */

import { useEffect, useRef, useState } from 'react';
import { apiPost } from '../api/client';
import { calculateTripleChartData } from '../utils/eqChart';

export function useEqCalculation({ state, isLiveSyncEnabled }) {
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [eqData, setEqData] = useState(null);
  const [exportRawData, setExportRawData] = useState("");
  const [baselineEqData, setBaselineEqData] = useState(null);
  const [aiGeneratedEqData, setAiGeneratedEqData] = useState(null);
  const debounceTimer = useRef(null);

  // Sync to Backend
  useEffect(() => {
    if (state.step < 1) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await apiPost('/api/calculate-eq', {
          state,
          destination: isLiveSyncEnabled ? 'e-apo' : 'export'
        });
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        setIsServerConnected(true);
        if (data.payload) {
          setEqData(data.payload);
          if (state.step === 4) {
            setBaselineEqData(prev => data.baseProfile || data.payload || prev);
            if (!aiGeneratedEqData) setAiGeneratedEqData(data.payload);
          }
        } else if (data.agnosticEq) {
          setEqData(data.agnosticEq);
          if (state.step === 4) {
            setBaselineEqData(prev => data.baseProfile || data.agnosticEq || prev);
            if (!aiGeneratedEqData) setAiGeneratedEqData(data.agnosticEq);
          }
        }
        if (data.fileContent) setExportRawData(data.fileContent);
      } catch (err) {
        console.error('Failed to sync with backend:', err);
        setIsServerConnected(false);
      }
    }, 200);

    return () => clearTimeout(debounceTimer.current);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const chartData = (eqData || baselineEqData) ? calculateTripleChartData(
      eqData?.filters,
      aiGeneratedEqData?.filters,
      baselineEqData?.filters
  ) : [];

  return {
    isServerConnected,
    eqData,
    setEqData,
    exportRawData,
    setExportRawData,
    baselineEqData,
    setBaselineEqData,
    aiGeneratedEqData,
    setAiGeneratedEqData,
    chartData
  };
}