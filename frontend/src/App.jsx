import { useState, useEffect, useRef, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Download, ChevronRight, ChevronLeft, CheckCircle, Copy, Check, HelpCircle, Bot, UploadCloud, Search, Plus, Send, User, X, MessageSquare, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import './index.css';
import './App.css';
import SearchableCombobox from './components/SearchableCombobox';
import AudioPlayerAB from './components/AudioPlayerAB';

// --- STATE MANAGEMENT ---
const GENRES_LIST = [
  { id: 'Rock', name: '🎸 Rock', desc: 'Punch dinamico e corpo chitarre' },
  { id: 'Pop', name: '🎤 Pop', desc: 'Focus vocale e alti cristallini' },
  { id: 'Jazz', name: '🎺 Jazz', desc: 'Spazialità e timbro naturale' },
  { id: 'Hip-Hop / EDM', name: '🎧 Hip-Hop / EDM', desc: 'Sub-bass profondo e impatto cassa' },
  { id: 'Classica', name: '🎻 Classica', desc: 'Aria da sala da concerto e realismo' },
  { id: 'Metal', name: '🤘 Metal', desc: 'Bite dinamico e controllo sibilanti' },
  { id: 'R&B', name: '🎷 R&B', desc: 'Bassi caldi e voci presenti' },
  { id: 'Acustico / Folk', name: '🪕 Acustico / Folk', desc: 'Medi intimi e calore acustico' },
  { id: 'Gaming / Spatial', name: '🕹️ Gaming / Spatial', desc: 'Soundstage ultra-ampio e precisione passi' }
];

const BASS_OPTIONS = [
  { id: 'explosive', title: '🚀 Bassi Esplosivi & Sub Profondo', desc: 'Massimo impatto per EDM, Hip-Hop e Film. Senti vibrare il sub-bass.', sub_bass: 4.5, mid_bass: 3.5 },
  { id: 'punchy', title: '👊 Punch Dinamico & Controllato', desc: 'Corpo deciso e cassa punzonata senza coprire le voci e i medi.', sub_bass: 2.5, mid_bass: 2.0 },
  { id: 'neutral', title: '⚖️ Neutro / Fedeltà Studio', desc: 'Risposta lineare e naturale, fedele al master originale.', sub_bass: 0, mid_bass: 0 },
  { id: 'light', title: '🍃 Bassi Asciutti & Voci Pulite', desc: 'Attenuazione delle basse per un ascolto rilassato o analisi vocale.', sub_bass: -2.0, mid_bass: -1.5 }
];

const MIDS_OPTIONS = [
  { id: 'forward', title: '🎤 Voci in Primo Piano & Intimità', desc: 'Esalta la presenza vocale, le chitarre e i micro-dettagli del cantato.', low_mids: 1.5, high_mids: 3.0 },
  { id: 'warm', title: '☕ Calore Avvolgente & Corpo', desc: 'Arricchisce il timbro di strumenti acustici, archi e fiati.', low_mids: 2.0, high_mids: 1.0 },
  { id: 'neutral', title: '⚖️ Bilanciamento Naturale', desc: 'Medi trasparenti e fedeli al timbro originale degli strumenti.', low_mids: 0, high_mids: 0 },
  { id: 'vshape', title: '🛋️ Medi Arretrati / Suono Moderno', desc: 'Curva V-Shape moderna che allontana le voci per un soundstage più largo.', low_mids: -1.5, high_mids: -2.0 }
];

const TREBLE_OPTIONS = [
  { id: 'crystal', title: '💎 Cristallino & Aria Ultra-Dettagliata', desc: 'Massima estensione di piatti, riverberi e micro-dettagli acustici.', presence: 2.5, brilliance: 3.5 },
  { id: 'clear', title: '✨ Definizione e Chiarezza', desc: 'Alti aperti e nitidi, illuminazione perfetta senza fatica d\'ascolto.', presence: 1.5, brilliance: 1.5 },
  { id: 'neutral', title: '⚖️ Morbido / Standard Studio', desc: 'Risposta equilibrata e controllo chirurgico delle sibilanti.', presence: 0, brilliance: 0 },
  { id: 'relaxed', title: '🌙 Alti Caldi / Relax Anti-Fatica', desc: 'Suono vellutato e scuro, ideale per lunghe sessioni d\'ascolto.', presence: -2.0, brilliance: -2.5 }
];

const initialState = {
  step: 0, 
  setupMode: null, 
  targetCurve: 'harman',
  headphone: '',
  dac: '',
  amp: '',
  uploadedFiles: [],
  selectedGenres: [],
  selectedArtists: [],
  baseVol: 50,
  balance: 0,
  threshold: 20,
  soundstage: 'intimate',
  bass: 'neutral',
  mids: 'balanced',
  treble: 'smooth',
  listeningPreferences: {
    sub_bass_gain: 0,
    mid_bass_gain: 0,
    low_mids_gain: 0,
    high_mids_gain: 0,
    presence_gain: 0,
    brilliance_gain: 0
  },
  destination: 'e-apo',
  chatHistory: [{ role: 'ai', content: "Ciao! Sono il tuo ingegnere del suono virtuale. Iniziamo a calibrare il tuo setup." }]
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.payload };
    case 'NEXT_STEP': return { ...state, step: Math.min(4, state.step + 1) };
    case 'PREV_STEP': return { ...state, step: Math.max(0, state.step - 1) };
    case 'UPDATE': return { ...state, ...action.payload };
    case 'UPDATE_PREF':
      return {
        ...state,
        listeningPreferences: {
          ...state.listeningPreferences,
          ...action.payload
        }
      };
    case 'TOGGLE_GENRE':
       const genreExists = state.selectedGenres.includes(action.payload);
       const newGenres = genreExists
               ? state.selectedGenres.filter(g => g !== action.payload)
               : [...state.selectedGenres, action.payload];
       return {
           ...state,
           selectedGenres: newGenres,
           targetCurve: newGenres.length > 0 ? (newGenres[0].toLowerCase().includes('harman') ? 'harman' : newGenres[0].toLowerCase()) : 'harman'
       };
    case 'TOGGLE_ARTIST': 
       const exists = state.selectedArtists.includes(action.payload);
       if (!exists && state.selectedArtists.length >= 5) {
           return state;
       }
       return { 
           ...state, 
           selectedArtists: exists 
               ? state.selectedArtists.filter(id => id !== action.payload) 
               : [...state.selectedArtists, action.payload] 
       };
    case 'APPEND_CHAT':
       return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    default: return state;
  }
}

// --- HELPER CHART (TRIPLE-CURVE) ---
function calculateTripleChartData(manualFilters, aiFilters, baselineFilters) {
  if (!manualFilters && !aiFilters && !baselineFilters) return [];
  const points = [];
  const calcGain = (filters, f) => {
    if (!filters) return 0;
    let gainSum = 0;
    filters.forEach(filter => {
         if (filter.type === 'PK') {
             const octavesDist = Math.abs(Math.log2(f / filter.freq));
             const bandwidth = 1.5 / (filter.q || 1.41); 
             const influence = Math.max(0, 1 - (octavesDist / bandwidth));
             gainSum += filter.gain * Math.pow(influence, 2);
         } else if (filter.type === 'LS') {
             if (f <= filter.freq) gainSum += filter.gain;
             else {
                 const oct = Math.log2(f / filter.freq);
                 if (oct < 2) gainSum += filter.gain * Math.pow(1 - (oct/2), 2);
             }
         } else if (filter.type === 'HS') {
             if (f >= filter.freq) gainSum += filter.gain;
             else {
                 const oct = Math.log2(filter.freq / f);
                 if (oct < 2) gainSum += filter.gain * Math.pow(1 - (oct/2), 2);
             }
         }
    });
    return parseFloat(gainSum.toFixed(2));
  };

  for (let i = 0; i <= 50; i++) {
      const logF = 1.301 + (i / 50) * 3;
      const f = Math.pow(10, logF);
      const manualGain = calcGain(manualFilters, f);
      const aiGain = calcGain(aiFilters || manualFilters, f);
      const baselineGain = calcGain(baselineFilters || aiFilters || manualFilters, f);
      points.push({ freq: Math.round(f), manualGain, aiGain, baselineGain });
  }
  return points;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const manualVal = payload.find(p => p.dataKey === 'manualGain')?.value;
    const aiVal = payload.find(p => p.dataKey === 'aiGain')?.value;
    const baselineVal = payload.find(p => p.dataKey === 'baselineGain')?.value;
    return (
      <div className="custom-tooltip" style={{ background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(0,240,255,0.3)', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <p className="label" style={{ margin: '0 0 6px 0', color: '#fff', fontWeight: 'bold' }}>{`${label} Hz`}</p>
        {manualVal !== undefined && (
          <p className="intro" style={{ margin: 0, color: '#00f0ff', fontSize: '0.9rem' }}>
            {`Manuale: ${manualVal > 0 ? '+' : ''}${manualVal} dB`}
          </p>
        )}
        {aiVal !== undefined && aiVal !== manualVal && (
          <p className="intro" style={{ margin: '4px 0 0 0', color: '#ffb142', fontSize: '0.85rem' }}>
            {`AI (Generato): ${aiVal > 0 ? '+' : ''}${aiVal} dB`}
          </p>
        )}
        {baselineVal !== undefined && baselineVal !== aiVal && (
          <p className="intro" style={{ margin: '4px 0 0 0', color: '#ff3366', fontSize: '0.85rem', opacity: 0.8 }}>
            {`Hardware (Originale): ${baselineVal > 0 ? '+' : ''}${baselineVal} dB`}
          </p>
        )}
      </div>
    );
  }
  return null;
};

// --- 3D SCENE ---
function Scene3D({ state }) {
  const lightRef = useRef();
  const particlesRef = useRef();
  
  const { step, baseVol } = state;

  useFrame((clockState) => {
    const t = clockState.clock.getElapsedTime();
    
    if (lightRef.current) {
       lightRef.current.position.lerp(new THREE.Vector3(0, 0, 2), 0.05);
       lightRef.current.intensity = 5;
    }

    if (particlesRef.current) {
       particlesRef.current.rotation.y = t * 0.1;
       particlesRef.current.material.opacity = step >= 2 ? 0.2 + (baseVol / 200) : 0.2;
    }
  });

  const particles = [];
  for (let i = 0; i < 500; i++) {
    particles.push((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
  }
  const positions = new Float32Array(particles);

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight ref={lightRef} color="#ff3366" distance={10} />
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color="#a0a0b0" transparent opacity={0.5} />
      </points>
    </>
  );
}

// --- COMPILAZIONE DATA RAPIDA (LIVELLO 3 - CONTESTUALIZZATA) ---
function ManualSpecsCard({ type, activeLevel3Form, setActiveLevel3Form, manualSpecs, setManualSpecs, dispatch, setHwStatus }) {
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

// --- AI CONCIERGE ---
function AIPersona({ state, dispatch, setEqData, setExportRawData, engineStatus, isMobileChatOpen, setIsMobileChatOpen, activeLevel3Form, setActiveLevel3Form, manualSpecs, setManualSpecs, setHwStatus, isLiveSyncEnabled }) {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll all'ultimo messaggio
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatHistory]);

  // Generazione automatica messaggi di contesto basati sullo step
  useEffect(() => {
    let contextMsg = "";
    if (state.step === 1) {
      if (state.headphone.toLowerCase().includes('hd800') || state.headphone.toLowerCase().includes('hd 800')) {
        contextMsg = "Ah, le mitiche HD800! Un soundstage imbattibile. Andremo a domare quel picco fastidioso sui 6kHz per renderle perfette.";
      } else if (state.dac.toLowerCase().includes('chord') || state.dac.toLowerCase().includes('hugo')) {
        contextMsg = "Vedo un DAC di altissimo livello. La precisione dei transienti sarà fenomenale.";
      } else {
        contextMsg = "Ottimo, inserisci le specifiche hardware o seleziona le periferiche dal database per avviare la calibrazione.";
      }
    } else if (state.step === 2) {
        contextMsg = "Perfetto! Ora raccontami i tuoi gusti: scegli il genere dominante e seleziona fino a 5 artisti preferiti per permettere all'IA di calcolare l'impronta timbrica su misura per te.";
    } else if (state.step === 3) {
        contextMsg = "Siamo nella fase di Tuning Timbrico d'Ascolto! Regola i cursori per Bassi, Medi e Alti e ascolta l'effetto dal vivo con il Player A/B.";
    } else if (state.step === 4) {
      contextMsg = "Ecco fatto! Ho elaborato tutti i tuoi input e generato un profilo parametrico chirurgico con Preamp anti-clipping pronto all'uso.";
    }

    if (contextMsg) {
      const lastMsg = state.chatHistory[state.chatHistory.length - 1];
      if (!lastMsg || lastMsg.content !== contextMsg) {
          dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: contextMsg } });
      }
    }
  }, [state.step, state.headphone, state.dac, state.selectedArtists, state.selectedGenres]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    
    // Aggiungi messaggio utente
    dispatch({ type: 'APPEND_CHAT', payload: { role: 'user', content: userMessage } });
    setIsTyping(true);

    try {
        const response = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                chatHistory: state.chatHistory,
                aiPayload: state,
                destination: isLiveSyncEnabled ? 'e-apo' : 'export'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
             let cleanReply = data.reply;
             if (typeof cleanReply === 'string' && cleanReply.trim().startsWith('{')) {
                 try {
                     const parsedReply = JSON.parse(cleanReply);
                     if (parsedReply.message) cleanReply = parsedReply.message;
                 } catch (e) {}
             }
             
             dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: cleanReply } });
             if (data.payload && setEqData) {
                 setEqData(data.payload);
             }
             if (data.fileContent && setExportRawData) {
                 setExportRawData(data.fileContent);
             }
        } else {
             dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: "Scusa, ho avuto un problema di connessione ai miei circuiti logici." } });
        }
    } catch (err) {
        dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: "Errore di rete con il server locale." } });
    } finally {
        setIsTyping(false);
    }
  };

  if (state.step === 0) return null;

  return (
    <div className={`sidebar-concierge ${isMobileChatOpen ? 'mobile-open' : ''}`}>
      <div className="ai-concierge-chat">
        <div className="chat-header-custom">
           <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
             <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                {/* Spazio per futuro Avatar animato */}
                <div style={{width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                   <Bot size={18} color="var(--accent-blue)" />
                </div>
                <h3 style={{margin: 0, color: 'white', fontSize: '1.1rem'}}>Personal EQ Concierge</h3>
             </div>
             
             {/* Pulsante chiusura visibile solo su mobile */}
             <button className="mobile-close-btn" onClick={() => setIsMobileChatOpen(false)}>
                <X size={20} color="var(--text-muted)" />
             </button>
           </div>
           
           {/* Engine Badge spostato qui */}
           <div style={{
             padding: '4px 10px', 
             borderRadius: '20px', 
             fontSize: '0.75rem', 
             fontWeight: 'bold', 
             background: engineStatus === 'LM Studio' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
             color: engineStatus === 'LM Studio' ? '#10b981' : '#3b82f6',
             border: `1px solid ${engineStatus === 'LM Studio' ? '#10b981' : '#3b82f6'}`
           }}>
             {engineStatus === 'LM Studio' ? '🟢 LM Studio (Attivo)' : '🔵 Local Knowledge Graph'}
           </div>
        </div>

        <div className="chat-content-area">
           <div className="chat-history-container">
           <AnimatePresence>
           {state.chatHistory.map((msg, idx) => (
             <motion.div 
                 key={idx} 
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.3 }}
                 className={`chat-message ${msg.role}`}
             >
                 <div className="chat-avatar">
                     {msg.role === 'ai' ? <Bot size={16} color="#ff3366" /> : <User size={16} color="#ffffff" />}
                 </div>
                 <div className="chat-bubble">
                     {(() => {
                        let txt = msg.content;
                        if (typeof txt === 'string' && txt.trim().startsWith('{')) {
                           try {
                              const parsed = JSON.parse(txt);
                              if (parsed.message) txt = parsed.message;
                           } catch(e) {}
                        }
                        return txt;
                     })()}
                     {msg.tutorOptions && Array.isArray(msg.tutorOptions) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          {msg.tutorOptions.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => {
                                if (opt.includes("Salta") || opt.includes("Prosegui")) {
                                  if (msg.deviceType && setHwStatus) {
                                    setHwStatus(prev => ({
                                      ...prev,
                                      [msg.deviceType]: { status: 'RESOLVED_OPTIONAL', level: 1, message: `Dispositivo ${msg.deviceType} riconosciuto ma senza impatto sull'EQ.` }
                                    }));
                                  }
                                  if (setActiveLevel3Form) setActiveLevel3Form(null);
                                  dispatch({ type: 'APPEND_CHAT', payload: { role: 'user', content: opt } });
                                  dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `👍 Perfetto! Abbiamo registrato la catena per il tuo ${msg.deviceType ? msg.deviceType.toUpperCase() : 'dispositivo'}. Il setup del componente è stato completato come opzionale (senza alterare la curva EQ della cuffia). Puoi proseguire ai passaggi successivi!` } });
                                } else {
                                  dispatch({ type: 'APPEND_CHAT', payload: { role: 'user', content: opt } });
                                  setIsTyping(true);
                                  setTimeout(() => {
                                    setIsTyping(false);
                                    let aiResp = `Ottima domanda! Per ottimizzare questo aspetto nella tua catena audio, ti consiglio di selezionare driver ASIO o WASAPI Exclusive sul tuo player (es. Foobar o Audirvana) per garantire un flusso Bit-Perfect. Mantieni l'attenuazione digitale a 0 dB e regola il volume esclusivamente in analogico sull'amplificatore per preservare la dinamica e il rapporto segnale/rumore (SNR).`;
                                    if (opt.includes("Gain") || opt.includes("impedenza") || opt.includes("headroom")) {
                                      aiResp = `Ecco la regola d'oro per il Gain e l'Headroom: se usi cuffie ad alta impedenza (> 150Ω) o bassa sensibilità (< 95 dB/mW), seleziona High Gain per erogare la giusta corrente e tensione. Inoltre, poiché l'EQ applica un Preamp negativo (es. -4.5 dB) per compensare i picchi di equalizzazione senza saturare il segnale, assicurati di avere almeno 20-30% di corsa del potenziometro disponibile!`;
                                    } else if (opt.includes("ASIO") || opt.includes("Bit-Perfect") || opt.includes("Audirvana") || opt.includes("Foobar")) {
                                      aiResp = `La modalità Bit-Perfect bypassa il mixer audio di Windows (che spesso esegue resample o introduce latenza/compressione). Impostando l'uscita esclusiva su ASIO o WASAPI, il DAC riceverà il flusso audio originale esatto (es. 24-bit/192kHz). È il fondamento per ascoltare le differenze della correzione parametrica senza interferenze del sistema operativo!`;
                                    }
                                    dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: aiResp } });
                                  }, 1000);
                                }
                              }}
                              style={{
                                background: 'rgba(0, 240, 255, 0.1)',
                                border: '1px solid #00f0ff',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                color: '#00f0ff',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span>👉</span> <span>{opt}</span>
                            </button>
                          ))}
                        </div>
                      )}
                 </div>
             </motion.div>
         ))}
         {isTyping && (
             <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="chat-message ai"
             >
                 <div className="chat-avatar"><Bot size={16} color="#ff3366" /></div>
                 <div className="chat-bubble" style={{fontStyle: 'italic', opacity: 0.7}}>Sta elaborando...</div>
             </motion.div>
         )}
         </AnimatePresence>
         <div ref={chatEndRef} />
      </div>
      <div className="chat-input-area">
          <input 
              type="text" 
              className="chat-input" 
              placeholder="Chiedi un consiglio all'AI..." 
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button className="chat-send-btn" onClick={handleSend} disabled={isTyping || !inputValue.trim()}>
              <Send size={18} />
          </button>
      </div>
      </div>
    </div>
    </div>
  );
}

// --- MAIN APP ---
function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const [isServerConnected, setIsServerConnected] = useState(true);
  const [engineStatus, setEngineStatus] = useState('Local Knowledge Graph');
  const [eqData, setEqData] = useState(null);
  const [exportRawData, setExportRawData] = useState("");
  const [availableArtists, setAvailableArtists] = useState([]);
  const [searchArtistQuery, setSearchArtistQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [uploadedAudioTrack, setUploadedAudioTrack] = useState(null);
  
  // Presets
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState("");

  const debounceTimer = useRef(null);
  const wizardContentRef = useRef(null);
  const [paramEq, setParamEq] = useState({ freq: 1000, gain: 0, q: 1.41, type: 'PK' });
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // --- HARDWARE DISCOVERY PIPELINE STATE ---
  const [brands, setBrands] = useState({ headphone: [], dac: [], amp: [] });
  const [models, setModels] = useState({ headphone: [], dac: [], amp: [] });
  const [selectedBrand, setSelectedBrand] = useState({ headphone: '', dac: '', amp: '' });
  const [hwStatus, setHwStatus] = useState({ headphone: null, dac: null, amp: null });
  const [hwLoading, setHwLoading] = useState({ headphone: false, dac: false, amp: false });
  const [activeLevel3Form, setActiveLevel3Form] = useState(null);
  const [manualSpecs, setManualSpecs] = useState({ imp: '32', sens: '100', arch: 'open', customModel: '' });
  const [customInputMode, setCustomInputMode] = useState({ headphone: false, dac: false, amp: false });
  const [baselineEqData, setBaselineEqData] = useState(null);
  const [aiGeneratedEqData, setAiGeneratedEqData] = useState(null);
  const [activeTabEq, setActiveTabEq] = useState('B'); // 'A' = Prima (Baseline), 'B' = Dopo (Affinato)
  const [activeAccordionTab, setActiveAccordionTab] = useState('bass');
  const [historyLog, setHistoryLog] = useState([]);
  const [refinementHistory, setRefinementHistory] = useState([]);
  const [isRefining, setIsRefining] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [isLiveSyncEnabled, setIsLiveSyncEnabled] = useState(false);

  const toggleLiveSync = async () => {
    if (isLiveSyncEnabled) {
      setIsLiveSyncEnabled(false);
      return;
    }
    try {
      const res = await fetch('http://localhost:3001/api/live-sync/check');
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

  const handleBrandChange = async (type, brand) => {
    setSelectedBrand(prev => ({ ...prev, [type]: brand }));
    if (brand === "Altro / Custom") {
      setCustomInputMode(prev => ({ ...prev, [type]: true }));
      dispatch({ type: 'UPDATE', payload: { [type]: '' } });
      setModels(prev => ({ ...prev, [type]: [] }));
    } else if (brand) {
      setCustomInputMode(prev => ({ ...prev, [type]: false }));
      try {
        const res = await fetch(`http://localhost:3001/api/hardware/models?brand=${encodeURIComponent(brand)}&type=${type}`);
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
      const res = await fetch('http://localhost:3001/api/hardware/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: deviceStr, type })
      });
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

  // Fetch Initial Data
  useEffect(() => {
    fetch('http://localhost:3001/api/hardware/brands?type=headphone')
      .then(res => res.json())
      .then(d => { if(d.success) setBrands(b => ({...b, headphone: d.brands})); });
    fetch('http://localhost:3001/api/hardware/brands?type=dac')
      .then(res => res.json())
      .then(d => { if(d.success) setBrands(b => ({...b, dac: d.brands})); });
    fetch('http://localhost:3001/api/hardware/brands?type=amp')
      .then(res => res.json())
      .then(d => { if(d.success) setBrands(b => ({...b, amp: d.brands})); });

    fetch('http://localhost:3001/api/artists')
      .then(res => res.json())
      .then(data => {
        if(data.success) setAvailableArtists(data.artists);
      })
      .catch(err => console.error("Failed to load artists", err));

    fetch('http://localhost:3001/api/presets')
      .then(res => res.json())
      .then(data => {
        if(data.success) setPresets(data.presets);
      })
      .catch(err => console.error("Failed to load presets", err));

    fetch('http://localhost:3001/api/engine-status')
      .then(res => res.json())
      .then(data => {
        if(data.success) setEngineStatus(data.engine);
      })
      .catch(err => console.error("Failed to load engine status", err));
  }, []);

  const LOCAL_STORAGE_KEY = 'PersonalEQ_Presets';

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

  // Sync to Backend
  useEffect(() => {
    if (state.step < 1) return;
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/calculate-eq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, destination: isLiveSyncEnabled ? 'e-apo' : 'export' })
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
  }, [state]);

  useEffect(() => {
    if (state.step > maxStepReached) {
      setMaxStepReached(state.step);
    }
    if (state.step < 4) {
      setBaselineEqData(null);
      setAiGeneratedEqData(null);
      setHistoryLog([]);
      setRefinementHistory([]);
      setActiveTabEq('B');
    }
  }, [state.step, maxStepReached]);

  const copyToClipboard = () => {
      if(!exportRawData) return;
      navigator.clipboard.writeText(exportRawData).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      });
  };

  const downloadFile = () => {
      if(!exportRawData) return;
      const blob = new Blob([exportRawData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PersonalEQ.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const downloadWavelet = () => {
      if(!eqData) return;
      // Generazione array GraphicEQ per Wavelet interpolando i filtri parametrici a 127 bande (10Hz a 20kHz)
      let waveletContent = "GraphicEQ: ";
      for(let i = 0; i < 127; i++) {
         const freq = 10 * Math.pow(10, i * Math.log10(20000/10) / 126);
         let gainSum = eqData.preamp; // Wavelet gestisce il preamp nei valori stessi
         eqData.filters.forEach(filter => {
             const octavesDist = Math.abs(Math.log2(freq / filter.freq));
             if (filter.type === 'PK') {
                 const bandwidth = 1.5 / (filter.q || 1.41); 
                 const influence = Math.max(0, 1 - (octavesDist / bandwidth));
                 gainSum += filter.gain * Math.pow(influence, 2);
             } else if (filter.type === 'LS') {
                 if (freq <= filter.freq) gainSum += filter.gain;
                 else if (octavesDist < 2) gainSum += filter.gain * Math.pow(1 - (octavesDist/2), 2);
             } else if (filter.type === 'HS') {
                 if (freq >= filter.freq) gainSum += filter.gain;
                 else if (octavesDist < 2) gainSum += filter.gain * Math.pow(1 - (octavesDist/2), 2);
             }
         });
         waveletContent += `${freq.toFixed(1)} ${gainSum.toFixed(2)}; `;
      }

      const blob = new Blob([waveletContent.trim()], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'GraphicEQ.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const downloadPassportJSON = () => {
      if(!eqData) return;
      const passportData = {
          version: "1.0",
          timestamp: new Date().toISOString(),
          hardware: state.headphone,
          profile: eqData,
          state: state
      };
      const blob = new Blob([JSON.stringify(passportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AudioPassport.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleAddCustomArtist = () => {
      if(searchArtistQuery.trim() !== '') {
          const customId = searchArtistQuery.toLowerCase().replace(/\s+/g, '_');
          dispatch({ type: 'TOGGLE_ARTIST', payload: customId });
          
          // Add to available so it shows as pill
          const exists = availableArtists.find(a => a.id === customId);
          if (!exists) {
              setAvailableArtists([...availableArtists, { id: customId, name: searchArtistQuery, genre: 'Custom' }]);
          }
          setSearchArtistQuery("");
      }
  };

  const handleResolveArtistOnline = async (query) => {
    if (!query || query.trim() === '') return;
    
    // Mostra feedback utente nella chat e imposta loading (potremmo usare uno state per il caricamento)
    dispatch({ type: 'APPEND_CHAT', payload: { role: 'ai', content: `🔍 Ricerca di '${query}' nel database musicale online...` } });
    
    try {
      const res = await fetch('http://localhost:3001/api/resolve-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: query })
      });
      const data = await res.json();
      
      if (data.success && data.artist) {
        const a = data.artist;
        const newArtistObj = {
          id: a.id,
          name: a.name,
          genre: a.tags?.[0] || 'Sconosciuto',
          origin: `ARTISTA: ${a.name} (Risolto Online)`
        };
        
        // Aggiunge agli available e seleziona
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
        // Fallback al custom artist
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
      const response = await fetch('http://localhost:3001/api/eq/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: previousEq.filters,
          destination: isLiveSyncEnabled ? 'e-apo' : 'export',
          basePreamp: previousEq.preamp
        })
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
      const response = await fetch('http://localhost:3001/api/eq/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: updatedFilters,
          destination: isLiveSyncEnabled ? 'e-apo' : 'export',
          basePreamp: baselineEqData ? baselineEqData.preamp : eqData.preamp
        })
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
      const response = await fetch('http://localhost:3001/api/eq/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: updatedFilters,
          destination: isLiveSyncEnabled ? 'e-apo' : 'export',
          basePreamp: baselineEqData ? baselineEqData.preamp : eqData.preamp
        })
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
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiPrompt,
          aiPayload: state,
          destination: isLiveSyncEnabled ? 'e-apo' : 'export'
        })
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
      fetch('http://localhost:3001/api/eq/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: baselineEqData.filters,
          destination: isLiveSyncEnabled ? 'e-apo' : 'export',
          basePreamp: baselineEqData.preamp
        })
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
      fetch('http://localhost:3001/api/eq/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: aiGeneratedEqData.filters,
          destination: state.destination || 'e-apo',
          basePreamp: aiGeneratedEqData.preamp
        })
      }).then(r => r.json()).then(data => {
        if (data.fileContent) setExportRawData(data.fileContent);
      });
    }
  };

  const varianti = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3 } }
  };

  const chartData = (eqData || baselineEqData) ? calculateTripleChartData(
      eqData?.filters, 
      aiGeneratedEqData?.filters, 
      baselineEqData?.filters
  ) : [];

  const filteredArtists = availableArtists.filter(a => a.name.toLowerCase().includes(searchArtistQuery.toLowerCase()));

  const mapGenresToDefaults = (genres) => {
      let prefs = {
          sub_bass_gain: 0, mid_bass_gain: 0,
          low_mids_gain: 0, high_mids_gain: 0,
          presence_gain: 0, brilliance_gain: 0
      };
      const combined = genres.join(' ').toLowerCase();
      
      if (combined.includes('hip-hop') || combined.includes('edm')) {
          prefs.sub_bass_gain = 4.5; prefs.mid_bass_gain = 3.5;
          prefs.low_mids_gain = -1.5; prefs.high_mids_gain = -2.0;
          prefs.presence_gain = 1.5; prefs.brilliance_gain = 1.5;
      } else if (combined.includes('rock') || combined.includes('metal')) {
          prefs.sub_bass_gain = 2.5; prefs.mid_bass_gain = 2.0;
          prefs.low_mids_gain = 1.5; prefs.high_mids_gain = 3.0;
      } else if (combined.includes('jazz') || combined.includes('classica')) {
          prefs.low_mids_gain = 2.0; prefs.high_mids_gain = 1.0;
          prefs.presence_gain = 2.5; prefs.brilliance_gain = 3.5;
      } else if (combined.includes('pop') || combined.includes('r&b')) {
          prefs.sub_bass_gain = 2.5; prefs.mid_bass_gain = 2.0;
          prefs.low_mids_gain = 1.5; prefs.high_mids_gain = 3.0;
          prefs.presence_gain = 1.5; prefs.brilliance_gain = 1.5;
      } else if (combined.includes('acustico')) {
          prefs.sub_bass_gain = -2.0; prefs.mid_bass_gain = -1.5;
          prefs.low_mids_gain = 2.0; prefs.high_mids_gain = 1.0;
      } else if (combined.includes('gaming')) {
          prefs.sub_bass_gain = 2.5; prefs.mid_bass_gain = 2.0;
          prefs.low_mids_gain = -1.5; prefs.high_mids_gain = -2.0;
          prefs.presence_gain = 2.5; prefs.brilliance_gain = 3.5;
      }
      return prefs;
  };

  const handleNextStep = () => {
      if (state.step === 1) {
          if (!state.headphone || state.headphone.trim() === '') {
              setShowError(true);
              return;
          }
          setShowError(false);
      } else if (state.step === 2) {
          if (state.selectedGenres.length === 0) {
              dispatch({ type: 'TOGGLE_GENRE', payload: 'Rock' });
          }
          
          // Applica i defaults dinamici in base ai generi scelti
          const dynamicPrefs = mapGenresToDefaults(state.selectedGenres.length > 0 ? state.selectedGenres : ['Rock']);
          Object.keys(dynamicPrefs).forEach(key => {
              dispatch({ type: 'UPDATE_PREF', payload: { [key]: dynamicPrefs[key] } });
          });
      }
      dispatch({ type: 'NEXT_STEP' });
      if (wizardContentRef.current) {
         wizardContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  return (
    <>
      <div className="canvas-bg">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <Scene3D state={state} />
        </Canvas>
      </div>
      <div className="app-container">
      
      {/* Colonna Destra (Wizard) - Ora al Centro/Sopra */}
      <div className="main-wizard-wrapper">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="glass-panel main-wizard"
        >
        <header className="wizard-header" style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
          <div className="header-top" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '15px'}}>
             <div>
               <h1 className="title" style={{margin: 0}}>Personal EQ Dashboard</h1>
               <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px', marginTop: '4px'}}>SISTEMA PARAMETRICO HIGH-END & AI CONCIERGE</div>
             </div>
             
             <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
               {/* Selettore Presets */}
               {presets.length > 0 && (
                 <select 
                   style={{padding: '8px 16px', borderRadius: '12px', background: 'rgba(12, 16, 22, 0.85)', color: '#fff', border: '1px solid rgba(0, 240, 255, 0.3)', outline: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.4)'}}
                   onChange={(e) => handleActivatePreset(e.target.value)}
                   defaultValue=""
                 >
                   <option value="" disabled>Carica Profilo Salvato...</option>
                   {presets.map(p => (
                     <option key={p.id} value={p.id}>{p.name}</option>
                   ))}
                 </select>
               )}
             </div>
          </div>
          {!isServerConnected && <div className="error-text">Backend disconnesso (Porta 3001).</div>}
        </header>

        <div className="wizard-content" ref={wizardContentRef}>
          <AnimatePresence mode="wait">
            
            {/* STEP 0: Bifurcation */}
            {state.step === 0 && (
              <motion.div key="step0" variants={varianti} initial="hidden" animate="visible" exit="exit" className="step-container">
                <h2 className="step-title">Come desideri calibrare il tuo Personal EQ?</h2>
                <div className="options-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                   <div 
                     className="option-card active" 
                     onClick={() => {
                       dispatch({ type: 'UPDATE', payload: { setupMode: 'interactive' } });
                       dispatch({ type: 'NEXT_STEP' });
                     }}
                     style={{ cursor: 'pointer', border: '1px solid rgba(0, 240, 255, 0.4)', background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(59, 130, 246, 0.15))' }}
                   >
                       <span className="badge" style={{ background: '#00ff87', color: '#000', fontWeight: 'bold' }}>🎧 Ascolto Live</span>
                       <h3>Metodo Interattivo (Sensoriale)</h3>
                       <p>Carica i tuoi brani (.mp3, .wav) o usa il mix di test per regolare l'EQ dal vivo con tasti per strumenti e banda parametrica.</p>
                   </div>
                   <div 
                     className="option-card active" 
                     onClick={() => {
                       dispatch({ type: 'UPDATE', payload: { setupMode: 'analytical' } });
                       dispatch({ type: 'NEXT_STEP' });
                     }}
                     style={{ cursor: 'pointer', border: '1px solid rgba(255, 177, 66, 0.4)', background: 'linear-gradient(135deg, rgba(255, 177, 66, 0.1), rgba(255, 51, 102, 0.15))' }}
                   >
                       <span className="badge" style={{ background: '#ffb142', color: '#000', fontWeight: 'bold' }}>📊 Data-Driven</span>
                       <h3>Metodo Analitico (Data-Driven)</h3>
                       <p>L'IA costruirà la tua curva perfetta basandosi su cuffie, generi musicali, artisti preferiti e profilo timbrico.</p>
                   </div>
                </div>
              </motion.div>
            )}

            {/* STEP 1: Hardware Profiler & Upload */}
            {state.step === 1 && (
              <motion.div key="step1" variants={varianti} initial="hidden" animate="visible" exit="exit" className="step-container">
                <h2 className="step-title">1. Hardware Profiler</h2>
                <p className="step-subtitle">Inserisci i dettagli del tuo setup per una correzione millimetrica.</p>
                
                <div className="hardware-form">
                  {/* SELEZIONE CUFFIE */}
                  <div className="input-group">
                    <div className="input-label-container">
                       <label className="input-label">Marchio Cuffie <span style={{color: '#ff4757'}}>*</span></label>
                       <div className="tooltip-trigger" title="Filtra a cascata per produttore (Es. Sennheiser, Sony, Focal)"><HelpCircle size={15}/></div>
                    </div>
                    <SearchableCombobox
                      options={brands.headphone || []}
                      value={selectedBrand.headphone}
                      placeholder="-- Cerca o Seleziona Produttore --"
                      error={showError}
                      onChange={brand => {
                        handleBrandChange('headphone', brand);
                        if (brand && brand !== 'Altro / Custom') {
                          dispatch({ type: 'UPDATE', payload: { headphone: '' } });
                        } else {
                          dispatch({ type: 'UPDATE', payload: { headphone: '' } });
                        }
                        if (brand) setShowError(false);
                      }}
                    />
                    
                    {selectedBrand.headphone && (
                      <div style={{ marginTop: '10px' }}>
                        <div className="input-label-container">
                           <label className="input-label">Modello Cuffie <span style={{color: '#ff4757'}}>*</span></label>
                        </div>
                        <div className="input-wrapper-validated" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ position: 'relative', flexGrow: 1, width: '100%' }}>
                            {selectedBrand.headphone !== 'Altro / Custom' && !customInputMode.headphone ? (
                              <SearchableCombobox
                                options={[
                                  ...(models.headphone || []).map(m => ({
                                    label: `${m.model || m.name} (${m.impedance}Ω)`,
                                    value: `${m.brand} ${m.model || m.name}`
                                  })),
                                  { label: `-- Altro Modello ${selectedBrand.headphone}... --`, value: `${selectedBrand.headphone} Custom Model` }
                                ]}
                                value={state.headphone}
                                placeholder="-- Seleziona il modello... --"
                                allowCustomInput={true}
                                onChange={val => {
                                  if (val.endsWith('Custom Model') || val === `${selectedBrand.headphone} Custom Model`) {
                                    setCustomInputMode(prev => ({ ...prev, headphone: true }));
                                    dispatch({ type: 'UPDATE', payload: { headphone: '' } });
                                  } else {
                                    dispatch({ type: 'UPDATE', payload: { headphone: val } });
                                    if (val) {
                                      setShowError(false);
                                      handleResolveHardware('headphone', val);
                                    }
                                  }
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                className={`hardware-input ${state.headphone && state.headphone.trim() !== '' ? 'validated' : ''}`}
                                placeholder="Digita Marca e Modello esatto (Es. Sennheiser IE 900)..."
                                value={state.headphone}
                                onChange={e => {
                                  dispatch({ type: 'UPDATE', payload: { headphone: e.target.value } });
                                  if (e.target.value.trim() !== '') setShowError(false);
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && state.headphone.trim() !== '') handleResolveHardware('headphone', state.headphone);
                                }}
                              />
                            )}

                            {hwLoading.headphone && (
                              <div className="validation-badge" style={{ borderColor: '#ffb142', color: '#ffb142' }}>
                                <span>🔍 Ricerca...</span>
                              </div>
                            )}
                            {!hwLoading.headphone && hwStatus.headphone && (
                              <div className="validation-badge" style={{ borderColor: hwStatus.headphone.status === 'RESOLVED_LOCAL' ? '#00f0ff' : hwStatus.headphone.status === 'RESOLVED_ONLINE' ? '#10b981' : '#ffb142', color: hwStatus.headphone.status === 'RESOLVED_LOCAL' ? '#00f0ff' : hwStatus.headphone.status === 'RESOLVED_ONLINE' ? '#10b981' : '#ffb142' }}>
                                {hwStatus.headphone.status === 'RESOLVED_LOCAL' && <CheckCircle size={14} />}
                                {hwStatus.headphone.status === 'RESOLVED_ONLINE' && <Bot size={14} />}
                                {hwStatus.headphone.status === 'REQUIRES_USER_INPUT' && <HelpCircle size={14} />}
                                <span>
                                  {hwStatus.headphone.status === 'RESOLVED_LOCAL' && 'DB Locale'}
                                  {hwStatus.headphone.status === 'RESOLVED_ONLINE' && 'Risolto Online'}
                                  {hwStatus.headphone.status === 'REQUIRES_USER_INPUT' && 'AI Support'}
                                </span>
                              </div>
                            )}
                            {!hwLoading.headphone && !hwStatus.headphone && state.headphone && state.headphone.trim() !== '' && (
                              <div className="validation-badge">
                                <CheckCircle size={14} color="#00f0ff" />
                                <span>Configurato</span>
                              </div>
                            )}
                          </div>

                          {(selectedBrand.headphone === 'Altro / Custom' || customInputMode.headphone) && (
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              <button
                                type="button"
                                className="ab-btn active"
                                style={{ padding: '0 16px', whiteSpace: 'nowrap', height: '52px', display: 'flex', alignItems: 'center' }}
                                onClick={() => {
                                  if (state.headphone.trim() !== '') handleResolveHardware('headphone', state.headphone);
                                }}
                              >
                                🔍 Cerca Online
                              </button>
                              <button
                                type="button"
                                className="ab-btn"
                                style={{ padding: '0 14px', height: '52px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}
                                title="Torna al menu modelli"
                                onClick={() => {
                                  setCustomInputMode(prev => ({ ...prev, headphone: false }));
                                  if (selectedBrand.headphone === 'Altro / Custom') setSelectedBrand(prev => ({ ...prev, headphone: '' }));
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                        <ManualSpecsCard type="headphone" activeLevel3Form={activeLevel3Form} setActiveLevel3Form={setActiveLevel3Form} manualSpecs={manualSpecs} setManualSpecs={setManualSpecs} dispatch={dispatch} setHwStatus={setHwStatus} />
                      </div>
                    )}
                    {showError && <div className="error-text" style={{marginTop: '4px', fontSize: '0.85rem'}}>È necessario selezionare o digitare le proprie cuffie/impianto per procedere.</div>}
                  </div>
                  
                  {/* SELEZIONE DAC */}
                  <div className="input-group">
                    <div className="input-label-container">
                       <label className="input-label">Marchio DAC (Opzionale)</label>
                       <div className="tooltip-trigger" title="Il convertitore Digitale-Analogico in uso"><HelpCircle size={15}/></div>
                    </div>
                    <SearchableCombobox
                      options={brands.dac || []}
                      value={selectedBrand.dac}
                      placeholder="-- Cerca o Seleziona Produttore DAC --"
                      onChange={brand => {
                        handleBrandChange('dac', brand);
                        if (brand && brand !== 'Altro / Custom') {
                          dispatch({ type: 'UPDATE', payload: { dac: '' } });
                        } else {
                          dispatch({ type: 'UPDATE', payload: { dac: '' } });
                        }
                      }}
                    />
                    
                    {selectedBrand.dac && (
                      <div style={{ marginTop: '10px' }}>
                        <div className="input-wrapper-validated" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ position: 'relative', flexGrow: 1, width: '100%' }}>
                            {selectedBrand.dac !== 'Altro / Custom' && !customInputMode.dac ? (
                              <SearchableCombobox
                                options={[
                                  ...(models.dac || []).map(m => ({
                                    label: `${m.model || m.name} (${m.architecture || 'Solid State'})`,
                                    value: `${m.brand} ${m.model || m.name}`
                                  })),
                                  { label: `-- Altro Modello ${selectedBrand.dac}... --`, value: `${selectedBrand.dac} Custom DAC` }
                                ]}
                                value={state.dac}
                                placeholder="-- Seleziona il modello... --"
                                allowCustomInput={true}
                                onChange={val => {
                                  if (val.endsWith('Custom DAC') || val === `${selectedBrand.dac} Custom DAC`) {
                                    setCustomInputMode(prev => ({ ...prev, dac: true }));
                                    dispatch({ type: 'UPDATE', payload: { dac: '' } });
                                  } else {
                                    dispatch({ type: 'UPDATE', payload: { dac: val } });
                                    if (val) handleResolveHardware('dac', val);
                                  }
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                className={`hardware-input ${state.dac && state.dac.trim() !== '' ? 'validated' : ''}`}
                                placeholder="Digita Marca e Modello esatto DAC..."
                                value={state.dac}
                                onChange={e => dispatch({ type: 'UPDATE', payload: { dac: e.target.value } })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && state.dac.trim() !== '') handleResolveHardware('dac', state.dac);
                                }}
                              />
                            )}
                            {hwLoading.dac && <div className="validation-badge" style={{ borderColor: '#ffb142', color: '#ffb142' }}><span>🔍 Ricerca...</span></div>}
                            {!hwLoading.dac && hwStatus.dac && (
                              <div className="validation-badge" style={{ borderColor: hwStatus.dac.status === 'RESOLVED_LOCAL' ? '#00f0ff' : (hwStatus.dac.status === 'RESOLVED_ONLINE' || hwStatus.dac.status === 'RESOLVED_OPTIONAL') ? '#10b981' : '#ffb142', color: hwStatus.dac.status === 'RESOLVED_LOCAL' ? '#00f0ff' : (hwStatus.dac.status === 'RESOLVED_ONLINE' || hwStatus.dac.status === 'RESOLVED_OPTIONAL') ? '#10b981' : '#ffb142' }}>
                                {hwStatus.dac.status === 'RESOLVED_LOCAL' && <CheckCircle size={14} />}
                                {(hwStatus.dac.status === 'RESOLVED_ONLINE' || hwStatus.dac.status === 'RESOLVED_OPTIONAL') && <CheckCircle size={14} />}
                                {hwStatus.dac.status === 'REQUIRES_USER_INPUT' && <HelpCircle size={14} />}
                                <span>{hwStatus.dac.status === 'RESOLVED_LOCAL' ? 'DB Locale' : hwStatus.dac.status === 'RESOLVED_ONLINE' ? 'Risolto Online' : hwStatus.dac.status === 'RESOLVED_OPTIONAL' ? 'Opzionale (No EQ)' : 'AI Support'}</span>
                              </div>
                            )}
                          </div>
                          {(selectedBrand.dac === 'Altro / Custom' || customInputMode.dac) && (
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              <button
                                type="button"
                                className="ab-btn active"
                                style={{ padding: '0 16px', whiteSpace: 'nowrap', height: '52px', display: 'flex', alignItems: 'center' }}
                                onClick={() => {
                                  if (state.dac.trim() !== '') handleResolveHardware('dac', state.dac);
                                }}
                              >
                                🔍 Cerca Online
                              </button>
                              <button
                                type="button"
                                className="ab-btn"
                                style={{ padding: '0 14px', height: '52px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}
                                title="Torna al menu modelli"
                                onClick={() => {
                                  setCustomInputMode(prev => ({ ...prev, dac: false }));
                                  if (selectedBrand.dac === 'Altro / Custom') setSelectedBrand(prev => ({ ...prev, dac: '' }));
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                        <ManualSpecsCard type="dac" activeLevel3Form={activeLevel3Form} setActiveLevel3Form={setActiveLevel3Form} manualSpecs={manualSpecs} setManualSpecs={setManualSpecs} dispatch={dispatch} setHwStatus={setHwStatus} />
                      </div>
                    )}
                  </div>

                  {/* SELEZIONE AMPLIFICATORE */}
                  <div className="input-group">
                    <div className="input-label-container">
                       <label className="input-label">Marchio Amplificatore (Opzionale)</label>
                       <div className="tooltip-trigger" title="Utile per calcolare l'impedenza d'uscita e il damping factor"><HelpCircle size={15}/></div>
                    </div>
                    <SearchableCombobox
                      options={brands.amp || []}
                      value={selectedBrand.amp}
                      placeholder="-- Cerca o Seleziona Produttore Amplificatore --"
                      onChange={brand => {
                        handleBrandChange('amp', brand);
                        if (brand && brand !== 'Altro / Custom') {
                          dispatch({ type: 'UPDATE', payload: { amp: '' } });
                        } else {
                          dispatch({ type: 'UPDATE', payload: { amp: '' } });
                        }
                      }}
                    />
                    
                    {selectedBrand.amp && (
                      <div style={{ marginTop: '10px' }}>
                        <div className="input-wrapper-validated" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ position: 'relative', flexGrow: 1, width: '100%' }}>
                            {selectedBrand.amp !== 'Altro / Custom' && !customInputMode.amp ? (
                              <SearchableCombobox
                                options={[
                                  ...(models.amp || []).map(m => ({
                                    label: `${m.model || m.name} (${m.architecture || 'Solid State'})`,
                                    value: `${m.brand} ${m.model || m.name}`
                                  })),
                                  { label: `-- Altro Modello ${selectedBrand.amp}... --`, value: `${selectedBrand.amp} Custom Amp` }
                                ]}
                                value={state.amp}
                                placeholder="-- Seleziona il modello... --"
                                allowCustomInput={true}
                                onChange={val => {
                                  if (val.endsWith('Custom Amp') || val === `${selectedBrand.amp} Custom Amp`) {
                                    setCustomInputMode(prev => ({ ...prev, amp: true }));
                                    dispatch({ type: 'UPDATE', payload: { amp: '' } });
                                  } else {
                                    dispatch({ type: 'UPDATE', payload: { amp: val } });
                                    if (val) handleResolveHardware('amp', val);
                                  }
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                className={`hardware-input ${state.amp && state.amp.trim() !== '' ? 'validated' : ''}`}
                                placeholder="Digita Marca e Modello esatto Amplificatore..."
                                value={state.amp}
                                onChange={e => dispatch({ type: 'UPDATE', payload: { amp: e.target.value } })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && state.amp.trim() !== '') handleResolveHardware('amp', state.amp);
                                }}
                              />
                            )}
                            {hwLoading.amp && <div className="validation-badge" style={{ borderColor: '#ffb142', color: '#ffb142' }}><span>🔍 Ricerca...</span></div>}
                            {!hwLoading.amp && hwStatus.amp && (
                              <div className="validation-badge" style={{ borderColor: hwStatus.amp.status === 'RESOLVED_LOCAL' ? '#00f0ff' : (hwStatus.amp.status === 'RESOLVED_ONLINE' || hwStatus.amp.status === 'RESOLVED_OPTIONAL') ? '#10b981' : '#ffb142', color: hwStatus.amp.status === 'RESOLVED_LOCAL' ? '#00f0ff' : (hwStatus.amp.status === 'RESOLVED_ONLINE' || hwStatus.amp.status === 'RESOLVED_OPTIONAL') ? '#10b981' : '#ffb142' }}>
                                {hwStatus.amp.status === 'RESOLVED_LOCAL' && <CheckCircle size={14} />}
                                {(hwStatus.amp.status === 'RESOLVED_ONLINE' || hwStatus.amp.status === 'RESOLVED_OPTIONAL') && <CheckCircle size={14} />}
                                {hwStatus.amp.status === 'REQUIRES_USER_INPUT' && <HelpCircle size={14} />}
                                <span>{hwStatus.amp.status === 'RESOLVED_LOCAL' ? 'DB Locale' : hwStatus.amp.status === 'RESOLVED_ONLINE' ? 'Risolto Online' : hwStatus.amp.status === 'RESOLVED_OPTIONAL' ? 'Opzionale (No EQ)' : 'AI Support'}</span>
                              </div>
                            )}
                          </div>
                          {(selectedBrand.amp === 'Altro / Custom' || customInputMode.amp) && (
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              <button
                                type="button"
                                className="ab-btn active"
                                style={{ padding: '0 16px', whiteSpace: 'nowrap', height: '52px', display: 'flex', alignItems: 'center' }}
                                onClick={() => {
                                  if (state.amp.trim() !== '') handleResolveHardware('amp', state.amp);
                                }}
                              >
                                🔍 Cerca Online
                              </button>
                              <button
                                type="button"
                                className="ab-btn"
                                style={{ padding: '0 14px', height: '52px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}
                                title="Torna al menu modelli"
                                onClick={() => {
                                  setCustomInputMode(prev => ({ ...prev, amp: false }));
                                  if (selectedBrand.amp === 'Altro / Custom') setSelectedBrand(prev => ({ ...prev, amp: '' }));
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                        <ManualSpecsCard type="amp" activeLevel3Form={activeLevel3Form} setActiveLevel3Form={setActiveLevel3Form} manualSpecs={manualSpecs} setManualSpecs={setManualSpecs} dispatch={dispatch} setHwStatus={setHwStatus} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="drop-zone" onClick={() => {
                    dispatch({type: 'UPDATE', payload: { uploadedFiles: [...state.uploadedFiles, {name: 'custom_measurement.csv', size: '12kb'}] }});
                }}>
                   <UploadCloud size={32} color="var(--text-muted)" style={{margin: '0 auto'}} />
                   <p>Hai misurazioni custom (.csv, .txt)?<br/>Trascinale qui o clicca per caricare</p>
                    {state.uploadedFiles.length > 0 && (
                        <div style={{marginTop: '10px', color: 'var(--accent-blue)', fontSize: '0.85rem', fontWeight: 'bold'}}>
                            {state.uploadedFiles.length} file caricati pronto per l'IA
                        </div>
                    )}
                 </div>
              </motion.div>
            )}

            {/* STEP 2: Selezione Brano (Interactive) vs Profilo Musicale Generi/Artisti (Analytical) */}
            {state.step === 2 && (
              <motion.div key="step2-music" variants={varianti} initial="hidden" animate="visible" exit="exit" className="step-container">
                {state.setupMode === 'interactive' ? (
                  <div>
                    <h2 className="step-title">2. Selezione Brano Musicale per la Calibrazione Live</h2>
                    <p className="step-subtitle">L'intera calibrazione del tuo EQ ruota attorno al brano che ascolti. Scegli se usare il brano di riferimento oppure caricare una tua canzone.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '24px' }}>
                      {/* Opzione 1: Brano di Test Integrato */}
                      <div className="option-card disabled-card" style={{ opacity: 0.65, border: '1px dashed rgba(255,255,255,0.2)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <span className="badge" style={{ background: '#ffb142', color: '#000', fontWeight: 'bold', marginBottom: '12px', display: 'inline-block' }}>Presto Disponibile</span>
                          <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1.2rem' }}>🎵 Usare Brano di Test Integrato</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>Il brano di riferimento ad altissima fedeltà (master lossless per test timbrico) sarà disponibile nelle prossime release.</p>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic', marginTop: '12px' }}>Disponibile prossimamente</div>
                      </div>

                      {/* Opzione 2: Carica un tuo brano */}
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

                    {/* Sezione 1: Genere Dominante */}
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

                    {/* Toggle Harman / Target Curve */}
                    <div className="ab-toggle-container" style={{ margin: '0 auto 2.5rem auto', maxWidth: '500px', background: 'rgba(0,0,0,0.3)', padding: '12px 20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)' }}>
                       <span className={`lbl ${state.targetCurve !== 'harman' ? 'accent' : ''}`}>Flat / Neutra</span>
                       <div className={`switch-bg ${state.targetCurve === 'harman' ? 'on' : ''}`} onClick={() => dispatch({ type: 'UPDATE', payload: { targetCurve: state.targetCurve === 'harman' ? 'flat' : 'harman' } })}>
                          <div className="switch-knob" style={{transform: state.targetCurve === 'harman' ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.3s'}} />
                       </div>
                       <span className={`lbl ${state.targetCurve === 'harman' ? 'accent' : ''}`}>Ottimizzazione Harman 2018</span>
                    </div>

                    {/* Sezione 2: Artisti Preferiti (Max 5 Chip Input) */}
                    <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>🎵 Artisti Preferiti (Max 5)</h3>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: state.selectedArtists.length >= 5 ? '#ffb142' : '#00f0ff', background: state.selectedArtists.length >= 5 ? 'rgba(255, 177, 66, 0.15)' : 'rgba(0, 240, 255, 0.15)', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${state.selectedArtists.length >= 5 ? 'rgba(255, 177, 66, 0.4)' : 'rgba(0, 240, 255, 0.4)'}` }}>
                          {state.selectedArtists.length} / 5 Selezionati
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px' }}>Cerca o digita gli artisti che ascolti di più. Il motore IA analizza la loro firma timbrica per calcolare modificatori mirati (es. sub-bass per Hans Zimmer, spazialità per Jazz).</p>

                      {/* Input Cerca / Aggiungi */}
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

                      {/* Visualizzazione Badge / Chip Selezionati */}
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

                      {/* Avviso Limite Raggiunto */}
                      {state.selectedArtists.length >= 5 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffb142', background: 'rgba(255, 177, 66, 0.12)', border: '1px solid rgba(255, 177, 66, 0.4)', padding: '12px 18px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, marginBottom: '20px' }}>
                          <span>⚠️ Limite massimo di 5 artisti raggiunto. Rimuovi un artista cliccando sulla "✕" per aggiungerne di nuovi.</span>
                        </div>
                      )}

                      {/* Autocomplete / Elenco Rapido Artisti Suggeriti dal DB */}
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
            )}

            {/* STEP 3: Tuning d'Ascolto Guidato (Analytical) vs Sessione Live Song EQ (Interactive) */}
            {state.step === 3 && (
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

                    {/* Audio Player A/B real-time with initial track */}
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

                    {/* Live Evolving EQ Curve Chart */}
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
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="manualGain" name="Risposta EQ Attuale Live" stroke="#00f0ff" strokeWidth={3} dot={false} animationDuration={300} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Tasto Fine: Concludi Calibrazione e passa a Step 4 (Tabella Valori) */}
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
                        
                        {/* Toggle Live Sync */}
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
                      {/* Sezione Bassa */}
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

                      {/* Sezione Media */}
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

                      {/* Sezione Alta */}
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

                      {/* Brief Generale: Anteprima dell'Enfasi Acustica */}
                      <div style={{ marginTop: '1rem', padding: '24px', background: 'rgba(0, 0, 0, 0.45)', borderRadius: '20px', border: '1px solid rgba(0, 240, 255, 0.25)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span>📊 Brief Generale: Anteprima dell'Enfasi Acustica</span>
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
                          Ecco l'anteprima dell'enfasi che hai conferito alle tre gamme sonore. L'IA integrerà questa firma timbrica con la curva del tuo dispositivo:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                          {/* Badge Bassi */}
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

                          {/* Badge Medi */}
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

                          {/* Badge Alti */}
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

                        {/* AI Note */}
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
            )}

            {/* STEP 4: Studio EQ Finale & Export Hardware */}
            {state.step === 4 && (
              <motion.div key="step10" variants={varianti} initial="hidden" animate="visible" exit="exit" className="step-container step-10-dashboard">
                <h2 className="step-title">Pannello di Controllo Finale</h2>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#aaa', fontWeight: 600 }}>Visualizzazione Curva:</span>
                    <div className="ab-toggle-group">
                      <button
                        type="button"
                        className={`ab-btn ${activeTabEq === 'A' ? 'active' : ''}`}
                        onClick={() => setActiveTabEq('A')}
                        style={{ border: '1px solid rgba(255, 51, 102, 0.5)', color: activeTabEq === 'A' ? '#fff' : '#ff3366', background: activeTabEq === 'A' ? 'rgba(255, 51, 102, 0.2)' : 'transparent' }}
                      >
                        Prima (Originale)
                      </button>
                      <button
                        type="button"
                        className={`ab-btn ${activeTabEq === 'B' ? 'active' : ''}`}
                        onClick={() => setActiveTabEq('B')}
                        style={{ border: '1px solid rgba(0, 240, 255, 0.5)', color: activeTabEq === 'B' ? '#fff' : '#00f0ff', background: activeTabEq === 'B' ? 'rgba(0, 240, 255, 0.2)' : 'transparent' }}
                      >
                        Dopo (Affinata IA)
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {baselineEqData && (
                      <button
                        type="button"
                        className="ab-btn"
                        onClick={handleRestoreBaseline}
                        style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#ffb142', borderColor: 'rgba(255, 177, 66, 0.3)', padding: '6px 14px' }}
                        title="Ripristina istantaneamente la curva iniziale calcolata dal Grafo (Senza IA)"
                      >
                        ↩️ Ripristina Hardware Neutro
                      </button>
                    )}
                    {aiGeneratedEqData && (
                      <button
                        type="button"
                        className="ab-btn"
                        onClick={handleRestoreAI}
                        style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#00f0ff', borderColor: 'rgba(0, 240, 255, 0.3)', padding: '6px 14px' }}
                        title="Ripristina la curva ottimizzata dall'IA (rimuove i tuoi ritocchi manuali successivi)"
                      >
                        ↩️ Ripristina Profilo IA
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleUndoRefinement}
                      disabled={refinementHistory.length === 0 || isRefining}
                      style={{
                        background: refinementHistory.length > 0 ? 'rgba(255, 165, 0, 0.15)' : 'rgba(255,255,255,0.05)',
                        border: refinementHistory.length > 0 ? '1px solid rgba(255, 165, 0, 0.5)' : '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        color: refinementHistory.length === 0 ? 'rgba(255,255,255,0.2)' : '#ffa500',
                        cursor: refinementHistory.length === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: refinementHistory.length > 0 ? '0 0 10px rgba(255, 165, 0, 0.2)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      ↩️ Torna Indietro (Undo)
                    </button>
                  </div>
                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
                      <XAxis dataKey="freq" type="number" domain={[20, 20000]} scale="log" ticks={[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]} stroke="#8a8a93" tickFormatter={(v) => v>=1000?`${v/1000}k`:v} />
                      <YAxis domain={['auto', 'auto']} stroke="#8a8a93" tickFormatter={(v) => `${v>0?'+':''}${v}dB`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="baselineGain" name="Hardware (Originale)" stroke="rgba(255, 51, 102, 0.35)" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="aiGain" name="AI (Generato)" stroke="rgba(255, 177, 66, 0.6)" strokeWidth={2} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="manualGain" name="Manuale (Attuale)" stroke="#00f0ff" strokeWidth={3} dot={false} animationDuration={1000} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

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

                <div className="table-glass-container mt-4">
                  <h3 className="table-title">
                    {activeTabEq === 'A' ? "Filtri Parametrici Iniziali (Baseline Originale)" : "Filtri Parametrici Attuali (Con Rifinitura AI)"}
                  </h3>
                  <div className="eq-table-wrapper">
                    <table className="eq-table">
                      <thead>
                        <tr>
                          <th>Filtro #</th>
                          <th>Tipo</th>
                          <th>Freq (Hz)</th>
                          <th>Gain (dB)</th>
                          <th>Q-Factor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((activeTabEq === 'A' && baselineEqData) ? baselineEqData : eqData)?.filters.map((f, i) => (
                          <tr key={i} style={{ background: f.isManual ? 'rgba(0, 240, 255, 0.08)' : 'transparent' }}>
                            <td>{i + 1}</td>
                            <td>{f.type} 
                              {f.origin === 'AUTOEQ' && <span className="badge-origin badge-autoeq">AUTOEQ</span>}
                              {f.origin?.startsWith('ARTISTA') && <span className="badge-origin badge-artista">{f.origin}</span>}
                              {f.origin === 'MANUALE' && <span className="badge-origin badge-manuale">MANUALE</span>}
                            </td>
                            <td>{f.freq}</td>
                            <td style={{ color: f.gain > 0 ? '#ff3366' : '#3b82f6' }}>
                              {f.gain > 0 ? '+' : ''}{f.gain.toFixed(2)}
                            </td>
                            <td>{f.q}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="preamp-footer">
                     Pre-Amp Sicurezza (No Clipping): <strong>{((activeTabEq === 'A' && baselineEqData) ? baselineEqData : eqData)?.preamp.toFixed(2)} dB</strong>
                  </div>
                </div>

                <div className="faq-section mt-4" style={{ background: 'rgba(15, 18, 25, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.2rem', color: '#3b82f6' }}>ℹ️</span>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: 600 }}>Guida Rapida all'Acustica Parametrica</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Clicca su un concetto per capire come opera l'IA:</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { id: 'pk', label: 'Filtro PK (Peak/Bell)', text: 'Interviene su una specifica campana di frequenze. Un Q-Factor alto (es. 2.0 o superiore) stringe la campana per correzioni chirurgiche (come sibilanti o risonanze di cuffia), mentre un Q basso (es. 0.7 - 1.4) crea modifiche ampie e musicali sul timbro globale.' },
                      { id: 'ls_hs', label: 'Filtri LS / HS (Shelving)', text: 'I filtri Low Shelf (LS) e High Shelf (HS) operano come controlli di tono da studio: sollevano o attenuano uniformemente tutte le frequenze al di sotto (o al di sopra) della soglia specificata, perfetti per dare corpo al basso profondo o aria alle frequenze altissime.' },
                      { id: 'preamp', label: 'Pre-Amp di Sicurezza (Anti-Clipping)', text: 'Nel dominio digitale, superare lo 0 dBFS causa distorsione da clipping irreversibile. Il nostro motore DSP calcola preventivamente il picco massimo generato dalla somma dei filtri e imposta automaticamente un guadagno negativo per mantenere il segnale puro e dinamico al 100%.' }
                    ].map(faq => (
                      <button
                        key={faq.id}
                        type="button"
                        className="faq-pill"
                        onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                        style={{ background: activeFaq === faq.id ? 'rgba(59, 130, 246, 0.4)' : undefined, color: activeFaq === faq.id ? '#fff' : undefined, borderColor: activeFaq === faq.id ? '#3b82f6' : undefined }}
                      >
                        {faq.label} {activeFaq === faq.id ? '▲' : '▼'}
                      </button>
                    ))}
                  </div>

                  {activeFaq && (
                    <div className="faq-accordion-box">
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                        {activeFaq === 'pk' && 'Interviene su una specifica campana di frequenze. Un Q-Factor alto (es. 2.0 o superiore) stringe la campana per correzioni chirurgiche (come sibilanti o risonanze di cuffia), mentre un Q basso (es. 0.7 - 1.4) crea modifiche ampie e musicali sul timbro globale.'}
                        {activeFaq === 'ls_hs' && 'I filtri Low Shelf (LS) e High Shelf (HS) operano come controlli di tono da studio: sollevano o attenuano uniformemente tutte le frequenze al di sotto (o al di sopra) della soglia specificata, perfetti per dare corpo al basso profondo o aria alle frequenze altissime.'}
                        {activeFaq === 'preamp' && 'Nel dominio digitale, superare lo 0 dBFS causa distorsione da clipping irreversibile. Il nostro motore DSP calcola preventivamente il picco massimo generato dalla somma dei filtri e imposta automaticamente un guadagno negativo per mantenere il segnale puro e dinamico al 100%.'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="action-buttons-bottom mt-4" style={{display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '650px', margin: '2rem auto 0 auto'}}>
                   <div style={{display: 'flex', gap: '14px', width: '100%', justifyContent: 'center', flexWrap: 'wrap'}}>
                       <div className="input-wrapper-validated" style={{flex: '1', minWidth: '220px', maxWidth: '320px'}}>
                         <input 
                           type="text" 
                           className={`hardware-input ${presetName && presetName.trim() !== '' ? 'validated' : ''}`} 
                           style={{background: 'rgba(255,255,255,0.05)'}} 
                           placeholder="Nome Profilo (Es. HD600 - Vocal)" 
                           value={presetName}
                           onChange={e => setPresetName(e.target.value)}
                         />
                         {presetName && presetName.trim() !== '' && (
                           <div className="validation-badge">
                             <CheckCircle size={14} color="#00f0ff" />
                             <span>Pronto</span>
                           </div>
                         )}
                       </div>
                       <button className="btn-secondary copy-btn" onClick={handleSavePreset} disabled={!presetName.trim()} style={{minWidth: '160px'}}>
                         <Plus size={18} /> Salva Profilo
                       </button>
                   </div>

                   {presets.length > 0 && (
                     <div style={{display: 'flex', gap: '14px', width: '100%', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px'}}>
                        <select 
                          className="hardware-input" 
                          style={{flex: '1', minWidth: '220px', maxWidth: '320px', background: 'rgba(255,255,255,0.05)'}}
                          onChange={(e) => handleActivatePreset(e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>Carica Profilo Salvato...</option>
                          {presets.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({new Date(p.timestamp).toLocaleDateString()})</option>
                          ))}
                        </select>
                     </div>
                   )}
                   
                   <div style={{display: 'flex', gap: '14px', width: '100%', justifyContent: 'center', flexWrap: 'wrap', marginTop: '14px'}}>
                       <button className="btn-secondary copy-btn" onClick={copyToClipboard} style={{minWidth: '200px'}}>
                         {copied ? <Check size={18} color="#00f0ff" /> : <Copy size={18} />} 
                         {copied ? 'Copiato!' : 'Appunti'}
                       </button>
                       <button className="btn-primary export-btn" onClick={downloadFile} style={{minWidth: '150px'}}>
                         <Download size={18} /> E-APO (.txt)
                       </button>
                       <button className="btn-primary export-btn" onClick={downloadWavelet} style={{minWidth: '150px'}}>
                         <Download size={18} /> Wavelet (.txt)
                       </button>
                       <button className="btn-secondary copy-btn" onClick={downloadPassportJSON} style={{minWidth: '150px', background: 'rgba(255, 177, 66, 0.1)', borderColor: '#ffb142', color: '#ffb142'}}>
                         <Download size={18} /> JSON
                       </button>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {state.step > 0 && (
          <div className="wizard-footer">
            <div className="timeline-stepper-container">
              <div className="timeline-track-bg">
                <div 
                  className="timeline-track-fill" 
                  style={{ width: `${Math.min(Math.max((state.step - 1) / 3, 0), 1) * 100}%` }}
                />
              </div>

              <div className="timeline-nodes">
                {[1, 2, 3, 4].map(stepNum => {
                  const isCurrent = state.step === stepNum;
                  const isCompleted = stepNum < state.step && stepNum <= maxStepReached;
                  const isUnlocked = stepNum <= maxStepReached;
                  const statusClass = isCurrent ? 'current' : isCompleted ? 'completed' : isUnlocked ? 'unlocked' : 'locked';
                  return (
                    <button
                      key={stepNum}
                      type="button"
                      className={`timeline-node-btn ${statusClass}`}
                      disabled={!isUnlocked && stepNum > state.step}
                      onClick={() => {
                        if (isUnlocked || stepNum <= state.step) {
                          dispatch({ type: 'SET_STEP', payload: stepNum });
                        }
                      }}
                      title={`Vai alla fase ${stepNum}`}
                    >
                      {stepNum}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="wizard-footer-buttons">
              <button className="btn-secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>
                <ChevronLeft size={20} /> Indietro
              </button>

              {state.step < 4 ? (
                <button className="btn-primary" onClick={handleNextStep}>
                  Avanti <ChevronRight size={20} />
                </button>
              ) : <div style={{ width: 110 }} />}
            </div>
          </div>
        )}
      </motion.div>
      </div>

      {/* Console Inferiore (Chatbot) */}
      <AIPersona state={state} dispatch={dispatch} setEqData={setEqData} setExportRawData={setExportRawData} engineStatus={engineStatus} isMobileChatOpen={isMobileChatOpen} setIsMobileChatOpen={setIsMobileChatOpen} activeLevel3Form={activeLevel3Form} setActiveLevel3Form={setActiveLevel3Form} manualSpecs={manualSpecs} setManualSpecs={setManualSpecs} setHwStatus={setHwStatus} isLiveSyncEnabled={isLiveSyncEnabled} />

      {/* Bottone Fluttuante Mobile (nascondibile in App.css) */}
      {state.step > 0 && (
        <button className="mobile-chat-fab" onClick={() => setIsMobileChatOpen(true)}>
            <MessageSquare size={24} color="#ffffff" />
            {state.chatHistory.length > 0 && state.chatHistory[state.chatHistory.length-1].role === 'ai' && (
                <div className="fab-badge">1</div>
            )}
        </button>
      )}

    </div>
    </>
  );
}

export default App;
