import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { MessageSquare } from 'lucide-react';
import './index.css';
import './App.css';
import { EqStateProvider, useEqState } from './contexts/EqStateContext';
import { Scene3D } from './components/Scene3D';
import { WizardShell } from './components/WizardShell';
import { AIPersona } from './components/AIPersona';
import OnboardingAiStep from './components/onboarding-ai/OnboardingAiStep';
import { apiGet } from './api/client';
import { useEqCalculation } from './hooks/useEqCalculation';
import { useLiveSync } from './hooks/useLiveSync';
import { useHardwareDiscovery } from './hooks/useHardwareDiscovery';
import { usePresets } from './hooks/usePresets';
import { useEqRefinement } from './hooks/useEqRefinement';
import { useArtistResolver } from './hooks/useArtistResolver';

/**
 * App.jsx — Fase 4: shell sottile (<200 righe). Composizione di
 * EqStateProvider, gate IA (Fase 3), layout (canvas-bg + Scene3D +
 * main-wizard-wrapper), WizardShell, AIPersona e FAB mobile.
 * Nessuna logica di step, fetch di dominio o JSX di step qui.
 */
function AppContent() {
  const { state, dispatch } = useEqState();

  const [engineStatus, setEngineStatus] = useState('Local Knowledge Graph');
  const [copied, setCopied] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [uploadedAudioTrack, setUploadedAudioTrack] = useState(null);
  const [showError, setShowError] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [aiOnboardingDone, setAiOnboardingDone] = useState(() => localStorage.getItem('PEQ_AI_ONBOARDING_DONE') === '1');
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const wizardContentRef = useRef(null);

  const { isLiveSyncEnabled, toggleLiveSync } = useLiveSync({ dispatch });
  const { isServerConnected, eqData, setEqData, exportRawData, setExportRawData, baselineEqData, setBaselineEqData, aiGeneratedEqData, setAiGeneratedEqData, chartData } = useEqCalculation({ state, isLiveSyncEnabled });
  const hardware = useHardwareDiscovery({ dispatch });
  const { presets, presetName, setPresetName, handleSavePreset, handleActivatePreset } = usePresets({ state, eqData, dispatch, setEqData });
  const refinement = useEqRefinement({ state, dispatch, eqData, setEqData, setExportRawData, baselineEqData, aiGeneratedEqData, isLiveSyncEnabled });
  const { setHistoryLog, setRefinementHistory, setActiveTabEq } = refinement;
  const { availableArtists, setAvailableArtists, searchArtistQuery, setSearchArtistQuery, handleResolveArtistOnline } = useArtistResolver({ dispatch });

  useEffect(() => {
    apiGet('/api/engine-status')
      .then(res => res.json())
      .then(data => { if (data.success) setEngineStatus(data.engine); })
      .catch(err => console.error("Failed to load engine status", err));
  }, []);

  useEffect(() => {
    apiGet('/api/ai/profiles')
      .then(res => res.json())
      .then(data => { if (data.success && data.profiles?.some(p => p.active)) setAiOnboardingDone(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (state.step > maxStepReached) {
      setMaxStepReached(state.step);
    }
    if (state.step < 4) {
      setBaselineEqData(null);
      setAiGeneratedEqData(null);
      setHistoryLog([]);
      setRefinementHistory([]);
      setActiveTabEq('B');
    }
  }, [state.step, maxStepReached]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAiOnboardingComplete = () => {
    setAiOnboardingDone(true);
    localStorage.setItem('PEQ_AI_ONBOARDING_DONE', '1');
    setAiSettingsOpen(false);
    if (wizardContentRef.current) {
      wizardContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const hardwareProps = {
    brands: hardware.brands, models: hardware.models,
    selectedBrand: hardware.selectedBrand, setSelectedBrand: hardware.setSelectedBrand,
    customInputMode: hardware.customInputMode, setCustomInputMode: hardware.setCustomInputMode,
    hwLoading: hardware.hwLoading, hwStatus: hardware.hwStatus,
    handleBrandChange: hardware.handleBrandChange, handleResolveHardware: hardware.handleResolveHardware,
    activeLevel3Form: hardware.activeLevel3Form, setActiveLevel3Form: hardware.setActiveLevel3Form,
    manualSpecs: hardware.manualSpecs, setManualSpecs: hardware.setManualSpecs,
    setHwStatus: hardware.setHwStatus
  };
  const musicProps = { availableArtists, setAvailableArtists, searchArtistQuery, setSearchArtistQuery, handleResolveArtistOnline, uploadedAudioTrack, setUploadedAudioTrack };
  const tuningProps = { eqData, setEqData, chartData, isLiveSyncEnabled, toggleLiveSync, uploadedAudioTrack };
  const finalEqProps = {
    chartData, activeTabEq: refinement.activeTabEq, setActiveTabEq: refinement.setActiveTabEq,
    baselineEqData, aiGeneratedEqData, handleRestoreBaseline: refinement.handleRestoreBaseline,
    handleRestoreAI: refinement.handleRestoreAI, refinementHistory: refinement.refinementHistory,
    isRefining: refinement.isRefining, handleUndoRefinement: refinement.handleUndoRefinement,
    handleRefineEQ: refinement.handleRefineEQ, paramEq: refinement.paramEq, setParamEq: refinement.setParamEq,
    handleApplyParametric: refinement.handleApplyParametric, aiPrompt: refinement.aiPrompt,
    setAiPrompt: refinement.setAiPrompt, isAiProcessing: refinement.isAiProcessing,
    handleAiParametric: refinement.handleAiParametric, historyLog: refinement.historyLog,
    eqData, activeFaq: refinement.activeFaq, setActiveFaq: refinement.setActiveFaq,
    presetName, setPresetName, handleSavePreset, presets, handleActivatePreset,
    copied, setCopied, exportRawData
  };

  return (
    <>
      <div className="canvas-bg">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <Scene3D state={state} />
        </Canvas>
      </div>
      <div className="app-container">
        <div className="main-wizard-wrapper">
          {(!aiOnboardingDone || aiSettingsOpen) ? (
            <OnboardingAiStep
              mode={aiOnboardingDone ? 'manage' : 'onboarding'}
              onComplete={handleAiOnboardingComplete}
              onClose={() => setAiSettingsOpen(false)}
            />
          ) : (
            <WizardShell
              state={state}
              dispatch={dispatch}
              onOpenAiSettings={() => setAiSettingsOpen(true)}
              presets={presets}
              handleActivatePreset={handleActivatePreset}
              isServerConnected={isServerConnected}
              maxStepReached={maxStepReached}
              wizardContentRef={wizardContentRef}
              showError={showError}
              setShowError={setShowError}
              hardware={hardwareProps}
              music={musicProps}
              tuning={tuningProps}
              finalEq={finalEqProps}
            />
          )}
        </div>

        <AIPersona
          state={state}
          dispatch={dispatch}
          setEqData={setEqData}
          setExportRawData={setExportRawData}
          engineStatus={engineStatus}
          isMobileChatOpen={isMobileChatOpen}
          setIsMobileChatOpen={setIsMobileChatOpen}
          activeLevel3Form={hardware.activeLevel3Form}
          setActiveLevel3Form={hardware.setActiveLevel3Form}
          manualSpecs={hardware.manualSpecs}
          setManualSpecs={hardware.setManualSpecs}
          setHwStatus={hardware.setHwStatus}
          isLiveSyncEnabled={isLiveSyncEnabled}
        />

        {state.step > 0 && (
          <button className="mobile-chat-fab" onClick={() => setIsMobileChatOpen(true)}>
              <MessageSquare size={24} color="#ffffff" />
              {state.chatHistory.length > 0 && state.chatHistory[state.chatHistory.length-1].role === 'ai' && (
                  <div className="fab-badge">1</div>
              )}
          </button>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <EqStateProvider>
      <AppContent />
    </EqStateProvider>
  );
}