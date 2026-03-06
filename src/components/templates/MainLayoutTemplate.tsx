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
  selectedBranchId?: string | 'main';
  onBranchChange?: (_branchId: string | 'main') => void;
  branchOptions?: Array<{ value: string; label: string }>;
  hiddenTabs?: Tab[];
}

export function MainLayoutTemplate({
  brandTitle,
  activeTab,
  onTabChange,
  onSignOut,
  children,
  selectedBranchId,
  onBranchChange,
  branchOptions,
  hiddenTabs,
}: MainLayoutTemplateProps) {
  const { t } = useTranslation();

  return (
    <div className="app">
      <NavigationBar
        brandTitle={brandTitle}
        activeTab={activeTab}
        onTabChange={onTabChange}
        selectedBranchId={selectedBranchId}
        onBranchChange={onBranchChange}
        branchOptions={branchOptions}
        hiddenTabs={hiddenTabs}
      />
      <main className="main-content">{children}</main>
      <footer className="app-footer">
        <LanguageSwitcher />
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="app-footer-sign-out-btn"
            data-testid="sign-out-btn"
          >
            {t('auth.signOut')}
          </button>
        )}
      </footer>
    </div>
  );
}
