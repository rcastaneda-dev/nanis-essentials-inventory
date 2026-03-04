import React, { useState, lazy, Suspense } from 'react';
import './App.css';
import { MainLayoutTemplate } from './components/templates/MainLayoutTemplate';
import { Tab } from './components/organisms/NavigationBar';
import { PageLoader } from './components/shared/PageLoader';
import { useAppData } from './hooks/useAppData';
import { useBackupImport } from './hooks/useBackupImport';
import { useAuth } from './hooks/useAuth';
import { LoginPage, ResetPasswordPage } from './components/pages/auth';

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
  const {
    session,
    loading: authLoading,
    isPasswordRecovery,
    signInWithPassword,
    signInWithOtp,
    updatePassword,
    signOut,
  } = useAuth();
  const {
    db,
    persist,
    refreshData,
    loading,
    saveProduct,
    saveBranch,
    saveMoveToBranch,
    savePurchase,
    removePurchase,
    saveSale,
    removeSale,
    saveTransaction,
    removeTransaction,
    saveCashWithdrawal,
  } = useAppData();
  const [tab, setTab] = useState<Tab>('inventory');
  const { handleExport, handleImport, handleClear } = useBackupImport(refreshData);

  if (authLoading) {
    return <PageLoader />;
  }

  if (!session) {
    return <LoginPage onSignInWithPassword={signInWithPassword} onSignInWithOtp={signInWithOtp} />;
  }

  if (isPasswordRecovery) {
    return <ResetPasswordPage onUpdatePassword={updatePassword} />;
  }

  const renderPageContent = () => {
    switch (tab) {
      case 'inventory':
        return (
          <InventoryPage
            db={db}
            persist={persist}
            onRefresh={refreshData}
            saveProduct={saveProduct}
            productsLoading={loading}
            saveBranch={saveBranch}
            saveMoveToBranch={saveMoveToBranch}
          />
        );
      case 'purchases':
        return (
          <PurchasesPage db={db} savePurchase={savePurchase} removePurchase={removePurchase} />
        );
      case 'sales':
        return <SalesPage db={db} saveSale={saveSale} removeSale={removeSale} />;
      case 'transactions':
        return (
          <TransactionsPage
            db={db}
            persist={persist}
            saveTransaction={saveTransaction}
            removeTransaction={removeTransaction}
            saveCashWithdrawal={saveCashWithdrawal}
          />
        );
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
        return (
          <InventoryPage
            db={db}
            persist={persist}
            onRefresh={refreshData}
            saveProduct={saveProduct}
            productsLoading={loading}
            saveBranch={saveBranch}
            saveMoveToBranch={saveMoveToBranch}
          />
        );
    }
  };

  return (
    <MainLayoutTemplate
      brandTitle="Nani's Essentials"
      activeTab={tab}
      onTabChange={setTab}
      onSignOut={signOut}
    >
      <Suspense fallback={<PageLoader />}>{renderPageContent()}</Suspense>
    </MainLayoutTemplate>
  );
}
