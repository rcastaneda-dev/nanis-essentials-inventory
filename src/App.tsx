import React, { useState, lazy, Suspense } from 'react';
import './App.css';
import { MainLayoutTemplate } from './components/templates/MainLayoutTemplate';
import { Tab } from './components/organisms/NavigationBar';
import { PageLoader } from './components/shared/PageLoader';
import { useAppData } from './hooks/useAppData';
import { useBackupImport } from './hooks/useBackupImport';

// Lazy-load page components for code splitting
const InventoryPage = lazy(() =>
  import('./components/pages/inventory').then(m => ({ default: m.InventoryPage }))
);
const PurchasesPage = lazy(() =>
  import('./components/pages/purchases').then(m => ({ default: m.PurchasesPage }))
);
const SalesPage = lazy(() =>
  import('./components/pages/sales').then(m => ({ default: m.SalesPage }))
);
const TransactionsPage = lazy(() =>
  import('./components/pages/transactions').then(m => ({ default: m.TransactionsPage }))
);
const AnalyticsPage = lazy(() =>
  import('./components/pages/analytics').then(m => ({ default: m.AnalyticsPage }))
);
const FinancialDashboard = lazy(() =>
  import('./components/pages/reports').then(m => ({ default: m.FinancialDashboard }))
);
const ImportExportPage = lazy(() =>
  import('./components/pages/import-export').then(m => ({ default: m.ImportExportPage }))
);
const QuotesPage = lazy(() =>
  import('./components/pages/quotes').then(m => ({ default: m.QuotesPage }))
);

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
      <Suspense fallback={<PageLoader />}>{renderPageContent()}</Suspense>
    </MainLayoutTemplate>
  );
}
