import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';

export type DateFilterOption = 'current-month' | 'previous-month' | 'overall';

interface DateFiltersProps {
  activeFilter: DateFilterOption;
  onFilterChange: (_filter: DateFilterOption) => void;
}

export function DateFilters({ activeFilter, onFilterChange }: DateFiltersProps) {
  const { t } = useTranslation();
  const filters: { key: DateFilterOption; label: string }[] = [
    { key: 'current-month', label: t('dateFilters.currentMonth') },
    { key: 'previous-month', label: t('dateFilters.previousMonth') },
    { key: 'overall', label: t('dateFilters.overall') },
  ];

  return (
    <div className="date-filters">
      <div className="filter-buttons">
        {filters.map(filter => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? 'primary' : 'secondary'}
            onClick={() => onFilterChange(filter.key)}
            className="filter-button"
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
