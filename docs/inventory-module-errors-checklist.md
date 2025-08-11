# Inventory Module Error Checklist - SchoolPilot3

**Date:** July 26, 2025  
**Status:** Active Resolution  
**Total Errors:** 16+ critical import/runtime errors

## 🚨 Critical Import Errors (Dev Server)

### 1. Missing useDataHook Hook
**Files Affected:** 
- `src/modules/inventory/data/useStockAlertData.ts`
- `src/modules/inventory/services/reorderMonitoringService.ts`

**Error:**
```
Failed to resolve import "../../../hooks/useDataHook" from "src/modules/inventory/data/useStockAlertData.ts". Does the file exist?
Plugin: vite:import-analysis
File: D:/DevCenter/abuilds/EduGen/old_system/schoolpilot3/src/modules/inventory/data/useStockAlertData.ts:4:28
```

**Stack Trace:**
```
at TransformPluginContext._formatLog (file:///D:/DevCenter/abuilds/EduGen/old_system/schoolpilot3/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:42499:41)
at TransformPluginContext.error (file:///D:/DevCenter/abuilds/EduGen/old_system/schoolpilot3/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:42496:16)
at normalizeUrl (file:///D:/DevCenter/abuilds/EduGen/old_system/schoolpilot3/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:40475:23)
```

### 2. Missing Layout Components
**Files Affected:**
- `src/modules/inventory/pages/ReorderAlertsPage.tsx`

**Error:**
```
Failed to resolve import "@/components/layout/PageHeader" from "src/modules/inventory/pages/ReorderAlertsPage.tsx". Does the file exist?
Plugin: vite:import-analysis
File: D:/DevCenter/abuilds/EduGen/old_system/schoolpilot3/src/modules/inventory/pages/ReorderAlertsPage.tsx:29:27
```

### 3. Missing @mui/icons-material Package
**Files Affected:**
- `src/modules/inventory/pages/StockReceptionPage.tsx`
- `src/modules/inventory/pages/StockReturnsPage.tsx`
- `src/modules/inventory/pages/SuppliersPage.tsx`
- `src/modules/inventory/pages/SupplierContractsPage.tsx`

**Error:**
```
Failed to resolve import "@mui/icons-material" from "src/modules/inventory/pages/StockReceptionPage.tsx". Does the file exist?
Plugin: vite:import-analysis
File: D:/DevCenter/abuilds/EduGen/old_system/schoolpilot3/src/modules/inventory/pages/StockReceptionPage.tsx:36:7
```

### 4. Missing useStockLevelData Hook
**Files Affected:**
- `src/modules/inventory/services/reorderMonitoringService.ts`

**Error:**
```
Failed to resolve import "../hooks/useStockLevelData" from "src/modules/inventory/services/reorderMonitoringService.ts". Does the file exist?
Plugin: vite:import-analysis
File: D:/DevCenter/abuilds/EduGen/old_system/schoolpilot3/src/modules/inventory/services/reorderMonitoringService.ts:2:34
```

## 📋 Inventory Pages Requiring Fixes

### Core Pages (16 total):
1. ✅ **InventoryDashboardPage** - Needs data hooks
2. ❌ **ItemsPage** - Missing MUI components
3. ❌ **ItemCategoriesPage** - Missing data hooks
4. ❌ **StockLevelsPage** - Missing hooks and components
5. ❌ **StockReceptionPage** - Missing @mui/icons-material
6. ❌ **StockReturnsPage** - Missing @mui/icons-material
7. ❌ **ReorderAlertsPage** - Missing layout components
8. ❌ **RequisitionsPage** - Missing components
9. ❌ **PurchaseOrdersPage** - Missing dependencies
10. ❌ **StockIssuancePage** - Missing hooks
11. ❌ **SuppliersPage** - Missing @mui/icons-material + @mui/x-data-grid
12. ❌ **SupplierContractsPage** - Missing @mui/icons-material + @mui/x-date-pickers
13. ❌ **FixedAssetsPage** - Missing components
14. ❌ **WarehousesPage** - Missing dependencies
15. ❌ **SchoolProcurementDashboardPage** - Missing components
16. ❌ **VendorPortalDashboardPage** - Missing dependencies

## 🔧 Resolution Plan

### Phase 1: Install Missing Dependencies
- [x] Install @mui/icons-material
- [x] Install @mui/x-data-grid  
- [x] Install @mui/x-date-pickers
- [x] Install notistack
- [x] Install date-fns

### Phase 2: Create Missing Core Hooks
- [ ] Create useDataHook base hook
- [ ] Create inventory-specific data hooks
- [ ] Create reorder monitoring hooks

### Phase 3: Create Missing Layout Components
- [ ] Create PageHeader component
- [ ] Create PageContainer component

### Phase 4: Fix Import Paths
- [ ] Update all inventory page imports
- [ ] Fix relative path issues
- [ ] Update service layer imports

### Phase 5: Test Each Page
- [ ] Verify each page loads without errors
- [ ] Test navigation between pages
- [ ] Validate data flow

## 🎯 Success Criteria
- [ ] All 16 inventory pages load without import errors
- [ ] Dev server runs without inventory-related errors
- [ ] All components render properly
- [ ] Navigation works between all pages
- [ ] Data hooks function correctly

---

**Next Action:** Start with Phase 1 - Install missing dependencies
