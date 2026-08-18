/**
 * FineTuningPanel.jsx — Pannello di rifinitura dello Step 4
 * (estratto identico da App.jsx:2348-2466, pre-Fase 4):
 * sintomi guidati + parametrico + assistente IA + cronologia ritocchi.
 */
export function FineTuningPanel({ handleRefineEQ, isRefining, paramEq, setParamEq, handleApplyParametric, aiPrompt, setAiPrompt, isAiProcessing, handleAiParametric, historyLog }) {
  return (
    <div className="fine-tuning-panel mt-4" style={{ background: 'linear-gradient(135deg, rgba(19,19,31,0.85) 0%, rgba(26,26,46,0.85) 100%)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontSize: '1.4rem' }}>🎛️</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>Rifinitura Guidata (Fine-Tuning Acustico)</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Non sei al 100% soddisfatto del primo ascolto? Scegli un sintomo qui sotto per calibrare millimetricamente la risposta con l'AI e aggiornare il DSP in tempo reale:</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
        <button
          type="button"
          className="symptom-pill"
          onClick={() => handleRefineEQ('voci_scure')}
          disabled={isRefining}
        >
          🎙️ Voci Impastate o Scure
          <span className="symptom-sub">(-1.5dB @ 500Hz, +1dB @ 2kHz)</span>
        </button>

        <button
          type="button"
          className="symptom-pill"
          onClick={() => handleRefineEQ('sibilanti')}
          disabled={isRefining}
        >
          🥁 Sibilanti / Piatti Taglienti
          <span className="symptom-sub">(-2.0dB @ 6kHz, -1.5dB @ 8kHz)</span>
        </button>

        <button
          type="button"
          className="symptom-pill"
          onClick={() => handleRefineEQ('chitarre_medi')}
          disabled={isRefining}
        >
          🎸 Chitarre coprono le Voci
          <span className="symptom-sub">(-1.5dB @ 1kHz, +1.5dB @ 3kHz)</span>
        </button>

        <button
          type="button"
          className="symptom-pill"
          onClick={() => handleRefineEQ('bassi_rimbombo')}
          disabled={isRefining}
        >
          🔊 Bassi Invadenti o Rimbombo
          <span className="symptom-sub">(-2.0dB @ 120Hz, +1.0dB @ 60Hz)</span>
        </button>

          <button
            type="button"
            className="symptom-pill"
            onClick={() => handleRefineEQ('manca_aria')}
            disabled={isRefining}
          >
            📉 Manca Dettaglio e Aria
            <span className="symptom-sub">(+1.5dB @ 10kHz, +1.0dB @ 16kHz)</span>
          </button>
        </div>

        <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚙️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>Fine-Tuning Parametrico (Avanzato)</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Inserisci valori esatti oppure descrivi il problema all'IA (es. "Abbassa di 2dB i 4kHz perché le chitarre sono squillanti").</p>
            </div>
          </div>

          <div className="parametric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#00f0ff' }}>Inserimento Manuale</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: '#aaa', display: 'block' }}>Freq (Hz)</label>
                  <input type="number" className="hardware-input" style={{ width: '100%', padding: '6px', fontSize: '0.85rem', background: '#13131f' }} value={paramEq.freq} onChange={e => setParamEq({...paramEq, freq: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: '#aaa', display: 'block' }}>Gain (dB)</label>
                  <input type="number" step="0.5" className="hardware-input" style={{ width: '100%', padding: '6px', fontSize: '0.85rem', background: '#13131f' }} value={paramEq.gain} onChange={e => setParamEq({...paramEq, gain: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: '#aaa', display: 'block' }}>Q-Factor</label>
                  <input type="number" step="0.1" className="hardware-input" style={{ width: '100%', padding: '6px', fontSize: '0.85rem', background: '#13131f' }} value={paramEq.q} onChange={e => setParamEq({...paramEq, q: e.target.value})} />
                </div>
              </div>
              <button onClick={handleApplyParametric} disabled={isRefining} className="btn-primary" style={{ padding: '8px', fontSize: '0.85rem' }}>
                Applica Filtro
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 177, 66, 0.05)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255, 177, 66, 0.2)' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#ffb142' }}>Assistente IA (Testo Libero)</h4>
              <textarea
                className="hardware-input"
                style={{ width: '100%', padding: '8px', fontSize: '0.85rem', background: '#13131f', resize: 'none', height: '60px' }}
                placeholder="Es. Il rullante della batteria suona troppo secco, dagli più corpo..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              <button onClick={handleAiParametric} disabled={isAiProcessing || isRefining || !aiPrompt.trim()} className="btn-primary" style={{ padding: '8px', fontSize: '0.85rem', background: '#ffb142', color: '#000' }}>
                {isAiProcessing ? "Elaborazione IA..." : "Invia all'IA"}
              </button>
            </div>
          </div>
        </div>

      {historyLog.length > 0 && (
        <div style={{ marginTop: '18px', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', borderLeft: '3px solid #00f0ff', maxHeight: '120px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#00f0ff', fontWeight: 'bold', marginBottom: '6px' }}>Cronologia Ritocchi (Applicati su DSP):</div>
          {historyLog.map((logItem, idx) => (
            <div key={idx} style={{ fontSize: '0.85rem', color: '#e0e0e0', margin: '3px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#00f0ff' }}>✓</span> {logItem}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
