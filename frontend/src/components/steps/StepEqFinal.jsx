import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EqCurveTooltip } from '../charts/EqCurveTooltip';
import { FineTuningPanel } from './FineTuningPanel';
import { EqFiltersTable } from './EqFiltersTable';
import { FaqSection } from './FaqSection';
import { ExportActions } from './ExportActions';

/**
 * StepEqFinal.jsx — Step 4: Pannello di Controllo Finale (estratto identico da
 * App.jsx:2262-2601, pre-Fase 4). Controlli A/B + grafico qui; il resto è
 * scomposto in FineTuningPanel, EqFiltersTable, FaqSection, ExportActions.
 */
export function StepEqFinal({ state, dispatch, varianti, chartData, activeTabEq, setActiveTabEq, baselineEqData, aiGeneratedEqData, handleRestoreBaseline, handleRestoreAI, refinementHistory, isRefining, handleUndoRefinement, handleRefineEQ, paramEq, setParamEq, handleApplyParametric, aiPrompt, setAiPrompt, isAiProcessing, handleAiParametric, historyLog, eqData, activeFaq, setActiveFaq, presetName, setPresetName, handleSavePreset, presets, handleActivatePreset, copied, setCopied, exportRawData }) {
  return (
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
            <Tooltip content={<EqCurveTooltip />} />
            <Line type="monotone" dataKey="baselineGain" name="Hardware (Originale)" stroke="rgba(255, 51, 102, 0.35)" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="aiGain" name="AI (Generato)" stroke="rgba(255, 177, 66, 0.6)" strokeWidth={2} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="manualGain" name="Manuale (Attuale)" stroke="#00f0ff" strokeWidth={3} dot={false} animationDuration={1000} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <FineTuningPanel
        handleRefineEQ={handleRefineEQ}
        isRefining={isRefining}
        paramEq={paramEq}
        setParamEq={setParamEq}
        handleApplyParametric={handleApplyParametric}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        isAiProcessing={isAiProcessing}
        handleAiParametric={handleAiParametric}
        historyLog={historyLog}
      />

      <EqFiltersTable activeTabEq={activeTabEq} baselineEqData={baselineEqData} eqData={eqData} />

      <FaqSection activeFaq={activeFaq} setActiveFaq={setActiveFaq} />

      <ExportActions
        presetName={presetName}
        setPresetName={setPresetName}
        handleSavePreset={handleSavePreset}
        presets={presets}
        handleActivatePreset={handleActivatePreset}
        copied={copied}
        setCopied={setCopied}
        exportRawData={exportRawData}
        eqData={eqData}
        state={state}
      />
    </motion.div>
  );
}