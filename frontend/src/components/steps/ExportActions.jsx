import { CheckCircle, Plus, Check, Copy, Download } from 'lucide-react';
import { copyToClipboard, downloadFile, downloadWavelet, downloadPassportJSON } from '../../utils/exporters';

/**
 * ExportActions.jsx — Salvataggio profilo + export dello Step 4
 * (estratto identico da App.jsx:2543-2597, pre-Fase 4).
 */
export function ExportActions({ presetName, setPresetName, handleSavePreset, presets, handleActivatePreset, copied, setCopied, exportRawData, eqData, state }) {
  return (
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
                 <CheckCircle size={14} color="var(--color-accent-cyan)" />
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
           <button className="btn-secondary copy-btn" onClick={() => copyToClipboard(exportRawData, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })} style={{minWidth: '200px'}}>
             {copied ? <Check size={18} color="var(--color-accent-cyan)" /> : <Copy size={18} />}
             {copied ? 'Copiato!' : 'Appunti'}
           </button>
           <button className="btn-primary export-btn" onClick={() => downloadFile(exportRawData)} style={{minWidth: '150px'}}>
             <Download size={18} /> E-APO (.txt)
           </button>
           <button className="btn-primary export-btn" onClick={() => downloadWavelet(eqData)} style={{minWidth: '150px'}}>
             <Download size={18} /> Wavelet (.txt)
           </button>
           <button className="btn-secondary copy-btn" onClick={() => downloadPassportJSON(eqData, state)} style={{minWidth: '150px', background: 'rgba(255, 177, 66, 0.1)', borderColor: 'var(--color-semantic-warning)', color: 'var(--color-semantic-warning)'}}>
             <Download size={18} /> JSON
           </button>
       </div>
    </div>
  );
}
