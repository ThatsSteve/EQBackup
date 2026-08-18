/**
 * useHardwareDiscovery.js — Fase 4: pipeline di discovery hardware
 * (brand → modelli → risoluzione device → card manuali).
 *
 * Estratto da App.jsx:707-713 (stati), 746-767 (handleBrandChange),
 * 769-821 (handleResolveHardware), 825-833 (fetch brands) senza modifiche.
 * I 2 console.error pre-esistenti sono spostati identici.
 */

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api/client';

export function useHardwareDiscovery({ dispatch }) {
  const [brands, setBrands] = useState({ headphone: [], dac: [], amp: [] });
  const [models, setModels] = useState({ headphone: [], dac: [], amp: [] });
  const [selectedBrand, setSelectedBrand] = useState({ headphone: '', dac: '', amp: '' });
  const [hwStatus, setHwStatus] = useState({ headphone: null, dac: null, amp: null });
  const [hwLoading, setHwLoading] = useState({ headphone: false, dac: false, amp: false });
  const [activeLevel3Form, setActiveLevel3Form] = useState(null);
  const [manualSpecs, setManualSpecs] = useState({ imp: '32', sens: '100', arch: 'open', customModel: '' });
  const [customInputMode, setCustomInputMode] = useState({ headphone: false, dac: false, amp: false });

  // Fetch dei brand all'avvio (ex App.jsx:825-833).
  useEffect(() => {
    apiGet('/api/hardware/brands?type=headphone')
      .then(res => res.json())
      .then(d => { if(d.success) setBrands(b => ({...b, headphone: d.brands})); });
    apiGet('/api/hardware/brands?type=dac')
      .then(res => res.json())
      .then(d => { if(d.success) setBrands(b => ({...b, dac: d.brands})); });
    apiGet('/api/hardware/brands?type=amp')
      .then(res => res.json())
      .then(d => { if(d.success) setBrands(b => ({...b, amp: d.brands})); });
  }, []);

  const handleBrandChange = async (type, brand) => {
    setSelectedBrand(prev => ({ ...prev, [type]: brand }));
    if (brand === "Altro / Custom") {
      setCustomInputMode(prev => ({ ...prev, [type]: true }));
      dispatch({ type: 'UPDATE', payload: { [type]: '' } });
      setModels(prev => ({ ...prev, [type]: [] }));
    } else if (brand) {
      setCustomInputMode(prev => ({ ...prev, [type]: false }));
      try {
        const res = await apiGet(`/api/hardware/models?brand=${encodeURIComponent(brand)}&type=${type}`);
        const data = await res.json();
        if (data.success) {
          setModels(prev => ({ ...prev, [type]: data.models }));
        }
      } catch (e) {
        console.error("Errore fetch modelli", e);
      }
    } else {
      setCustomInputMode(prev => ({ ...prev, [type]: false }));
      setModels(prev => ({ ...prev, [type]: [] }));
    }
  };

  const handleResolveHardware = async (type, deviceStr) => {
    if (!deviceStr || !deviceStr.trim()) return;
    setHwLoading(prev => ({ ...prev, [type]: true }));
    setHwStatus(prev => ({ ...prev, [type]: null }));
    try {
      const res = await apiPost('/api/hardware/resolve', { device: deviceStr, type });
      const data = await res.json();
      if (data.success && data.resolution) {
        setHwStatus(prev => ({ ...prev, [type]: data.resolution }));
        if (data.resolution.status === 'REQUIRES_USER_INPUT') {
          setActiveLevel3Form(type);
          setManualSpecs(s => ({ ...s, customModel: deviceStr }));
          dispatch({
            type: 'APPEND_CHAT',
            payload: {
              role: 'ai',
              content: data.resolution.message || `⚠️ Non ho trovato misurazioni per '${deviceStr}' (${type}). Compila la tabella dati rapida qui sotto o carica uno screenshot del grafico OCR per avviare la calibrazione!`,
              tutorOptions: data.resolution.tutorOptions || null,
              deviceType: type
            }
          });
        } else if (data.resolution.status === 'RESOLVED_ONLINE') {
          dispatch({
            type: 'APPEND_CHAT',
            payload: {
              role: 'ai',
              content: data.resolution.message || `🌐 [Auto-Apprendimento] Misurazioni per '${deviceStr}' acquisite dal Web e memorizzate nel Grafo Locale!`,
              tutorOptions: data.resolution.tutorOptions || null,
              deviceType: type
            }
          });
        } else if (data.resolution.status === 'RESOLVED_LOCAL') {
          dispatch({
            type: 'APPEND_CHAT',
            payload: {
              role: 'ai',
              content: data.resolution.message || `✅ Modello '${deviceStr}' identificato nel database locale!`,
              tutorOptions: data.resolution.tutorOptions || null,
              deviceType: type
            }
          });
        }
      }
    } catch (e) {
      console.error("Errore risoluzione", e);
    } finally {
      setHwLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  return {
    brands, models, selectedBrand, setSelectedBrand,
    hwStatus, setHwStatus, hwLoading,
    activeLevel3Form, setActiveLevel3Form,
    manualSpecs, setManualSpecs,
    customInputMode, setCustomInputMode,
    handleBrandChange, handleResolveHardware
  };
}