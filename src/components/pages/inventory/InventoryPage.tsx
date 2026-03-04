import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { InventoryForm } from './InventoryForm';
import { BranchManager } from './BranchManager';
import { MoveToBranchModal } from './MoveToBranchModal';
import { MoveToMainModal } from './MoveToMainModal';
import { InventoryPageTemplate } from '../../templates/InventoryPageTemplate';
import { PageLoader } from '../../shared/PageLoader';
import { SortOption } from '../../molecules/SearchFilters';
import { DB, InventoryItem } from '../../../types/models';
import {
  nowIso,
  uid,
  generateInventoryCSV,
  downloadCSV,
  buildLastSellingPricesMap,
} from '../../../lib/utils';
import { CATEGORIES } from '../../../constants/categories';
import { getCategoryTranslationKey } from '../../../lib/i18nUtils';

interface InventoryPageProps {
  db: DB;
  persist: (_db: DB) => void;
  onRefresh: () => void;
  saveProduct: (_item: InventoryItem) => Promise<void>;
  productsLoading: boolean;
  saveBranch: (_branch: import('../../../types/models').Branch) => Promise<void>;
  saveMoveToBranch: (
    _pendingMoves: Array<{ itemId: string; quantity: number; item: InventoryItem }>,
    _targetBranchId: string,
    _updatedItems: InventoryItem[]
  ) => Promise<void>;
  selectedBranchId: string | 'main';
}

export function InventoryPage({
  db,
  persist,
  saveProduct,
  productsLoading,
  saveBranch,
  saveMoveToBranch,
  selectedBranchId,
}: InventoryPageProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [showMoveToBranch, setShowMoveToBranch] = useState(false);
  const [showMoveToMain, setShowMoveToMain] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('inStock');

  // Precompute last selling prices for all items (computed once, reused for all cards)
  const lastSellingPricesByItemId = useMemo(() => buildLastSellingPricesMap(db.sales), [db.sales]);

  // Precompute branch names map for efficient lookup
  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    db.branches?.forEach(branch => {
      map.set(branch.id, branch.name);
    });
    return map;
  }, [db.branches]);

  // Filter items by selected branch
  const items = useMemo(() => {
    if (selectedBranchId === 'main') {
      return db.items.filter(item => !item.branchId);
    }
    return db.items.filter(item => item.branchId === selectedBranchId);
  }, [db.items, selectedBranchId]);

  // Filter items based on search query and category
  const filteredItems = useMemo(() => {
    let result = items;

    // Apply category filter
    if (categoryFilter && categoryFilter !== '') {
      result = result.filter(item => item.category === categoryFilter);
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
      );
    }

    return result;
  }, [items, searchQuery, categoryFilter]);

  const sortedItems = useMemo(() => {
    const copy = [...filteredItems];
    switch (sortBy) {
      case 'nameAsc':
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case 'nameDesc':
        return copy.sort((a, b) => b.name.localeCompare(a.name));
      case 'minPriceAsc':
        return copy.sort((a, b) => {
          const aVal = a.minPrice ?? Number.POSITIVE_INFINITY;
          const bVal = b.minPrice ?? Number.POSITIVE_INFINITY;
          return aVal - bVal;
        });
      case 'minPriceDesc':
        return copy.sort((a, b) => {
          const aVal = a.minPrice ?? Number.NEGATIVE_INFINITY;
          const bVal = b.minPrice ?? Number.NEGATIVE_INFINITY;
          return bVal - aVal;
        });
      case 'outOfStock':
        return copy.sort((a, b) => {
          const aStock = a.stock ?? 0;
          const bStock = b.stock ?? 0;
          return aStock - bStock;
        });
      case 'inStock':
      default:
        return copy.sort((a, b) => {
          const aStock = a.stock ?? 0;
          const bStock = b.stock ?? 0;
          // Sort by stock level (high to low), which naturally puts out-of-stock (0) at bottom
          if (aStock !== bStock) return bStock - aStock;
          // Tie-breaker by name for stable, predictable order
          return a.name.localeCompare(b.name);
        });
    }
  }, [filteredItems, sortBy]);

  const onDelete = useCallback(
    (id: string) => {
      if (!window.confirm(t('inventory.deleteItem'))) return;
      persist({ ...db, items: db.items.filter(i => i.id !== id) });
    },
    [db, persist, t]
  );

  const handleEditItem = useCallback(
    (item: InventoryItem) => {
      setEditing(item);
      setShowForm(true);
    },
    [setEditing, setShowForm]
  );

  if (productsLoading) {
    return <PageLoader />;
  }

  const handleRecalculatePrices = () => {
    // Recalculate unit costs for all items using weight-based allocation
    const updatedItems = [...db.items];
    const updatedPurchases = [...db.purchases];

    // Process each purchase to recalculate allocations
    db.purchases.forEach((purchase, purchaseIndex) => {
      const { lines, tax, shippingUS, shippingIntl, subtotal } = purchase;

      // Calculate total units and weight for this purchase
      const totalUnits = lines.reduce(
        (acc, l) => acc + l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0),
        0
      );
      const totalWeight = lines.reduce((acc, l) => {
        const item = updatedItems.find(item => item.id === l.itemId);
        const itemWeight = item?.weightLbs ?? 0;
        const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
        return acc + itemWeight * lineUnits;
      }, 0);

      // Recalculate allocations for each line
      const updatedLines = lines.map(l => {
        const item = updatedItems.find(item => item.id === l.itemId);
        const itemWeight = item?.weightLbs ?? 0;
        const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
        const lineWeight = itemWeight * lineUnits;

        // Proportional tax distribution based on unit cost
        const lineCost = l.quantity * l.unitCost;
        const perUnitTax = subtotal > 0 ? (tax * lineCost) / (subtotal * l.quantity) : 0;

        // Equal distribution for US shipping
        const perUnitShippingUS = shippingUS > 0 && totalUnits ? shippingUS / totalUnits : 0;

        // Weight-based distribution for international shipping
        const weightRatio = totalWeight > 0 ? lineWeight / totalWeight : 0;
        const perUnitShippingIntl = lineUnits > 0 ? (shippingIntl * weightRatio) / lineUnits : 0;

        return {
          ...l,
          perUnitTax,
          perUnitShippingUS,
          perUnitShippingIntl,
          unitCostPostShipping: l.unitCost + perUnitTax + perUnitShippingUS + perUnitShippingIntl,
        };
      });

      updatedPurchases[purchaseIndex] = {
        ...purchase,
        lines: updatedLines,
      };

      // Update item costs based on most recent purchase
      updatedLines.forEach(l => {
        const itemIndex = updatedItems.findIndex(item => item.id === l.itemId);
        if (itemIndex !== -1) {
          const costPre = l.unitCost;
          const costPost = l.unitCostPostShipping ?? l.unitCost;
          const autoMin = Math.ceil(costPost * 1.25);
          const autoMax = Math.ceil(costPost * 1.4);

          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            costPreShipping: costPre,
            costPostShipping: costPost,
            minPrice: autoMin,
            maxPrice: autoMax,
            minProfit: autoMin - costPost,
            maxProfit: autoMax - costPost,
            updatedAt: nowIso(),
          };
        }
      });
    });

    persist({ ...db, items: updatedItems, purchases: updatedPurchases });
  };

  const selectedBranch =
    selectedBranchId === 'main' ? null : db.branches?.find(b => b.id === selectedBranchId);

  const handleDownloadInventory = () => {
    const branchName = selectedBranch?.name || t('inventory.mainInventory');
    const csvContent = generateInventoryCSV(items);
    const filename = `Nanis Essentials Inventory - ${branchName}.csv`;
    downloadCSV(csvContent, filename);
  };

  const handleMoveToBranch = async (
    pendingMoves: Array<{ itemId: string; quantity: number; item: InventoryItem }>,
    targetBranchId: string
  ) => {
    if (typeof saveMoveToBranch !== 'function') {
      throw new Error('Save is not available. Please refresh the page.');
    }

    let updatedItems = [...db.items];

    pendingMoves.forEach(move => {
      const sourceItem = updatedItems.find(i => i.id === move.itemId && !i.branchId);
      if (!sourceItem) return;

      // Decrease main inventory stock
      const updatedSourceItem = {
        ...sourceItem,
        stock: Math.max(0, sourceItem.stock - move.quantity),
        updatedAt: nowIso(),
      };

      // Calculate branch unit cost (+$1)
      const baseCost = sourceItem.costPostShipping ?? sourceItem.costPreShipping ?? 0;
      const branchCostPre = sourceItem.costPreShipping
        ? sourceItem.costPreShipping + 1
        : baseCost + 1;
      const branchCostPost = sourceItem.costPostShipping
        ? sourceItem.costPostShipping + 1
        : baseCost + 1;

      // Match by product id and branch (same product at target branch)
      const existingBranchItem = updatedItems.find(
        i => i.id === sourceItem.id && i.branchId === targetBranchId
      );

      if (existingBranchItem) {
        // Update existing branch item stock
        updatedItems = updatedItems.map(item =>
          item.id === existingBranchItem.id && item.branchId === targetBranchId
            ? {
                ...item,
                stock: item.stock + move.quantity,
                updatedAt: nowIso(),
              }
            : item
        );
      } else {
        // New branch row: same product (id), different location (branchId)
        const branchItem: InventoryItem = {
          ...sourceItem,
          id: sourceItem.id,
          branchId: targetBranchId,
          stock: move.quantity,
          costPreShipping: branchCostPre,
          costPostShipping: branchCostPost,
          minPrice: Math.ceil(branchCostPost * 1.25),
          maxPrice: Math.ceil(branchCostPost * 1.4),
          minProfit: Math.ceil(branchCostPost * 1.25) - branchCostPost,
          maxProfit: Math.ceil(branchCostPost * 1.4) - branchCostPost,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        updatedItems.push(branchItem);
      }

      // Update source item
      updatedItems = updatedItems.map(item =>
        item.id === sourceItem.id && !item.branchId ? updatedSourceItem : item
      );
    });

    await saveMoveToBranch(pendingMoves, targetBranchId, updatedItems);
  };

  const handleMoveToMain = (
    pendingMoves: Array<{ itemId: string; quantity: number; item: InventoryItem }>
  ) => {
    if (selectedBranchId === 'main') return;

    let updatedItems = [...db.items];

    pendingMoves.forEach(move => {
      const branchItem = updatedItems.find(
        i => i.id === move.itemId && i.branchId === selectedBranchId
      );
      if (!branchItem) return;

      // Decrease branch inventory stock
      const updatedBranchItem = {
        ...branchItem,
        stock: Math.max(0, branchItem.stock - move.quantity),
        updatedAt: nowIso(),
      };

      // Calculate original cost (remove +$1)
      const branchCost = branchItem.costPostShipping ?? branchItem.costPreShipping ?? 0;
      const originalCostPre = branchItem.costPreShipping
        ? branchItem.costPreShipping - 1
        : branchCost - 1;
      const originalCostPost = branchItem.costPostShipping
        ? branchItem.costPostShipping - 1
        : branchCost - 1;

      // Find or create main inventory item
      const mainItem = updatedItems.find(i => i.name === branchItem.name && !i.branchId);

      if (mainItem) {
        // Update existing main item
        updatedItems = updatedItems.map(item =>
          item.id === mainItem.id && !item.branchId
            ? {
                ...item,
                stock: item.stock + move.quantity,
                updatedAt: nowIso(),
              }
            : item
        );
      } else {
        // Create new main item with original cost
        const newMainItem: InventoryItem = {
          ...branchItem,
          id: uid(),
          branchId: undefined,
          stock: move.quantity,
          costPreShipping: originalCostPre,
          costPostShipping: originalCostPost,
          // Recalculate pricing based on original cost
          minPrice: Math.ceil(originalCostPost * 1.25),
          maxPrice: Math.ceil(originalCostPost * 1.4),
          minProfit: Math.ceil(originalCostPost * 1.25) - originalCostPost,
          maxProfit: Math.ceil(originalCostPost * 1.4) - originalCostPost,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        updatedItems.push(newMainItem);
      }

      // Update branch item
      updatedItems = updatedItems.map(item =>
        item.id === branchItem.id && item.branchId === selectedBranchId ? updatedBranchItem : item
      );

      // Remove branch item if stock is 0
      if (updatedBranchItem.stock === 0) {
        updatedItems = updatedItems.filter(
          item => !(item.id === branchItem.id && item.branchId === selectedBranchId)
        );
      }
    });

    persist({ ...db, items: updatedItems });
    setShowMoveToMain(false);
  };

  const headerActions = [
    {
      label: t('inventory.downloadInventory'),
      onClick: handleDownloadInventory,
      title: t('inventory.downloadInventoryTitle', {
        branch: selectedBranch?.name || t('inventory.mainInventory'),
      }),
      testId: 'download-inventory-btn',
    },
    {
      label: t('inventory.viewPublicCatalog'),
      onClick: () => window.open('https://nanisessentials-catalog.vercel.app/', '_blank'),
      title: t('inventory.viewPublicCatalogTitle'),
      testId: 'view-public-catalog-btn',
    },
    {
      label: t('inventory.recalculateUnitCosts'),
      onClick: handleRecalculatePrices,
      title: t('inventory.recalculatePricesTitle'),
      testId: 'recalculate-prices-btn',
    },
    {
      label: t('inventory.manageBranches'),
      onClick: () => setShowBranchManager(true),
      title: t('inventory.manageBranchesTitle'),
      testId: 'manage-branches-btn',
    },
    ...(selectedBranchId === 'main'
      ? [
          {
            label: t('inventory.moveToBranch'),
            onClick: () => setShowMoveToBranch(true),
            title: t('inventory.moveToBranchTitle'),
            testId: 'move-to-branch-btn',
            variant: 'secondary' as const,
          },
        ]
      : [
          {
            label: t('inventory.moveToMain'),
            onClick: () => setShowMoveToMain(true),
            title: t('inventory.moveToMainTitle'),
            testId: 'move-to-main-btn',
            variant: 'secondary' as const,
          },
        ]),
    {
      label: `+ ${t('inventory.addItem')}`,
      onClick: () => {
        setEditing(null);
        setShowForm(true);
      },
      variant: 'primary' as const,
    },
  ];

  const sortOptions = [
    { value: '', label: t('inventory.sortBy'), disabled: true },
    { value: 'inStock', label: t('inventory.stockLevelHighLow') },
    { value: 'outOfStock', label: t('inventory.stockLevelLowHigh') },
    { value: 'nameAsc', label: t('inventory.nameAZ') },
    { value: 'nameDesc', label: t('inventory.nameZA') },
    { value: 'minPriceAsc', label: t('inventory.minPriceLowHigh') },
    { value: 'minPriceDesc', label: t('inventory.minPriceHighLow') },
  ];

  const categoryOptions = [
    { value: '', label: t('inventory.allCategories') },
    ...CATEGORIES.map(category => ({
      value: category,
      label: t(`categories.${getCategoryTranslationKey(category)}`),
    })),
  ];

  const formContent = showForm ? (
    <InventoryForm
      initial={editing ?? undefined}
      onClose={() => setShowForm(false)}
      onSave={item => {
        saveProduct(item).catch(err => {
          // eslint-disable-next-line no-console
          console.error('Failed to save product to Supabase:', err);
          alert(err.message);
        });
        setShowForm(false);
      }}
    />
  ) : null;

  return (
    <>
      <InventoryPageTemplate
        headerActions={headerActions}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOptions={sortOptions}
        totalCount={items.length}
        filteredCount={filteredItems.length}
        items={sortedItems}
        onEditItem={handleEditItem}
        onDeleteItem={onDelete}
        showEmptyState={filteredItems.length === 0 && items.length === 0}
        showNoResults={filteredItems.length === 0 && items.length > 0}
        showForm={showForm}
        formTitle={editing ? t('inventory.editItem') : t('inventory.addItem')}
        onCloseForm={() => setShowForm(false)}
        formContent={formContent}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categoryOptions={categoryOptions}
        branchName={selectedBranch?.name}
        lastSellingPricesByItemId={lastSellingPricesByItemId}
        branchNameById={branchNameById}
      />

      {showBranchManager && (
        <BranchManager
          db={db}
          onSave={branches => {
            branches.forEach(branch => {
              saveBranch(branch).catch(err => {
                // eslint-disable-next-line no-console
                console.error('Failed to save branch to Supabase:', err);
              });
            });
            persist({ ...db, branches });
            setShowBranchManager(false);
          }}
          onClose={() => setShowBranchManager(false)}
        />
      )}

      {showMoveToBranch && (
        <MoveToBranchModal
          db={db}
          onSave={handleMoveToBranch}
          onClose={() => setShowMoveToBranch(false)}
        />
      )}

      {showMoveToMain && selectedBranchId !== 'main' && (
        <MoveToMainModal
          db={db}
          sourceBranchId={selectedBranchId}
          onSave={handleMoveToMain}
          onClose={() => setShowMoveToMain(false)}
        />
      )}
    </>
  );
}
