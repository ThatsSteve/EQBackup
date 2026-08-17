import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Activity, UploadCloud, Music, FileAudio, Trash2, Sliders, Music2, CheckCircle, Plus, RefreshCw } from 'lucide-react';

const INSTRUMENT_PRESETS = [
  {
    id: 'vocals',
    name: '🎤 Voci (Vocals)',
    desc: 'Esalta la presenza vocale ed elimina l\'effetto impastato',
    color: '#00f0ff',
    apply: (prefs) => ({
      ...prefs,
      low_mids_gain: (parseFloat(prefs.low_mids_gain) || 0) - 1.5,
      high_mids_gain: (parseFloat(prefs.high_mids_gain) || 0) + 2.5,
      presence_gain: (parseFloat(prefs.presence_gain) || 0) + 1.5,
    }),
    filters: [
      { type: 'PK', freq: 500, gain: -1.5, q: 1.41, name: 'Voci Clean' },
      { type: 'PK', freq: 2500, gain: 2.5, q: 1.41, name: 'Vocals Forward' }
    ]
  },
  {
    id: 'kick_drums',
    name: '🥁 Cassa & Batteria',
    desc: 'Spinta sulla cassa e definizione dell\'attacco del battente',
    color: '#ff416c',
    apply: (prefs) => ({
      ...prefs,
      sub_bass_gain: (parseFloat(prefs.sub_bass_gain) || 0) + 3.5,
      mid_bass_gain: (parseFloat(prefs.mid_bass_gain) || 0) + 2.0,
      presence_gain: (parseFloat(prefs.presence_gain) || 0) + 1.5,
    }),
    filters: [
      { type: 'PK', freq: 60, gain: 3.5, q: 1.2, name: 'Sub Kick' },
      { type: 'PK', freq: 3000, gain: 2.0, q: 1.5, name: 'Beater Attack' }
    ]
  },
  {
    id: 'bass_guitar',
    name: '🎸 Basso Elettrico',
    desc: 'Corpo solido sulle note fondamentali del basso',
    color: '#ff9f43',
    apply: (prefs) => ({
      ...prefs,
      sub_bass_gain: (parseFloat(prefs.sub_bass_gain) || 0) + 2.0,
      mid_bass_gain: (parseFloat(prefs.mid_bass_gain) || 0) + 3.0,
      low_mids_gain: (parseFloat(prefs.low_mids_gain) || 0) - 1.0,
    }),
    filters: [
      { type: 'PK', freq: 100, gain: 3.0, q: 1.41, name: 'Bass Punch' },
      { type: 'PK', freq: 250, gain: -1.0, q: 1.41, name: 'De-Mud' }
    ]
  },
  {
    id: 'acoustic_guitar',
    name: '🪕 Chitarra Acustica',
    desc: 'Calore del legno e brillantezza della plettrata',
    color: '#fabca1',
    apply: (prefs) => ({
      ...prefs,
      low_mids_gain: (parseFloat(prefs.low_mids_gain) || 0) + 1.5,
      high_mids_gain: (parseFloat(prefs.high_mids_gain) || 0) + 2.0,
      presence_gain: (parseFloat(prefs.presence_gain) || 0) + 2.0,
    }),
    filters: [
      { type: 'PK', freq: 1500, gain: 2.0, q: 1.41, name: 'Acoustic Body' },
      { type: 'PK', freq: 4000, gain: 2.0, q: 1.41, name: 'Pick Clarity' }
    ]
  },
  {
    id: 'electric_guitar',
    name: '⚡ Chitarra Elettrica',
    desc: 'Grinta sulle medie e controllo del suono nasale',
    color: '#ee5253',
    apply: (prefs) => ({
      ...prefs,
      low_mids_gain: (parseFloat(prefs.low_mids_gain) || 0) - 1.0,
      high_mids_gain: (parseFloat(prefs.high_mids_gain) || 0) + 2.5,
    }),
    filters: [
      { type: 'PK', freq: 1000, gain: -1.0, q: 1.41, name: 'Anti-Nasal' },
      { type: 'PK', freq: 3000, gain: 2.5, q: 1.41, name: 'Guitar Crunch' }
    ]
  },
  {
    id: 'piano_keys',
    name: '🎹 Pianoforte & Tastiere',
    desc: 'Profondità armonica e risposta cristallina sulle tastiere',
    color: '#54a0ff',
    apply: (prefs) => ({
      ...prefs,
      low_mids_gain: (parseFloat(prefs.low_mids_gain) || 0) + 1.5,
      high_mids_gain: (parseFloat(prefs.high_mids_gain) || 0) + 1.5,
      brilliance_gain: (parseFloat(prefs.brilliance_gain) || 0) + 2.0,
    }),
    filters: [
      { type: 'PK', freq: 500, gain: 1.5, q: 1.2, name: 'Piano Body' },
      { type: 'PK', freq: 2500, gain: 1.5, q: 1.41, name: 'Keys Definition' }
    ]
  },
  {
    id: 'snare_drum',
    name: '🥁 Rullante (Snare)',
    desc: 'Corpo e schiaffo metallico del rullante',
    color: '#5f27cd',
    apply: (prefs) => ({
      ...prefs,
      mid_bass_gain: (parseFloat(prefs.mid_bass_gain) || 0) + 2.0,
      presence_gain: (parseFloat(prefs.presence_gain) || 0) + 2.5,
    }),
    filters: [
      { type: 'PK', freq: 200, gain: 2.0, q: 1.41, name: 'Snare Body' },
      { type: 'PK', freq: 5000, gain: 2.5, q: 1.5, name: 'Snare Snap' }
    ]
  },
  {
    id: 'brass_strings',
    name: '🎺 Fiati & Archi',
    desc: 'Apertura orchestrale e lucentezza degli archi',
    color: '#10ac84',
    apply: (prefs) => ({
      ...prefs,
      high_mids_gain: (parseFloat(prefs.high_mids_gain) || 0) + 1.5,
      presence_gain: (parseFloat(prefs.presence_gain) || 0) + 2.5,
      brilliance_gain: (parseFloat(prefs.brilliance_gain) || 0) + 1.5,
    }),
    filters: [
      { type: 'PK', freq: 1200, gain: 1.5, q: 1.2, name: 'Brass Warmth' },
      { type: 'PK', freq: 6000, gain: 2.5, q: 1.41, name: 'Strings Air' }
    ]
  },
  {
    id: 'cymbals_hihat',
    name: '💎 Piatti & Percussioni',
    desc: 'Brillantezza, estensione e micro-dettaglio dei piatti',
    color: '#00d2d3',
    apply: (prefs) => ({
      ...prefs,
      presence_gain: (parseFloat(prefs.presence_gain) || 0) + 1.5,
      brilliance_gain: (parseFloat(prefs.brilliance_gain) || 0) + 3.0,
    }),
    filters: [
      { type: 'HS', freq: 10000, gain: 3.0, q: 0.7, name: 'Cymbals Sparkle' }
    ]
  },
  {
    id: 'spatial_soundstage',
    name: '🎧 Spazialità 3D',
    desc: 'Apertura del soundstage e bassi tridimensionali',
    color: '#ff9ff3',
    apply: (prefs) => ({
      ...prefs,
      sub_bass_gain: (parseFloat(prefs.sub_bass_gain) || 0) + 2.0,
      brilliance_gain: (parseFloat(prefs.brilliance_gain) || 0) + 2.5,
    }),
    filters: [
      { type: 'LS', freq: 40, gain: 2.0, q: 0.7, name: 'Deep Sub' },
      { type: 'HS', freq: 12000, gain: 2.5, q: 0.7, name: '3D Air' }
    ]
  }
];

export default function AudioPlayerAB({ 
  listeningPreferences = {}, 
  onUpdatePreferences,
  eqData,
  onUpdateEqData,
  activeTab = 'bass',
  isInteractiveMode = false,
  initialFile = null
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEqActive, setIsEqActive] = useState(true);
  const [volume, setVolume] = useState(0.7);
  
  // sourceType: 'synth-loop', 'track-sub', 'track-mids', 'track-treble', 'file'
  const [sourceType, setSourceType] = useState(initialFile ? 'file' : 'synth-loop');
  const [uploadedFile, setUploadedFile] = useState(initialFile || null);
  
  // EQ Mode: 'simple' (Instrument buttons & Sliders) vs 'parametric' (Direct Band Editing)
  const [eqEditMode, setEqEditMode] = useState('simple');

  // Custom Parametric Filters for Live Editing
  const [liveParametricFilters, setLiveParametricFilters] = useState(eqData?.filters || [
    { type: 'LS', freq: 60, gain: 2.0, q: 0.7 },
    { type: 'PK', freq: 500, gain: -1.0, q: 1.41 },
    { type: 'PK', freq: 2500, gain: 1.5, q: 1.41 },
    { type: 'HS', freq: 10000, gain: 2.0, q: 0.7 }
  ]);

  const [newBand, setNewBand] = useState({ type: 'PK', freq: 1000, gain: 2.0, q: 1.41 });
  
  // Web Audio API References
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const gainNodeRef = useRef(null);
  const biquadNodesRef = useRef([]);
  const filtersRef = useRef({});
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isPlayingRef = useRef(false);
  
  const audioElRef = useRef(null);
  const mediaSourceRef = useRef(null);

  // Band levels for animated UI gauges
  const [bandLevels, setBandLevels] = useState({ bass: 0, mids: 0, treble: 0 });

  // Sync eqData filters if provided from outside
  useEffect(() => {
    if (eqData?.filters && eqData.filters.length > 0) {
      setLiveParametricFilters(eqData.filters);
    }
  }, [eqData]);

  // Sync initial file if passed from parent
  useEffect(() => {
    if (initialFile) {
      setUploadedFile(initialFile);
      setSourceType('file');
      if (audioElRef.current) {
        audioElRef.current.src = initialFile.url;
      }
    }
  }, [initialFile]);

  // Update Web Audio API Filter Nodes when preferences or live parametric filters change
  useEffect(() => {
    if (!audioCtxRef.current) return;

    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    if (eqEditMode === 'simple') {
      const prefs = listeningPreferences || {};
      const gains = {
        subBass: isEqActive ? (parseFloat(prefs.sub_bass_gain) || 0) : 0,
        midBass: isEqActive ? (parseFloat(prefs.mid_bass_gain) || 0) : 0,
        lowMids: isEqActive ? (parseFloat(prefs.low_mids_gain) || 0) : 0,
        highMids: isEqActive ? (parseFloat(prefs.high_mids_gain) || 0) : 0,
        presence: isEqActive ? (parseFloat(prefs.presence_gain) || 0) : 0,
        brilliance: isEqActive ? (parseFloat(prefs.brilliance_gain) || 0) : 0,
      };

      const f = filtersRef.current;
      if (f.subBass) f.subBass.gain.setTargetAtTime(gains.subBass, now, 0.05);
      if (f.midBass) f.midBass.gain.setTargetAtTime(gains.midBass, now, 0.05);
      if (f.lowMids) f.lowMids.gain.setTargetAtTime(gains.lowMids, now, 0.05);
      if (f.highMids) f.highMids.gain.setTargetAtTime(gains.highMids, now, 0.05);
      if (f.presence) f.presence.gain.setTargetAtTime(gains.presence, now, 0.05);
      if (f.brilliance) f.brilliance.gain.setTargetAtTime(gains.brilliance, now, 0.05);
    } else {
      // Parametric mode: update dynamic nodes
      biquadNodesRef.current.forEach((node, idx) => {
        const filter = liveParametricFilters[idx];
        if (filter && node) {
          const targetGain = isEqActive ? filter.gain : 0;
          node.frequency.setTargetAtTime(filter.freq, now, 0.05);
          node.gain.setTargetAtTime(targetGain, now, 0.05);
          if (node.Q) node.Q.setTargetAtTime(filter.q || 1.41, now, 0.05);
        }
      });
    }

  }, [listeningPreferences, liveParametricFilters, isEqActive, eqEditMode]);

  // Master Volume
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(volume, audioCtxRef.current.currentTime, 0.05);
    }
    if (audioElRef.current) {
      audioElRef.current.volume = volume;
    }
  }, [volume]);

  // Setup Web Audio Graph
  const setupAudioGraph = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (!analyserRef.current) {
      // Simple mode static Biquad chain
      const subBass = ctx.createBiquadFilter();
      subBass.type = 'lowshelf';
      subBass.frequency.value = 40;

      const midBass = ctx.createBiquadFilter();
      midBass.type = 'peaking';
      midBass.frequency.value = 120;
      midBass.Q.value = 1.0;

      const lowMids = ctx.createBiquadFilter();
      lowMids.type = 'peaking';
      lowMids.frequency.value = 500;
      lowMids.Q.value = 1.0;

      const highMids = ctx.createBiquadFilter();
      highMids.type = 'peaking';
      highMids.frequency.value = 2000;
      highMids.Q.value = 1.0;

      const presence = ctx.createBiquadFilter();
      presence.type = 'peaking';
      presence.frequency.value = 6000;
      presence.Q.value = 1.4;

      const brilliance = ctx.createBiquadFilter();
      brilliance.type = 'highshelf';
      brilliance.frequency.value = 10000;

      filtersRef.current = { subBass, midBass, lowMids, highMids, presence, brilliance };

      // Analyser and Master Gain
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      gainNodeRef.current = masterGain;

      // Connect Simple Chain
      subBass.connect(midBass);
      midBass.connect(lowMids);
      lowMids.connect(highMids);
      highMids.connect(presence);
      presence.connect(brilliance);
      brilliance.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);
    }
    
    // Connect audio element if user uploads a file
    if (audioElRef.current && !mediaSourceRef.current) {
        mediaSourceRef.current = ctx.createMediaElementSource(audioElRef.current);
        mediaSourceRef.current.connect(filtersRef.current.subBass);
    }
  };

  // Synthetic Beat Generator for loop testing
  const triggerBeat = (step) => {
    if (!isPlayingRef.current || !audioCtxRef.current || !filtersRef.current.subBass) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const inputNode = filtersRef.current.subBass;

    const playKick = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(inputNode);
      osc.start(now);
      osc.stop(now + 0.26);
    };

    const playSnare = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(inputNode);
      osc.start(now);
      osc.stop(now + 0.16);
    };

    const playHat = () => {
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'highpass';
      bandpass.frequency.value = 7000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(inputNode);
      noise.start(now);
    };

    const playChord = (freqs) => {
      freqs.forEach(f => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = f;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(1800, now + 0.3);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(inputNode);
        osc.start(now);
        osc.stop(now + 0.46);
      });
    };

    if (sourceType === 'synth-loop') {
        if (step % 4 === 0) playKick();
        if (step === 4 || step === 12) playSnare();
        if (step % 2 === 0 || step === 7 || step === 15) playHat();
        if (step === 0 || step === 6 || step === 10) {
            const freqs = step === 0 ? [261.63, 329.63, 392.00] : step === 6 ? [220.00, 261.63, 329.63] : [293.66, 349.23, 440.00];
            playChord(freqs);
        }
    } else if (sourceType === 'track-sub') {
        if (step % 4 === 0 || step === 14) playKick();
    } else if (sourceType === 'track-mids') {
        if (step % 2 === 0) {
            playChord([261.63 + (step*10), 329.63 + (step*10)]);
        }
    } else if (sourceType === 'track-treble') {
        if (step % 1 === 0) playHat();
        if (step % 4 === 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 6000 + (Math.random()*2000);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(inputNode);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    }
  };

  const togglePlay = () => {
    if (!isPlaying) {
      setupAudioGraph();
      isPlayingRef.current = true;
      setIsPlaying(true);
      startVisualizer();
      
      if (sourceType === 'file' && audioElRef.current) {
          audioElRef.current.play().catch(e => console.error("Error playing file:", e));
      } else {
          let currentStep = 0;
          triggerBeat(currentStep);
          intervalRef.current = setInterval(() => {
            currentStep = (currentStep + 1) % 16;
            triggerBeat(currentStep);
          }, 130);
      }
    } else {
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioElRef.current) audioElRef.current.pause();
      setBandLevels({ bass: 0, mids: 0, treble: 0 });
    }
  };

  const handleSourceChange = (src) => {
      setSourceType(src);
      if (isPlaying) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (audioElRef.current) audioElRef.current.pause();
          
          if (src === 'file' && audioElRef.current) {
              audioElRef.current.play();
          } else if (src !== 'file') {
              let currentStep = 0;
              intervalRef.current = setInterval(() => {
                currentStep = (currentStep + 1) % 16;
                triggerBeat(currentStep);
              }, 130);
          }
      }
  };

  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setUploadedFile({ name: file.name, url });
          if (audioElRef.current) {
              audioElRef.current.src = url;
          }
          handleSourceChange('file');
      }
  };

  // Canvas visualizer loop
  const startVisualizer = () => {
    const draw = () => {
      if (!isPlayingRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      if (analyserRef.current && canvasRef.current) {
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        let bSum = 0, mSum = 0, tSum = 0;
        const bCount = Math.floor(bufferLength * 0.15);
        const mCount = Math.floor(bufferLength * 0.5);
        
        for (let i = 0; i < bufferLength; i++) {
          if (i < bCount) bSum += dataArray[i];
          else if (i < mCount) mSum += dataArray[i];
          else tSum += dataArray[i];
        }

        setBandLevels({
          bass: Math.min(100, Math.round((bSum / bCount) / 2.5)),
          mids: Math.min(100, Math.round((mSum / (mCount - bCount)) / 2.5)),
          treble: Math.min(100, Math.round((tSum / (bufferLength - mCount)) / 2.0)),
        });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;
          let fillStyle = '#00d2ff';
          if (i < bCount) fillStyle = '#ff416c';
          else if (i < mCount) fillStyle = '#8a2387';
          else fillStyle = '#00ff87';

          ctx.fillStyle = fillStyle;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
    };
    draw();
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (uploadedFile) URL.revokeObjectURL(uploadedFile.url);
    };
  }, []);

  const handleApplyInstrumentPreset = (preset) => {
    if (onUpdatePreferences) {
      const updated = preset.apply(listeningPreferences);
      onUpdatePreferences(updated);
    }
  };

  const handleAddLiveBand = () => {
    const updated = [...liveParametricFilters, { ...newBand }];
    setLiveParametricFilters(updated);
    if (onUpdateEqData) {
      onUpdateEqData({ filters: updated, preamp: 0 });
    }
  };

  const handleRemoveLiveBand = (idx) => {
    const updated = liveParametricFilters.filter((_, i) => i !== idx);
    setLiveParametricFilters(updated);
    if (onUpdateEqData) {
      onUpdateEqData({ filters: updated, preamp: 0 });
    }
  };

  const handleUpdateLiveBand = (idx, field, val) => {
    const updated = liveParametricFilters.map((f, i) => {
      if (i === idx) return { ...f, [field]: parseFloat(val) || val };
      return f;
    });
    setLiveParametricFilters(updated);
    if (onUpdateEqData) {
      onUpdateEqData({ filters: updated, preamp: 0 });
    }
  };

  return (
    <div className="audio-player-ab-container" style={{
      background: 'rgba(19, 19, 31, 0.88)',
      border: '1px solid rgba(0, 240, 255, 0.25)',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      backdropFilter: 'blur(12px)'
    }}>
      {/* Header: Title and EQ Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity color="var(--accent-blue)" size={22} className={isPlaying ? "animate-pulse" : ""} />
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Player Audio A/B Live EQ</span>
              <span style={{ fontSize: '0.75rem', color: '#00ff87', fontWeight: 500, background: 'rgba(0, 255, 135, 0.15)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(0, 255, 135, 0.3)' }}>
                Real-Time DSP
              </span>
            </h4>
            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
              Carica un tuo brano o usa il mix di test per ascoltare l'EQ in tempo reale
            </span>
          </div>
        </div>

        {/* Mode Selector & EQ Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Toggle EQ Edit Mode (Simple vs Parametric) */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setEqEditMode('simple')}
              style={{
                background: eqEditMode === 'simple' ? 'linear-gradient(135deg, #00f0ff, #3b82f6)' : 'transparent',
                color: eqEditMode === 'simple' ? '#000' : '#aaa',
                border: 'none', padding: '5px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              🎹 Semplice (Tasti/Strumenti)
            </button>
            <button
              onClick={() => setEqEditMode('parametric')}
              style={{
                background: eqEditMode === 'parametric' ? 'linear-gradient(135deg, #ffb142, #ff416c)' : 'transparent',
                color: eqEditMode === 'parametric' ? '#000' : '#aaa',
                border: 'none', padding: '5px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              🎛️ EQ Parametrica Live
            </button>
          </div>

          {/* EQ Bypass Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setIsEqActive(true)}
              style={{
                background: isEqActive ? 'var(--accent-blue)' : 'transparent',
                color: isEqActive ? '#000' : '#aaa',
                border: 'none', padding: '5px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              🔥 EQ Attivo
            </button>
            <button
              onClick={() => setIsEqActive(false)}
              style={{
                background: !isEqActive ? '#ff4757' : 'transparent',
                color: !isEqActive ? '#fff' : '#aaa',
                border: 'none', padding: '5px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              ⏸️ Flat (Bypass)
            </button>
          </div>
        </div>
      </div>

      {/* Track Source Selection Tabs */}
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.35)', padding: '8px', borderRadius: '12px', overflowX: 'auto', alignItems: 'center' }}>
         <button onClick={() => handleSourceChange('synth-loop')} style={{ ...btnStyle(sourceType === 'synth-loop'), flex: '0 0 auto' }}>
            <Music size={14} /> Mix Completo Synthetic
         </button>
         <button onClick={() => handleSourceChange('track-sub')} style={{ ...btnStyle(sourceType === 'track-sub'), flex: '0 0 auto' }}>
            🥁 Test Sub & Punch
         </button>
         <button onClick={() => handleSourceChange('track-mids')} style={{ ...btnStyle(sourceType === 'track-mids'), flex: '0 0 auto' }}>
            🎤 Test Voci & Medi
         </button>
         <button onClick={() => handleSourceChange('track-treble')} style={{ ...btnStyle(sourceType === 'track-treble'), flex: '0 0 auto' }}>
            ⚡ Test Aria & Dettaglio
         </button>
         
         <div style={{ flex: '1' }}></div>
         
         <div style={{ position: 'relative', flexShrink: 0 }}>
             <button onClick={() => uploadedFile ? handleSourceChange('file') : null} style={{ ...btnStyle(sourceType === 'file'), border: '1px dashed var(--accent-blue)', color: 'var(--accent-blue)', fontWeight: 600 }}>
                {uploadedFile ? <><FileAudio size={14}/> {uploadedFile.name}</> : <><UploadCloud size={14}/> Carica un tuo brano (.mp3, .wav)</>}
             </button>
             <input type="file" accept=".mp3, .wav, .flac" onChange={handleFileUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
         </div>
      </div>

      {/* Hidden HTML audio element for file playback */}
      <audio ref={audioElRef} crossOrigin="anonymous" onEnded={() => setIsPlaying(false)} />

      {/* Visual Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '12px' }}>
        <div style={{ background: activeTab === 'bass' ? 'rgba(255, 65, 108, 0.15)' : 'rgba(255,255,255,0.02)', border: `1px solid ${activeTab === 'bass' ? '#ff416c' : 'rgba(255,255,255,0.05)'}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#ff416c', fontWeight: 600, marginBottom: '6px' }}>🥁 BASSI / CASSA</div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${bandLevels.bass}%`, height: '100%', background: '#ff416c', transition: 'width 0.1s' }} />
          </div>
        </div>

        <div style={{ background: activeTab === 'mids' ? 'rgba(212, 82, 209, 0.2)' : 'rgba(255,255,255,0.02)', border: `1px solid ${activeTab === 'mids' ? '#d452d1' : 'rgba(255,255,255,0.05)'}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#d452d1', fontWeight: 600, marginBottom: '6px' }}>🎸 MEDI / VOCI</div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${bandLevels.mids}%`, height: '100%', background: '#d452d1', transition: 'width 0.1s' }} />
          </div>
        </div>

        <div style={{ background: activeTab === 'treble' ? 'rgba(0, 255, 135, 0.15)' : 'rgba(255,255,255,0.02)', border: `1px solid ${activeTab === 'treble' ? '#00ff87' : 'rgba(255,255,255,0.05)'}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#00ff87', fontWeight: 600, marginBottom: '6px' }}>⚡ ALTI / ARIA</div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${bandLevels.treble}%`, height: '100%', background: '#00ff87', transition: 'width 0.1s' }} />
          </div>
        </div>
      </div>

      {/* Spectrum Visualizer Canvas */}
      <div style={{ position: 'relative', width: '100%', height: '70px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', overflow: 'hidden' }}>
        <canvas ref={canvasRef} width={400} height={70} style={{ width: '100%', height: '100%', display: 'block' }} />
        {!isPlaying && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', color: '#888', fontSize: '0.85rem' }}>
            ▶️ Premi "Avvia Test A/B" per ascoltare il brano dal vivo con la tua curva EQ
          </div>
        )}
      </div>

      {/* Interactive Controls Section: Simple vs Parametric */}
      {eqEditMode === 'simple' ? (
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#00f0ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Music2 size={16} /> Controlli Rapidi per Strumento & Gamma Acustica
            </span>
            <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Clicca per esaltare dal vivo durante la riproduzione</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            {INSTRUMENT_PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyInstrumentPreset(p)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p.color}44`,
                  borderRadius: '10px',
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${p.color}44`; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem', marginBottom: '4px' }}>{p.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#888', lineHeight: '1.2' }}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Live Parametric EQ Edit Panel */
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 177, 66, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.9rem', color: '#ffb142', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={16} /> Modifica Parametrica Live Bande EQ (Frequenza, Gain, Q)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#ccc' }}>Modifiche applicate istantaneamente all'ascolto</span>
          </div>

          {/* List of Live Parametric Bands */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px', marginBottom: '14px' }}>
            {liveParametricFilters.map((filter, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 80px 1fr 1fr 1fr 40px', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 700, color: '#00f0ff' }}>Band #{i+1}</span>
                <select 
                  value={filter.type} 
                  onChange={e => handleUpdateLiveBand(i, 'type', e.target.value)}
                  style={{ background: '#13131f', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '4px', borderRadius: '4px', fontSize: '0.75rem' }}
                >
                  <option value="PK">PK (Peak)</option>
                  <option value="LS">LS (LowShelf)</option>
                  <option value="HS">HS (HighShelf)</option>
                </select>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#aaa', display: 'block' }}>Freq: {filter.freq} Hz</span>
                  <input type="range" min="20" max="20000" step="10" value={filter.freq} onChange={e => handleUpdateLiveBand(i, 'freq', e.target.value)} style={{ width: '100%', accentColor: '#00f0ff' }} />
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#aaa', display: 'block' }}>Gain: {filter.gain > 0 ? '+' : ''}{parseFloat(filter.gain).toFixed(1)} dB</span>
                  <input type="range" min="-12" max="12" step="0.5" value={filter.gain} onChange={e => handleUpdateLiveBand(i, 'gain', e.target.value)} style={{ width: '100%', accentColor: '#ffb142' }} />
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#aaa', display: 'block' }}>Q: {parseFloat(filter.q || 1.41).toFixed(2)}</span>
                  <input type="range" min="0.3" max="5.0" step="0.1" value={filter.q || 1.41} onChange={e => handleUpdateLiveBand(i, 'q', e.target.value)} style={{ width: '100%', accentColor: '#00ff87' }} />
                </div>

                <button 
                  type="button" 
                  onClick={() => handleRemoveLiveBand(i)}
                  style={{ background: 'transparent', border: 'none', color: '#ff4757', cursor: 'pointer' }}
                  title="Rimuovi banda"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Live Band Bar */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>Aggiungi Banda:</span>
            <select value={newBand.type} onChange={e => setNewBand({ ...newBand, type: e.target.value })} style={{ background: '#13131f', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '4px', borderRadius: '4px', fontSize: '0.8rem' }}>
              <option value="PK">PK</option>
              <option value="LS">LS</option>
              <option value="HS">HS</option>
            </select>
            <input type="number" placeholder="Hz" value={newBand.freq} onChange={e => setNewBand({ ...newBand, freq: parseFloat(e.target.value) || 1000 })} style={{ width: '70px', padding: '4px 6px', background: '#13131f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }} />
            <input type="number" step="0.5" placeholder="dB" value={newBand.gain} onChange={e => setNewBand({ ...newBand, gain: parseFloat(e.target.value) || 0 })} style={{ width: '60px', padding: '4px 6px', background: '#13131f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }} />
            <input type="number" step="0.1" placeholder="Q" value={newBand.q} onChange={e => setNewBand({ ...newBand, q: parseFloat(e.target.value) || 1.41 })} style={{ width: '60px', padding: '4px 6px', background: '#13131f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }} />
            <button type="button" onClick={handleAddLiveBand} style={{ background: '#00f0ff', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} /> Aggiungi
            </button>
          </div>
        </div>
      )}

      {/* Play/Pause Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={togglePlay}
          style={{
            background: isPlaying ? '#ff4757' : 'linear-gradient(135deg, #00f0ff, #3b82f6)',
            color: '#000',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '25px',
            fontSize: '0.95rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 210, 255, 0.3)',
            transition: 'all 0.2s'
          }}
        >
          {isPlaying ? <><Pause size={18} fill="#000" /> Pausa Test</> : <><Play size={18} fill="#000" /> Avvia Test A/B</>}
        </button>

        {/* Volume Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1, maxWidth: '180px' }}>
          {volume === 0 ? <VolumeX size={18} color="#aaa" /> : <Volume2 size={18} color="var(--accent-blue)" />}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-blue)' }}
          />
        </div>
      </div>
    </div>
  );
}

const btnStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: active ? 'rgba(0, 210, 255, 0.18)' : 'transparent',
    color: active ? '#fff' : '#aaa',
    border: active ? '1px solid rgba(0,240,255,0.4)' : 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
});
