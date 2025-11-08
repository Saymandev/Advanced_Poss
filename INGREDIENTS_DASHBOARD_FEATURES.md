# Ingredients Dashboard Features - Implementation Status

**Route:** `/dashboard/ingredients`  
**Purpose:** Inventory management for restaurant ingredients and stock levels  
**Last Updated:** 2025

---

## 📋 Table of Contents

1. [✅ Implemented Features](#-implemented-features)
2. [⏳ Remaining Features](#-remaining-features)
3. [🔧 Technical Implementation](#-technical-implementation)
4. [📊 API Endpoints Status](#-api-endpoints-status)

---

## ✅ Implemented Features

### 1. **Core Ingredient Management**

#### ✅ Ingredient List Display
- **DataTable component** with full pagination support
- **Sortable columns**:
  - Ingredient name and description
  - Current stock level
  - Unit cost and total value
  - Category
  - Expiry date
  - Stock status
- **Search functionality** - Search by ingredient name, description, category, SKU
- **Category filtering** - Filter by category (Food, Beverage, Packaging, Cleaning, Other)
- **Stock level filtering** - Filter by stock status (All, Low Stock, Out of Stock)
- **Pagination controls**:
  - Current page display
  - Items per page selector (default: 20)
  - Total items count
  - Page navigation
- **Empty state** - Message when no ingredients found
- **Export functionality** - Export ingredients data (CSV/Excel)

#### ✅ Statistics Dashboard
- **Five stat cards** displaying:
  - **Total Items** - Total number of ingredients
  - **In Stock** - Items with adequate stock
  - **Low Stock** - Items below minimum threshold
  - **Out of Stock** - Items with zero stock
  - **Total Value** - Total inventory value (calculated)
- **Real-time updates** from API
- **Visual icons** for each metric
- **Color-coded cards** (Green for in stock, Yellow for low stock, Red for out of stock)

### 2. **Ingredient CRUD Operations**

#### ✅ Create Ingredient
- **Create modal** with comprehensive form fields:
  - **Basic Information**:
    - Ingredient Name (required)
    - Description (optional)
    - Category (required) - Food, Beverage, Packaging, Cleaning, Other
  - **Stock Information**:
    - Current Stock (required)
    - Unit (required) - Pieces, Kilograms, Grams, Liters, Milliliters, Box, Pack, Bottle, Can
    - Minimum Stock (required)
    - Maximum Stock (optional)
    - Shelf Life in days (optional)
  - **Pricing**:
    - Cost per Unit (required)
  - **Additional Information**:
    - SKU (optional)
    - Barcode (optional)
    - Storage Location (optional)
    - Storage Temperature (optional, e.g., "2-8°C")
    - Preferred Supplier ID (optional, text input - not dropdown)
    - Notes (optional)
- **Form validation** - Required field checks
- **Success/error notifications** - Toast messages
- **Loading states** - Button disabled during creation
- **Auto-close modal** on success

#### ✅ View Ingredient Details
- **Ingredient details modal** showing:
  - **Header Section**:
    - Ingredient icon
    - Name and category badge
    - Description (if available)
  - **Stock Information**:
    - Current Stock with unit
    - Minimum Stock with unit
    - Maximum Stock with unit (if set)
    - Unit Cost per unit
    - Total Value (calculated)
    - Status badge (In Stock, Low Stock, Out of Stock)
  - **Additional Information** (if available):
    - SKU
    - Barcode
    - Storage Location
    - Storage Temperature
    - Shelf Life in days
  - **Notes** (if available)
  - **Action buttons**:
    - Close
    - Edit Ingredient

#### ✅ Edit Ingredient
- **Edit modal** with pre-filled form
- **Editable fields** (same as create):
  - All basic information fields
  - Stock levels
  - Pricing
  - Additional information
- **Form validation**
- **Success/error notifications**
- **Loading states**

#### ✅ Delete Ingredient
- **Confirmation dialog** before deletion
- **Success notification** after deletion
- **Error handling** with user-friendly messages
- **Role-based access** - Only Owner and Super Admin can delete

### 3. **Stock Management**

#### ✅ Stock Status Display
- **Color-coded status badges**:
  - In Stock (Green) - Stock above minimum level
  - Low Stock (Yellow) - Stock at or below minimum level
  - Out of Stock (Red) - Stock is zero
- **Automatic status calculation** - Based on current stock vs minimum stock
- **Status filtering** - Filter ingredients by stock status

#### ✅ Stock Adjustment
- **Adjust Stock Modal** with:
  - **Ingredient Information**:
    - Ingredient name and icon
    - Current stock level display
  - **Adjustment Controls**:
    - Add Stock button (positive adjustment)
    - Remove Stock button (negative adjustment)
    - Quantity input field
    - Reason field (optional)
  - **Preview**:
    - Shows new stock level after adjustment
  - **Validation**:
    - Prevents negative stock when removing
    - Requires valid quantity
- **Stock adjustment types**:
  - Add Stock - Increases inventory
  - Remove Stock - Decreases inventory
- **Success/error notifications**
- **Real-time stock updates** after adjustment

#### ✅ Stock Level Tracking
- **Current Stock** - Real-time stock levels
- **Minimum Stock** - Threshold for low stock alerts
- **Maximum Stock** - Optional maximum capacity
- **Stock calculations**:
  - Total value = current stock × unit cost
  - Stock status based on minimum threshold

### 4. **Ingredient Categories**

#### ✅ Category System
- **Five categories**:
  - Food
  - Beverage
  - Packaging
  - Cleaning
  - Other
- **Category selection** in create/edit forms
- **Category filtering** in ingredient list
- **Category badge display** in table and details

### 5. **Units of Measurement**

#### ✅ Unit System
- **Nine unit types**:
  - Pieces (pcs)
  - Kilograms (kg)
  - Grams (g)
  - Liters (l)
  - Milliliters (ml)
  - Box
  - Pack
  - Bottle
  - Can
- **Unit selection** in create/edit forms
- **Unit display** throughout the interface
- **Unit consistency** - Same unit used for all stock measurements

### 6. **Search & Filtering**

#### ✅ Search Functionality
- **Ingredient search** - Search by name, description, category, SKU
- **Real-time search** - Updates as you type
- **Search input** with placeholder text
- **Server-side search** - Search performed on backend

#### ✅ Category Filtering
- **Dropdown filter** for ingredient categories
- **Options**:
  - All Categories
  - Food
  - Beverage
  - Packaging
  - Cleaning
  - Other
- **Real-time filtering** - Updates list immediately

#### ✅ Stock Level Filtering
- **Dropdown filter** for stock status
- **Options**:
  - All Stock Levels
  - Low Stock
  - Out of Stock
- **Real-time filtering** - Updates list immediately
- **Client-side filtering** - Applied after data fetch

### 7. **Ingredient Information Display**

#### ✅ Table Columns
- **Ingredient** - Name, description, and icon
- **Stock** - Current stock with unit, minimum stock display
- **Cost** - Unit cost per unit, total value
- **Category** - Category badge
- **Expiry** - Expiry date with warnings (if applicable)
- **Status** - Stock status badge
- **Actions** - View, Adjust Stock, Edit, Delete buttons

#### ✅ Expiry Date Tracking
- **Expiry date display** - Shows expiry date if available
- **Expiry warnings**:
  - Expired items - Red text with "(Expired)" label
  - Expiring soon (within 7 days) - Yellow text with "(Expiring Soon)" label
  - No expiry - Gray text "No expiry"
- **Date formatting** - Locale-specific date display

### 8. **Additional Features**

#### ✅ SKU and Barcode
- **SKU field** - Stock Keeping Unit identifier
- **Barcode field** - Barcode identifier
- **Optional fields** - Can be left empty
- **Display in details** - Shown in ingredient details modal

#### ✅ Storage Information
- **Storage Location** - Where ingredient is stored
- **Storage Temperature** - Required temperature (e.g., "2-8°C")
- **Shelf Life** - Number of days until expiry
- **Optional fields** - Can be left empty
- **Display in details** - Shown in ingredient details modal

#### ✅ Notes
- **Notes field** - Additional information about ingredient
- **Multi-line text** - Textarea input
- **Display in details** - Shown in ingredient details modal

### 9. **User Interface Features**

#### ✅ Responsive Design
- **Desktop layout** - Full table view with all columns
- **Tablet optimized** - Responsive columns
- **Mobile responsive** - Stacked layout
- **Dark mode support** - Full dark theme compatibility

#### ✅ Loading States
- **Skeleton loaders** while fetching data
- **Loading spinners** in modals
- **Button loading states** during API calls
- **Empty states** with helpful messages

#### ✅ Toast Notifications
- **Success messages** for completed actions
- **Error messages** for failed operations
- **Auto-dismiss** after 3 seconds

#### ✅ Modals
- **Create Ingredient Modal** - Form for new ingredients
- **Edit Ingredient Modal** - Form for updating ingredients
- **View Ingredient Modal** - Detailed ingredient information
- **Adjust Stock Modal** - Stock adjustment interface

### 10. **Data Management**

#### ✅ API Integration
- **RTK Query** for data fetching
- **Automatic cache invalidation** on mutations
- **Optimistic updates** for better UX
- **Error handling** with user-friendly messages
- **Pagination support** - Server-side pagination

#### ✅ Branch Context
- **Automatic branch detection** from user context
- **Branch-specific ingredient filtering**
- **Multi-branch support** (if user has access)

#### ✅ Company Context
- **Company-wide ingredients** - Ingredients can be company-wide or branch-specific
- **Company ID validation** - Required for creating ingredients

---

## ⏳ Remaining Features

### 1. **Supplier Integration**

#### ⏳ Supplier Selection
- **Supplier Dropdown** - Select from existing suppliers (currently text input)
- **Supplier Search** - Search suppliers while selecting
- **Preferred Supplier** - Visual indication of preferred supplier
- **Alternative Suppliers** - Support for multiple suppliers per ingredient
- **Supplier Information** - Display supplier details in ingredient view
- **Backend support**: ✅ Available (preferredSupplierId, alternativeSupplierIds fields exist)
- **Frontend status**: ❌ Not implemented (only text input for supplier ID)

#### ⏳ Supplier Management
- **Link to Suppliers Page** - Quick navigation to supplier management
- **Create Supplier from Ingredient** - Quick create supplier option
- **Supplier Performance** - Track supplier performance metrics
- **Backend support**: ✅ Available (suppliers module exists)
- **Frontend status**: ❌ Not implemented

### 2. **Bulk Operations**

#### ⏳ Bulk Import
- **CSV Import** - Import ingredients from CSV file
- **Excel Import** - Import ingredients from Excel file
- **Import Template** - Download import template
- **Import Validation** - Validate imported data
- **Import Preview** - Preview before importing
- **Error Handling** - Show errors for failed imports
- **Backend support**: ✅ Available (bulkImport endpoint exists)
- **Frontend status**: ❌ Not implemented

#### ⏳ Bulk Edit
- **Select Multiple** - Select multiple ingredients
- **Bulk Update** - Update multiple ingredients at once
- **Bulk Delete** - Delete multiple ingredients
- **Bulk Stock Adjustment** - Adjust stock for multiple ingredients
- **Backend support**: ❌ Not available (would need new endpoints)
- **Frontend status**: ❌ Not implemented

### 3. **Advanced Stock Management**

#### ⏳ Stock History
- **Stock Movement History** - Track all stock changes
- **Adjustment History** - View past stock adjustments
- **Purchase History** - Track purchases and restocking
- **Usage History** - Track ingredient usage
- **Wastage Tracking** - Track wastage separately
- **Backend support**: ✅ Partial (totalPurchased, totalUsed, totalWastage fields exist)
- **Frontend status**: ❌ Not implemented (no history view)

#### ⏳ Stock Transfers
- **Transfer Between Branches** - Move stock between branches
- **Transfer History** - Track all transfers
- **Transfer Approval** - Require approval for transfers
- **Backend support**: ❌ Not available (would need new endpoints)
- **Frontend status**: ❌ Not implemented

#### ⏳ Stock Alerts
- **Low Stock Alerts** - Automatic alerts when stock is low
- **Out of Stock Alerts** - Alerts when stock reaches zero
- **Reorder Alerts** - Alerts when reorder point is reached
- **Email Notifications** - Email alerts for stock issues
- **Push Notifications** - Push notifications for critical stock
- **Backend support**: ✅ Available (isLowStock, isOutOfStock, needsReorder flags)
- **Frontend status**: ⏳ Partial (status displayed but no alert system)

### 4. **Reorder Management**

#### ⏳ Reorder Points
- **Reorder Point Setting** - Set reorder point threshold
- **Reorder Quantity** - Set quantity to reorder
- **Auto Reorder** - Automatic reorder suggestions
- **Reorder List** - List of items needing reorder
- **Backend support**: ✅ Available (reorderPoint, reorderQuantity, needsReorder fields)
- **Frontend status**: ❌ Not implemented (fields exist but not shown in UI)

#### ⏳ Purchase Orders Integration
- **Create PO from Reorder** - Generate purchase orders from reorder list
- **Link to Purchase Orders** - Navigate to purchase orders
- **PO Status Tracking** - Track purchase order status
- **Backend support**: ❌ Not available (would need purchase orders integration)
- **Frontend status**: ❌ Not implemented

### 5. **Pricing Management**

#### ⏳ Price History
- **Price Tracking** - Track price changes over time
- **Price Trends** - View price trends
- **Average Cost Calculation** - Show average cost vs current cost
- **Last Purchase Price** - Display last purchase price
- **Backend support**: ✅ Available (averageCost, lastPurchasePrice fields)
- **Frontend status**: ❌ Not implemented (fields exist but not displayed)

#### ⏳ Price Updates
- **Bulk Price Update** - Update prices for multiple ingredients
- **Price Change History** - Track all price changes
- **Price Alerts** - Alert on significant price changes
- **Backend support**: ✅ Available (updatePricing endpoint exists)
- **Frontend status**: ❌ Not implemented (endpoint exists but no UI)

### 6. **Expiry Management**

#### ⏳ Expiry Tracking
- **Expiry Date Setting** - Set expiry date for ingredients
- **Expiry Alerts** - Alerts for expiring items
- **Expired Items List** - List of expired ingredients
- **Expiring Soon List** - Items expiring within X days
- **Backend support**: ✅ Partial (shelfLife field exists, but no expiryDate field)
- **Frontend status**: ⏳ Partial (expiry date shown if available, but no expiry management)

#### ⏳ Expiry Reports
- **Expiry Report** - Report of expiring items
- **Wastage Report** - Report of expired/wasted items
- **Expiry Analytics** - Analytics on expiry patterns
- **Backend support**: ❌ Not available (would need new endpoints)
- **Frontend status**: ❌ Not implemented

### 7. **Image Management**

#### ⏳ Ingredient Images
- **Image Upload** - Upload ingredient images
- **Image Display** - Display images in list and details
- **Image Gallery** - Multiple images per ingredient
- **Image Optimization** - Optimize images for web
- **Backend support**: ✅ Available (image field in schema)
- **Frontend status**: ❌ Not implemented (no image upload/display)

### 8. **Tags System**

#### ⏳ Tag Management
- **Tag Creation** - Create and assign tags
- **Tag Filtering** - Filter ingredients by tags
- **Tag Search** - Search by tags
- **Tag Suggestions** - Auto-suggest tags
- **Backend support**: ✅ Available (tags array field exists)
- **Frontend status**: ❌ Not implemented (no tag UI)

### 9. **Advanced Filtering**

#### ⏳ Advanced Filters
- **Date Range Filter** - Filter by creation/update date
- **Price Range Filter** - Filter by price range
- **Stock Range Filter** - Filter by stock range
- **Supplier Filter** - Filter by supplier
- **Tag Filter** - Filter by tags
- **Multiple Filters** - Combine multiple filters
- **Frontend status**: ❌ Not implemented (only basic filters exist)

#### ⏳ Saved Filters
- **Save Filter Presets** - Save commonly used filters
- **Quick Filters** - One-click filter presets
- **Filter Sharing** - Share filters with team
- **Frontend status**: ❌ Not implemented

### 10. **Reports & Analytics**

#### ⏳ Inventory Reports
- **Inventory Valuation Report** - Total inventory value
- **Stock Level Report** - Stock levels by category
- **Low Stock Report** - List of low stock items
- **Out of Stock Report** - List of out of stock items
- **Category Report** - Ingredients by category
- **Backend support**: ✅ Available (getStats, getValuation endpoints)
- **Frontend status**: ❌ Not implemented (endpoints exist but no report UI)

#### ⏳ Usage Analytics
- **Usage Trends** - Track ingredient usage over time
- **Usage by Category** - Usage breakdown by category
- **Wastage Analysis** - Analyze wastage patterns
- **Cost Analysis** - Analyze ingredient costs
- **Backend support**: ✅ Partial (totalUsed, totalWastage fields exist)
- **Frontend status**: ❌ Not implemented (no analytics UI)

### 11. **Barcode Scanning**

#### ⏳ Barcode Support
- **Barcode Scanner** - Scan barcodes to find ingredients
- **Barcode Input** - Manual barcode entry
- **Barcode Validation** - Validate barcode format
- **Barcode Search** - Search by barcode
- **Backend support**: ✅ Available (barcode field exists)
- **Frontend status**: ❌ Not implemented (barcode field exists but no scanner)

### 12. **Recipe Integration**

#### ⏳ Recipe Linking
- **Link to Recipes** - Link ingredients to menu items/recipes
- **Recipe Requirements** - Show which recipes use ingredient
- **Stock Impact** - Show how recipes affect stock
- **Backend support**: ❌ Not available (would need menu-items integration)
- **Frontend status**: ❌ Not implemented

### 13. **Export**

#### ⏳ Export Features
- **CSV Export** - Export to CSV (partially implemented - button exists but functionality limited)
- **Excel Export** - Export to Excel
- **PDF Export** - Export to PDF
- **Custom Export** - Custom export formats
- **Export Templates** - Pre-defined export templates
- **Frontend status**: ⏳ Partial (export button exists but functionality is limited)

### 14. **Notifications**

#### ⏳ Notification System
- **Low Stock Notifications** - Notify when stock is low
- **Out of Stock Notifications** - Notify when stock is zero
- **Expiry Notifications** - Notify about expiring items
- **Reorder Notifications** - Notify when reorder is needed
- **Email Notifications** - Email alerts
- **Push Notifications** - Push alerts
- **Backend support**: ❌ Not available (would need notification system)
- **Frontend status**: ❌ Not implemented

### 15. **Mobile App Features**

#### ⏳ Mobile Optimization
- **Mobile-optimized View** - Optimized for mobile devices
- **Barcode Scanner App** - Mobile barcode scanning
- **Quick Stock Adjustment** - Quick adjust from mobile
- **Offline Mode** - View inventory offline
- **Frontend status**: ❌ Not implemented (web-only currently)

### 16. **Print Functionality**

#### ⏳ Printing
- **Print Inventory List** - Print ingredient list
- **Print Labels** - Print ingredient labels with barcodes
- **Print Reports** - Print inventory reports
- **PDF Generation** - Generate PDF documents
- **Frontend status**: ❌ Not implemented

---

## 🔧 Technical Implementation

### Current Architecture

#### Frontend
- **Framework**: Next.js 14 (App Router)
- **State Management**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS
- **Components**: Custom UI components (DataTable, Modal, Badge, etc.)
- **API Client**: RTK Query with automatic caching
- **Pagination**: Server-side pagination

#### Backend
- **Framework**: NestJS
- **Database**: MongoDB (Mongoose)
- **API**: RESTful endpoints
- **Authentication**: JWT with role-based access

### File Structure

```
frontend/src/
├── app/dashboard/ingredients/
│   └── page.tsx                    ✅ Main ingredients page
├── lib/api/endpoints/
│   └── inventoryApi.ts            ✅ Ingredients API endpoints
└── components/ui/                 ✅ Reusable UI components

backend/src/modules/ingredients/
├── ingredients.controller.ts      ✅ API endpoints
├── ingredients.service.ts         ✅ Business logic
├── ingredients.module.ts          ✅ Module definition
├── schemas/
│   └── ingredient.schema.ts      ✅ Database schema
└── dto/
    ├── create-ingredient.dto.ts   ✅ Create DTO
    ├── update-ingredient.dto.ts  ✅ Update DTO
    └── stock-adjustment.dto.ts    ✅ Stock adjustment DTO
```

---

## 📊 API Endpoints Status

### ✅ Fully Implemented (Frontend + Backend)

| Endpoint | Method | Purpose | Frontend | Backend |
|----------|--------|---------|----------|---------|
| `/ingredients` | GET | Get all ingredients (paginated) | ✅ | ✅ |
| `/ingredients/:id` | GET | Get ingredient by ID | ✅ | ✅ |
| `/ingredients` | POST | Create ingredient | ✅ | ✅ |
| `/ingredients/:id` | PATCH | Update ingredient | ✅ | ✅ |
| `/ingredients/:id` | DELETE | Delete ingredient | ✅ | ✅ |
| `/ingredients/:id/add-stock` | POST | Add stock | ✅ | ✅ |
| `/ingredients/:id/remove-stock` | POST | Remove stock | ✅ | ✅ |
| `/ingredients/:id/adjust-stock` | POST | Adjust stock | ✅ | ✅ |

### ⏳ Backend Available, Frontend Not Implemented

| Endpoint | Method | Purpose | Frontend | Backend |
|----------|--------|---------|----------|---------|
| `/ingredients/bulk-import` | POST | Bulk import ingredients | ❌ | ✅ |
| `/ingredients/search` | GET | Search ingredients | ❌ | ✅ |
| `/ingredients/company/:companyId` | GET | Get ingredients by company | ❌ | ✅ |
| `/ingredients/branch/:branchId` | GET | Get ingredients by branch | ❌ | ✅ |
| `/ingredients/company/:companyId/low-stock` | GET | Get low stock items | ❌ | ✅ |
| `/ingredients/company/:companyId/out-of-stock` | GET | Get out of stock items | ❌ | ✅ |
| `/ingredients/company/:companyId/need-reorder` | GET | Get items needing reorder | ❌ | ✅ |
| `/ingredients/company/:companyId/stats` | GET | Get inventory statistics | ❌ | ✅ |
| `/ingredients/company/:companyId/valuation` | GET | Get inventory valuation | ❌ | ✅ |
| `/ingredients/:id/update-pricing` | POST | Update unit cost | ❌ | ✅ |
| `/ingredients/:id/deactivate` | PATCH | Deactivate ingredient | ❌ | ✅ |

### ❌ Not Available (Would Need Implementation)

- Stock transfer endpoints
- Stock history endpoints
- Expiry management endpoints
- Notification endpoints
- Recipe integration endpoints
- Advanced analytics endpoints
- Barcode scanning endpoints

---

## 🎯 Priority Recommendations

### High Priority (Should Implement Next)

1. **Supplier Dropdown** - Replace text input with supplier selection dropdown
2. **Low Stock Alerts** - Visual alerts and notifications for low stock items
3. **Reorder Management** - UI for reorder points and reorder list
4. **Bulk Import** - CSV/Excel import functionality
5. **Inventory Reports** - Reports for stats and valuation (endpoints exist)

### Medium Priority (Nice to Have)

1. **Stock History** - Track stock movements and adjustments
2. **Price History** - Track price changes over time
3. **Expiry Management** - Better expiry tracking and alerts
4. **Image Upload** - Upload and display ingredient images
5. **Tags System** - Tag management and filtering

### Low Priority (Future Enhancements)

1. **Barcode Scanning** - Barcode scanner integration
2. **Recipe Integration** - Link ingredients to menu items
3. **Stock Transfers** - Transfer stock between branches
4. **Mobile App** - Native mobile experience
5. **Print Functionality** - Print labels and reports

---

## 📝 Notes

### Current Limitations

1. **No supplier dropdown** - Only text input for supplier ID (backend supports supplier relationships)
2. **No stock history** - Can't view past stock adjustments
3. **No reorder management UI** - Reorder fields exist but not shown/used
4. **No bulk operations** - Can't import/edit multiple ingredients at once
5. **No alerts system** - Status displayed but no notification system
6. **No reports UI** - Stats and valuation endpoints exist but no UI
7. **No image support** - Image field exists but no upload/display
8. **No tags UI** - Tags field exists but no tag management
9. **Limited export** - Export button exists but functionality is limited
10. **No expiry management** - Expiry date shown but no expiry tracking/alerts

### Backend Capabilities Not Utilized

1. **Bulk import** - bulkImport endpoint not used
2. **Search endpoint** - search endpoint not used
3. **Low stock endpoint** - findLowStock endpoint not used
4. **Out of stock endpoint** - findOutOfStock endpoint not used
5. **Reorder endpoint** - findNeedReorder endpoint not used
6. **Stats endpoint** - getStats endpoint not used
7. **Valuation endpoint** - getValuation endpoint not used
8. **Update pricing endpoint** - updatePricing endpoint not used
9. **Deactivate endpoint** - deactivate endpoint not used
10. **Supplier relationships** - preferredSupplierId and alternativeSupplierIds not properly utilized
11. **Price tracking** - averageCost and lastPurchasePrice fields not displayed
12. **Usage tracking** - totalPurchased, totalUsed, totalWastage fields not displayed
13. **Reorder fields** - reorderPoint, reorderQuantity, needsReorder not shown in UI

---

## 🚀 Quick Start

### View Ingredients Dashboard

1. Navigate to `/dashboard/ingredients`
2. Ensure you're logged in as a user with appropriate role (Manager, Owner, or staff member)
3. Ingredients will load automatically based on your branch

### Key Actions

- **Add Ingredient**: Click "Add Ingredient" button
- **View Details**: Click eye icon on ingredient row
- **Adjust Stock**: Click archive icon to adjust stock
- **Edit Ingredient**: Click pencil icon
- **Delete Ingredient**: Click trash icon (requires confirmation, Owner/Super Admin only)
- **Search**: Type in search box
- **Filter by Category**: Select category from dropdown
- **Filter by Stock**: Select stock level from dropdown
- **Export**: Click export button (functionality limited)

---

## 📞 Support

For questions or issues:
- Check backend API documentation at `/api/docs`
- Review ingredients service implementation in `backend/src/modules/ingredients/`
- Check frontend implementation in `frontend/src/app/dashboard/ingredients/`

---

**Last Updated:** 2025  
**Status:** Core ingredient management complete, supplier integration and advanced features pending implementation

