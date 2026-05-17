import React from 'react';
import { Sliders, Clock, Send } from 'lucide-react';

interface ConfigPanelProps {
  saveConfig: (e: React.FormEvent) => void;
  autoHeal: boolean;
  setAutoHeal: (v: boolean) => void;
  cooldown: number;
  setCooldown: (v: number) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  setIsModelVerified: (v: boolean) => void;
  setModelTestStatus: (v: null | 'success' | 'failed' | 'sandbox') => void;
  setModelTestError: (v: string | null) => void;
  handleTestModel: () => Promise<void>;
  isTestingModel: boolean;
  modelTestStatus: null | 'success' | 'failed' | 'sandbox';
  modelTestError: string | null;
  isModelVerified: boolean;
  customPrompt: string;
  setCustomPrompt: (v: string) => void;
  isSavingConfig: boolean;
  availableModels: Array<{ id: string; displayName: string }>;
  t: any;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  saveConfig,
  autoHeal,
  setAutoHeal,
  cooldown,
  setCooldown,
  selectedModel,
  setSelectedModel,
  setIsModelVerified,
  setModelTestStatus,
  setModelTestError,
  handleTestModel,
  isTestingModel,
  modelTestStatus,
  modelTestError,
  isModelVerified,
  customPrompt,
  setCustomPrompt,
  isSavingConfig,
  availableModels,
  t
}) => {
  return (
    <>
      <div className="section-title">
        <Sliders size={20} color="var(--color-primary)" />
        <h2>{t.engineConfigTitle}</h2>
      </div>

      <div className="sidebar-panel">
        <form onSubmit={saveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="toggle-group">
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.autoHealingToggle}</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={autoHeal} 
                onChange={(e) => setAutoHeal(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="form-group">
            <label>{t.cooldownMinutes}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="var(--text-secondary)" />
              <input 
                type="number" 
                min={1} 
                max={120} 
                value={cooldown} 
                onChange={(e) => setCooldown(Number(e.target.value))} 
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t.selectModel}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <select
                value={selectedModel}
                onChange={(e) => { 
                  setSelectedModel(e.target.value); 
                  setIsModelVerified(false); 
                  setModelTestStatus(null); 
                  setModelTestError(null);
                }}
                style={{ 
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {availableModels.length > 0 ? (
                  availableModels.map(m => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))
                ) : (
                  <>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                    <option value="gemini-flash-latest">Gemini 1.5 Flash (Latest)</option>
                    <option value="gemini-pro-latest">Gemini 1.5 Pro (Latest)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Rate-Limited 20/day)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
                  </>
                )}
              </select>

              <button
                type="button"
                className="btn"
                onClick={handleTestModel}
                disabled={isTestingModel}
                style={{ 
                  width: '100%',
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.85rem', 
                  whiteSpace: 'nowrap',
                  background: modelTestStatus === 'success' ? 'var(--color-success)' : modelTestStatus === 'sandbox' ? '#F59E0B' : modelTestStatus === 'failed' ? 'var(--color-danger)' : 'var(--color-primary)',
                  borderColor: 'transparent'
                }}
              >
                {isTestingModel ? t.modelTesting : t.testModelBtn}
              </button>
            </div>

            {/* Model Connection Status Indicator */}
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.75rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.25rem',
              width: '100%',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal'
            }}>
              {modelTestStatus === 'success' && (
                <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                  ● {t.modelVerified}
                </span>
              )}
              {modelTestStatus === 'sandbox' && (
                <span style={{ color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  ⚠️ {t.sandboxRateLimit}
                </span>
              )}
              {modelTestStatus === 'failed' && (
                <div style={{ 
                  color: 'var(--color-danger)', 
                  fontWeight: 500, 
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  marginTop: '0.25rem',
                  lineHeight: '1.4',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}>
                  <strong style={{ fontWeight: 700 }}>● {t.errorPrefix}</strong> {modelTestError}
                </div>
              )}
              {!modelTestStatus && (
                <span style={{ color: isModelVerified ? 'var(--color-success)' : 'var(--text-muted)' }}>
                  ● {isModelVerified ? t.modelVerified : t.modelNotVerified}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>{t.promptTemplate}</label>
            <textarea 
              value={customPrompt} 
              onChange={(e) => setCustomPrompt(e.target.value)} 
              placeholder={t.promptPlaceholder}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {t.dynamicVarsPrefix} `{'{totalCount}'}`, `{'{errorCode}'}`, `{'{sampleLogs}'}` {t.dynamicVarsSuffix}
            </span>
          </div>

          <button className="btn" type="submit" disabled={isSavingConfig}>
            <Send size={16} /> 
            {isSavingConfig ? t.savingConfig : t.saveConfig}
          </button>
        </form>
      </div>
    </>
  );
};
