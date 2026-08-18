import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../../api/client';
import { validateProfileForm, defaultProfileName } from '../../ai/aiConfig';
import '../OnboardingAiStep.css';
import { ChoiceView } from './ChoiceView';
import { LocalView } from './LocalView';
import { CloudView } from './CloudView';
import { ManageView } from './ManageView';
import { SavedProfileCard } from './SavedProfileCard';
import { renderMessages, TierNote } from './shared';

/**
 * OnboardingAiStep.jsx — Fase 4: orchestratore delle viste dell'onboarding IA
 * (gate Fase 3, scomposto da OnboardingAiStep.jsx 676 righe pre-Fase 4).
 * Viste: choice/local/cloud (onboarding) e manage (Impostazioni IA).
 * Contratti backend: POST /api/ai/profiles (crea), GET (lista),
 * POST /:id/test (probe tier), POST /:id/activate (attiva; tier 3 mai
 * bloccante). La chiave API compare SOLO nel body della POST di creazione,
 * mai loggata, mai riletta, mai in localStorage.
 */
export default function OnboardingAiStep({ mode = 'onboarding', onComplete, onClose }) {
  const [view, setView] = useState(mode === 'manage' ? 'manage' : 'choice');
  const [profiles, setProfiles] = useState([]);
  const [creatingId, setCreatingId] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [messages, setMessages] = useState([]);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await apiGet('/api/ai/profiles');
      const data = await res.json();
      if (data.success) setProfiles(data.profiles || []);
    } catch {
      // Lista vuota/vault non decifrabile = stato normale, mai crash.
      setProfiles([]);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const doCreate = async (form) => {
    try {
      const res = await apiPost('/api/ai/profiles', {
        name: form.name,
        type: form.type,
        baseUrl: form.baseUrl,
        apiKey: form.apiKey || undefined,
        model: form.model || undefined
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessages([{ kind: 'error', text: data.error || 'Errore nella creazione del profilo.' }]);
        return null;
      }
      setMessages([{ kind: 'success', text: `Profilo "${data.profile.name}" creato e salvato sul backend locale.` }]);
      await fetchProfiles();
      return data.profile;
    } catch {
      setMessages([{ kind: 'error', text: 'Errore di rete con il server locale (porta 3001).' }]);
      return null;
    }
  };

  const doTest = async (id) => {
    setTestingId(id);
    try {
      const res = await apiPost(`/api/ai/profiles/${id}/test`, {});
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [id]: { tier: data.tier, latencyMs: data.latencyMs, modelName: data.modelName } }));
      const badge = data.tier === 3 ? '🔴 Solo chat' : data.tier === 2 ? '🟡 Compatibile' : data.tier === 1 ? '🟢 Ottimale' : 'Non testato';
      const detail = data.modelName ? ` · Modello rilevato: ${data.modelName}` : '';
      const latency = data.latencyMs != null ? ` · ${data.latencyMs}ms` : '';
      setMessages([{ kind: data.success ? 'success' : 'error', text: `Test connessione: ${badge}${detail}${latency}.` }]);
    } catch {
      setMessages([{ kind: 'error', text: 'Errore di rete durante il test di connessione.' }]);
    } finally {
      setTestingId(null);
    }
  };

  const doActivate = async (id) => {
    setActivatingId(id);
    try {
      const res = await apiPost(`/api/ai/profiles/${id}/activate`, {});
      const data = await res.json();
      if (data.success) {
        setMessages([{ kind: 'success', text: 'Profilo attivato con successo.' }]);
        await fetchProfiles();
        if (mode === 'onboarding') onComplete();
      } else {
        setMessages([{ kind: 'error', text: data.error || "Errore nell'attivazione del profilo." }]);
      }
    } catch {
      setMessages([{ kind: 'error', text: "Errore di rete durante l'attivazione." }]);
    } finally {
      setActivatingId(null);
    }
  };

  const handleManualSubmit = async (form, tag) => {
    const { valid, errors } = validateProfileForm(form);
    if (!valid) {
      setMessages([{ kind: 'error', text: errors.name || errors.type || errors.baseUrl || errors.apiKey || 'Dati non validi.' }]);
      return;
    }
    setCreatingId(tag);
    try {
      await doCreate(form);
    } finally {
      setCreatingId(null);
    }
  };

  const handleQuickStart = async (preset) => {
    setCreatingId(preset.id);
    try {
      const profile = await doCreate({
        name: defaultProfileName(preset.type),
        type: preset.type,
        baseUrl: preset.baseUrl,
        apiKey: '',
        model: preset.model
      });
      if (profile) await doTest(profile.id);
    } finally {
      setCreatingId(null);
    }
  };

  const existingActive = profiles.find(p => p.active) || null;
  const showProfiles = view === 'local' || view === 'cloud';
  const isBackVisible = (view === 'local' || view === 'cloud') && mode === 'onboarding';

  return (
    <div className="aionb-panel glass-panel">
      <div className="aionb-scroll">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>
            {mode === 'manage' ? '⚙️ IMPOSTAZIONI IA' : '🔌 CONFIGURAZIONE IA'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isBackVisible && (
              <button type="button" className="btn-secondary" onClick={() => setView('choice')} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                ← Indietro
              </button>
            )}
            {mode === 'manage' && onClose && (
              <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                Chiudi
              </button>
            )}
          </div>
        </div>

        {view === 'choice' && (
          <ChoiceView
            onChooseLocal={() => setView('local')}
            onChooseCloud={() => setView('cloud')}
            onNoAi={onComplete}
            existingActive={existingActive}
            onUseExisting={onComplete}
          />
        )}

        {view === 'local' && (
          <LocalView
            onQuickStart={handleQuickStart}
            onManualSubmit={handleManualSubmit}
            creatingId={creatingId}
            messages={messages}
            existingActive={existingActive}
            onUseExisting={onComplete}
          />
        )}

        {view === 'cloud' && (
          <CloudView
            onQuickStart={handleQuickStart}
            onManualSubmit={handleManualSubmit}
            creatingId={creatingId}
            messages={messages}
            existingActive={existingActive}
            onUseExisting={onComplete}
          />
        )}

        {view === 'manage' && (
          <ManageView
            profiles={profiles}
            onTest={doTest}
            onActivate={doActivate}
            onCreate={handleManualSubmit}
            creatingId={creatingId}
            testingId={testingId}
            activatingId={activatingId}
            messages={messages}
          />
        )}

        {showProfiles && profiles.length > 0 && (
          <div>
            <div className="aionb-section-title">Profili Salvati</div>
            {profiles.map(p => (
              <SavedProfileCard
                key={p.id}
                profile={{ ...p, ...(testResults[p.id] ? { tier: testResults[p.id].tier } : {}) }}
                onTest={doTest}
                onActivate={doActivate}
                testingId={testingId}
                activatingId={activatingId}
              />
            ))}
          </div>
        )}

        {view === 'choice' && <TierNote />}
        {renderMessages(messages)}
      </div>
    </div>
  );
}