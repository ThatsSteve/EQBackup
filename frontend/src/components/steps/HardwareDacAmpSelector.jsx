import { HelpCircle, CheckCircle } from 'lucide-react';
import SearchableCombobox from '../SearchableCombobox';
import { ManualSpecsCard } from '../ManualSpecsCard';

/**
 * HardwareDacAmpSelector.jsx — Sezioni DAC e Amplificatore dello Step 1
 * (estratte identiche da App.jsx:1553-1752, pre-Fase 4, parametrizzate
 * per tipo). Il componente rende entrambe le sezioni (DAC poi AMP).
 */
const CONFIG = {
  dac: {
    label: 'Marchio DAC (Opzionale)',
    tooltip: 'Il convertitore Digitale-Analogico in uso',
    placeholder: '-- Cerca o Seleziona Produttore DAC --',
    customSuffix: 'Custom DAC'
  },
  amp: {
    label: 'Marchio Amplificatore (Opzionale)',
    tooltip: "Utile per calcolare l'impedenza d'uscita e il damping factor",
    placeholder: '-- Cerca o Seleziona Produttore Amplificatore --',
    customSuffix: 'Custom Amp'
  }
};

function DeviceSection({ type, state, dispatch, brands, models, selectedBrand, setSelectedBrand, customInputMode, setCustomInputMode, hwLoading, hwStatus, handleBrandChange, handleResolveHardware, activeLevel3Form, setActiveLevel3Form, manualSpecs, setManualSpecs, setHwStatus }) {
  const cfg = CONFIG[type];

  return (
    <div className="input-group">
      <div className="input-label-container">
         <label className="input-label">{cfg.label}</label>
         <div className="tooltip-trigger" title={cfg.tooltip}><HelpCircle size={15}/></div>
      </div>
      <SearchableCombobox
        options={brands[type] || []}
        value={selectedBrand[type]}
        placeholder={cfg.placeholder}
        onChange={brand => {
          handleBrandChange(type, brand);
          if (brand && brand !== 'Altro / Custom') {
            dispatch({ type: 'UPDATE', payload: { [type]: '' } });
          } else {
            dispatch({ type: 'UPDATE', payload: { [type]: '' } });
          }
        }}
      />

      {selectedBrand[type] && (
        <div style={{ marginTop: '10px' }}>
          <div className="input-wrapper-validated" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flexGrow: 1, width: '100%' }}>
              {selectedBrand[type] !== 'Altro / Custom' && !customInputMode[type] ? (
                <SearchableCombobox
                  options={[
                    ...(models[type] || []).map(m => ({
                      label: `${m.model || m.name} (${m.architecture || 'Solid State'})`,
                      value: `${m.brand} ${m.model || m.name}`
                    })),
                    { label: `-- Altro Modello ${selectedBrand[type]}... --`, value: `${selectedBrand[type]} ${cfg.customSuffix}` }
                  ]}
                  value={state[type]}
                  placeholder="-- Seleziona il modello... --"
                  allowCustomInput={true}
                  onChange={val => {
                    if (val.endsWith(cfg.customSuffix) || val === `${selectedBrand[type]} ${cfg.customSuffix}`) {
                      setCustomInputMode(prev => ({ ...prev, [type]: true }));
                      dispatch({ type: 'UPDATE', payload: { [type]: '' } });
                    } else {
                      dispatch({ type: 'UPDATE', payload: { [type]: val } });
                      if (val) handleResolveHardware(type, val);
                    }
                  }}
                />
              ) : (
                <input
                  type="text"
                  className={`hardware-input ${state[type] && state[type].trim() !== '' ? 'validated' : ''}`}
                  placeholder={`Digita Marca e Modello esatto ${type.toUpperCase()}...`}
                  value={state[type]}
                  onChange={e => dispatch({ type: 'UPDATE', payload: { [type]: e.target.value } })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && state[type].trim() !== '') handleResolveHardware(type, state[type]);
                  }}
                />
              )}
              {hwLoading[type] && <div className="validation-badge" style={{ borderColor: 'var(--color-semantic-warning)', color: 'var(--color-semantic-warning)' }}><span>🔍 Ricerca...</span></div>}
              {!hwLoading[type] && hwStatus[type] && (
                <div className="validation-badge" style={{ borderColor: hwStatus[type].status === 'RESOLVED_LOCAL' ? 'var(--color-accent-cyan)' : (hwStatus[type].status === 'RESOLVED_ONLINE' || hwStatus[type].status === 'RESOLVED_OPTIONAL') ? 'var(--color-semantic-successAlt)' : 'var(--color-semantic-warning)', color: hwStatus[type].status === 'RESOLVED_LOCAL' ? 'var(--color-accent-cyan)' : (hwStatus[type].status === 'RESOLVED_ONLINE' || hwStatus[type].status === 'RESOLVED_OPTIONAL') ? 'var(--color-semantic-successAlt)' : 'var(--color-semantic-warning)' }}>
                  {hwStatus[type].status === 'RESOLVED_LOCAL' && <CheckCircle size={14} />}
                  {(hwStatus[type].status === 'RESOLVED_ONLINE' || hwStatus[type].status === 'RESOLVED_OPTIONAL') && <CheckCircle size={14} />}
                  {hwStatus[type].status === 'REQUIRES_USER_INPUT' && <HelpCircle size={14} />}
                  <span>{hwStatus[type].status === 'RESOLVED_LOCAL' ? 'DB Locale' : hwStatus[type].status === 'RESOLVED_ONLINE' ? 'Risolto Online' : hwStatus[type].status === 'RESOLVED_OPTIONAL' ? 'Opzionale (No EQ)' : 'AI Support'}</span>
                </div>
              )}
            </div>
            {(selectedBrand[type] === 'Altro / Custom' || customInputMode[type]) && (
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  type="button"
                  className="ab-btn active"
                  style={{ padding: '0 16px', whiteSpace: 'nowrap', height: '52px', display: 'flex', alignItems: 'center' }}
                  onClick={() => {
                    if (state[type].trim() !== '') handleResolveHardware(type, state[type]);
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
                    setCustomInputMode(prev => ({ ...prev, [type]: false }));
                    if (selectedBrand[type] === 'Altro / Custom') setSelectedBrand(prev => ({ ...prev, [type]: '' }));
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          <ManualSpecsCard type={type} activeLevel3Form={activeLevel3Form} setActiveLevel3Form={setActiveLevel3Form} manualSpecs={manualSpecs} setManualSpecs={setManualSpecs} dispatch={dispatch} setHwStatus={setHwStatus} />
        </div>
      )}
    </div>
  );
}

export function HardwareDacAmpSelector(props) {
  return (
    <>
      <DeviceSection type="dac" {...props} />
      <DeviceSection type="amp" {...props} />
    </>
  );
}
