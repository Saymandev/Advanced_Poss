# Orders Management Dashboard – Implementation Status

**Route:** `/dashboard/orders`

**Purpose:** Oversee in-flight restaurant orders, update fulfillment status, and review transaction details tied to the POS.

**Last Reviewed:** 2025-11-08

---

## Implemented Features

### 1. Overview & Context
- **Branch-scoped queries:** Frontend derives `branchId` from the authenticated context and passes it to `GET /orders` for paginated retrieval.
- **Role awareness:** Actions are implicitly gated by API RBAC (owner/manager/super-admin for deletes, kitchen roles for status updates).
- **Quick POS access:** `New Order` button deep-links to `/dashboard/pos` in a new tab for rapid order entry.

### 2. Realtime Snapshot & KPIs
- **Metric cards:** Totals for overall orders, pending, preparing, ready, and paid revenue calculated client-side from the fetched dataset.
- **Auto-refresh affordance:** Manual `Retry` button appears in the empty/error state to refetch from RTK Query.

### 3. Filtering & Search
- **Global search:** Free-text filter across order number, customer name, and phone number.
- **Status filter:** Dropdown toggles between consolidated states (all, pending → cancelled). Applies on the client side after the API response.
- **Pagination controls:** Server-backed pagination (page & limit) with UI control for page switching and page-size changes.

### 4. Orders Data Grid
- **Rich rows:** Custom cells show order metadata (table, status badges, payment status, totals) with icons for quick scanning.
- **Inline status update:** For active orders, dropdown in each row posts `PATCH /orders/:id/status` with the selected status.
- **Row actions:** View button opens modal; export callback triggers toast confirmation.
- **CSV/JSON export:** Uses generic `DataTable` export hook; currently client-side only.

### 5. Order Detail Modal
- **Structured summary:** Sections for order info, customer details, timestamps, and payment state.
- **Itemized list:** Each line item shows quantity, price, extended total, and special notes.
- **Financial breakdown:** Subtotal, tax, optional tip/discount, and computed grand total displayed with utility formatters.
- **Follow-up actions:** Buttons for closing, printing receipt (links to `/dashboard/pos/receipts/:id`), status update, and deletion (with confirm prompt).

### 6. State & Data Handling
- **RTK Query integration:** `useGetOrdersQuery`, `useGetOrderByIdQuery`, `useUpdateOrderStatusMutation`, `useDeleteOrderMutation` manage requests/cache.
- **Fallback mapping:** Robust mapping layer normalizes diverse backend payload shapes (`_id` vs `id`, nested customer/table references).
- **Local pagination stats:** Total items computed from API response metadata when available.

---

## Remaining & Missing Features

### Data & Filtering
- **Server-side search parity:** Current API call passes `search`, `status`, `page`, `limit`, but backend `OrderFilterDto` may expect additional parameters (`branchId`, date range). Need to verify query handling.
- **Date / time filters:** No UI to constrain by daypart, service period, or custom date range despite backend support for start/end dates on branch endpoints.
- **Order type / channel filters:** Lacks toggles for dine-in vs delivery/takeaway.

### Operational Workflow
- **Bulk actions:** No ability to select multiple orders for batch status updates or printing.
- **Kitchen coordination:** No kitchen display mode, ticket routing, or `bump` workflow; statuses rely on manual dropdowns.
- **Payment integration:** `Add payment`, `split order`, and refund endpoints exist but are not exposed in the UI.
- **Receipt printing route:** `Print Receipt` redirects to `/dashboard/pos/receipts/:id`; confirm that page exists—may be a stub.

### UX & Feedback
- **Live updates:** Requires manual refresh; no WebSocket/SSE subscription to push order changes in real time.
- **Empty-state nuance:** Single generic empty message; no tips based on filters/date selection.
- **Error handling:** Toast + console logging only; lacks structured inline errors for API validation failures.

### Reporting & Analytics
- **Trend visualizations:** No charting or comparison view for order volume, prep time, or revenue trends (backend exposes `/orders/branch/:branchId/series`).
- **Staff performance:** UI omits backend `top-employees` analytics.
- **Product mix:** Missing top-item insights despite `top-products` endpoint.

### Permissions & Audit
- **Frontend RBAC:** UI still renders destructive controls even for unauthorized roles (backend will reject, but UX should hide/disable appropriately).
- **Audit trail:** No visibility into who changed statuses or deleted orders.

### Technical Debt
- **Mock remnants:** Legacy `_mockOrders` array remains in file (unused but could confuse readers).
- **Type safety:** Local `Order` interface diverges from backend DTO (e.g., `tableNumber` vs `tableId`), risking runtime mismatches.
- **Receipt path:** Hard-coded window open may break in multi-tenant slugged routes.

---

## Recommendations

### High Priority
- **Align filters with backend:** Confirm `OrderFilterDto` contract (branchId vs branch slug) and add date range + order-type filters to leverage existing stats endpoints.
- **Expose payments features:** Surface `Add payment`, `Split order`, and refund actions with inline validation and receipts refresh.
- **Strengthen RBAC UX:** Hide or disable delete/status controls for roles lacking permission; add informative tooltips.
- **Realtime updates:** Introduce WebSocket or polling refresh to keep kitchen/front-of-house in sync.

### Medium Priority
- **Batch operations:** Enable multi-select for status changes and bulk print/export.
- **Analytics widgets:** Add quick charts for hourly volume, product mix, and staff leaderboards using existing backend endpoints.
- **Order timeline:** Display preparation timeline (created → ready → served) with elapsed durations.
- **Receipt workflow:** Replace hard-coded window open with dedicated modal + `printReceipt`/`downloadReceipt` integrations.

### Low Priority
- **Custom views:** Saved filters or presets by daypart/service type.
- **Inline notes:** Allow staff to tag orders with kitchen/front-of-house comments.
- **Mobile responsiveness:** Optimize modal layout and table density for tablet use on the floor.
- **Localization:** Externalize status labels and currency format settings per branch.

---

## Technical Implementation Notes
- **Frontend stack:** Next.js 14 App Router client component utilizing RTK Query and Tailwind-styled shared UI primitives.
- **State persistence:** Filters live in component state; no URL query sync or local storage caching.
- **Utilities:** `formatCurrency`, `formatDateTime` ensure regional formatting but rely on default locale.
- **Deletion confirmation:** Uses native `confirm` dialog—could be replaced with custom modal for consistent styling.

---

## API Endpoint Coverage

| Endpoint | Frontend Usage | Backend Status | Notes |
| --- | --- | --- | --- |
| `GET /orders` | ✅ Main list via `useGetOrdersQuery` | ✅ Implemented | Supports pagination/filter DTO; verify branch search handling. |
| `GET /orders/:id` | ✅ Detail modal fetch | ✅ Implemented | Returns enriched document with customer/table refs. |
| `PATCH /orders/:id/status` | ✅ Inline status dropdown | ✅ Implemented | Roles: super_admin/owner/manager/waiter/chef. |
| `DELETE /orders/:id` | ✅ Delete button | ✅ Implemented | Restricted to super_admin/owner/manager. |
| `PATCH /orders/:id` | ❌ Not surfaced | ✅ Implemented | Needed for item edits or reassignment. |
| `POST /orders/:id/payment` | ❌ Not surfaced | ✅ Implemented | Enables partial payments/settlement. |
| `POST /orders/:id/split` | ❌ Not surfaced | ✅ Implemented | Supports bill splitting; UI missing. |
| `GET /orders/branch/:branchId` | ❌ Not surfaced | ✅ Implemented | Allows branch filter with status & date range. |
| `GET /orders/branch/:branchId/stats` | ❌ Not surfaced | ✅ Implemented | Provides revenue and order KPIs for dashboards. |
| `GET /orders/branch/:branchId/series` | ❌ Not surfaced | ✅ Implemented | Returns time-series for charts. |
| `GET /orders/branch/:branchId/top-products` | ❌ Not surfaced | ✅ Implemented | Enables top-seller analysis. |
| `GET /orders/branch/:branchId/top-employees` | ❌ Not surfaced | ✅ Implemented | Ranks staff by orders served. |
| `GET /orders/branch/:branchId/active` | ❌ Not surfaced | ✅ Implemented | Could power kitchen display / active queue. |
| `GET /orders/table/:tableId` | ❌ Not surfaced | ✅ Implemented | Useful for table-specific histories. |

---

## Important Notes & Risks
- **Data consistency:** Frontend trusts the API response shape; any schema change (e.g., renaming `items`) may break mapping silently.
- **Performance:** Large datasets pulled per page and filtered client-side; consider server-driven filters to avoid heavy payloads.
- **Concurrency:** Two operators could update status simultaneously—no optimistic UI or conflict warning.
- **Delete safety:** Native confirm lacks context (no order number). Implement custom modal with details to reduce accidental removals.
- **Dependence on POS route:** If `/dashboard/pos` requires branch/table context, opening in new tab may drop necessary state.
