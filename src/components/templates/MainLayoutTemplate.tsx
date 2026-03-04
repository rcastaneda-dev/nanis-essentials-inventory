import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationBar, Tab } from '../organisms/NavigationBar';
import { LanguageSwitcher } from '../atoms/LanguageSwitcher';
import { useIsMobile } from '../../hooks/useMediaQuery';

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
  const isMobile = useIsMobile();

  const drawerFooter = (
    <>
      <LanguageSwitcher />
      {onSignOut && (
        <button onClick={onSignOut} className="drawer-sign-out-btn" data-testid="sign-out-btn">
          {t('auth.signOut')}
        </button>
      )}
    </>
  );

  return (
    <div className="app">
      <NavigationBar
        brandTitle={brandTitle}
        activeTab={activeTab}
        onTabChange={onTabChange}
        drawerFooter={isMobile ? drawerFooter : undefined}
        selectedBranchId={selectedBranchId}
        onBranchChange={onBranchChange}
        branchOptions={branchOptions}
        hiddenTabs={hiddenTabs}
      />
      {!isMobile && (
        <div className="top-right-controls">
          <LanguageSwitcher />
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="top-right-sign-out-btn"
              data-testid="sign-out-btn"
            >
              {t('auth.signOut')}
            </button>
          )}
        </div>
      )}
      <main className="main-content">{children}</main>
    </div>
  );
}
