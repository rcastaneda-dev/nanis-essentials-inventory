import React from 'react';
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
  const tabs: { key: Tab; label: string; disabled?: boolean }[] = [
    { key: 'inventory', label: 'Inventory' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'sales', label: 'Sales' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'reports', label: 'Reports', disabled: true },
    { key: 'quotes', label: 'Quotes' },
    { key: 'import-export', label: 'Import/Export' },
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
