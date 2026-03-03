import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationBar, Tab } from '../organisms/NavigationBar';
import { LanguageSwitcher } from '../atoms/LanguageSwitcher';

interface MainLayoutTemplateProps {
  brandTitle: string;
  activeTab: Tab;
  onTabChange: (_tab: Tab) => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export function MainLayoutTemplate({
  brandTitle,
  activeTab,
  onTabChange,
  onSignOut,
  children,
}: MainLayoutTemplateProps) {
  const { t } = useTranslation();

  return (
    <div className="app">
      <NavigationBar brandTitle={brandTitle} activeTab={activeTab} onTabChange={onTabChange} />
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <LanguageSwitcher />
        {onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--muted)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            data-testid="sign-out-btn"
          >
            {t('auth.signOut')}
          </button>
        )}
      </div>
      <main className="main-content">{children}</main>
    </div>
  );
}
