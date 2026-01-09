# Nani's Essentials — Inventory, Sales, Purchases, Analytics

A local-first SPA to manage cosmetics inventory, purchases, and sales with lightweight analytics. Data is stored in the browser (localStorage) with backup import/export.

## Features

- Inventory: CRUD, images, pricing helpers, search, stock badges
- Purchases: multi-line, tax/shipping/weight, payment date, quick-add item
- Sales: multi-line, min price default, installments, buyer autocomplete, delete lines
- Sales Mgmt: grouped by buyer with search, expand/collapse, stats
- Analytics: popular and price extremes, total sales, inventory value
- Backup: localStorage, JSON export/import, legacy import support

## Tech Stack

- React 19 + TypeScript
- CRA (react-scripts)
- LocalStorage for persistence
- Lightweight, dependency-minimal design

## Getting Started

Prerequisites:

- Node.js 18+ (or latest LTS)

Install and run:

```bash
npm install
npm start
```

The app runs at http://localhost:3000

## Project Structure

```
src/
  App.tsx           # Main SPA and feature pages
  App.css           # Styles
  index.tsx         # Entrypoint
  lib/
    storage.ts      # LocalStorage load/save/export/import
    utils.ts        # Utilities (currency, ids, dates)
    dataConverter.ts# Old-backup → new DB converter
  types/
    models.ts       # App-wide TS interfaces
  components/
    ImageUpload.tsx
    ItemImageDisplay.tsx
```

## Data Model (overview)

- InventoryItem: images, primaryImageId, costs (pre/post-shipping), min/max price, revenue, stock, metadata
- Purchase: lines with unitCost and computed post-shipping costs; totals; paymentDate
- Sale: lines with unitPrice; paymentMethod; optional installments; buyerName; totalAmount
- Settings: weightCostPerLb
- DB: { items, purchases, sales, settings }

## Business Rules

For the full, canonical set of business rules (pricing, inventory updates, allocations, grouping, etc.), see [BUSINESS_RULES.md](./BUSINESS_RULES.md).

## Import/Export

- Export: creates a JSON backup for download
- Import: loads backup

## Code Quality

This project enforces code quality through:

- **ESLint**: TypeScript/React linting with strict rules
- **Prettier**: Consistent code formatting
- **Pre-commit hooks**: Automatic linting/formatting before commits
- **Type checking**: Full TypeScript validation

See [CODE_QUALITY.md](CODE_QUALITY.md) for detailed setup and usage.

## Configuration

- Weight cost per lb: `DEFAULT_SETTINGS.weightCostPerLb` in `src/types/models.ts`

## Notes

- Data is browser-local. Export regularly if you clear browser data.
- Designed for small to medium catalogs; performance tuned for local use.

## License

MIT
