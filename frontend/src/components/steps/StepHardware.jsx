import { motion } from 'framer-motion';
import { HelpCircle, CheckCircle, Bot, UploadCloud } from 'lucide-react';
import SearchableCombobox from '../SearchableCombobox';
import { ManualSpecsCard } from '../ManualSpecsCard';
import { HardwareDacAmpSelector } from './HardwareDacAmpSelector';

/**
 * StepHardware.jsx — Step 1: Hardware Profiler (estratto identico da
 * App.jsx:1419-1766, pre-Fase 4). Le sezioni DAC/AMP sono in
 * HardwareDacAmpSelector.jsx; qui cuffie + drop-zone upload.
 */
export function StepHardware({ state, dispatch, showError, setShowError, varianti, brands, models, selectedBrand, setSelectedBrand, customInputMode, setCustomInputMode, hwLoading, hwStatus, handleBrandChange, handleResolveHardware, activeLevel3Form, setActiveLevel3Form, manualSpecs, setManualSpecs, setHwStatus }) {
  return (
    <motion.div key="step1" variants={varianti} initial="hidden" animate="visible" exit="exit" className="step-container">
      <h2 className="step-title">1. Hardware Profiler</h2>
      <p className="step-subtitle">Inserisci i dettagli del tuo setup per una correzione millimetrica.</p>

      <div className="hardware-form">
        {/* SELEZIONE CUFFIE */}
        <div className="input-group">
          <div className="input-label-container">
             <label className="input-label">Marchio Cuffie <span style={{color: 'var(--color-semantic-error)'}}>*</span></label>
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
                 <label className="input-label">Modello Cuffie <span style={{color: 'var(--color-semantic-error)'}}>*</span></label>
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
                    <div className="validation-badge" style={{ borderColor: 'var(--color-semantic-warning)', color: 'var(--color-semantic-warning)' }}>
                      <span>🔍 Ricerca...</span>
                    </div>
                  )}
                  {!hwLoading.headphone && hwStatus.headphone && (
                    <div className="validation-badge" style={{ borderColor: hwStatus.headphone.status === 'RESOLVED_LOCAL' ? 'var(--color-accent-cyan)' : hwStatus.headphone.status === 'RESOLVED_ONLINE' ? 'var(--color-semantic-successAlt)' : 'var(--color-semantic-warning)', color: hwStatus.headphone.status === 'RESOLVED_LOCAL' ? 'var(--color-accent-cyan)' : hwStatus.headphone.status === 'RESOLVED_ONLINE' ? 'var(--color-semantic-successAlt)' : 'var(--color-semantic-warning)' }}>
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
                      <CheckCircle size={14} color="var(--color-accent-cyan)" />
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

        <HardwareDacAmpSelector
          state={state}
          dispatch={dispatch}
          brands={brands}
          models={models}
          selectedBrand={selectedBrand}
          setSelectedBrand={setSelectedBrand}
          customInputMode={customInputMode}
          setCustomInputMode={setCustomInputMode}
          hwLoading={hwLoading}
          hwStatus={hwStatus}
          handleBrandChange={handleBrandChange}
          handleResolveHardware={handleResolveHardware}
          activeLevel3Form={activeLevel3Form}
          setActiveLevel3Form={setActiveLevel3Form}
          manualSpecs={manualSpecs}
          setManualSpecs={setManualSpecs}
          setHwStatus={setHwStatus}
        />

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
      </div>
    </motion.div>
  );
}
