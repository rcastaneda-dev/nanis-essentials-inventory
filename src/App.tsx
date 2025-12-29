import React, { useState } from 'react';
import './App.css';
import { MainLayoutTemplate } from './components/templates/MainLayoutTemplate';
import { Tab } from './components/organisms/NavigationBar';
import { InventoryPage } from './components/pages/inventory';
import { PurchasesPage } from './components/pages/purchases';
import { SalesPage } from './components/pages/sales';
import { TransactionsPage } from './components/pages/transactions';
import { AnalyticsPage } from './components/pages/analytics';
import { FinancialDashboard } from './components/pages/reports';
import { ImportExportPage } from './components/pages/import-export';
import { QuotesPage } from './components/pages/quotes';
import { useAppData } from './hooks/useAppData';
import { useBackupImport } from './hooks/useBackupImport';

export default function App() {
  const { db, persist, refreshData } = useAppData();
  const [tab, setTab] = useState<Tab>('inventory');
  const { handleExport, handleImport, handleClear } = useBackupImport(refreshData);

  const renderPageContent = () => {
    switch (tab) {
      case 'inventory':
        return <InventoryPage db={db} persist={persist} onRefresh={refreshData} />;
      case 'purchases':
        return <PurchasesPage db={db} persist={persist} />;
      case 'sales':
        return <SalesPage db={db} persist={persist} />;
      case 'transactions':
        return <TransactionsPage db={db} persist={persist} />;
      case 'analytics':
        return <AnalyticsPage db={db} />;
      case 'reports':
        return <FinancialDashboard db={db} />;
      case 'quotes':
        return <QuotesPage db={db} />;
      case 'import-export':
        return (
          <ImportExportPage onExport={handleExport} onImport={handleImport} onClear={handleClear} />
        );
      default:
        return <InventoryPage db={db} persist={persist} onRefresh={refreshData} />;
    }
  };

  return (
    <MainLayoutTemplate brandTitle="Nani's Essentials" activeTab={tab} onTabChange={setTab}>
      {renderPageContent()}
    </MainLayoutTemplate>
  );
}
