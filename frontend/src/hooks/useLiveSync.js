/**
 * useLiveSync.js — Fase 4: stato e toggle del Live Sync Windows APO.
 *
 * Estratto da App.jsx:724 + 726-744 (pre-Fase 4) senza modifiche:
 * check GET /api/live-sync/check prima di attivare; alert e APPEND_CHAT
 * identici.
 */

import { useState } from 'react';
import { apiGet } from '../api/client';

export function useLiveSync({ dispatch }) {
  const [isLiveSyncEnabled, setIsLiveSyncEnabled] = useState(false);

  const toggleLiveSync = async () => {
    if (isLiveSyncEnabled) {
      setIsLiveSyncEnabled(false);
      return;
    }
    try {
      const res = await apiGet('/api/live-sync/check');
      const data = await res.json();
      if (data.success) {
        setIsLiveSyncEnabled(true);
        dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `⚡ Live Sync APO attivato con successo!` } });
      } else {
        alert("Errore Live Sync: " + data.error);
        dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `❌ Errore Live Sync: ${data.error}` } });
      }
    } catch (e) {
      alert("Errore di comunicazione per attivare il Live Sync");
    }
  };

  return { isLiveSyncEnabled, toggleLiveSync };
}