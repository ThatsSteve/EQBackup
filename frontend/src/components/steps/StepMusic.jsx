import { motion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import SearchableCombobox from '../SearchableCombobox';
import { GENRES_LIST } from '../../data/eqOptions';

/**
 * StepMusic.jsx — Step 2 (estratto identico da App.jsx:1769-1964, pre-Fase 4).
 * Interactive: selezione brano/upload; Analytical: generi + artisti + targetCurve.
 */
export function StepMusic({ state, dispatch, varianti, availableArtists, setAvailableArtists, searchArtistQuery, setSearchArtistQuery, handleResolveArtistOnline, uploadedAudioTrack, setUploadedAudioTrack }) {
  return (
    <motion.div key="step2-music" variants={varianti} initial="hidden" animate="visible" exit="exit" className="step-container">
      {state.setupMode === 'interactive' ? (
        <div>
          <h2 className="step-title">2. Selezione Brano Musicale per la Calibrazione Live</h2>
          <p className="step-subtitle">L'intera calibrazione del tuo EQ ruota attorno al brano che ascolti. Scegli se usare il brano di riferimento oppure caricare una tua canzone.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '24px' }}>
            <div className="option-card disabled-card" style={{ opacity: 0.65, border: '1px dashed rgba(255,255,255,0.2)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span className="badge" style={{ background: '#ffb142', color: '#000', fontWeight: 'bold', marginBottom: '12px', display: 'inline-block' }}>Presto Disponibile</span>
                <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1.2rem' }}>🎵 Usare Brano di Test Integrato</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>Il brano di riferimento ad altissima fedeltà (master lossless per test timbrico) sarà disponibile nelle prossime release.</p>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic', marginTop: '12px' }}>Disponibile prossimamente</div>
            </div>

            <div
              className="option-card active"
              style={{ border: '2px solid #00f0ff', background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(59, 130, 246, 0.2))', padding: '24px', borderRadius: '16px', position: 'relative' }}
            >
              <span className="badge" style={{ background: '#00f0ff', color: '#000', fontWeight: 'bold', marginBottom: '12px', display: 'inline-block' }}>⚡ Seleziona Brano</span>
              <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1.2rem' }}>📂 Carica un tuo Brano Audio (.mp3, .wav, .flac)</h3>
              <p style={{ color: '#e0e0e0', fontSize: '0.9rem', lineHeight: '1.4', marginBottom: '16px' }}>Seleziona una canzone dal tuo computer attorno a cui far ruotare la regolazione dell'EQ in tempo reale.</p>

              <div className="drop-zone" style={{ margin: 0, padding: '20px', background: 'rgba(0,0,0,0.35)', border: '1px dashed rgba(0,240,255,0.5)', borderRadius: '12px', textAlign: 'center', position: 'relative', cursor: 'pointer' }}>
                 <UploadCloud size={32} color="#00f0ff" style={{ margin: '0 auto 8px' }} />
                 <p style={{ margin: 0, fontSize: '0.88rem', color: '#00f0ff', fontWeight: 600 }}>
                   {uploadedAudioTrack ? `✅ Selezionato: ${uploadedAudioTrack.name}` : 'Clicca qui o trascina il tuo file audio per avviare il Live Tuning'}
                 </p>
                 <input type="file" accept=".mp3, .wav, .flac" onChange={(e) => {
                   const file = e.target.files[0];
                   if (file) {
                     const url = URL.createObjectURL(file);
                     setUploadedAudioTrack({ name: file.name, url });
                   }
                 }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </div>

              {uploadedAudioTrack && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => dispatch({ type: 'NEXT_STEP' })}
                  style={{ marginTop: '16px', width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
                >
                  Avvia Sessione Live con "{uploadedAudioTrack.name}" →
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <h2 className="step-title">2. Profilo Musicale (Generi & Artisti)</h2>
          <p className="step-subtitle">Definisci la tua identità di ascolto: l'IA utilizzerà il genere dominante e la firma acustica dei tuoi artisti preferiti per calibrare la curva di partenza.</p>

          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎧 Seleziona i Generi Musicali</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Scegli i generi principali che guidano le fondamenta della Target Curve EQ (puoi selezionarne più di uno).</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
              {GENRES_LIST.map(g => {
                const isSelected = state.selectedGenres.includes(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => dispatch({ type: 'TOGGLE_GENRE', payload: g.id })}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      background: isSelected ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.25), rgba(59, 130, 246, 0.35))' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected ? '0 8px 20px rgba(0, 240, 255, 0.2)' : 'none',
                      transform: isSelected ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isSelected ? '#fff' : '#e0e0e0', marginBottom: '6px' }}>{g.name}</div>
                    <div style={{ fontSize: '0.8rem', color: isSelected ? '#a5f3fc' : '#888', lineHeight: '1.3' }}>{g.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ab-toggle-container" style={{ margin: '0 auto 2.5rem auto', maxWidth: '500px', background: 'rgba(0,0,0,0.3)', padding: '12px 20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)' }}>
             <span className={`lbl ${state.targetCurve !== 'harman' ? 'accent' : ''}`}>Flat / Neutra</span>
             <div className={`switch-bg ${state.targetCurve === 'harman' ? 'on' : ''}`} onClick={() => dispatch({ type: 'UPDATE', payload: { targetCurve: state.targetCurve === 'harman' ? 'flat' : 'harman' } })}>
                <div className="switch-knob" style={{transform: state.targetCurve === 'harman' ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.3s'}} />
             </div>
             <span className={`lbl ${state.targetCurve === 'harman' ? 'accent' : ''}`}>Ottimizzazione Harman 2018</span>
          </div>

          <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>🎵 Artisti Preferiti (Max 5)</h3>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: state.selectedArtists.length >= 5 ? '#ffb142' : '#00f0ff', background: state.selectedArtists.length >= 5 ? 'rgba(255, 177, 66, 0.15)' : 'rgba(0, 240, 255, 0.15)', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${state.selectedArtists.length >= 5 ? 'rgba(255, 177, 66, 0.4)' : 'rgba(0, 240, 255, 0.4)'}` }}>
                {state.selectedArtists.length} / 5 Selezionati
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px' }}>Cerca o digita gli artisti che ascolti di più. Il motore IA analizza la loro firma timbrica per calcolare modificatori mirati (es. sub-bass per Hans Zimmer, spazialità per Jazz).</p>

            <div style={{ margin: '0 0 16px 0', maxWidth: '560px', width: '100%' }}>
              <SearchableCombobox
                options={[
                  ...availableArtists.filter(a => !state.selectedArtists.includes(a.id)).map(a => ({ label: `${a.name} (${a.genre})`, value: a.id })),
                  { label: '🌐 Cerca artista online...', value: '__ONLINE_RESOLVE__' }
                ]}
                value=""
                placeholder={state.selectedArtists.length >= 5 ? "⚠️ Limite massimo di 5 artisti raggiunto" : "Cerca o digita il nome dell'artista..."}
                disabled={state.selectedArtists.length >= 5}
                allowCustomInput={true}
                enableOnlineResolve={true}
                onResolveOnline={handleResolveArtistOnline}
                onChange={val => {
                  if (!val) return;
                  if (val !== '__ONLINE_RESOLVE__' && state.selectedArtists.length < 5) {
                    if (availableArtists.some(a => a.id === val)) {
                      dispatch({ type: 'TOGGLE_ARTIST', payload: val });
                    } else {
                      setSearchArtistQuery(val);
                      const customId = val.toLowerCase().replace(/\s+/g, '_');
                      dispatch({ type: 'TOGGLE_ARTIST', payload: customId });
                      const exists = availableArtists.find(a => a.id === customId);
                      if (!exists) {
                          setAvailableArtists([...availableArtists, { id: customId, name: val, genre: 'Custom' }]);
                      }
                      setSearchArtistQuery('');
                    }
                  }
                }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', minHeight: '52px', padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px', alignItems: 'center' }}>
              {state.selectedArtists.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💡 Nessun artista selezionato. Aggiungine fino a 5 per arricchire il profilo acustico.</span>
                </span>
              ) : (
                state.selectedArtists.map(artistId => {
                  const artObj = availableArtists.find(a => a.id === artistId) || { id: artistId, name: artistId.replace(/_/g, ' '), genre: 'Custom' };
                  return (
                    <div key={artistId} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25), rgba(59, 130, 246, 0.35))', border: '1px solid rgba(0, 240, 255, 0.6)', padding: '6px 14px', borderRadius: '25px', color: '#fff', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0, 240, 255, 0.15)', animation: 'fadeIn 0.2s ease-out' }}>
                        <span>🎵 {artObj.name}</span>
                        {artObj.genre && <span style={{ fontSize: '0.75rem', opacity: 0.85, background: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: '10px' }}>{artObj.genre}</span>}
                        <button type="button" onClick={() => dispatch({ type: 'TOGGLE_ARTIST', payload: artistId })} style={{ background: 'transparent', border: 'none', color: '#ff4757', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, marginLeft: '4px', fontWeight: 'bold', fontSize: '1.1rem', transition: 'transform 0.2s' }} title="Rimuovi artista">✕</button>
                    </div>
                  );
                })
              )}
            </div>

            {state.selectedArtists.length >= 5 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffb142', background: 'rgba(255, 177, 66, 0.12)', border: '1px solid rgba(255, 177, 66, 0.4)', padding: '12px 18px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, marginBottom: '20px' }}>
                <span>⚠️ Limite massimo di 5 artisti raggiunto. Rimuovi un artista cliccando sulla "✕" per aggiungerne di nuovi.</span>
              </div>
            )}

            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Artisti Suggeriti dal Grafo di Conoscenza:</div>
              <div className="artists-grid" style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                 {availableArtists
                   .filter(a => !searchArtistQuery || a.name.toLowerCase().includes(searchArtistQuery.toLowerCase()))
                   .map(artist => {
                     const isSel = state.selectedArtists.includes(artist.id);
                     const isMax = state.selectedArtists.length >= 5 && !isSel;
                     return (
                       <div key={artist.id}
                            onClick={() => !isMax && dispatch({ type: 'TOGGLE_ARTIST', payload: artist.id })}
                            style={{ opacity: isMax ? 0.4 : 1, cursor: isMax ? 'not-allowed' : 'pointer' }}
                            className={`artist-pill ${isSel ? 'active' : ''}`}>
                         {artist.name} <span className="genre-tag">{artist.genre}</span>
                       </div>
                     );
                 })}
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
