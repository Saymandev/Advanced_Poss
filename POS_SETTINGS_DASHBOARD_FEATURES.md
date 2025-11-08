# POS Settings Dashboard – Implementation Status

**Route:** `/dashboard/pos-settings`

**Purpose:** Central hub for configuring taxation, receipt branding, and printer preferences used by the POS checkout workflow.

**Last Reviewed:** 2025-11-08

---

## Implemented Features

### 1. Settings Overview Cards
- **Tax & pricing summary**: Displays current tax rate, service charge, and default currency as configured in the backend (`GET /pos/settings`).
- **Receipt settings card**: Shows header/footer text, logo toggle, and logo URL presence at a glance.
- **Printer status card**: Highlights whether printing is enabled, which printer is selected, auto-print toggle, and provides quick access to test print.
- **Quick actions**: Buttons to preview receipts, trigger printer tests, or jump to the POS page.

### 2. Edit Settings Modal
- **Tax & service charge inputs**: Validated number inputs (0–100 range) for tax rate and service charge percentage.
- **Currency selector**: Dropdown with predefined currency options; persisted via `PUT /pos/settings`.
- **Receipt customization**: Header/footer, logo toggle, logo URL, font size (8–24 px), and paper width (58–210 mm) controls.
- **Printer configuration**: Enable toggle, printer selection dropdown (populated from `GET /pos/printers`), printer type (thermal/laser/inkjet), paper size options, and auto-print checkbox.
- **Validation & feedback**: Toast notifications on successful save or field validation errors; modal closes automatically and refetches settings.

### 3. Printer Utilities
- **Test print modal**: Select printer, preview receipt stub, and call `POST /pos/printers/test` with loading state and success/error toasts.
- **Receipt preview modal**: Renders mocked receipt using current settings (header/footer, tax) for visual confirmation without printing.
- **Default printer selection**: When printers are fetched, selects active/online printer or fallback to first available.
- **Full printer management**: Add/Edit/Delete printers via dedicated modal using `/pos/printers` CRUD endpoints, with validation and status badges in the printer list.
- **Permission-aware actions**: Printer management and tests restricted to owner/manager roles in the UI.

### 4. Data Fetching & State Management
- **RTK Query integration**: Uses `useGetPOSSettingsQuery`, `useUpdatePOSSettingsMutation`, `useGetPrintersQuery`, `useTestPrinterMutation`, `useCreatePrinterMutation`, `useUpdatePrinterMutation`, `useDeletePrinterMutation`.
- **Branch scoping**: Branch ID pulled from authenticated user (also inferred server side) ensuring tenant isolation.
- **Optimistic input state**: Local `formData` populated when settings arrive, ensuring modal reflects current persisted config.
- **Inline validation**: Numeric inputs (tax, service charge, font size, width) display inline error messaging instead of toast-only feedback.

---

## Remaining & Missing Features

### Settings Depth
- **Multi-tax support**: Only single percentage allowed; no per-branch, per-category, or tiered taxes.
- **Service fees**: Flat service charge only; lacks support for thresholds or conditional surcharges.
- **Currency flexibility**: Hard-coded currency list—no multi-currency branch support or custom ISO entry.
- **Receipt templates**: Only one template; no multiple designs, custom font styles, or dynamic sections (e.g., QR codes, promo text).
- **Logo handling**: Accepts URL but no upload manager or validation; missing preview/automatic scaling.

### Printer Management
- **Advanced config**: Missing controls for copies, priority, driver selection, per-order printer rules.
- **Fallback handling**: No messaging when printer offline beyond dropdown indicator; lacks auto-disable or failover to PDF.
- **Print history**: No visibility into print queue status or last failures.

### Access & Auditing
- **Change log**: No audit trail of who changed what; backend updates not surfaced.
- **Environment separation**: No profile toggles for staging vs production printers.

### UX Improvements
- **Loading placeholders**: Skeletons appear for initial load, but modals may flash previous values while refetching.
- **Validation detail**: Numeric validation uses inline text but could benefit from grouped error summary.
- **Multi-step saving**: Large operations (e.g., printer connection) could benefit from wizard or status tracking.
- **Mobile layout**: Modal forms densely packed; no mobile-first optimization.

### Automation & Advanced
- **Sync to registers**: No integration to push settings to connected terminals automatically.
- **Backup & restore**: Cannot export/import settings or revert to defaults.
- **Conditional rules**: No scheduling (e.g., happy hour tax), branch hours, or holiday overrides.

---

## Technical Implementation Notes
- **Frontend**: Next.js 14 App Router, client component, state via `useState`/`useEffect`, RTK Query for API.
- **Backend**: `POSSettings` stored via `pos.service.ts` (`getPOSSettings`, `updatePOSSettings`) with receipt/printer configs embedded.
- **Validation**: Client-side numeric validation now inline; server side relies on DTO constraints (`pos-settings.dto.ts`).
- **Printing**: Test print hits `ReceiptService.testPrinter` (wraps native driver integration). Printer list comes from backend store (likely config collection or OS enumeration).
- **Branch context**: Branch ID derived from JWT; `branchId` parameter optional but not required in requests.

---

## API Endpoint Coverage

| Endpoint | Frontend Usage | Backend Status | Notes |
| --- | --- | --- | --- |
| `GET /pos/settings` | ✅ Fetch current settings | ✅ Implemented | Returns tax/service charge, currency, receipt + printer settings. |
| `PUT /pos/settings` | ✅ Save edits | ✅ Implemented | Accepts nested `receiptSettings` and `printerSettings`. |
| `GET /pos/printers` | ✅ Populate printer dropdown | ✅ Implemented | Returns available printers with online state. |
| `POST /pos/printers/test` | ✅ Test print action | ✅ Implemented | Returns success boolean + message. |
| `GET /pos/printers/queue` | ❌ Not used | ✅ Implemented | Could show print queue/failed jobs. |
| `GET /pos/printers/:name/status` | ❌ Not used | ✅ Implemented | Live status not surfaced UI-side. |
| Printer CRUD (`POST/PUT/DELETE /pos/printers`) | ❌ Not used | ✅ Implemented | UI lacks create/update/delete flows. |

---

## Recommendations

### High Priority
- **Multi-tier taxes**: Support tax groups, inclusive/exclusive toggles, and rule-based application (per category/item).
- **Saved configurations**: Allow saving snapshots (e.g., dine-in vs kiosk printer settings) and switching quickly.
- **Printer monitoring**: Display queue length, last successful print, failure warnings using `GET /pos/printers/queue` + `.../status` endpoints.
- **Localization**: Extend currency list via API, support locale-specific formatting (e.g., decimal separators).
- **Audit trail**: Surface change history (who updated settings/printers) with timestamp.

### Medium Priority
- **Auto-sync to registers**: Push updated settings to active POS terminals in real time (websocket/broadcast).
- **Backup/export**: JSON export/import for rapid deployment across branches.
- **Scheduling**: Allow date-based overrides (holiday receipts, time-of-day tax rules).
- **Logo tooling**: Add upload manager with cropping, preview, CDN hosting.

### Low Priority
- **Advanced printer rules**: Route receipts by order type, location, or priority queue.
- **Dark-mode receipt preview**: Simulate printer output vs on-screen theme for accuracy.
- **Guided setup**: Provide wizard for first-time configuration and printer discovery.

---

## Important Notes & Risks
- **Dependency on backend defaults**: If settings missing, frontend seeds defaults (tax 10%, currency USD); ensure backend handles absent configs gracefully.
- **Logo URL reliability**: No validation or upload path; broken URLs degrade receipts silently.
- **Printer offline scenario**: UI allows enabling auto-print even when printer offline; need safeguards to prevent failed transactions.
- **Data race**: Multiple users editing simultaneously could override without warnings; last-write wins.
- **Accessibility**: Modals rely on toggles and small inputs; ensure keyboard navigation and focus management remain intact.
- **Testing**: Test printer call synchronous and may block UI; consider background jobs or status updates for long-running tasks.
