# QR Code Menus Dashboard Features - Implementation Status

**Route:** `/dashboard/qr-code-menus`  
**Purpose:** Manage QR code menus for contactless menu access  
**Last Updated:** 2025

---

## 📋 Table of Contents

1. [✅ Implemented Features](#-implemented-features)
2. [⏳ Remaining Features](#-remaining-features)
3. [🌐 Public Menu Display Page](#-public-menu-display-page)
4. [🔧 Technical Implementation](#-technical-implementation)
5. [📊 API Endpoints Status](#-api-endpoints-status)

---

## ✅ Implemented Features

### 1. **QR Code Listing**

#### ✅ DataTable Display
- **QR code list** with pagination
- **Sortable columns** - Sort by table number, menu type, etc.
- **Selectable rows** - Select multiple QR codes
- **Export functionality** - Export QR codes to CSV/Excel
- **Empty state** - "No QR codes found" message with helpful text
- **Loading state** - Loading indicator while fetching

#### ✅ Table Columns
- **QR Code** - QR code image preview
  - Image display (48x48px)
  - Fallback icon if image not available
  - White background with border
- **Table** - Table number or "General Menu"
  - Table icon badge
  - Table number display
  - "General Menu" for non-table-specific codes
- **Menu Type** - Color-coded menu type badges
  - Full Menu (info - blue)
  - Food Menu (success - green)
  - Drinks Menu (info - blue)
  - Desserts Menu (warning - orange)
- **Status** - Active/Inactive status badge
  - Active (success - green)
  - Inactive (danger - red)
- **Scans** - Total scan count
  - Center-aligned display
  - Bold font
- **Last Scanned** - Last scan timestamp
  - Formatted date/time
  - "Never" if not scanned
- **Actions** - View, Enable/Disable, Delete buttons

### 2. **Statistics Dashboard**

#### ✅ Stats Cards
- **Four key metric cards**:
  - **Total QR Codes** - Total count of QR codes (blue)
  - **Active** - Number of active QR codes (green)
  - **Total Scans** - Sum of all scan counts (purple)
  - **Avg Scans** - Average scans per QR code (yellow)
- **Visual icons** for each metric
- **Color-coded cards** - Visual distinction
- **Real-time calculation** - Calculated from current data

### 3. **Filtering & Search**

#### ✅ Search Functionality
- **Search input** - Search QR codes by table number
- **Real-time search** - Updates as you type
- **Table number search** - Searches table numbers

#### ✅ Menu Type Filter
- **Menu type dropdown** - Filter by menu type
- **Filter options**:
  - All Menu Types
  - Full Menu
  - Food Menu
  - Drinks Menu
  - Desserts Menu
- **Real-time filtering** - Updates table immediately

#### ✅ Table Filter
- **Table dropdown** - Filter by specific table
- **Filter options**:
  - All Tables
  - Individual tables (from tables list)
- **Table integration** - Fetches tables from API
- **Real-time filtering** - Updates table immediately

### 4. **QR Code Management**

#### ✅ Generate QR Code Modal
- **Form fields**:
  - **Table** (optional) - Select table or leave empty for general menu
    - Dropdown of available tables
    - "General Menu (No specific table)" option
    - Auto-populated from tables list
  - **Menu Type** (required) - Select menu type
    - Full Menu
    - Food Menu
    - Drinks Menu
    - Desserts Menu
- **Info banner** - Explains how QR codes work:
  - Customers scan with phone camera
  - Opens digital menu in browser
  - No app download required
  - Real-time menu updates
- **Form validation** - Menu type required
- **Success notification** - Toast notification on success
- **Error handling** - Error messages for failed operations
- **Auto-refresh** - Refreshes list after generation

#### ✅ View QR Code Modal
- **QR code details display**:
  - **Header**:
    - QR code icon
    - Table number or "General Menu"
    - Menu type badge
    - Status badge
    - Total scans count
  - **QR Code Display**:
    - Large QR code image (192x192px)
    - White background with border
    - QR code preview label
    - Menu URL display with copy button
  - **QR Code Information**:
    - Menu type badge
    - Status badge
    - Created date/time
    - Last scanned date/time
  - **Usage Statistics**:
    - Total scans
    - Unique users (estimated)
    - Average daily scans
- **Action buttons**:
  - Copy URL button (copies menu URL to clipboard)
  - Download QR button (downloads QR code image)
  - Close button
  - Enable/Disable button
- **Visual design** - Clean, organized layout

#### ✅ Toggle Active Status
- **Enable/Disable** - Toggle QR code active status
- **Status update** - Updates via API
- **Success notification** - Toast notification on success
- **Error handling** - Error messages for failed operations
- **Auto-refresh** - Refreshes list after update
- **Visual feedback** - Button text changes based on status

#### ✅ Delete QR Code
- **Delete button** - Delete action in table and modal
- **Confirmation dialog** - Confirms before deletion
- **Success notification** - Toast notification on success
- **Error handling** - Error messages for failed operations
- **Auto-refresh** - Refreshes list after deletion

### 5. **QR Code Actions**

#### ✅ Copy URL
- **Copy URL button** - Copies menu URL to clipboard
- **Success notification** - Toast notification on copy
- **URL display** - Shows full menu URL
- **Clipboard integration** - Uses navigator.clipboard API

#### ✅ Download QR Code
- **Download button** - Downloads QR code image
- **File naming** - Named as "qr-code-table-{number}.png" or "qr-code-table-general.png"
- **Image download** - Downloads QR code image file
- **Automatic download** - Triggers browser download

### 6. **Menu Types**

#### ✅ Menu Type System
- **Four menu types**:
  - Full Menu - Complete menu
  - Food Menu - Food items only
  - Drinks Menu - Drinks only
  - Desserts Menu - Desserts only
- **Menu type badges** - Color-coded badges
- **Menu type filtering** - Filter by menu type
- **Menu type selection** - Select when generating

### 7. **Table Integration**

#### ✅ Table Selection
- **Table dropdown** - Select table when generating
- **Table list** - Fetches tables from API
- **Table filtering** - Filter QR codes by table
- **General menu option** - Option for non-table-specific codes
- **Table display** - Shows table number in list

### 8. **Scan Tracking**

#### ✅ Scan Statistics
- **Scan count** - Tracks total number of scans
- **Last scanned** - Tracks last scan timestamp
- **Scan display** - Shows scan count in table and details
- **Usage statistics** - Calculates average daily scans
- **Unique users** - Estimates unique users (70% of scans)

### 9. **QR Code Generation**

#### ✅ QR Code Image Generation
- **QR code generation** - Generates QR code image
- **URL encoding** - Encodes menu URL in QR code
- **Image format** - PNG format
- **Image storage** - Stores QR code image URL
- **QR code display** - Displays QR code in table and modal

### 10. **Menu URL Generation**

#### ✅ URL Generation
- **Dynamic URL** - Generates menu URL with parameters
- **URL parameters**:
  - branchId
  - table (if table-specific)
  - type (menu type)
- **Base URL** - Uses FRONTEND_URL environment variable
- **URL display** - Shows URL in details modal
- **URL copying** - Copy URL to clipboard

### 11. **Pagination**

#### ✅ Pagination Controls
- **Page navigation** - Navigate between pages
- **Items per page** - Configurable items per page (default: 20)
- **Total items display** - Shows total QR code count
- **Current page indicator** - Shows current page
- **Total pages** - Calculated from total items

### 12. **Data Export**

#### ✅ Export Functionality
- **Export button** - Export selected QR codes
- **Export formats** - CSV, Excel support
- **Export filename** - "qr-codes" as default filename
- **Selectable export** - Export selected items only

### 13. **User Interface Features**

#### ✅ Responsive Design
- **Desktop layout** - Full-width table and cards
- **Tablet optimized** - Responsive grid columns
- **Mobile responsive** - Stacked layout for mobile
- **Dark mode support** - Full dark theme compatibility

#### ✅ Loading States
- **Loading indicator** - Shows while fetching data
- **Skeleton loading** - Loading state for table
- **Button loading** - Loading state for actions

#### ✅ Toast Notifications
- **Success messages** for completed actions
- **Error messages** for failed operations
- **Auto-dismiss** after 3 seconds

### 14. **Branch Context**

#### ✅ Branch Integration
- **Automatic branch detection** from user context
- **Branch-specific QR codes** - QR codes filtered by branch
- **Branch ID in requests** - Automatically included

---

## ⏳ Remaining Features

### 1. **QR Code Analytics**

#### ⏳ Analytics Dashboard
- **QR Code Analytics** - Analytics for QR code usage
- **Scan Analytics** - Detailed scan analytics
- **Trend Analysis** - Scan trends over time
- **Performance Metrics** - Performance metrics per QR code
- **Comparison** - Compare QR codes
- **Backend support**: ❌ Not available (would need analytics endpoints)
- **Frontend status**: ❌ Not implemented

#### ⏳ Scan Analytics
- **Scan Charts** - Visual charts for scan data
- **Scan Trends** - Scan trends over time
- **Peak Scan Times** - Identify peak scan times
- **Scan Heatmap** - Heatmap of scan activity
- **Backend support**: ❌ Not available (would need analytics endpoints)
- **Frontend status**: ❌ Not implemented

### 2. **QR Code Customization**

#### ⏳ QR Code Styling
- **Custom Colors** - Customize QR code colors
- **Logo Integration** - Add logo to QR code center
- **QR Code Size** - Adjustable QR code size
- **QR Code Format** - Different QR code formats
- **Backend support**: ❌ Not available (would need customization options)
- **Frontend status**: ❌ Not implemented (default styling only)

#### ⏳ QR Code Templates
- **QR Code Templates** - Pre-designed QR code templates
- **Template Selection** - Select template when generating
- **Template Management** - Manage templates
- **Template Preview** - Preview templates
- **Backend support**: ❌ Not available (would need template system)
- **Frontend status**: ❌ Not implemented

### 3. **QR Code Printing**

#### ⏳ Print QR Codes
- **Print QR Codes** - Print QR codes directly
- **Print Templates** - Print templates for QR codes
- **Bulk Printing** - Print multiple QR codes
- **Print Settings** - Configure print settings
- **Backend support**: ❌ Not available (would need print system)
- **Frontend status**: ❌ Not implemented (only download available)

### 4. **QR Code Bulk Operations**

#### ⏳ Bulk Actions
- **Bulk Generate** - Generate multiple QR codes at once
- **Bulk Delete** - Delete multiple QR codes
- **Bulk Activate/Deactivate** - Activate/deactivate multiple QR codes
- **Bulk Export** - Export multiple QR codes
- **Backend support**: ❌ Not available (would need bulk endpoints)
- **Frontend status**: ❌ Not implemented

### 5. **QR Code Reports**

#### ⏳ QR Code Reports
- **Generate Reports** - Generate QR code usage reports
- **Report Templates** - Pre-defined report templates
- **Custom Reports** - Build custom reports
- **Report Export** - Export reports to PDF/Excel
- **Report Scheduling** - Schedule automatic reports
- **Backend support**: ❌ Not available (would need report system)
- **Frontend status**: ❌ Not implemented

### 6. **QR Code Sharing**

#### ⏳ Share QR Codes
- **Share Links** - Generate shareable QR code links
- **Email QR Codes** - Email QR codes to staff/customers
- **SMS Sharing** - Send QR codes via SMS
- **Social Sharing** - Share QR codes on social media
- **Backend support**: ❌ Not available (would need sharing system)
- **Frontend status**: ❌ Not implemented

### 7. **QR Code Expiration**

#### ⏳ Expiration Management
- **Set Expiration** - Set expiration date for QR codes
- **Expiration Alerts** - Alerts for expiring QR codes
- **Auto-deactivation** - Automatically deactivate expired codes
- **Expiration Notifications** - Notify about expiring codes
- **Backend support**: ❌ Not available (would need expiration system)
- **Frontend status**: ❌ Not implemented

### 8. **QR Code Access Control**

#### ⏳ Access Control
- **Access Restrictions** - Restrict access to QR codes
- **Password Protection** - Password-protect QR codes
- **Time-based Access** - Time-based access restrictions
- **IP Restrictions** - IP-based access restrictions
- **Backend support**: ❌ Not available (would need access control system)
- **Frontend status**: ❌ Not implemented

### 9. **QR Code Analytics Integration**

#### ⏳ Analytics Integration
- **Google Analytics** - Integrate with Google Analytics
- **Custom Analytics** - Custom analytics integration
- **Event Tracking** - Track QR code scan events
- **Conversion Tracking** - Track conversions from QR codes
- **Backend support**: ❌ Not available (would need analytics integration)
- **Frontend status**: ❌ Not implemented

### 10. **QR Code Notifications**

#### ⏳ Notification System
- **Scan Notifications** - Notify on QR code scans
- **Low Scan Alerts** - Alerts for low scan counts
- **High Scan Alerts** - Alerts for high scan counts
- **Notification Preferences** - Configure notification preferences
- **Backend support**: ❌ Not available (would need notification system)
- **Frontend status**: ❌ Not implemented

### 11. **QR Code History**

#### ⏳ History Tracking
- **Scan History** - View scan history for QR codes
- **History Filters** - Filter scan history
- **History Export** - Export scan history
- **History Analytics** - Analytics on scan history
- **Backend support**: ❌ Not available (would need history tracking)
- **Frontend status**: ❌ Not implemented

### 12. **QR Code Validation**

#### ⏳ QR Code Validation
- **QR Code Verification** - Verify QR code authenticity
- **QR Code Testing** - Test QR codes before deployment
- **QR Code Validation** - Validate QR code format
- **QR Code Health Check** - Health check for QR codes
- **Backend support**: ❌ Not available (would need validation system)
- **Frontend status**: ❌ Not implemented

### 13. **QR Code Search Enhancement**

#### ⏳ Advanced Search
- **Search by URL** - Search by menu URL
- **Search by Status** - Search by active/inactive status
- **Search by Scan Count** - Search by scan count range
- **Search by Date** - Search by creation date
- **Backend support**: ✅ Partial (basic search possible)
- **Frontend status**: ⏳ Partial (only table number search)

### 14. **QR Code Filtering Enhancement**

#### ⏳ Advanced Filters
- **Filter by Status** - Filter by active/inactive (exists but could be enhanced)
- **Filter by Scan Count** - Filter by scan count range
- **Filter by Date Range** - Filter by creation date range
- **Filter by Last Scanned** - Filter by last scanned date
- **Backend support**: ✅ Partial (status filtering possible)
- **Frontend status**: ⏳ Partial (only type and table filters)

### 15. **QR Code Edit Functionality**

#### ⏳ Edit QR Code
- **Edit Menu Type** - Change menu type
- **Edit Table** - Change table assignment
- **Edit Status** - Change active status (exists)
- **Edit Restrictions** - Prevent editing certain fields
- **Backend support**: ✅ Available (update endpoint exists)
- **Frontend status**: ⏳ Partial (only status toggle, no edit modal)

### 16. **QR Code Duplication**

#### ⏳ Duplicate QR Code
- **Duplicate QR Code** - Duplicate existing QR code
- **Duplicate with Changes** - Duplicate with modifications
- **Bulk Duplication** - Duplicate multiple QR codes
- **Duplicate Templates** - Use as template for new codes
- **Backend support**: ❌ Not available (would need duplication endpoint)
- **Frontend status**: ❌ Not implemented

### 17. **QR Code Preview**

#### ⏳ Menu Preview
- **Menu Preview** - Preview menu that QR code opens
- **Preview Modal** - Preview modal for menu
- **Preview URL** - Open preview in new tab
- **Preview Testing** - Test menu before generating QR
- **Backend support**: ✅ Available (URL generation exists)
- **Frontend status**: ❌ Not implemented (no preview functionality)

### 18. **QR Code Mobile App**

#### ⏳ Mobile Optimization
- **Mobile-optimized View** - Optimized for mobile devices
- **Mobile QR Generation** - Generate QR codes on mobile
- **Mobile Scanning** - Scan QR codes on mobile
- **Offline Mode** - View QR codes offline
- **Frontend status**: ❌ Not implemented (web-only currently)

---

## 🌐 Public Menu Display Page

### ⚠️ **CRITICAL: Missing Implementation**

**Route:** `/display/menu`  
**Purpose:** Public-facing menu display page that customers see when scanning QR codes  
**Status:** ❌ **NOT IMPLEMENTED** (Backend generates URLs pointing to this page, but the page doesn't exist)

### Expected URL Format

The backend QR code service generates URLs in this format:
```
/display/menu?branchId={branchId}&table={tableNumber}&type={menuType}
```

**URL Parameters:**
- `branchId` (required) - Branch ID
- `table` (optional) - Table number if table-specific
- `type` (required) - Menu type (full, food, drinks, desserts)

### ⏳ Required Features (Not Implemented)

#### 1. **Menu Display**
- **Menu Items Display** - Show menu items based on menu type
- **Category Filtering** - Filter by category
- **Menu Type Filtering** - Show only items matching menu type (food, drinks, desserts)
- **Item Details** - Display item name, description, price, images
- **Availability Status** - Show if items are available
- **Responsive Design** - Mobile-optimized layout

#### 2. **Table Context**
- **Table Number Display** - Show table number if table-specific
- **Table Selection** - Allow selecting table if not specified
- **Table-specific Features** - Table-specific menu items or pricing

#### 3. **Ordering Functionality**
- **Add to Cart** - Add items to cart
- **Cart Management** - View and manage cart
- **Checkout** - Place order from menu
- **Order Placement** - Submit order to kitchen

#### 4. **QR Code Integration**
- **Scan Tracking** - Track QR code scan when page loads
- **Scan Count Update** - Update scan count in backend
- **Last Scanned Update** - Update last scanned timestamp
- **QR Code ID Tracking** - Track which QR code was scanned

#### 5. **User Experience**
- **Loading States** - Show loading while fetching menu
- **Error Handling** - Handle errors gracefully
- **Empty States** - Show message if no items available
- **Search Functionality** - Search menu items
- **Category Navigation** - Navigate between categories

#### 6. **Menu Type Filtering**
- **Full Menu** - Show all menu items
- **Food Menu** - Show only food items (filter by category type)
- **Drinks Menu** - Show only drinks items (filter by category type)
- **Desserts Menu** - Show only desserts items (filter by category type)

#### 7. **Branch Context**
- **Branch Information** - Display branch name and details
- **Branch-specific Menu** - Show menu items for specific branch
- **Branch Settings** - Apply branch-specific settings

### 🔄 Related Pages

#### ✅ **Shop Page** (`/[companySlug]/[branchSlug]/shop`)
- **Status:** ✅ Implemented
- **Purpose:** Public shop/menu page for customers
- **Features:**
  - Menu items display
  - Category filtering
  - Shopping cart
  - Add to cart functionality
  - Product details page
  - Checkout flow
- **Difference:** Uses company/branch slugs instead of branchId query parameter
- **Note:** This page exists but QR codes don't point to it

#### ✅ **Order Display Page** (`/display/[tableId]`)
- **Status:** ✅ Implemented
- **Purpose:** Display order status for customers
- **Features:**
  - Real-time order tracking
  - Order status updates
  - Progress bar
  - Order details
- **Difference:** Shows order status, not menu items

### 🎯 Implementation Priority

**HIGH PRIORITY** - This page is critical for QR code functionality to work properly.

1. **Create `/display/menu` page** - Main menu display page
2. **Implement menu type filtering** - Filter items by menu type
3. **Add scan tracking** - Track QR code scans
4. **Integrate with ordering** - Allow customers to place orders
5. **Add table context** - Show table number and context
6. **Mobile optimization** - Ensure mobile-friendly design

### 📝 Implementation Notes

1. **URL Parameter Parsing** - Parse `branchId`, `table`, and `type` from query parameters
2. **Menu Fetching** - Fetch menu items based on branchId and filter by menu type
3. **Scan Tracking** - Call `/qr-codes/:id/track-scan` endpoint when page loads (need to identify QR code ID)
4. **Menu Type Filtering** - Filter menu items by category type based on menu type parameter
5. **Table Integration** - If table parameter exists, show table number and allow table-specific features
6. **Ordering Flow** - Integrate with existing ordering system or create new flow

### 🔗 Integration Points

- **Public API** - Use `/public/companies/:companySlug/branches/:branchSlug/menu` endpoint (but need branchId to slug conversion)
- **QR Code API** - Use `/qr-codes/:id/track-scan` to track scans
- **Orders API** - Use orders API to place orders
- **Tables API** - Use tables API to get table information

### ⚠️ Current Workaround

Currently, QR codes point to `/display/menu` which doesn't exist. Customers scanning QR codes will get a 404 error. 

**Possible workarounds:**
1. Redirect `/display/menu` to shop page (but need to convert branchId to slug)
2. Create the missing `/display/menu` page
3. Update QR code generation to point to shop page (but need slug-based URLs)

---

## 🔧 Technical Implementation

### Current Architecture

#### Frontend
- **Framework**: Next.js 14 (App Router)
- **State Management**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS
- **Components**: Custom UI components (Card, Button, DataTable, Modal, Input, Select, Badge)
- **Image Handling**: Next.js Image component
- **API Client**: RTK Query with automatic caching
- **Form Handling**: React state management

#### Backend
- **Framework**: NestJS
- **Database**: MongoDB (Mongoose)
- **API**: RESTful endpoints
- **Authentication**: JWT with role-based access
- **QR Code Generation**: qrcode library (Node.js)
- **Image Format**: PNG (base64 data URL)

### File Structure

```
frontend/src/
├── app/dashboard/qr-code-menus/
│   └── page.tsx                    ✅ Main QR code menus page
├── lib/api/endpoints/
│   └── aiApi.ts                    ✅ QR code API endpoints (in AI API)
└── components/ui/                 ✅ Reusable UI components

backend/src/modules/qr-codes/
├── qr-codes.controller.ts         ✅ API endpoints
├── qr-codes.service.ts            ✅ Business logic
├── qr-codes.module.ts             ✅ Module definition
├── schemas/
│   └── qr-code.schema.ts         ✅ QR code schema
└── dto/
    ├── create-qr-code.dto.ts     ✅ Create DTO
    └── update-qr-code.dto.ts     ✅ Update DTO
```

---

## 📊 API Endpoints Status

### ✅ Fully Implemented (Frontend + Backend)

| Endpoint | Method | Purpose | Frontend | Backend |
|----------|--------|---------|----------|---------|
| `/qr-codes/generate` | POST | Generate QR code | ✅ | ✅ |
| `/qr-codes` | GET | List QR codes | ✅ | ✅ |
| `/qr-codes/:id` | GET | Get QR code by ID | ✅ | ✅ |
| `/qr-codes/:id` | PATCH | Update QR code | ✅ | ✅ |
| `/qr-codes/:id` | DELETE | Delete QR code | ✅ | ✅ |

### ⏳ Backend Available, Frontend Not Implemented

| Endpoint | Method | Purpose | Frontend | Backend |
|----------|--------|---------|----------|---------|
| `/qr-codes/:id/track-scan` | POST | Track scan | ❌ | ✅ (trackScan method exists) |

### ❌ Not Available (Would Need Implementation)

- QR code analytics endpoints
- QR code reports endpoints
- QR code bulk operations endpoints
- QR code sharing endpoints
- QR code expiration endpoints
- QR code access control endpoints
- QR code validation endpoints

---

## 🎯 Priority Recommendations

### High Priority (Should Implement Next)

1. **🚨 CRITICAL: Create Public Menu Display Page** - Implement `/display/menu` page that QR codes point to
2. **Scan Tracking Integration** - Track scans when QR codes are scanned (method exists)
3. **Edit QR Code Modal** - Full edit functionality (update endpoint exists)
4. **QR Code Preview** - Preview menu that QR code opens
5. **Advanced Search** - Enhanced search functionality
6. **Status Filter** - Filter by active/inactive status

### Medium Priority (Nice to Have)

1. **QR Code Analytics** - Analytics dashboard
2. **QR Code Customization** - Custom colors and logos
3. **QR Code Printing** - Print QR codes
4. **Bulk Operations** - Bulk generate, delete, activate
5. **QR Code Reports** - Generate and export reports

### Low Priority (Future Enhancements)

1. **QR Code Expiration** - Expiration management
2. **QR Code Access Control** - Access restrictions
3. **QR Code Sharing** - Share QR codes
4. **Mobile App** - Native mobile experience
5. **QR Code Notifications** - Notifications and alerts

---

## 📝 Notes

### Current Limitations

1. **❌ CRITICAL: Missing public menu display page** - QR codes point to `/display/menu` which doesn't exist
2. **No scan tracking integration** - Scan tracking method exists but not called from frontend
3. **Limited edit functionality** - Only status toggle, no full edit modal
4. **No QR code preview** - Cannot preview menu before generating
5. **Limited search** - Only table number search
6. **No analytics** - No analytics dashboard or charts
7. **No customization** - Default QR code styling only
8. **No printing** - Only download, no direct printing
9. **No bulk operations** - Cannot perform bulk actions
10. **No expiration** - QR codes don't expire
11. **No access control** - No access restrictions
12. **URL mismatch** - QR codes use branchId but shop page uses slugs

### Backend Capabilities Not Utilized

1. **Scan tracking** - trackScan method exists but not called
2. **Update endpoint** - Can update menu type and table but no UI
3. **Table filtering** - Table filter exists but limited UI

### Key Features

1. **QR code generation** - Generate QR codes for menus
2. **Menu types** - Four menu types (full, food, drinks, desserts)
3. **Table integration** - Link QR codes to tables
4. **Scan tracking** - Track scan counts and last scanned
5. **Status management** - Active/inactive status
6. **QR code display** - Display QR codes in table and modal
7. **URL copying** - Copy menu URL to clipboard
8. **QR code download** - Download QR code images
9. **Statistics** - Basic QR code statistics
10. **Responsive design** - Mobile-friendly interface

---

## 🚀 Quick Start

### View QR Code Menus Dashboard

1. Navigate to `/dashboard/qr-code-menus`
2. Ensure you're logged in as a user with appropriate role
3. QR codes will load automatically based on your branch

### Key Actions

- **Generate QR Code**: Click "Generate QR Code" button, select table and menu type
- **View QR Code**: Click view icon in actions column
- **Enable/Disable**: Click enable/disable button in actions column
- **Delete QR Code**: Click delete icon in actions column
- **Copy URL**: Click "Copy URL" button in view modal
- **Download QR**: Click "Download QR" button in view modal
- **Filter**: Use menu type and table dropdowns
- **Search**: Type in search box to search by table number
- **Export**: Use export button to export QR codes

---

## 📞 Support

For questions or issues:
- Check backend API documentation at `/api/docs`
- Review QR codes service implementation in `backend/src/modules/qr-codes/`
- Check frontend implementation in `frontend/src/app/dashboard/qr-code-menus/`

---

**Last Updated:** 2025  
**Status:** Core CRUD complete, analytics and advanced features pending implementation

