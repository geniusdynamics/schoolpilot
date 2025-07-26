# Akademiko Inventory Module Migration Specification

## 1. Introduction
This document outlines the migration strategy for the Akademiko Inventory module from the old system to the new `schoolpilot` platform. The goal is to identify existing functionalities, pinpoint areas for improvement, and propose a robust, scalable, and modern inventory management solution that integrates seamlessly with other modules.

## 2. Old System Overview
The old Akademiko Inventory system appears to be a Windows Forms application developed in C#, managing various aspects of inventory, including product categories, products, stock issuance, reception, returns, and supplier management. It also includes user management, privileges, and basic reporting.

## 3. Missing Features / Areas for Improvement in Old System
Based on the file list, the old system might lack or have limited capabilities in the following areas:

*   **Advanced Inventory Tracking**: Real-time stock updates, batch/lot tracking, expiry date management.
*   **Multi-Warehouse/Location Support**: Managing inventory across multiple physical or logical locations.
*   **Automated Reorder Points & Alerts**: System-driven suggestions for restocking based on predefined thresholds.
*   **Integration with Procurement/Finance**: Seamless flow of data between inventory, purchasing, and accounting.
*   **Comprehensive Reporting & Analytics**: Advanced dashboards, customizable reports, and predictive analytics for inventory optimization.
*   **Barcode/QR Code Integration**: Efficient scanning for stock movements and identification.
*   **Audit Trails & Versioning**: Detailed logs of all inventory changes and historical data.
*   **Supplier Relationship Management**: More robust features for managing supplier details, contracts, and performance.
*   **User-Friendly Interface**: Modern web-based UI/UX for improved usability.
*   **API for External Systems**: Exposing inventory functionalities via APIs for integration with other systems.

## 4. Proposed Module Placements in New System
The inventory functionalities will primarily reside within a dedicated `inventory` module in the new `schoolpilot` system, with integration points in other relevant modules:

*   **Core Inventory Module (`src/modules/inventory`)**: This will house the main logic and UI for product management, stock movements (issue, receive, return), warehouse management, and supplier management.
*   **Reports Module Integration (`src/modules/reports`)**: Inventory-related reports and analytics will be generated and viewed through the central reports module.
*   **Finance Module Integration (`src/modules/finance`)**: Integration for procurement, cost tracking, and financial reporting related to inventory.
*   **Academics Module Integration (`src/modules/academics`)**: Potentially for managing academic supplies or lab equipment.
*   **Settings Module Integration (`src/modules/settings`)**: Configuration for inventory rules, units of measure, and other global settings.

## 5. Implementation Checklist
This checklist maps functionalities from the old system and new requirements to the proposed implementation in the new system.

| Old System Functionality / New Requirement | Description | Status (Old System) | Proposed New System Implementation | Current New System Implementation | Status (New System) |
|---|---|---|---|---|---|
| **Product Categories** | Manage different categories of products. | Existing | `src/modules/inventory/models/ProductCategory.js`, `src/modules/inventory/controllers/ProductCategoryController.js`, `src/modules/inventory/views/ProductCategoryList.vue` | `src/modules/inventory/data/useItemCategoryData.ts`, `src/modules/inventory/pages/ItemCategoriesPage.tsx` | Fully Covered |
| **Products** | Manage individual products with details like name, description, unit, price, category. | Existing | `src/modules/inventory/models/Product.js`, `src/modules/inventory/controllers/ProductController.js`, `src/modules/inventory/views/ProductList.vue`, `src/modules/inventory/views/ProductDetail.vue` | `src/modules/inventory/data/useItemData.ts`, `src/modules/inventory/pages/ItemsPage.tsx` | Fully Covered |
| **Stock Issuance** | Record products issued from inventory. | Existing | `src/modules/inventory/models/StockIssue.js`, `src/modules/inventory/controllers/StockIssueController.js`, `src/modules/inventory/views/StockIssue.vue` | `src/modules/inventory/data/useStockTransactionData.ts`, `src/modules/inventory/pages/StockIssuancePage.tsx` | Fully Covered |
| **Stock Reception** | Record products received into inventory. | Existing | `src/modules/inventory/models/StockReception.js`, `src/modules/inventory/controllers/StockReceptionController.js`, `src/modules/inventory/views/StockReception.vue` | `src/modules/inventory/data/useStockTransactionData.ts` (for reception), `src/modules/inventory/pages/PurchaseOrdersPage.tsx` (for receiving against POs) | Partially Covered (Reception via POs) |
| **Stock Returns** | Record products returned to inventory. | Existing | `src/modules/inventory/models/StockReturn.js`, `src/modules/inventory/controllers/StockReturnController.js`, `src/modules/inventory/views/StockReturn.vue` | `src/modules/inventory/data/useStockTransactionData.ts` | Partially Covered (Needs dedicated UI/workflow) |
| **Supplier Management** | Manage supplier details. | Existing | `src/modules/inventory/models/Supplier.js`, `src/modules/inventory/controllers/SupplierController.js`, `src/modules/inventory/views/SupplierList.vue`, `src/modules/inventory/views/SupplierDetail.vue` | `src/modules/inventory/pages/VendorPortalDashboardPage.tsx` (implies supplier interaction), `src/modules/inventory/data/usePurchaseOrderData.ts` (implies supplier data in POs) | Partially Covered (Needs dedicated Supplier Management UI) |
| **User Management & Privileges** | Control user access and permissions. | Existing | Integrated with central `src/modules/auth` and `src/modules/users` modules. Inventory-specific roles/permissions defined within `src/modules/inventory/config/permissions.js` | `src/modules/inventory/rbac.ts` | Fully Covered (via RBAC) |
| **Basic Reporting** | Generate simple reports on stock levels, movements. | Existing | Initial reports within `src/modules/inventory/views/reports/` and integrated with `src/modules/reports` for advanced analytics. | `src/modules/inventory/pages/InventoryDashboardPage.tsx`, `src/modules/inventory/pages/StockLevelsPage.tsx` | Partially Covered (Basic dashboards exist) |
| **Advanced Inventory Tracking** | Real-time stock updates, batch/lot tracking, expiry date management. | Missing/Limited | Implement real-time stock updates using database triggers/web sockets. Add fields for batch/lot numbers and expiry dates in `Product` and `StockMovement` models. Develop dedicated UI for tracking. | `src/modules/inventory/data/useStockLevelData.ts`, `src/modules/inventory/data/useStockTransactionData.ts` | Partially Covered (Real-time updates, batch/lot/expiry tracking needs explicit implementation) |
| **Multi-Warehouse/Location Support** | Manage inventory across multiple physical or logical locations. | Missing | Introduce `Warehouse` and `Location` models. Update `Product` and `StockMovement` to link to specific locations. | `src/modules/inventory/data/useWarehouseData.ts`, `src/modules/inventory/pages/WarehousesPage.tsx` | Fully Covered (Warehouse management exists) |
| **Automated Reorder Points & Alerts** | System-driven suggestions for restocking based on predefined thresholds. | Missing | Add `reorder_point` and `max_stock_level` fields to `Product` model. Implement background job/service to check stock levels and generate alerts/notifications. | None explicitly identified | Missing |
| **Integration with Procurement/Finance** | Seamless flow of data between inventory, purchasing, and accounting. | Missing | Develop APIs/services for integration with `src/modules/finance` (e.g., purchase orders, invoices, cost of goods sold). | `src/modules/inventory/data/usePurchaseOrderData.ts`, `src/modules/inventory/data/useRequisitionData.ts`, `src/modules/inventory/pages/PurchaseOrdersPage.tsx`, `src/modules/inventory/pages/RequisitionsPage.tsx`, `src/modules/inventory/pages/SchoolProcurementDashboardPage.tsx` | Partially Covered (Procurement workflows exist, finance integration needs explicit implementation) |
| **Comprehensive Reporting & Analytics** | Advanced dashboards, customizable reports, and predictive analytics for inventory optimization. | Missing | Leverage `src/modules/reports` for advanced BI tools. Develop custom dashboards for key inventory metrics (e.g., stock turnover, dead stock). | `src/modules/inventory/pages/InventoryDashboardPage.tsx` | Partially Covered (Basic dashboards, advanced analytics missing) |
| **Barcode/QR Code Integration** | Efficient scanning for stock movements and identification. | Missing | Generate and print barcodes/QR codes for products. Implement scanning functionality in stock movement UIs. | None explicitly identified | Missing |
| **Audit Trails & Versioning** | Detailed logs of all inventory changes and historical data. | Missing | Implement database-level auditing or application-level logging for all inventory transactions. Versioning for product master data. | None explicitly identified | Missing |
| **Supplier Relationship Management (SRM)** | More robust features for managing supplier details, contracts, and performance. | Limited | Enhance `Supplier` model with contract details, performance metrics. Develop UI for SRM. | Partially Covered (Vendor portal exists, full SRM missing) | Missing |
| **User-Friendly Interface** | Modern web-based UI/UX for improved usability. | Limited (WinForms) | Develop responsive web UI using Vue.js, following `schoolpilot` design guidelines. | Existing React/TypeScript UI | Fully Covered |
| **API for External Systems** | Exposing inventory functionalities via APIs for integration with other systems. | Missing | Design and implement RESTful APIs for core inventory operations (e.g., get stock, create issue, receive product). | Implied by data hooks and pages (backend APIs would exist) | Partially Covered (APIs likely exist but need explicit documentation/exposure) |

## 6. Data Migration Strategy

*   **Data Extraction**: Extract data from the old system's database (likely SQL Server) using scripts or ETL tools.
*   **Data Transformation**: Cleanse, map, and transform old data schema to the new `schoolpilot` inventory module schema. This will involve handling data types, relationships, and potential data inconsistencies.
*   **Data Loading**: Load transformed data into the new `schoolpilot` database. This should be done in a controlled environment with thorough validation.
*   **Validation**: Implement comprehensive data validation checks post-migration to ensure data integrity and accuracy.
*   **Rollback Plan**: Define a clear rollback strategy in case of migration failures.

## 7. Technology Stack (New System)

*   **Frontend**: Vue.js (or similar modern JavaScript framework)
*   **Backend**: Node.js (Express.js) or C# (.NET Core) - consistent with `schoolpilot` backend.
*   **Database**: PostgreSQL (or similar relational database) - consistent with `schoolpilot` database.
*   **API**: RESTful APIs
*   **Other**: Potentially Redis for caching, RabbitMQ for messaging (for real-time updates/alerts).

## 8. Future Enhancements

*   **Demand Forecasting**: Integrate with analytics tools for predicting future inventory needs.
*   **Integration with E-commerce**: If applicable, integrate with online stores for direct sales/stock updates.
*   **Mobile App**: Develop a mobile application for on-the-go inventory management.
*   **RFID Integration**: For highly accurate and automated inventory tracking.

## 9. Conclusion
This document provides a high-level plan for migrating and enhancing the Akademiko Inventory module. The focus is on building a modern, scalable, and feature-rich inventory management system that addresses the limitations of the old system and aligns with the overall `schoolpilot` architecture.
|---|---|---|---|
| **Product Categories** | Manage different categories of products. | Existing | `src/modules/inventory/models/ProductCategory.js`, `src/modules/inventory/controllers/ProductCategoryController.js`, `src/modules/inventory/views/ProductCategoryList.vue` |
| **Products** | Manage individual products with details like name, description, unit, price, category. | Existing | `src/modules/inventory/models/Product.js`, `src/modules/inventory/controllers/ProductController.js`, `src/modules/inventory/views/ProductList.vue`, `src/modules/inventory/views/ProductDetail.vue` |
| **Stock Issuance** | Record products issued from inventory. | Existing | `src/modules/inventory/models/StockIssue.js`, `src/modules/inventory/controllers/StockIssueController.js`, `src/modules/inventory/views/StockIssue.vue` |
| **Stock Reception** | Record products received into inventory. | Existing | `src/modules/inventory/models/StockReception.js`, `src/modules/inventory/controllers/StockReceptionController.js`, `src/modules/inventory/views/StockReception.vue` |
| **Stock Returns** | Record products returned to inventory. | Existing | `src/modules/inventory/models/StockReturn.js`, `src/modules/inventory/controllers/StockReturnController.js`, `src/modules/inventory/views/StockReturn.vue` |
| **Supplier Management** | Manage supplier details. | Existing | `src/modules/inventory/models/Supplier.js`, `src/modules/inventory/controllers/SupplierController.js`, `src/modules/inventory/views/SupplierList.vue`, `src/modules/inventory/views/SupplierDetail.vue` |
| **User Management & Privileges** | Control user access and permissions. | Existing | Integrated with central `src/modules/auth` and `src/modules/users` modules. Inventory-specific roles/permissions defined within `src/modules/inventory/config/permissions.js` |
| **Basic Reporting** | Generate simple reports on stock levels, movements. | Existing | Initial reports within `src/modules/inventory/views/reports/` and integrated with `src/modules/reports` for advanced analytics. |
| **Advanced Inventory Tracking** | Real-time stock updates, batch/lot tracking, expiry date management. | Missing/Limited | Implement real-time stock updates using database triggers/web sockets. Add fields for batch/lot numbers and expiry dates in `Product` and `StockMovement` models. Develop dedicated UI for tracking. |
| **Multi-Warehouse/Location Support** | Manage inventory across multiple physical or logical locations. | Missing | Introduce `Warehouse` and `Location` models. Update `Product` and `StockMovement` to link to specific locations. |
| **Automated Reorder Points & Alerts** | System-driven suggestions for restocking based on predefined thresholds. | Missing | Add `reorder_point` and `max_stock_level` fields to `Product` model. Implement background job/service to check stock levels and generate alerts/notifications. |
| **Integration with Procurement/Finance** | Seamless flow of data between inventory, purchasing, and accounting. | Missing | Develop APIs/services for integration with `src/modules/finance` (e.g., purchase orders, invoices, cost of goods sold). |
| **Comprehensive Reporting & Analytics** | Advanced dashboards, customizable reports, and predictive analytics for inventory optimization. | Missing | Leverage `src/modules/reports` for advanced BI tools. Develop custom dashboards for key inventory metrics (e.g., stock turnover, dead stock). |
| **Barcode/QR Code Integration** | Efficient scanning for stock movements and identification. | Missing | Generate and print barcodes/QR codes for products. Implement scanning functionality in stock movement UIs. |
| **Audit Trails & Versioning** | Detailed logs of all inventory changes and historical data. | Missing | Implement database-level auditing or application-level logging for all inventory transactions. Versioning for product master data. |
| **Supplier Relationship Management (SRM)** | More robust features for managing supplier details, contracts, and performance. | Limited | Enhance `Supplier` model with contract details, performance metrics. Develop UI for SRM. |
| **User-Friendly Interface** | Modern web-based UI/UX for improved usability. | Limited (WinForms) | Develop responsive web UI using Vue.js, following `schoolpilot` design guidelines. |
| **API for External Systems** | Exposing inventory functionalities via APIs for integration with other systems. | Missing | Design and implement RESTful APIs for core inventory operations (e.g., get stock, create issue, receive product). |

## 6. Data Migration Strategy

*   **Data Extraction**: Extract data from the old system's database (likely SQL Server) using scripts or ETL tools.
*   **Data Transformation**: Cleanse, map, and transform old data schema to the new `schoolpilot` inventory module schema. This will involve handling data types, relationships, and potential data inconsistencies.
*   **Data Loading**: Load transformed data into the new `schoolpilot` database. This should be done in a controlled environment with thorough validation.
*   **Validation**: Implement comprehensive data validation checks post-migration to ensure data integrity and accuracy.
*   **Rollback Plan**: Define a clear rollback strategy in case of migration failures.

## 7. Technology Stack (New System)

*   **Frontend**: Vue.js (or similar modern JavaScript framework)
*   **Backend**: Node.js (Express.js) or C# (.NET Core) - consistent with `schoolpilot` backend.
*   **Database**: PostgreSQL (or similar relational database) - consistent with `schoolpilot` database.
*   **API**: RESTful APIs
*   **Other**: Potentially Redis for caching, RabbitMQ for messaging (for real-time updates/alerts).

## 8. Future Enhancements

*   **Demand Forecasting**: Integrate with analytics tools for predicting future inventory needs.
*   **Integration with E-commerce**: If applicable, integrate with online stores for direct sales/stock updates.
*   **Mobile App**: Develop a mobile application for on-the-go inventory management.
*   **RFID Integration**: For highly accurate and automated inventory tracking.

## 9. Conclusion
This document provides a high-level plan for migrating and enhancing the Akademiko Inventory module. The focus is on building a modern, scalable, and feature-rich inventory management system that addresses the limitations of the old system and aligns with the overall `schoolpilot` architecture.