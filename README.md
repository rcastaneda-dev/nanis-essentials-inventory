# Nani's Essentials — Inventory & Business Management

A full-featured business management SPA for a cosmetics retail operation. Tracks inventory across multiple locations, manages purchases with detailed cost accounting, records sales with flexible payment options, monitors expenses and cash flow, and provides financial reporting.

Built with React 19 + TypeScript and backed by Supabase (PostgreSQL, Auth, Storage).

## Features

### Inventory

- Full CRUD with search, filtering, sorting, and pagination
- Multi-image upload with client-side compression and thumbnails
- Automatic pricing helpers (min/max price based on cost + margin)
- CSV export for inventory data
- Product categories: Hair Care, Body Care, Makeup, Fragrance, Skin Care, Other

### Multi-Branch Support

- Create and manage multiple store locations
- Move items between main inventory and branches with quantity control
- Branch-specific inventory and sales tracking
- Open/close branches with soft delete

### Purchases

- Multi-line purchase orders with per-unit cost allocation
- Tax, US shipping, and international shipping broken down per unit
- International shipping auto-calculated from weight
- Discount tracking with actual cost computation
- Cash source tracking (external funds, business revenue, or mixed)
- Quick-add item creation during purchase entry

### Sales

- Multi-line sales with buyer name autocomplete
- Payment methods: cash, transfer, installments, payment link, credit card
- Sales channels: Facebook Marketplace, Instagram, TikTok, family/friends, loyal customers, referrals, store customers
- Installment plan support (number of payments, amount per payment)
- Grouped by buyer with expand/collapse, search, and month filtering
- Summary stats: total sales, total amount, unique customers

### Transactions & Cash Management

- Track business expenses, fees, income, and discounts
- Category-based organization (Packaging, Marketing, Fees, Equipment, etc.)
- Cash withdrawal tracking for business reinvestment
- Mixed payment source support with cash/external breakdown
- Available cash balance calculation

### Financial Reports

- **Income Statement**: Revenue, COGS, gross profit, operating expenses, net income
- **Cash Flow Statement**: Operating, investing, and financing activities
- Report export utilities

### Analytics

- Date-filtered metrics (current month, previous month, overall)
- Most popular items, total revenue, sales count, items sold
- Payment method and sales channel breakdowns
- Weekly sales summaries and channel performance
- Branch-specific analytics

### Quotes

- Pre-purchase pricing calculator
- Factors in coupon discounts, tax, and international shipping
- Outputs cost breakdown and minimum selling price recommendation

### Authentication

- Supabase Auth with email/password and magic link (OTP)
- Password recovery flow
- Row-level security on all tables

### Internationalization

- English and Spanish (i18next + react-i18next)
- Language switcher in the UI

### Data Management

- JSON export/import for full backups
- One-time Supabase migration tool (localStorage to cloud)
- Legacy backup format conversion

## Tech Stack

| Layer             | Technology                                    |
| ----------------- | --------------------------------------------- |
| UI                | React 19 + TypeScript                         |
| Build             | CRA (react-scripts)                           |
| Backend           | Supabase (PostgreSQL + RLS)                   |
| Auth              | Supabase Auth                                 |
| File Storage      | Supabase Storage (product images)             |
| State Management  | Custom hooks (`useAppData`)                   |
| i18n              | i18next + react-i18next                       |
| Virtual Scrolling | react-window                                  |
| E2E Testing       | Playwright                                    |
| Code Quality      | ESLint + Prettier + Husky + lint-staged       |
| Package Manager   | Yarn 4.4.1                                    |
| CI/CD             | GitHub Actions (Playwright, 3-shard parallel) |

## Getting Started

Prerequisites:

- Node.js 18+ (or latest LTS)
- Corepack enabled (`corepack enable`)
- A Supabase project with the required tables and RLS policies

Set up environment variables:

```bash
cp .env .env.local
# Edit .env.local with your Supabase credentials:
# REACT_APP_SUPABASE_URL=https://your-project.supabase.co
# REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

Install and run:

```bash
yarn install
yarn start
```

The app runs at http://localhost:3000

## Project Structure

```
src/
  App.tsx                          # Main SPA with tab-based routing and lazy-loaded pages
  index.tsx                        # Entrypoint
  types/
    models.ts                      # Core TypeScript interfaces (DB, InventoryItem, etc.)
  lib/
    utils.ts                       # Formatting, IDs, dates, CSV export
    storage.ts                     # LocalStorage persistence with debounced writes
    revenueService.ts              # Cash flow and revenue calculations
    imageUtils.ts                  # Client-side compression and thumbnails
    supabase/
      client.ts                    # Supabase client initialization
      productService.ts            # Product CRUD
      purchaseService.ts           # Purchase CRUD
      saleService.ts               # Sale CRUD
      transactionService.ts        # Expense/income CRUD
      cashWithdrawalService.ts     # Cash withdrawal CRUD
      branchService.ts             # Branch management
      brandService.ts              # Brand management
      settingsService.ts           # Settings persistence
      storageService.ts            # Image uploads to Supabase Storage
      mappers.ts                   # DB row ↔ TypeScript model conversions
  hooks/
    useAppData.ts                  # Central state: loads from Supabase, provides save/remove
    useAuth.ts                     # Supabase Auth session management
    useBackupImport.ts             # Export/import/clear operations
  i18n/
    config.ts                      # i18next setup
    locales/
      en.json                      # English translations
      es.json                      # Spanish translations
  components/
    atoms/                         # Button, Input, Select, Icon, Typography
    molecules/                     # Modal, DateFilters, SearchFilters, PageHeader
    organisms/                     # NavigationBar, ItemGrid
    templates/                     # MainLayoutTemplate, InventoryPageTemplate
    layout/                        # TopBar
    pages/
      auth/                        # LoginPage, ResetPasswordPage
      inventory/                   # InventoryPage, InventoryForm, BranchManager
      purchases/                   # PurchasesPage, PurchaseForm, QuickAddItemForm
      sales/                       # SalesPage, SaleForm, CustomerGroup
      transactions/                # TransactionsPage, TransactionForm
      analytics/                   # AnalyticsPage, ChannelPerformanceCard
      reports/                     # IncomeStatementPage, CashFlowPage
      quotes/                      # QuotesPage
      import-export/               # ImportExportPage
supabase/
  migrations/                      # SQL migration files
tests/
  fixtures/                        # Playwright auth fixtures
  pages/                           # Page object models
  *.spec.ts                        # E2E test specs
```

## Architecture

### Data Flow

```
React Pages (lazy-loaded)
        ↓
useAppData() hook (central state)
        ↓
Supabase Service Layer (lib/supabase/*.ts)
        ↓
Supabase Client (REST API)
        ↓
PostgreSQL + RLS
```

- **State**: `useAppData` is the single source of truth, loading all entities from Supabase in parallel on mount
- **Persistence**: Optimistic local updates, then async Supabase sync. LocalStorage serves as a backup layer
- **Components**: Atomic design (atoms → molecules → organisms → templates → pages)
- **Code splitting**: All pages lazy-loaded via `React.lazy()` with Suspense

### Data Model

- **InventoryItem**: images, costs (pre/post-shipping), min/max/catalog price, stock, brand, color, branch
- **Purchase**: line items with per-unit cost allocation (tax, shipping), discount, cash source tracking
- **Sale**: line items, buyer, payment method, channel, installments, branch
- **Transaction**: expenses, fees, income, discounts with payment source tracking
- **CashWithdrawal**: amount, reason, optional link to purchase
- **Branch**: multi-location with open/close lifecycle
- **Settings**: weightCostPerLb (default 7.0), taxRatePercent (default 8.775%)
- **DB**: `{ items, purchases, sales, transactions, cashWithdrawals, branches, brands, settings }`

## Business Rules

For the full, canonical set of business rules (pricing, inventory updates, cost allocations, grouping, etc.), see [BUSINESS_RULES.md](./BUSINESS_RULES.md).

## Scripts

```bash
yarn start               # Dev server (port 3000)
yarn build               # Production build
yarn test                # Jest tests
yarn test:e2e            # Playwright headless
yarn test:e2e:headed     # Playwright with browser UI
yarn test:e2e:ui         # Playwright UI mode
yarn lint                # ESLint check
yarn lint:fix            # ESLint auto-fix
yarn format              # Prettier format
yarn format:check        # Prettier check
yarn type-check          # TypeScript validation
yarn analyze             # Bundle size analysis
```

## Code Quality

- **ESLint**: TypeScript/React linting with strict rules
- **Prettier**: Consistent formatting (single quotes, 2-space indent, 100-char width)
- **Husky + lint-staged**: Automatic linting/formatting on pre-commit
- **TypeScript**: Strict mode enabled

See [CODE_QUALITY.md](CODE_QUALITY.md) for detailed setup and usage.

## License

MIT
