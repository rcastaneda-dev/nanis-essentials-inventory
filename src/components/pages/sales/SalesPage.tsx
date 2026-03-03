import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SaleForm } from './SaleForm';
import { SearchSection } from './SearchSection';
import { CustomerGroup, CustomerGroupType } from './CustomerGroup';
import { DB, Sale, InventoryItem } from '../../../types/models';
import { isInMonthYear, getUniqueMonthsFromSales } from '../../../lib/utils';

interface SalesPageProps {
  db: DB;

  saveSale: (sale: Sale, updatedItems: InventoryItem[]) => Promise<void>;
  removeSale: (id: string, restoredItems: InventoryItem[]) => Promise<void>;
}

export function SalesPage({ db, saveSale, removeSale }: SalesPageProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const onDelete = (id: string) => {
    if (!window.confirm(t('sales.deleteSale'))) return;
    const s = db.sales.find(x => x.id === id);
    const restoredItems: InventoryItem[] = [];
    if (s) {
      s.lines.forEach(l => {
        const itemToRestore = s.branchId
          ? db.items.find(it => it.id === l.itemId && it.branchId === s.branchId)
          : db.items.find(it => it.id === l.itemId && !it.branchId);

        if (itemToRestore) {
          restoredItems.push({ ...itemToRestore, stock: itemToRestore.stock + l.quantity });
        }
      });
    }
    removeSale(id, restoredItems);
  };

  function matchesSearch(sale: Sale, query: string): boolean {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (sale.buyerName?.toLowerCase().includes(q) ?? false) ||
      sale.id.toLowerCase().includes(q) ||
      sale.paymentMethod.toLowerCase().includes(q) ||
      sale.totalAmount.toString().includes(q) ||
      new Date(sale.createdAt).toLocaleDateString().toLowerCase().includes(q)
    );
  }

  function matchesMonthFilter(sale: Sale, filter: string | null): boolean {
    if (!filter) return true;
    const [year, month] = filter.split('-').map(Number);
    return isInMonthYear(sale.createdAt, month, year);
  }

  // Generate month options from sales data
  const monthOptions = useMemo(() => {
    const uniqueMonths = getUniqueMonthsFromSales(db.sales);
    const options = [{ value: '', label: t('sales.allMonths') }];
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    uniqueMonths.forEach(({ year, month, key }) => {
      options.push({
        value: key,
        label: `${monthNames[month]} ${year}`,
      });
    });
    return options;
  }, [db.sales, t]);

  const groups: CustomerGroupType[] = useMemo(() => {
    const map = new Map<string, Sale[]>();
    db.sales
      .filter(s => matchesSearch(s, searchQuery) && matchesMonthFilter(s, monthFilter))
      .forEach(s => {
        const name = s.buyerName?.trim() || t('sales.anonymous');
        if (!map.has(name)) map.set(name, []);
        map.get(name)!.push(s);
      });

    const result: CustomerGroupType[] = Array.from(map.entries()).map(([name, sales]) => ({
      customerName: name,
      key: name.toLowerCase(),
      sales: sales.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      salesCount: sales.length,
      totalAmount: sales.reduce((sum, s) => sum + s.totalAmount, 0),
    }));

    // Sort by total spent desc, then name asc
    result.sort(
      (a, b) => b.totalAmount - a.totalAmount || a.customerName.localeCompare(b.customerName)
    );
    return result;
  }, [db.sales, searchQuery, monthFilter, t]);

  const summaryStats = useMemo(() => {
    const totalSales = groups.reduce((acc, g) => acc + g.salesCount, 0);
    const totalAmount = groups.reduce((acc, g) => acc + g.totalAmount, 0);
    const uniqueCustomers = groups.length;
    return { totalSales, totalAmount, uniqueCustomers };
  }, [groups]);

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandAll() {
    setExpandedGroups(new Set(groups.map(g => g.key)));
  }

  function collapseAll() {
    setExpandedGroups(new Set());
  }

  const handleSave = (sale: Sale, updatedItems: InventoryItem[]) => {
    saveSale(sale, updatedItems);
    setShowForm(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>{t('sales.title')}</h2>
        <button
          className="primary"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          {t('sales.registerSale')}
        </button>
      </div>

      <SearchSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        monthOptions={monthOptions}
        summaryStats={summaryStats}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      <div className="cards">
        {groups.map(group => (
          <CustomerGroup
            key={group.key}
            group={group}
            db={db}
            isExpanded={expandedGroups.has(group.key)}
            onToggle={() => toggleGroup(group.key)}
            onEditSale={sale => {
              setEditing(sale);
              setShowForm(true);
            }}
            onDeleteSale={onDelete}
          />
        ))}
        {groups.length === 0 && <div className="empty">{t('sales.noSales')}</div>}
      </div>

      {showForm && (
        <SaleForm
          db={db}
          initial={editing ?? undefined}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
