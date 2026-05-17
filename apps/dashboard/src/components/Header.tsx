import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface HeaderProps {
  lang: 'vi' | 'en';
  setLang: (lang: 'vi' | 'en') => void;
  isBackendConnected: boolean;
  autoHeal: boolean;
  t: any;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  setLang,
  isBackendConnected,
  autoHeal,
  t
}) => {
  return (
    <header>
      <div className="brand">
        <ShieldAlert size={36} color="#36BCF7" style={{ filter: 'drop-shadow(0 0 10px rgba(54, 188, 247, 0.4))' }} />
        <div>
          <h1>{t.title}</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.subtitle}</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.4rem 0.8rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
            fontWeight: 500
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
        >
          {lang === 'vi' ? t.switchLangEN : t.switchLangVI}
        </button>

        <div className="system-status">
          <div 
            className="status-dot" 
            style={{
              background: !isBackendConnected ? 'var(--color-danger)' : !autoHeal ? '#F59E0B' : 'var(--color-success)',
              boxShadow: !isBackendConnected 
                ? '0 0 8px var(--color-danger)' 
                : !autoHeal 
                ? '0 0 8px #F59E0B' 
                : '0 0 8px var(--color-success)',
              animation: isBackendConnected && autoHeal ? 'pulse 2s infinite' : 'none'
            }}
          ></div>
          <span style={{ 
            color: !isBackendConnected ? 'var(--color-danger)' : !autoHeal ? '#F59E0B' : 'var(--color-success)',
            fontWeight: 600
          }}>
            {!isBackendConnected ? t.engineOffline : !autoHeal ? t.engineStandby : t.engineOnline}
          </span>
        </div>
      </div>
    </header>
  );
};
