export const fmtUSD = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export const parseNumber = (v: string) => {
  const n = Number((v ?? '').toString().replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : 0;
};

export const uid = () => Math.random().toString(36).slice(2, 9);

export const nowIso = () => new Date().toISOString();

export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

export const isSameMonth = (iso: string) => {
  const d = new Date(iso);
  const s = startOfMonth();
  return d >= s;
};

export const isCurrentMonth = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

export const isPreviousMonth = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
};

export const isInMonthYear = (iso: string, month: number, year: number) => {
  const d = new Date(iso);
  return d.getMonth() === month && d.getFullYear() === year;
};

export const getUniqueMonthsFromSales = (sales: Array<{ createdAt: string }>) => {
  const monthSet = new Set<string>();
  sales.forEach(sale => {
    const date = new Date(sale.createdAt);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    monthSet.add(monthYear);
  });
  return Array.from(monthSet)
    .map(monthYear => {
      const [year, month] = monthYear.split('-');
      return {
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        key: monthYear,
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
};

export const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  // Calculate the difference in milliseconds to get to Sunday
  const diff = day * 24 * 60 * 60 * 1000;
  return new Date(d.getTime() - diff);
};

export const getWeeksInRange = (startDate: Date, endDate: Date) => {
  const weeks = [];
  const current = getStartOfWeek(startDate);

  while (current <= endDate) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({
      start: new Date(current),
      end: new Date(Math.min(weekEnd.getTime(), endDate.getTime())),
    });
    current.setDate(current.getDate() + 7);
  }

  return weeks;
};

export const isDateInWeek = (iso: string, weekStart: Date, weekEnd: Date) => {
  const date = new Date(iso);
  return date >= weekStart && date <= weekEnd;
};

/**
 * Escape CSV field value to handle commas, quotes, and newlines
 */
export const escapeCSVField = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Generate CSV content from inventory items
 */
export const generateInventoryCSV = (
  items: Array<{
    name: string;
    stock: number;
    weightLbs?: number;
    costPostShipping?: number;
    costPreShipping?: number;
    minPrice?: number;
    maxPrice?: number;
  }>
): string => {
  const headers = ['#', 'Item name', 'stock', 'weight', 'Unit Cost', 'price'];
  // Sort items alphabetically by name
  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));
  const rows = sortedItems.map((item, index) => {
    const rowNumber = index + 1;
    const stock = item.stock;
    const weight = item.weightLbs ?? '';
    const unitCost = item.costPostShipping ?? item.costPreShipping ?? 0;
    const price =
      item.minPrice && item.maxPrice
        ? `${fmtUSD(item.minPrice)} - ${fmtUSD(item.maxPrice)}`
        : item.minPrice
          ? fmtUSD(item.minPrice)
          : '';

    return [rowNumber, item.name, stock, weight, fmtUSD(unitCost), price]
      .map(escapeCSVField)
      .join(',');
  });

  return [headers.map(escapeCSVField).join(','), ...rows].join('\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Get unique selling prices for a specific item from sales history
 * Returns up to 5 unique prices, sorted from most recent to oldest
 */
export const getLastSellingPrices = (
  itemId: string,
  sales: Array<{
    createdAt: string;
    lines: Array<{ itemId: string; unitPrice: number }>;
  }>
): number[] => {
  const pricesWithDate: Array<{ price: number; date: Date }> = [];

  // Collect all selling prices for this item with their dates
  sales.forEach(sale => {
    sale.lines.forEach(line => {
      if (line.itemId === itemId) {
        pricesWithDate.push({
          price: line.unitPrice,
          date: new Date(sale.createdAt),
        });
      }
    });
  });

  // Sort by date (most recent first)
  pricesWithDate.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Extract unique prices while maintaining order
  const uniquePrices: number[] = [];
  const seenPrices = new Set<number>();

  for (const item of pricesWithDate) {
    if (!seenPrices.has(item.price)) {
      seenPrices.add(item.price);
      uniquePrices.push(item.price);
      // Limit to 3 unique prices
      if (uniquePrices.length >= 3) break;
    }
  }

  return uniquePrices;
};
