# POS Dashboard Features – Implementation Status

**Route:** `/dashboard/pos`

**Purpose:** In-restaurant point of sale for dine-in service (menu browsing, cart building, order capture, payment processing, receipt generation, and printer handoff).

**Last Reviewed:** 2025-11-08

---

## Contents
- [Implemented Features](#implemented-features)
- [Remaining & Missing Features](#remaining--missing-features)
- [Technical Implementation Notes](#technical-implementation-notes)
- [API Endpoint Coverage](#api-endpoint-coverage)
- [Priority Recommendations](#priority-recommendations)
- [Important Notes & Risks](#important-notes--risks)

---

## Implemented Features

### 1. Workspace Layout & Context Awareness
- **Order-type gateway**: Operators land on a three-tile selector (Dine-In, Delivery, Takeaway). Dine-In requires a table pick before the menu unlocks; Delivery/Takeaway launch directly into the workspace.
- **Cart modal**: The order summary now lives in a modal that slides over the menu grid, keeping the workspace roomy while still surfacing table/fulfilment controls, discounts, and payment actions.
- **Persistent layout**: Full-height (`h-screen`) split view with responsive menu grid and modal-driven order summary to maximise menu real estate.
- **Header context**: Displays POS title, currently selected table (live lookup from tables query), and quick actions (Select Table, Clear Cart, Keyboard Shortcuts).
- **Role/context integration**: Uses `useAppSelector` to pull authenticated user, leveraging branch/company IDs for downstream API calls.

### 2. Table Management (Selection)
- **Table fetch**: `useGetAvailableTablesQuery` auto-loads tables for current branch (no manual branchId required). Response normalised in API slice.
- **Selection modal**: `Modal` shows grid of tables, capacity, and status badge (Available / Reserved / Occupied) with colour coding.
- **Local persistence**: Selected table written to `localStorage` (`pos_selectedTable`) for page reload resilience; cleared once order completes.
- **Keyboard shortcut**: `F1` opens table modal. ESC closes.
- **Order-type enforcement**: When the POS is set to Dine-In, the modal opens automatically if no table is selected, and checkout buttons stay disabled until a table is chosen.

### 3. Menu Browsing & Filtering
- **Initial load**: `useGetPOSMenuItemsQuery` pulls all available menu items (with images, categories, availability & stock) for branch.
- **Client-side filtering**: Instant search on name/description, category dropdown (populated via `useGetCategoriesQuery`), `Reset Filters` button.
- **Loading skeletons**: Pulse cards when menu items, tables, or categories are loading.
- **Unavailable states**: Empty-state UX when no menu items match filters.
- **Responsive grid**: Cards adapt from 1-column (mobile) up to 4-column (xl).

### 4. Cart Management & Persistence
- **Cart store**: `CartItem` state (id, menuItemId, name, price, quantity, category, notes).
- **Local persistence**: Cart synchronised to `localStorage` (`pos_cart`) on every change; restored on mount.
- **Add to cart**: Single click from menu card (with toasts) increments existing items.
- **Quantity controls**: Increment/decrement buttons with delete per line item.
- **Notes support**: Items keep optional notes when provided (currently only preserved if present on menu item, not editable inline).
- **Clear cart**: Button + keyboard shortcut `F3` (includes toast feedback and local storage clean-up).

### 5. Order Summary & Tax Calculation
- **Dynamic calculations**: Memoised `orderSummary` (subtotal, tax, total, item count) using branch tax rate.
- **Tax configuration**: Reads `taxRate` via `useGetPOSSettingsQuery`; defaults to 10% if API data missing.
- **Formatted currency**: Uses shared `formatCurrency` helper for consistent display.
- **Action buttons**: `Create Order` (pending status) and `Pay Now` (immediate payment) gated by table selection and non-empty cart.

### 6. Order Creation & Payment Flow
- **Validation**: Order creation ensures table selected and cart non-empty for dine-in; delivery/takeaway bypass the table requirement.
- **Create order**: Calls `useCreatePOSOrderMutation` with items, customer info, total, order type, and pending status. Clears state & storage on success.
- **Process payment**: Combines order creation (status `paid`, paymentMethod, order type) and `useProcessPaymentMutation` to finalise transaction.
- **Payment modal**: Allows switching between `cash`, `card`, `split` (UI toggle only), capture of customer name/phone, summary of total.
- **Printer integration**: On payment success, attempts receipt printing via `/pos/receipts/{id}/print`, swallow errors to avoid blocking checkout.
- **Receipt prompt**: Post-success `setTimeout` confirm dialog to open receipt preview modal.
- **Toasts**: Success and error notifications across create, pay, print, download flows.

### 7. Receipt Handling
- **Receipt preview**: Modal fetches HTML via `useGetReceiptHTMLQuery`, renders with inline styles, fallback loader when pending.
- **Print options**: Buttons for direct print (`/print`), print as PDF (`/print-pdf`), and download PDF (`/pdf` GET returning blob).
- **Printer selection**: Optional dropdown populated via `useGetPrintersQuery`, value passed to print + print-pdf mutations.

### 8. Customer & Order Metadata
- **Customer capture**: Optional name/phone/email stored with cart and persisted to `localStorage` (`pos_customerInfo`). Cleared after order completion.
- **Order numbers**: Backend returns generated order number; UI surfaces in success toast.
- **Status badges**: `Badge` component for table occupancy and cart item count.

### 9. Keyboard Shortcuts & Accessibility
- **Global listener**: `useEffect` binds to window keydown (skips inputs/textarea) with F1–F4, Enter, Escape.
- **Shortcut modal**: Dedicated modal enumerating navigation and action keys with `kbd` styling.
- **Visual cues**: Buttons display shortcut hints (e.g., “Select Table (F1)”).
- **Accessibility**: `Modal` components manage focus/close behaviour (via shared UI component); high-contrast dark mode supported.

### 10. Resilience & UX Considerations
- **Graceful API failure**: Many RTK Query mutations wrap in try/catch with fallbacks (e.g., printing) and toasts.
- **Local fallback**: Cart/table/customer info survive reloads even if API temporarily unavailable, improving operator experience.
- **Responsive design**: Works across breakpoints; right column locks to 24rem width on desktop.
- **Dark mode**: Extensive `dark:` styles on backgrounds, borders, text.

### 11. Order Type & Fulfilment Rules
    - **Order-type selector**: Dine-In / Delivery / Takeaway toggle (default Dine-In) persisted to `localStorage` (`pos_orderType`).
    - **Contextual UI**: Header badge and helper text reflect the current order mode.
    - **Table gating**: Checkout actions and shortcuts demand table selection only for dine-in.
    - **Stored metadata**: `orderType` is included in every order payload for downstream analytics and kitchen displays.
    - **Delivery address workflow**: Delivery orders now collect contact name/phone, address lines, city/state/postal, instructions, optional driver notes, and delivery fee with validation before checkout.
    - **Takeaway contact capture**: Takeaway orders require contact name/phone and allow pickup instructions + staff assignment notes so handoffs are clear.

### 12. Split Tenders & Refunds
- **Focused payment modal**: Cash and card remain primary flows; split tender is queued for a future iteration while retry-safe order creation keeps the modal lightweight.
- **Discount controls**: The cart modal introduces a Full vs Item-wise discount toggle with percent/amount selection, feeding directly into net totals.
- **Order notes**: A dedicated notes editor captures cashier comments, comp reasons, or delivery instructions and persists them on the order payload.
- **Refund workflow**: Paid orders continue to expose a refund action (amount + reason) backed by `POST /pos/refunds`, with full/partial quick buttons and queue refresh.

---

## Remaining & Missing Features

### Order Type Workflows
- **Delivery dispatch & status**: No UI to move deliveries through statuses (prepping → out-for-delivery → delivered) or capture timestamps/proof of delivery.
- **Automated delivery fees**: Delivery fee is entered manually each order; no linkage to delivery zones, minimum order thresholds, or auto-suggested fees.
- **Takeaway scheduling**: No pickup time selection, readiness notifications, or in-store queue board for takeaway orders.
- **Delivery analytics**: Collected address data isn’t rolled into reports/heatmaps yet; no tracking of delivery time, distance, or driver performance.

### Order Lifecycle & Management
- **No active order list**: POS page lacks queue or order history listing (backend provides `/pos/orders`, `/pos/orders/:id`, `/pos/refunds`).
- **No order editing**: After submission, there is no UI to edit, comp, or void existing orders (backend supports PUT/update, cancel, refund).
- **No hold/park flow**: Cannot park/hold orders aside from leaving in cart; lacks explicit “Save Draft”/“Resume” states.

### Payments & Tenders
- **Split payment UI**: Payment method toggle supports `split`, but there is no interface to allocate amounts or multiple tender lines; backend expects detailed handling.
- **Tips & service charge**: UI doesn’t expose service charge or tip inputs; backend settings include `serviceCharge`.
- **Card metadata entry**: No fields for card last4, auth code, transaction IDs (DTO supports these).
- **Refund handling**: No UI for `/pos/refunds` or partial refunds.

### Table & Guest Experience
- **Guest count**: No capture of party size; tables include capacity but UI doesn’t leverage.
- **Table status updates**: Occupied/reserved determined server-side; no UI to manually mark or release tables.
- **Order transfer**: No ability to merge/split tables or transfer checks (backend has `/pos/orders/:id/split` but not integrated).

### Menu & Modifier Enhancements
- **Modifier/choices**: No support for item modifiers, cooking instructions, or upsells.
- **Inventory feedback**: Stock quantity not surfaced; no indication when item stock low/zero.
- **Bulk actions**: No quick add multiples or favourites/hot keys for most-used items.

### Reporting & Metrics
- **Real-time metrics**: No display of `getQuickStats` (active orders, available tables, revenue) or `getPOSStats` (top sellers, daily revenue).
- **Operator dashboards**: No charts or KPI panels for POS performance.

### Settings & Configuration
- **POS settings management**: UI reads tax rate but offers no interface to edit POS settings (`/pos/settings` PUT) or receipt/printer preferences.
- **Printer management**: Ability to list printers but not create/update/delete/test printers (endpoints exist).
- **Receipt templates**: No UI to customise receipt header/footer/logo despite backend support.

### Operational Workflow
- **Staff assignment**: Orders tagged with user ID but UI doesn’t show cashier name or allow assignment changes.
- **Customer lookup**: Manual entry only; lacks search against customers API or loyalty linking.
- **Discounts & promotions**: No UI for item or order-level discounts, coupons, or loyalty redemptions.

### Offline / Resilience
- **No offline queue**: While cart persists locally, there’s no queued sync for orders/payments when offline.
- **Error recovery**: Limited guidance for partial failures (e.g., payment success but print fail beyond toast).

---

## Technical Implementation Notes
- **Framework & stack**: Next.js 14 App Router, client component (`'use client'`). State via React hooks + RTK Query slices.
- **Key hooks**: `useGetPOSMenuItemsQuery`, `useGetAvailableTablesQuery`, `useCreatePOSOrderMutation`, `useProcessPaymentMutation`, `useGetPOSSettingsQuery`, `useGetPrintersQuery`, `useGetReceiptHTMLQuery`, printer/receipt mutations.
- **Local storage keys**: `pos_cart`, `pos_selectedTable`, `pos_customerInfo`, `pos_orderType`, `pos_deliveryDetails`, `pos_deliveryFee`, `pos_takeawayDetails` for persistence.
- **Backend integration**: Comprehensive NestJS POS module (`pos.controller.ts`, `pos.service.ts`, `receipt.service.ts`, `printer.service.ts`) providing order, payment, stats, table, menu, receipt, and printer endpoints.
- **Data normalisation**: API slice transforms align Mongoose `_id` to `id`, flatten nested relationships, and handle multiple payload shapes.
- **Security**: All endpoints guard via `JwtAuthGuard` and roles (owner/manager/cashier). Branch derived from JWT server-side (no need to pass explicitly for most requests).
- **Receipt generation**: Server renders HTML/PDF via Puppeteer; front-end simply displays/requests.
- **Order creation retry**: `createOrder` mutations wrap duplicate-key (E11000) collisions with a lightweight retry to avoid race conditions when multiple checks fire in rapid succession.
- **Console logging**: POS service logs query filters; ensure production logging config handles this.

---

## API Endpoint Coverage

| Endpoint | Frontend Usage | Backend Status | Notes |
| --- | --- | --- | --- |
| `POST /pos/orders` | ✅ Create order (pending/paid) | ✅ Implemented | Used for both create and payment flows.
| `GET /pos/orders` | ❌ Not used | ✅ Implemented | Candidate for order history / queue UI.
| `GET /pos/orders/:id` | ❌ Not used | ✅ Implemented | Could power receipt reprints/order details.
| `PUT /pos/orders/:id` | ❌ Not used | ✅ Implemented | Supports edits/updates.
| `PATCH /pos/orders/:id/cancel` | ❌ Not used | ✅ Implemented | Enables void/cancel actions.
| `POST /pos/orders/:id/split` | ❌ Not used | ✅ Implemented | Backend handles split orders; no UI.
| `POST /pos/payments` | ✅ Finalise payment | ✅ Implemented | Called right after order creation.
| `POST /pos/refunds` | ❌ Not used | ✅ Implemented | No refund workflow in UI.
| `GET /pos/stats` | ❌ Not used | ✅ Implemented | Aggregated KPIs/top sellers.
| `GET /pos/quick-stats` | ❌ Not used | ✅ Implemented | Real-time counter stats.
| `GET /pos/tables/available` | ✅ Used for table modal | ✅ Implemented | Auto applies branch context.
| `GET /pos/tables/:id/orders` | ❌ Not used | ✅ Implemented | Useful for recent activity per table.
| `GET /pos/menu-items` | ✅ Menu grid | ✅ Implemented | Client filters for UX speed.
| `GET /pos/settings` | ✅ Read tax rate | ✅ Implemented | Defaults created server-side when missing.
| `PUT /pos/settings` | ❌ Not used | ✅ Implemented | Missing front-end settings UI.
| `GET /pos/receipts/:id/html` | ✅ Receipt preview | ✅ Implemented | Rendered in modal.
| `GET /pos/receipts/:id/pdf` | ✅ PDF download | ✅ Implemented | Blob download with auto filename.
| `POST /pos/receipts/:id/print` | ✅ Trigger print | ✅ Implemented | Errors soft-fail.
| `POST /pos/receipts/:id/print-pdf` | ✅ Trigger PDF print | ✅ Implemented | Returns message/job metadata.
| `GET /pos/printers` | ✅ Populate printer dropdown | ✅ Implemented | No management UI.
| `POST /pos/printers/test` | ❌ Not used | ✅ Implemented | Could be exposed in settings.
| `POST /pos/printers` / `PUT` / `DELETE` | ❌ Not used | ✅ Implemented | Printer CRUD endpoints unused.
| `GET /pos/printers/queue` | ❌ Not used | ✅ Implemented | Print job monitoring.
| `GET /pos/printers/:name/status` | ❌ Not used | ✅ Implemented | Live printer status.

All referenced endpoints exist in backend; feature gaps are purely UI/UX.

---

## Priority Recommendations

### High Priority
- **Delivery logistics enhancements**: Tie delivery orders to driver rosters, default fees/zone rules, and status updates (prepping, on-route, delivered) so teams can monitor fulfilment.
- **Add active order queue & history**: Surface `/pos/orders` (with filters and actions) so staff can manage in-flight orders.
- **Implement split/tender UI**: Provide interface for true split payments, multiple tenders, and detailed method metadata (card info, cash amounts).
- **Expose cancel/void/refund flows**: UI actions backed by existing endpoints to handle mistakes, returns, or voided tickets.
- **Surfacing printer errors**: Enhance user feedback when print mutations fail; allow retry or printer selection before failure.

### Medium Priority
- **Metrics sidebar / dashboard**: Leverage `getQuickStats` and `getPOSStats`