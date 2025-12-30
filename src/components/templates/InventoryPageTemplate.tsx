import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../molecules/PageHeader';
import { SearchFilters, SortOption } from '../molecules/SearchFilters';
import { ItemGrid } from '../organisms/ItemGrid';
import { Modal } from '../molecules/Modal';
import { InventoryItem, DB } from '../../types/models';

interface InventoryPageTemplateProps {
  // Page Header
  headerActions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    title?: string;
    testId?: string;
  }>;

  // Search and Filters
  searchQuery: string;
  onSearchChange: (_query: string) => void;
  sortBy: SortOption;
  onSortChange: (_sort: SortOption) => void;
  sortOptions: Array<{ value: string; label: string; disabled?: boolean }>;
  totalCount: number;
  filteredCount: number;
  categoryFilter?: string;
  onCategoryChange?: (_category: string) => void;
  categoryOptions?: Array<{ value: string; label: string; disabled?: boolean }>;

  // Branch Selection
  selectedBranchId?: string | 'main';
  onBranchChange?: (_branchId: string | 'main') => void;
  branchOptions?: Array<{ value: string; label: string }>;
  branchName?: string;
  db?: DB; // DB for branch name lookup

  // Items Grid
  items: InventoryItem[];
  onEditItem: (_item: InventoryItem) => void;
  onDeleteItem: (_id: string) => void;
  showEmptyState: boolean;
  showNoResults: boolean;

  // Form Modal
  showForm: boolean;
  formTitle: string;
  onCloseForm: () => void;
  formContent: React.ReactNode;
}

export function InventoryPageTemplate({
  headerActions,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  sortOptions,
  totalCount,
  filteredCount,
  items,
  onEditItem,
  onDeleteItem,
  showEmptyState,
  showNoResults,
  showForm,
  formTitle,
  onCloseForm,
  formContent,
  categoryFilter,
  onCategoryChange,
  categoryOptions,
  selectedBranchId,
  onBranchChange,
  branchOptions,
  branchName,
  db,
}: InventoryPageTemplateProps) {
  const { t } = useTranslation();
  const pageTitle = branchName
    ? `${t('inventory.title')} - ${branchName}`
    : t('inventory.management');

  return (
    <div className="page">
      <PageHeader title={pageTitle} actions={headerActions} />

      {branchOptions && branchOptions.length > 1 && onBranchChange && (
        <div style={{ marginBottom: '1rem', padding: '0 1rem' }}>
          <label htmlFor="branch-selector" style={{ marginRight: '0.5rem', fontWeight: '500' }}>
            View:
          </label>
          <select
            id="branch-selector"
            value={selectedBranchId || 'main'}
            onChange={e => onBranchChange(e.target.value as string | 'main')}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '1rem',
            }}
          >
            {branchOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <SearchFilters
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        sortBy={sortBy}
        onSortChange={onSortChange}
        sortOptions={sortOptions}
        totalCount={totalCount}
        filteredCount={filteredCount}
        placeholder="Search items"
        testId="inventory-filters"
        categoryFilter={categoryFilter}
        onCategoryChange={onCategoryChange}
        categoryOptions={categoryOptions}
      />

      <ItemGrid
        items={items}
        onEdit={onEditItem}
        onDelete={onDeleteItem}
        showEmptyState={showEmptyState}
        showNoResults={showNoResults}
        testId="inventory-cards"
        columns="two"
        db={db}
      />

      {showForm && (
        <Modal title={formTitle} onClose={onCloseForm}>
          {formContent}
        </Modal>
      )}
    </div>
  );
}
