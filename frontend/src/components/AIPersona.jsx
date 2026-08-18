import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, User, X } from 'lucide-react';
import { apiPost } from '../api/client';

/**
 * AIPersona.jsx — Chat concierge (estratto identico da App.jsx:421-654, pre-Fase 4).
 * Interface props invariata: state, dispatch, setEqData, setExportRawData,
 * engineStatus, isMobileChatOpen, setIsMobileChatOpen, activeLevel3Form,
 * setActiveLevel3Form, manualSpecs, setManualSpecs, setHwStatus, isLiveSyncEnabled.
 * Hidden su state.step === 0; messaggi contestuali sugli step 1-4; tutorOptions.
 * L'unica differenza dal monolite: fetch /api/chat via apiPost (host/header/body identici).
 */
export function AIPersona({ state, dispatch, setEqData, setExportRawData, engineStatus, isMobileChatOpen, setIsMobileChatOpen, _activeLevel3Form, setActiveLevel3Form, _manualSpecs, _setManualSpecs, setHwStatus, isLiveSyncEnabled }) {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatHistory]);

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

    dispatch({ type: 'APPEND_CHAT', payload: { role: 'user', content: userMessage } });
    setIsTyping(true);

    try {
        const response = await apiPost('/api/chat', {
            message: userMessage,
            chatHistory: state.chatHistory,
            aiPayload: state,
            destination: isLiveSyncEnabled ? 'e-apo' : 'export'
        });

        const data = await response.json();

        if (data.success) {
             let cleanReply = data.reply;
             if (typeof cleanReply === 'string' && cleanReply.trim().startsWith('{')) {
                 try {
                     const parsedReply = JSON.parse(cleanReply);
                     if (parsedReply.message) cleanReply = parsedReply.message;
                 } catch {}
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
    } catch {
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
                <div style={{width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                   <Bot size={18} color="var(--accent-blue)" />
                </div>
                <h3 style={{margin: 0, color: 'white', fontSize: '1.1rem'}}>Personal EQ Concierge</h3>
             </div>

             <button className="mobile-close-btn" onClick={() => setIsMobileChatOpen(false)}>
                <X size={20} color="var(--text-muted)" />
             </button>
           </div>

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
                           } catch {}
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
