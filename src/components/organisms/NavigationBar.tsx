import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Heading } from '../atoms/Typography';

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
}

export function NavigationBar({ brandTitle, activeTab, onTabChange }: NavigationBarProps) {
  const { t } = useTranslation();
  const tabs: { key: Tab; label: string; disabled?: boolean }[] = [
    { key: 'inventory', label: t('navigation.inventory') },
    { key: 'purchases', label: t('navigation.purchases') },
    { key: 'sales', label: t('navigation.sales') },
    { key: 'transactions', label: t('navigation.transactions') },
    { key: 'analytics', label: t('navigation.analytics') },
    { key: 'reports', label: t('navigation.reports'), disabled: true },
    { key: 'quotes', label: t('navigation.quotes') },
    { key: 'import-export', label: t('navigation.importExport') },
  ];

  return (
    <div className="topbar">
      <div className="brand">
        <div className="title">
          <Heading level={1}>{brandTitle}</Heading>
        </div>
      </div>

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
