# POS Reports Dashboard – Implementation Status

**Route:** `/dashboard/pos-reports`

**Purpose:** Provide managers with a centralized view into point-of-sale performance, order activity, payment mix, and the ability to inspect individual orders.

**Last Reviewed:** 2025-11-08

---

## Implemented Features

### 1. Time-Scoped KPI Overview
- **Dynamic date range**: Start/end date inputs drive every query (orders, stats, charts) without page reloads.
- **Realtime stats cards**: Total revenue, total orders, average order value, and orders today pulled from `GET /pos/stats`.
- **Trend deltas**: Each card shows % change (calculated client-side) with heroicons for up/down neutral state.
- **Today snapshot**: `ordersToday` and `revenueToday` surfaced for rapid daily glance.

### 2. Order Activity Table
- **Paginated data table**: Uses shared `DataTable` component with server-side pagination (page, limit).
- **Column rendering**: Table badge, formatted currency, status chips, and relative payment method display.
- **Order drill-in**: Row action opens modal (uses `GET /pos/orders/:id`) with itemized breakdown, customer info, and notes.
- **Branch-aware fetch**: BranchId inferred from JWT, filters optionally override; no manual branch selection needed.

### 3. Exports & Refresh
- **CSV/PDF export buttons**: Trigger toasts and placeholder handlers for future wiring to export endpoint.
- **Manual refresh**: Refresh button reloads the view (placeholder for cache invalidation hook).

### 4. Visualization Layer
- **Revenue line chart**: Revenue aggregated per day (client-side transform), rendered via Recharts `LineChart`.
- **Payment mix bar chart**: Aggregates revenue and order count by payment method to highlight tender mix.
- **Top-selling items list**: Top five items with ranking badge, quantity, and revenue using `topSellingItems` from stats.

### 5. Insights Cards
- **Revenue summary**: Shows totals, today revenue, average order for the selected range.
- **Order summary**: Totals, today count, selected period displayed with formatted dates.
- **Responsive layout**: Cards and charts operate on 1-column to 2-column grids across breakpoints.

### 6. Order Details Modal
- **Itemized view**: Tabular breakdown of menu items with quantities and line totals.
- **Payment & status badges**: Visual status indicator with uppercase label and conditional styling.
- **Customer metadata**: Optional name/phone/email sections when provided at POS.
- **Structured layout**: Headline metrics (order number, table, payment) grouped in header grid.

### 7. Filter Controls & Segmentation
- **Quick date presets**: Today, Yesterday, Last 7 Days, Last 30 Days, and This Month buttons update the dashboard instantly.
- **Status filtering**: Dropdown for All/Paid/Pending/Cancelled wired to `/pos/orders` query string.
- **Order type filtering**: Dine-In/Delivery/Takeaway selector filters both stats and order listings via backend query.

---

## Remaining & Missing Features

### Data Accuracy & Sources
- **Trend comparison**: Previous period stats currently estimated (90% placeholder). Need real historical fetch from backend.
- **Payment breakdown**: Revenue-only chart; no order count overlay or share percentage display.
- **Revenue vs target**: No connection to sales targets/budgets for context.
- **Tax/service charge visibility**: No breakdown on reports; total includes them but not surfaced.

### Filtering & Segmentation
- **Branch selector**: Single-branch assumption; multi-branch selection UI missing.
- **Search term**: Text search only; consider advanced filters (cashier, register, payment method) for faster targeting.
- **Saved views**: No ability to save commonly-used filter combinations.

### Exports & Automation
- **Backend export endpoints**: Buttons trigger toast only; missing server endpoints for CSV/PDF/Excel.
- **Scheduled delivery**: No ability to schedule reports or email digests.
- **Print-ready view**: No printer-friendly layout for at-a-glance reporting.

### Advanced Analytics
- **Gross profit metrics**: No linkage to COGS or item cost for margin insight.
- **Hourly heatmap**: Revenue trend limited to daily; lacks intraday performance.
- **Staff performance**: No breakdown by cashier/server.
- **Repeat vs new customers**: No retention metrics or customer tagging.
- **Discount/void insights**: No visibility into voided orders, comps, discounts.

### UX Improvements
- **Empty states**: Charts hide when no data, but no friendly message or sample placeholder.
- **Modal pagination**: Large orders display in single table; no pagination/scroll hints.
- **Accessibility**: Chart tooltips only; no table summary/statistics for screen readers.
- **Loading skeletons**: Present for stats/table, but charts top-selling list appear/disappear without skeletons.

---

## Technical Implementation Notes
- **Frontend stack**: Next.js 14 App Router, React client component, RTK Query for API calls.
- **Charts**: Recharts `LineChart` and `BarChart` with responsive containers.
- **Data derivation**: Revenue per day and payment breakdown calculated client-side from `getPOSOrders` payload; creates risk of heavy client processing for large datasets.
- **API queries**: `useGetPOSStatsQuery`, `useGetPOSOrdersQuery`, `useGetPOSOrderQuery`. Date filters passed through to backend.
- **Pagination**: `DataTable` handles current page, limit, total, and uses state to fetch new pages.
- **Modal data fetch**: On-demand order fetch using `skip` option when no order selected.
- **Auth context**: BranchId derived from logged-in user; backend enforces branch scoping.

---

## API Endpoint Coverage

| Endpoint | Frontend Usage | Backend Status | Notes |
| --- | --- | --- | --- |
| `GET /pos/stats` | ✅ Dashboard stats cards | ✅ Implemented | Accepts `branchId`, `startDate`, `endDate`.
| `GET /pos/orders` | ✅ Recent orders table | ✅ Implemented | Supports pagination, start/end dates.
| `GET /pos/orders/:id` | ✅ Order detail modal | ✅ Implemented | Returns populated table & items.
| `GET /pos/orders/:id/split` | ❌ Not used | ✅ Implemented | Split orders not surfaced.
| `GET /pos/quick-stats` | ❌ Not used | ✅ Implemented | Could drive lightweight header stats.
| `POST /pos/orders/export` | ❌ Not used | ❌ Missing | Requires backend support.
| `GET /pos/orders/summary` | ❌ Not used | ❌ Missing | Aggregated metrics endpoint not available.
| `GET /pos/payments` | ❌ Not used | ❌ Missing | Payment ledger not exposed.

---

## Recommendations

### High Priority
- **Implement real previous-period pulls**: Add backend endpoint (`/pos/stats/compare`) or extend existing stats service to accept comparison range so % deltas reflect accurate data.
- **Add export endpoints**: Provide server-side CSV/PDF generation (with queue if large) and wire buttons to actual downloads.
- **Optimize data fetch**: For large ranges, move revenue aggregation & payment breakdown to backend endpoints to avoid heavy client compute.
- **Branch-aware views**: Introduce multi-branch selector (for org admins) and surface branch context in every call.
- **Automated delivery**: Allow scheduling of recurring email digests / Slack pushes with key metrics for leadership.

### Medium Priority
- **Drill-down & segmentation**: Add branch selector (for super admins), cashier filter, and payment method filter atop table.
- **Additional charts**: Hourly revenue heatmap, week-over-week comparison, discount/void trend line.
- **Lifecycle analytics**: Hook into loyalty/customer data to show repeat vs new customers, average visits.
- **Print/E-mail reports**: Provide printable layout, schedule daily/weekly email digests with key metrics.
- **Empty-state UX**: Introduce friendly placeholders and guidance when chart data absent.

### Low Priority
- **Predictive insights**: Combine with AI endpoints (e.g., demand forecasting) for future revenue prediction.
- **Benchmarking**: Compare branch performance against company average or past months.
- **Custom dashboards**: Allow user-defined widgets, reorder cards, save favorite layouts.
- **Permissions**: Fine-grain access (e.g., cashiers view orders but not export).
- **Realtime streaming**: Websocket updates for orders to refresh dashboard without manual reload.

---

## Important Notes & Risks
- **Data accuracy**: Without backend aggregation for previous periods, metrics can mislead (currently simulated comparisons).
- **Large date ranges**: Client-side reduce on thousands of orders can impact performance; server pagination partially mitigates but chart transforms still heavy.
- **No guard against missing stats**: If `/pos/stats` returns null (e.g., new branch), cards show 0 but lack empty-state messaging.
- **Access control**: Export toasts operate regardless of RBAC; real functionality must respect permissions.
- **Currency & locale**: Uses `formatCurrency` with default locale; ensure multi-currency support if expansion planned.
- **Offline usage**: Reports rely entirely on live API; consider caching results for offline/low-latency review.
