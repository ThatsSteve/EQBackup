/**
 * useArtistResolver.js — Fase 4: risoluzione artisti (custom + online).
 *
 * Estratto da App.jsx:810-815 (fetch /api/artists), 1001-1013
 * (handleAddCustomArtist) e 1015-1066 (handleResolveArtistOnline) senza
 * modifiche di contenuto. Il console.error pre-esistente è spostato identico.
 */

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api/client';

export function useArtistResolver({ dispatch }) {
  const [availableArtists, setAvailableArtists] = useState([]);
  const [searchArtistQuery, setSearchArtistQuery] = useState("");

  useEffect(() => {
    apiGet('/api/artists')
      .then(res => res.json())
      .then(data => {
        if (data.success) setAvailableArtists(data.artists);
      })
      .catch(err => console.error("Failed to load artists", err));
  }, []);

  const handleAddCustomArtist = () => {
    if (searchArtistQuery.trim() !== '') {
      const customId = searchArtistQuery.toLowerCase().replace(/\s+/g, '_');
      dispatch({ type: 'TOGGLE_ARTIST', payload: customId });

      const exists = availableArtists.find(a => a.id === customId);
      if (!exists) {
        setAvailableArtists([...availableArtists, { id: customId, name: searchArtistQuery, genre: 'Custom' }]);
      }
      setSearchArtistQuery("");
    }
  };

  const handleResolveArtistOnline = async (query) => {
    if (!query || query.trim() === '') return;

    dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `🔍 Ricerca di '${query}' nel database musicale online...` } });

    try {
      const res = await apiPost('/api/resolve-artist', { name: query });
      const data = await res.json();

      if (data.success && data.artist) {
        const a = data.artist;
        const newArtistObj = {
          id: a.id,
          name: a.name,
          genre: a.tags?.[0] || 'Sconosciuto',
          origin: `ARTISTA: ${a.name} (Risolto Online)`
        };

        setAvailableArtists(prev => {
          if (!prev.find(x => x.id === newArtistObj.id)) {
            return [...prev, newArtistObj];
          }
          return prev;
        });

        dispatch({ type: 'TOGGLE_ARTIST', payload: newArtistObj.id });
        setSearchArtistQuery('');

        dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `✅ Trovato: **${a.name}**. I suoi tratti acustici sono stati importati nel Grafo Locale per l'equalizzazione.` } });
      } else {
        dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `⚠️ Non sono riuscito a trovare un match esatto per '${query}'. Verrà aggiunto come artista custom.` } });
        const customId = query.toLowerCase().replace(/\s+/g, '_');
        dispatch({ type: 'TOGGLE_ARTIST', payload: customId });
        setAvailableArtists(prev => {
          if (!prev.find(x => x.id === customId)) {
            return [...prev, { id: customId, name: query, genre: 'Custom' }];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Errore risoluzione artista:", err);
      dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `❌ Errore di connessione durante la ricerca di '${query}'. Riprova più tardi.` } });
    }
  };

  return {
    availableArtists, setAvailableArtists,
    searchArtistQuery, setSearchArtistQuery,
    handleAddCustomArtist, handleResolveArtistOnline
  };
}
