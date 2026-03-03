import React from 'react';

export type Tab = 'inventory' | 'purchases' | 'sales' | 'transactions' | 'analytics' | 'reports';

interface TopBarProps {
  active: Tab;
  setActive: (_tab: Tab) => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}

export function TopBar({ active, setActive, onExport, onImport, onClear }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="title">Nani&apos;s Essentials</div>
      </div>
      <div className="tabs">
        <button
          className={active === 'inventory' ? 'tab active' : 'tab'}
          onClick={() => setActive('inventory')}
        >
          Inventory
        </button>
        <button
          className={active === 'purchases' ? 'tab active' : 'tab'}
          onClick={() => setActive('purchases')}
        >
          Purchases
        </button>
        <button
          className={active === 'sales' ? 'tab active' : 'tab'}
          onClick={() => setActive('sales')}
        >
          Sales
        </button>
        <button
          className={active === 'transactions' ? 'tab active' : 'tab'}
          onClick={() => setActive('transactions')}
        >
          Transactions
        </button>
        <button
          className={active === 'analytics' ? 'tab active' : 'tab'}
          onClick={() => setActive('analytics')}
        >
          Analytics
        </button>
        <button
          className={active === 'reports' ? 'tab active' : 'tab'}
          onClick={() => setActive('reports')}
        >
          Reports
        </button>
      </div>
      <div className="actions">
        <button onClick={onExport}>Export Backup</button>
        <button onClick={onImport}>Import</button>
        <button className="danger" onClick={onClear}>
          Clear All Data
        </button>
      </div>
    </div>
  );
}
