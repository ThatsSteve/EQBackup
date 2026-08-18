import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AudioPlayerAB from '../AudioPlayerAB';
import { EqCurveTooltip } from '../charts/EqCurveTooltip';
import { BASS_OPTIONS, MIDS_OPTIONS, TREBLE_OPTIONS } from '../../data/eqOptions';

/**
 * StepTuning.jsx — Step 3 (estratto identico da App.jsx:1967-2259, pre-Fase 4).
 * Interactive: AudioPlayerAB + grafico live; Analytical: BASS/MIDS/TREBLE
 * + AudioPlayerAB + brief generale.
 */
export function StepTuning({ state, dispatch, varianti, eqData, setEqData, chartData, isLiveSyncEnabled, toggleLiveSync, uploadedAudioTrack }) {
  return (
    <motion.div key="step3" variants={varianti} initial="hidden" animate="visible" exit="exit" className="step-container">
      {state.setupMode === 'interactive' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="step-title" style={{ margin: 0 }}>3. Sessione di Live EQ Tuning attorno al Brano</h2>
              <p className="step-subtitle" style={{ margin: '4px 0 0 0' }}>Ascolta la canzone dal vivo, regola i parametri con i tasti per strumenti o la banda parametrica e osserva la curva dell'EQ che si trasforma in tempo reale.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '30px', border: `1px solid ${isLiveSyncEnabled ? 'rgba(0, 255, 135, 0.4)' : 'rgba(255,255,255,0.1)'}` }}>
              <span style={{ fontSize: '0.85rem', color: isLiveSyncEnabled ? '#00ff87' : '#aaa', fontWeight: 600 }}>⚡ Live Sync Windows APO</span>
              <div onClick={toggleLiveSync} style={{ width: '40px', height: '22px', background: isLiveSyncEnabled ? '#00ff87' : 'rgba(255,255,255,0.1)', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: '0.3s' }}>
                <div style={{ position: 'absolute', top: '2px', left: isLiveSyncEnabled ? '20px' : '2px', width: '18px', height: '18px', background: isLiveSyncEnabled ? '#000' : '#888', borderRadius: '50%', transition: '0.3s' }} />
              </div>
            </div>
          </div>

          <div style={{ margin: '20px 0' }}>
            <AudioPlayerAB
              listeningPreferences={state.listeningPreferences}
              onUpdatePreferences={(prefs) => dispatch({ type: 'UPDATE_PREF', payload: prefs })}
              eqData={eqData}
              onUpdateEqData={setEqData}
              activeTab="bass"
              isInteractiveMode={true}
              initialFile={uploadedAudioTrack}
            />
          </div>

          <div style={{ marginTop: '20px', background: 'rgba(15, 18, 25, 0.85)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📈 Grafico Curva EQ Live in Evoluzione</span>
                <span style={{ fontSize: '0.75rem', color: '#00f0ff', background: 'rgba(0,240,255,0.15)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(0,240,255,0.3)' }}>Real-Time Response</span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>La risposta in frequenza si aggiorna live con ogni modifica</span>
            </div>
            <div className="chart-container" style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
                  <XAxis dataKey="freq" type="number" domain={[20, 20000]} scale="log" ticks={[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]} stroke="#8a8a93" tickFormatter={(v) => v>=1000?`${v/1000}k`:v} />
                  <YAxis domain={['auto', 'auto']} stroke="#8a8a93" tickFormatter={(v) => `${v>0?'+':''}${v}dB`} />
                  <Tooltip content={<EqCurveTooltip />} />
                  <Line type="monotone" dataKey="manualGain" name="Risposta EQ Attuale Live" stroke="#00f0ff" strokeWidth={3} dot={false} animationDuration={300} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-primary export-btn"
              onClick={() => dispatch({ type: 'NEXT_STEP' })}
              style={{ padding: '16px 36px', fontSize: '1.1rem', fontWeight: 800, background: 'linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)', boxShadow: '0 8px 30px rgba(0, 240, 255, 0.4)', cursor: 'pointer', borderRadius: '30px' }}
            >
              🏁 Fine: Concludi Calibrazione & Genera Tabella Valori
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="step-title" style={{ margin: 0 }}>3. Tuning d'Ascolto Guidato</h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '30px', border: `1px solid ${isLiveSyncEnabled ? 'rgba(0, 255, 135, 0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                  <span style={{ fontSize: '0.85rem', color: isLiveSyncEnabled ? '#00ff87' : '#aaa', fontWeight: 600 }}>⚡ Live Sync Windows APO</span>
                  <div onClick={toggleLiveSync} style={{ width: '40px', height: '22px', background: isLiveSyncEnabled ? '#00ff87' : 'rgba(255,255,255,0.1)', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: '0.3s' }}>
                      <div style={{ position: 'absolute', top: '2px', left: isLiveSyncEnabled ? '20px' : '2px', width: '18px', height: '18px', background: isLiveSyncEnabled ? '#000' : '#888', borderRadius: '50%', transition: '0.3s' }} />
                  </div>
              </div>
          </div>
          <p className="step-subtitle">Scegli l'impronta sonora che preferisci per ciascuna gamma con semplici descrizioni in linguaggio naturale. Ascolta le modifiche in tempo reale.</p>

          <div style={{ margin: '20px 0' }}>
              <AudioPlayerAB
                listeningPreferences={state.listeningPreferences}
                onUpdatePreferences={(prefs) => dispatch({ type: 'UPDATE_PREF', payload: prefs })}
                eqData={eqData}
                onUpdateEqData={setEqData}
                activeTab="bass"
                isInteractiveMode={false}
              />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '1.5rem', width: '100%' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#ff416c', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🥁 GAMMA BASSA (Fondamenta & Punch)</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {BASS_OPTIONS.map((opt) => {
                  const isSelected = state.listeningPreferences.sub_bass_gain === opt.sub_bass && state.listeningPreferences.mid_bass_gain === opt.mid_bass;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => dispatch({ type: 'UPDATE_PREF', payload: { sub_bass_gain: opt.sub_bass, mid_bass_gain: opt.mid_bass } })}
                      style={{
                        background: isSelected ? 'rgba(255, 65, 108, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                        border: `2px solid ${isSelected ? '#ff416c' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '16px',
                        padding: '18px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isSelected ? '0 8px 25px rgba(255, 65, 108, 0.25)' : 'none'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: isSelected ? '#fff' : '#eee', fontSize: '1rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span>{opt.title}</span>
                          {isSelected && <CheckCircle size={18} color="#ff416c" style={{ flexShrink: 0 }} />}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                          {opt.desc}
                        </p>
                      </div>
                      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: isSelected ? '#ff416c' : '#888', fontWeight: 'bold' }}>
                        <span>Sub: {opt.sub_bass > 0 ? `+${opt.sub_bass}` : opt.sub_bass} dB</span>
                        <span>Mid: {opt.mid_bass > 0 ? `+${opt.mid_bass}` : opt.mid_bass} dB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#d452d1', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🎸 GAMMA MEDIA (Voci & Calore Acustico)</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {MIDS_OPTIONS.map((opt) => {
                  const isSelected = state.listeningPreferences.low_mids_gain === opt.low_mids && state.listeningPreferences.high_mids_gain === opt.high_mids;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => dispatch({ type: 'UPDATE_PREF', payload: { low_mids_gain: opt.low_mids, high_mids_gain: opt.high_mids } })}
                      style={{
                        background: isSelected ? 'rgba(212, 82, 209, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                        border: `2px solid ${isSelected ? '#d452d1' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '16px',
                        padding: '18px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isSelected ? '0 8px 25px rgba(212, 82, 209, 0.25)' : 'none'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: isSelected ? '#fff' : '#eee', fontSize: '1rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span>{opt.title}</span>
                          {isSelected && <CheckCircle size={18} color="#d452d1" style={{ flexShrink: 0 }} />}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                          {opt.desc}
                        </p>
                      </div>
                      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: isSelected ? '#d452d1' : '#888', fontWeight: 'bold' }}>
                        <span>Low-Mid: {opt.low_mids > 0 ? `+${opt.low_mids}` : opt.low_mids} dB</span>
                        <span>High-Mid: {opt.high_mids > 0 ? `+${opt.high_mids}` : opt.high_mids} dB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#00ff87', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>⚡ GAMMA ALTA (Dettaglio, Aria & Spazialità)</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {TREBLE_OPTIONS.map((opt) => {
                  const isSelected = state.listeningPreferences.presence_gain === opt.presence && state.listeningPreferences.brilliance_gain === opt.brilliance;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => dispatch({ type: 'UPDATE_PREF', payload: { presence_gain: opt.presence, brilliance_gain: opt.brilliance } })}
                      style={{
                        background: isSelected ? 'rgba(0, 255, 135, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                        border: `2px solid ${isSelected ? '#00ff87' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '16px',
                        padding: '18px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isSelected ? '0 8px 25px rgba(0, 255, 135, 0.25)' : 'none'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: isSelected ? '#fff' : '#eee', fontSize: '1rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span>{opt.title}</span>
                          {isSelected && <CheckCircle size={18} color="#00ff87" style={{ flexShrink: 0 }} />}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                          {opt.desc}
                        </p>
                      </div>
                      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: isSelected ? '#00ff87' : '#888', fontWeight: 'bold' }}>
                        <span>Presence: {opt.presence > 0 ? `+${opt.presence}` : opt.presence} dB</span>
                        <span>Brilliance: {opt.brilliance > 0 ? `+${opt.brilliance}` : opt.brilliance} dB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '24px', background: 'rgba(0, 0, 0, 0.45)', borderRadius: '20px', border: '1px solid rgba(0, 240, 255, 0.25)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>📊 Brief Generale: Anteprima dell'Enfasi Acustica</span>
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
                Ecco l'anteprima dell'enfasi che hai conferito alle tre gamme sonore. L'IA integrerà questa firma timbrica con la curva del tuo dispositivo:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(255, 65, 108, 0.1)', border: '1px solid rgba(255, 65, 108, 0.3)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#ff416c', fontSize: '1rem' }}>🥁 Gamma Bassa</span>
                    <span style={{ background: '#ff416c', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>
                      {state.listeningPreferences.sub_bass_gain > 0 ? `+${state.listeningPreferences.sub_bass_gain}` : state.listeningPreferences.sub_bass_gain} dB
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#ddd' }}>
                    {BASS_OPTIONS.find(o => o.sub_bass === state.listeningPreferences.sub_bass_gain && o.mid_bass === state.listeningPreferences.mid_bass_gain)?.title.replace(/^[^\s]+\s/, '') || 'Personalizzato'}
                  </span>
                </div>

                <div style={{ background: 'rgba(212, 82, 209, 0.1)', border: '1px solid rgba(212, 82, 209, 0.3)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#d452d1', fontSize: '1rem' }}>🎸 Gamma Media</span>
                    <span style={{ background: '#d452d1', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>
                      {state.listeningPreferences.high_mids_gain > 0 ? `+${state.listeningPreferences.high_mids_gain}` : state.listeningPreferences.high_mids_gain} dB
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#ddd' }}>
                    {MIDS_OPTIONS.find(o => o.low_mids === state.listeningPreferences.low_mids_gain && o.high_mids === state.listeningPreferences.high_mids_gain)?.title.replace(/^[^\s]+\s/, '') || 'Personalizzato'}
                  </span>
                </div>

                <div style={{ background: 'rgba(0, 255, 135, 0.1)', border: '1px solid rgba(0, 255, 135, 0.3)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#00ff87', fontSize: '1rem' }}>⚡ Gamma Alta</span>
                    <span style={{ background: '#00ff87', color: '#000', fontSize: '0.8rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>
                      {state.listeningPreferences.brilliance_gain > 0 ? `+${state.listeningPreferences.brilliance_gain}` : state.listeningPreferences.brilliance_gain} dB
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#ddd' }}>
                    {TREBLE_OPTIONS.find(o => o.presence === state.listeningPreferences.presence_gain && o.brilliance === state.listeningPreferences.brilliance_gain)?.title.replace(/^[^\s]+\s/, '') || 'Personalizzato'}
                  </span>
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.12), rgba(59, 130, 246, 0.2))', borderLeft: '4px solid #00f0ff', padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '1.4rem' }}>🤖</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#00f0ff', fontSize: '0.95rem', marginBottom: '4px' }}>Analisi AI del Timbro Globale</div>
                  <div style={{ color: '#e0e0e0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {state.listeningPreferences.sub_bass_gain > 0 && state.listeningPreferences.brilliance_gain > 0
                      ? "Firma acustica dinamica ed energica (V-Shape o U-Shape elegante). Ottima separazione e coinvolgimento ad ogni livello di volume, con Transient Preamp di sicurezza integrato per evitare distorsione."
                      : state.listeningPreferences.high_mids_gain > 0 || state.listeningPreferences.low_mids_gain > 0
                      ? "Firma acustica centrata sulla naturalezza vocale e acustica. Le voci e gli strumenti solisti emergeranno con una presenza scenica tridimensionale e un calore organico."
                      : "Firma acustica di altissima precisione e coerenza timbrica. Risposta equilibrata pensata per una resa da studio di mastering senza colorazioni estranee."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
