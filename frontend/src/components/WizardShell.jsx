import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mapGenresToDefaults } from '../utils/genreDefaults';
import { StepWelcome } from './steps/StepWelcome';
import { StepHardware } from './steps/StepHardware';
import { StepMusic } from './steps/StepMusic';
import { StepTuning } from './steps/StepTuning';
import { StepEqFinal } from './steps/StepEqFinal';

/**
 * WizardShell.jsx — Fase 4: guscio del wizard (header + contenitore step +
 * footer timeline). Estratto da App.jsx:1356-1380 (header), 1382-2601
 * (contenitore + step), 2603-2651 (footer) + varianti (1268-1272) +
 * handleNextStep (1315-1337), pre-Fase 4, con l'aggiunta Fase 3 del
 * pulsante "Impostazioni IA" (onOpenAiSettings).
 */
const varianti = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.3 } }
};

export function WizardShell({ state, dispatch, onOpenAiSettings, presets, handleActivatePreset, isServerConnected, maxStepReached, wizardContentRef, showError, setShowError, hardware, music, tuning, finalEq }) {
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
             <button
               type="button"
               className="btn-secondary"
               onClick={onOpenAiSettings}
               style={{padding: '8px 16px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap'}}
               title="Gestisci i profili IA (provider locale/cloud)"
             >
               ⚙️ Impostazioni IA
             </button>
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
          {state.step === 0 && <StepWelcome state={state} dispatch={dispatch} varianti={varianti} />}
          {state.step === 1 && <StepHardware state={state} dispatch={dispatch} showError={showError} setShowError={setShowError} varianti={varianti} {...hardware} />}
          {state.step === 2 && <StepMusic state={state} dispatch={dispatch} varianti={varianti} {...music} />}
          {state.step === 3 && <StepTuning state={state} dispatch={dispatch} varianti={varianti} {...tuning} />}
          {state.step === 4 && <StepEqFinal state={state} dispatch={dispatch} varianti={varianti} {...finalEq} />}
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
  );
}