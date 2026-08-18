/**
 * eqOptions.js — Fase 4: costanti dati del wizard EQ (puri).
 *
 * Estratte da App.jsx:14-45 (pre-Fase 4) senza alcuna modifica di contenuto:
 * GENRES_LIST, BASS_OPTIONS, MIDS_OPTIONS, TREBLE_OPTIONS.
 */

export const GENRES_LIST = [
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

export const BASS_OPTIONS = [
  { id: 'explosive', title: '🚀 Bassi Esplosivi & Sub Profondo', desc: 'Massimo impatto per EDM, Hip-Hop e Film. Senti vibrare il sub-bass.', sub_bass: 4.5, mid_bass: 3.5 },
  { id: 'punchy', title: '👊 Punch Dinamico & Controllato', desc: 'Corpo deciso e cassa punzonata senza coprire le voci e i medi.', sub_bass: 2.5, mid_bass: 2.0 },
  { id: 'neutral', title: '⚖️ Neutro / Fedeltà Studio', desc: 'Risposta lineare e naturale, fedele al master originale.', sub_bass: 0, mid_bass: 0 },
  { id: 'light', title: '🍃 Bassi Asciutti & Voci Pulite', desc: 'Attenuazione delle basse per un ascolto rilassato o analisi vocale.', sub_bass: -2.0, mid_bass: -1.5 }
];

export const MIDS_OPTIONS = [
  { id: 'forward', title: '🎤 Voci in Primo Piano & Intimità', desc: 'Esalta la presenza vocale, le chitarre e i micro-dettagli del cantato.', low_mids: 1.5, high_mids: 3.0 },
  { id: 'warm', title: '☕ Calore Avvolgente & Corpo', desc: 'Arricchisce il timbro di strumenti acustici, archi e fiati.', low_mids: 2.0, high_mids: 1.0 },
  { id: 'neutral', title: '⚖️ Bilanciamento Naturale', desc: 'Medi trasparenti e fedeli al timbro originale degli strumenti.', low_mids: 0, high_mids: 0 },
  { id: 'vshape', title: '🛋️ Medi Arretrati / Suono Moderno', desc: 'Curva V-Shape moderna che allontana le voci per un soundstage più largo.', low_mids: -1.5, high_mids: -2.0 }
];

export const TREBLE_OPTIONS = [
  { id: 'crystal', title: '💎 Cristallino & Aria Ultra-Dettagliata', desc: 'Massima estensione di piatti, riverberi e micro-dettagli acustici.', presence: 2.5, brilliance: 3.5 },
  { id: 'clear', title: '✨ Definizione e Chiarezza', desc: 'Alti aperti e nitidi, illuminazione perfetta senza fatica d\'ascolto.', presence: 1.5, brilliance: 1.5 },
  { id: 'neutral', title: '⚖️ Morbido / Standard Studio', desc: 'Risposta equilibrata e controllo chirurgico delle sibilanti.', presence: 0, brilliance: 0 },
  { id: 'relaxed', title: '🌙 Alti Caldi / Relax Anti-Fatica', desc: 'Suono vellutato e scuro, ideale per lunghe sessioni d\'ascolto.', presence: -2.0, brilliance: -2.5 }
];