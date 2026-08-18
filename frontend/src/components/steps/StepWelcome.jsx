import { motion } from 'framer-motion';

/**
 * StepWelcome.jsx — Step 0: biforcazione Interattivo/Analitico.
 * Estratto identico da App.jsx:1385-1416 (pre-Fase 4).
 */
export function StepWelcome({ state, dispatch, varianti }) {
  return (
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
  );
}
