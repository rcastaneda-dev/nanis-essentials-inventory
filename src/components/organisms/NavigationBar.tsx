import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Heading } from '../atoms/Typography';
import { useIsMobile } from '../../hooks/useMediaQuery';

export type Tab =
  | 'inventory'
  | 'purchases'
  | 'sales'
  | 'transactions'
  | 'analytics'
  | 'reports'
  | 'quotes'
  | 'import-export';

interface NavigationBarProps {
  brandTitle: string;
  activeTab: Tab;
  onTabChange: (_tab: Tab) => void;
  selectedBranchId?: string | 'main';
  onBranchChange?: (_branchId: string | 'main') => void;
  branchOptions?: Array<{ value: string; label: string }>;
  hiddenTabs?: Tab[];
}

export function NavigationBar({
  brandTitle,
  activeTab,
  onTabChange,
  selectedBranchId,
  onBranchChange,
  branchOptions,
  hiddenTabs,
}: NavigationBarProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allTabs: { key: Tab; label: string; disabled?: boolean }[] = [
    { key: 'inventory', label: t('navigation.inventory') },
    { key: 'purchases', label: t('navigation.purchases') },
    { key: 'sales', label: t('navigation.sales') },
    { key: 'transactions', label: t('navigation.transactions') },
    { key: 'analytics', label: t('navigation.analytics') },
    { key: 'reports', label: t('navigation.reports'), disabled: true },
    { key: 'quotes', label: t('navigation.quotes') },
    { key: 'import-export', label: t('navigation.importExport') },
  ];

  const tabs = hiddenTabs?.length ? allTabs.filter(tab => !hiddenTabs.includes(tab.key)) : allTabs;

  const branchSelector = branchOptions && branchOptions.length > 1 && onBranchChange && (
    <div className="branch-selector">
      <label htmlFor="global-branch-selector">{t('navigation.location')}:</label>
      <select
        id="global-branch-selector"
        value={selectedBranchId || 'main'}
        onChange={e => onBranchChange(e.target.value as string | 'main')}
      >
        {branchOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const handleTabChange = useCallback(
    (tab: Tab) => {
      onTabChange(tab);
      setDrawerOpen(false);
    },
    [onTabChange]
  );

  if (isMobile) {
    return (
      <>
        <div className="topbar topbar-mobile">
          <div className="brand">
            <div className="title">
              <Heading level={1}>{brandTitle}</Heading>
            </div>
          </div>
          <button
            className="hamburger-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>

        {drawerOpen && (
          <div className="mobile-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
        )}
        <nav className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
          <div className="mobile-drawer-header">
            <Heading level={2}>{brandTitle}</Heading>
            <button
              className="drawer-close-btn"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          {branchSelector && <div className="mobile-branch-selector">{branchSelector}</div>}
          <div className="mobile-drawer-tabs">
            {tabs.map(tab => (
              <Button
                key={tab.key}
                className={activeTab === tab.key ? 'drawer-tab active' : 'drawer-tab'}
                onClick={() => handleTabChange(tab.key)}
                disabled={tab.disabled}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </nav>
      </>
    );
  }

  return (
    <div className="topbar">
      <div className="brand">
        <div className="title">
          <Heading level={1}>{brandTitle}</Heading>
        </div>
      </div>

      {branchSelector}

      <div className="tabs">
        {tabs.map(tab => (
          <Button
            key={tab.key}
            className={activeTab === tab.key ? 'tab active' : 'tab'}
            onClick={() => onTabChange(tab.key)}
            disabled={tab.disabled}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
