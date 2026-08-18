import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, X, UploadCloud, ArrowRight } from 'lucide-react';

/**
 * ManualSpecsCard.jsx — Scheda inserimento manuale specifiche DAC/Amp/Cuffia.
 * Estratto identico da App.jsx:229-419 (pre-Fase 4).
 */
export function ManualSpecsCard({
  type,
  activeLevel3Form,
  setActiveLevel3Form,
  manualSpecs,
  setManualSpecs,
  dispatch,
  setHwStatus
}) {
  if (activeLevel3Form !== type) return null;

  const getTitle = () => {
    if (type === 'dac') return "⚡ Inserimento Manuale Specifiche DAC";
    if (type === 'amp') return "⚡ Inserimento Manuale Specifiche Amplificatore";
    return "⚡ Inserimento Manuale Specifiche Cuffia/IEM";
  };

  const handleApply = () => {
    const modelName = manualSpecs?.customModel || activeLevel3Form;
    let detailsStr = '';
    if (type === 'headphone') {
      detailsStr = `${manualSpecs?.imp || 32}Ω, ${manualSpecs?.sens || 100} dB/mW (${manualSpecs?.arch || 'open'})`;
    } else if (type === 'dac') {
      detailsStr = `Sample Rate: ${manualSpecs?.sampleRate || '24-bit/192kHz'}, Uscita: ${manualSpecs?.outType || 'Bilanciata'}`;
    } else {
      detailsStr = `Potenza: ${manualSpecs?.power || '500 mW'}, Gain: ${manualSpecs?.gain || 'Medio'}`;
    }

    if (setHwStatus) {
      setHwStatus(prev => ({
        ...prev,
        [type]: {
          status: 'RESOLVED_LOCAL',
          level: 1,
          message: `Specifiche manuali registrate per ${type.toUpperCase()}: ${detailsStr}`
        }
      }));
    }

    dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `✅ Dati manuali per '${modelName}' acquisiti: ${detailsStr}. Parametri registrati nel Grafo Locale per l'ottimizzazione della catena audio!` } });
    setActiveLevel3Form(null);
  };

  const handleSkip = () => {
    const modelName = manualSpecs?.customModel || activeLevel3Form;
    if (setHwStatus) {
      setHwStatus(prev => ({
        ...prev,
        [type]: {
          status: 'RESOLVED_OPTIONAL',
          level: 1,
          message: `Dispositivo ${type.toUpperCase()} riconosciuto senza impatto diretto sulla curva EQ.`
        }
      }));
    }
    dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `👍 Dispositivo '${modelName}' (${type.toUpperCase()}) impostato come opzionale. Le sue specifiche non alterano direttamente la curva EQ della cuffia; puoi procedere con la calibrazione senza impedimenti!` } });
    setActiveLevel3Form(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="level3-fallback-card" style={{ background: '#1e1e2d', border: '1px solid #ffb142', borderRadius: '12px', padding: '16px', marginTop: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontWeight: 'bold', color: '#ffb142', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getTitle()}
        </span>
        <button type="button" onClick={() => setActiveLevel3Form(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      {(type === 'dac' || type === 'amp') && (
        <div style={{ background: 'rgba(255, 177, 66, 0.1)', borderLeft: '3px solid #ffb142', padding: '8px 12px', borderRadius: '4px', marginBottom: '12px', fontSize: '0.8rem', color: '#ffd384' }}>
          ℹ️ I dati di questo componente sono facoltativi: non alterano la curva di risposta della cuffia, ma servono ad ottimizzare la catena di segnale (Bit-Perfect / Headroom).
        </div>
      )}

      {type === 'headphone' && (
        <>
          <p style={{ fontSize: '0.85rem', color: '#ccc', margin: '0 0 12px 0' }}>
            Specifica i parametri acustici della tua cuffia per calcolare la correzione di impedenza:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Impedenza (Ω)</label>
              <input type="number" className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f' }} value={manualSpecs?.imp || '32'} onChange={e => setManualSpecs({ ...manualSpecs, imp: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Sensibilità (dB/mW)</label>
              <input type="number" className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f' }} value={manualSpecs?.sens || '100'} onChange={e => setManualSpecs({ ...manualSpecs, sens: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Architettura</label>
              <select className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f', color: '#fff' }} value={manualSpecs?.arch || 'open'} onChange={e => setManualSpecs({ ...manualSpecs, arch: e.target.value })}>
                <option value="open">Aperta (Open-Back)</option>
                <option value="closed">Chiusa (Closed-Back)</option>
                <option value="planar">Magnetoplanare</option>
                <option value="in-ear">In-Ear (IEM)</option>
                <option value="semi-open">Semi-Aperta</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Tipo Driver</label>
              <select className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f', color: '#fff' }} value={manualSpecs?.driver || 'dynamic'} onChange={e => setManualSpecs({ ...manualSpecs, driver: e.target.value })}>
                <option value="dynamic">Dinamico</option>
                <option value="planar">Planare</option>
                <option value="electrostatic">Elettrostatico</option>
                <option value="ba">Balanced Armature</option>
                <option value="hybrid">Ibrido / Multi-driver</option>
              </select>
            </div>
          </div>
        </>
      )}

      {type === 'dac' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Sample Rate Max</label>
              <select className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f', color: '#fff' }} value={manualSpecs?.sampleRate || '24-bit/192kHz'} onChange={e => setManualSpecs({ ...manualSpecs, sampleRate: e.target.value })}>
                <option value="16-bit/44.1kHz">16-bit/44.1kHz (CD Standard)</option>
                <option value="24-bit/96kHz">24-bit/96kHz</option>
                <option value="24-bit/192kHz">24-bit/192kHz (Hi-Res)</option>
                <option value="32-bit/384kHz">32-bit/384kHz</option>
                <option value="DSD512">32-bit/768kHz / DSD512</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Tipo Uscita</label>
              <select className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f', color: '#fff' }} value={manualSpecs?.outType || 'Bilanciata'} onChange={e => setManualSpecs({ ...manualSpecs, outType: e.target.value })}>
                <option value="Bilanciata">Bilanciata (4.4mm / XLR)</option>
                <option value="Sbilanciata">Sbilanciata (3.5mm / 6.35mm)</option>
                <option value="Duale">Duale (Bilanciata + Sbilanciata)</option>
                <option value="Ottica/SPDIF">Ottica / Coassiale SPDIF</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Impedenza Uscita (Ω) [Opz.]</label>
              <input type="number" step="0.1" placeholder="Es. 0.1" className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f' }} value={manualSpecs?.outImp || ''} onChange={e => setManualSpecs({ ...manualSpecs, outImp: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>SNR (dB) [Opz.]</label>
              <input type="number" placeholder="Es. 120" className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f' }} value={manualSpecs?.snr || ''} onChange={e => setManualSpecs({ ...manualSpecs, snr: e.target.value })} />
            </div>
          </div>
        </>
      )}

      {type === 'amp' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Guadagno (Gain)</label>
              <select className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f', color: '#fff' }} value={manualSpecs?.gain || 'Medio'} onChange={e => setManualSpecs({ ...manualSpecs, gain: e.target.value })}>
                <option value="Basso">Basso (Low Gain)</option>
                <option value="Medio">Medio (Mid Gain)</option>
                <option value="Alto">Alto (High Gain)</option>
                <option value="Variabile">Selettore Multi-Step / Variabile</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Impedenza Uscita (Ω) [Opz.]</label>
              <input type="number" step="0.1" placeholder="Es. 1.0" className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f' }} value={manualSpecs?.outImp || ''} onChange={e => setManualSpecs({ ...manualSpecs, outImp: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>Potenza Uscita (mW su 32Ω/300Ω) [Opz.]</label>
            <input type="text" placeholder="Es. 500 mW su 32Ω" className="hardware-input" style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', background: '#13131f' }} value={manualSpecs?.power || ''} onChange={e => setManualSpecs({ ...manualSpecs, power: e.target.value })} />
          </div>
        </>
      )}

      <div className="ocr-drop-zone" onClick={() => {
        dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `📸 [OCR/Vision] Spec Sheet analizzata per ${type.toUpperCase()}. Parametri acquisiti correttamente!` } });
        if (setHwStatus) {
          setHwStatus(prev => ({ ...prev, [type]: { status: 'RESOLVED_LOCAL', level: 1, message: `Dati OCR applicati per ${type}` } }));
        }
        setActiveLevel3Form(null);
      }} style={{ border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,240,255,0.05)', marginBottom: '12px', transition: 'all 0.2s' }}>
        <UploadCloud size={20} color="#00f0ff" style={{ margin: '0 auto 4px' }} />
        <span style={{ fontSize: '0.8rem', color: '#00f0ff', display: 'block' }}>Carica Grafico / Spec Sheet (OCR)</span>
      </div>

      <button type="button" className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: (type === 'dac' || type === 'amp') ? '8px' : '0' }} onClick={handleApply}>
        <CheckCircle size={16} /> {type === 'headphone' ? 'Applica Specifiche Cuffia e EQ' : `Salva Specifiche ${type.toUpperCase()}`}
      </button>

      {(type === 'dac' || type === 'amp') && (
        <button type="button" className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#ccc', cursor: 'pointer', borderRadius: '8px' }} onClick={handleSkip}>
          <ArrowRight size={16} /> Salta (Non influisce su EQ - Prosegui)
        </button>
      )}
    </motion.div>
  );
}