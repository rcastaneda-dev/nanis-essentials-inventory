import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../molecules/PageHeader';
import { SearchFilters, SortOption } from '../molecules/SearchFilters';
import { ItemGrid } from '../organisms/ItemGrid';
import { Modal } from '../molecules/Modal';
import { InventoryItem } from '../../types/models';

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

  branchName?: string;
  lastSellingPricesByItemId?: Map<string, number[]>;
  branchNameById?: Map<string, string>;

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
  branchName,
  lastSellingPricesByItemId,
  branchNameById,
}: InventoryPageTemplateProps) {
  const { t } = useTranslation();
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  const pageTitle = branchName
    ? `${t('inventory.title')} - ${branchName}`
    : t('inventory.management');

  return (
    <div className="page">
      <PageHeader title={pageTitle} actions={headerActions} />

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
        items={paginatedItems}
        onEdit={onEditItem}
        onDelete={onDeleteItem}
        showEmptyState={showEmptyState}
        showNoResults={showNoResults}
        testId="inventory-cards"
        columns="two"
        lastSellingPricesByItemId={lastSellingPricesByItemId}
        branchNameById={branchNameById}
      />

      {!showEmptyState && !showNoResults && items.length > ITEMS_PER_PAGE && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginTop: '1.5rem',
            padding: '0 1rem',
          }}
          data-testid="inventory-pagination"
        >
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: currentPage === 1 ? 'var(--border-light)' : 'var(--card)',
              color: currentPage === 1 ? 'var(--muted)' : 'var(--text)',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
            data-testid="pagination-prev"
          >
            {t('common.previous')}
          </button>
          <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            {t('inventory.pageOf', { current: currentPage, total: totalPages })}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: currentPage === totalPages ? 'var(--border-light)' : 'var(--card)',
              color: currentPage === totalPages ? 'var(--muted)' : 'var(--text)',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
            data-testid="pagination-next"
          >
            {t('common.next')}
          </button>
        </div>
      )}

      {showForm && (
        <Modal title={formTitle} onClose={onCloseForm}>
          {formContent}
        </Modal>
      )}
    </div>
  );
}
