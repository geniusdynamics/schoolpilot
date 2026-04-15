// ABOUTME: Inventory domain hook — Warehouses, ItemCategories, StockItems, FixedAssets,
// ABOUTME: AssetDepreciationLogs, Requisitions, PurchaseOrders, StockTransactions, RFQs
// ABOUTME: Uses real database-backed hooks for persistent data

import { useCallback } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import * as allTypes from '@/types';

export function useInventoryData() {
  const warehousesCollection = useDatabaseCollection<any>('warehouses');
  const itemCategoriesInvCollection = useDatabaseCollection<any>('item_categories_inv');
  const itemsInvCollection = useDatabaseCollection<any>('items_inv');
  const fixedAssetsCollection = useDatabaseCollection<any>('fixed_assets');
  const requisitionsCollection = useDatabaseCollection<any>('requisitions');
  const purchaseOrdersCollection = useDatabaseCollection<any>('purchase_orders');
  const stockLevelsCollection = useDatabaseCollection<any>('stock_levels');
  const stockTransactionsCollection = useDatabaseCollection<any>('stock_transactions');
  const rfqsCollection = useDatabaseCollection<any>('rfqs');

  // ── Warehouses ────────────────────────────────────────────────────────────────
  const addWarehouse = useCallback(async (data: any) => {
    return warehousesCollection.insert(data);
  }, [warehousesCollection]);

  const updateWarehouse = useCallback(async (id: string, data: any) => {
    return warehousesCollection.update(id, data);
  }, [warehousesCollection]);

  const deleteWarehouse = useCallback(async (id: string) => {
    return warehousesCollection.remove(id);
  }, [warehousesCollection]);

  // ── Item Categories ───────────────────────────────────────────────────────────
  const addItemCategoryInv = useCallback(async (data: any) => {
    return itemCategoriesInvCollection.insert(data);
  }, [itemCategoriesInvCollection]);

  const updateItemCategoryInv = useCallback(async (id: string, data: any) => {
    return itemCategoriesInvCollection.update(id, data);
  }, [itemCategoriesInvCollection]);

  const deleteItemCategoryInv = useCallback(async (id: string) => {
    return itemCategoriesInvCollection.remove(id);
  }, [itemCategoriesInvCollection]);

  // ── Inventory Items ───────────────────────────────────────────────────────────
  const addItemInv = useCallback(async (data: any) => {
    return itemsInvCollection.insert(data);
  }, [itemsInvCollection]);

  const updateItemInv = useCallback(async (id: string, data: any) => {
    return itemsInvCollection.update(id, data);
  }, [itemsInvCollection]);

  const deleteItemInv = useCallback(async (id: string) => {
    return itemsInvCollection.remove(id);
  }, [itemsInvCollection]);

  // ── Fixed Assets ──────────────────────────────────────────────────────────────
  const addFixedAsset = useCallback(async (data: any) => {
    return fixedAssetsCollection.insert(data);
  }, [fixedAssetsCollection]);

  const updateFixedAsset = useCallback(async (id: string, data: any) => {
    return fixedAssetsCollection.update(id, data);
  }, [fixedAssetsCollection]);

  const deleteFixedAsset = useCallback(async (id: string) => {
    return fixedAssetsCollection.remove(id);
  }, [fixedAssetsCollection]);

  const addAssetDepreciationLog = useCallback(async (logData: Omit<allTypes.AssetDepreciationLog, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const logWithId = { ...logData, id: databaseService.generateId() };
      const result = await db.asset_depreciation_logs?.insert(logWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding asset depreciation log:', error); throw error; }
  }, []);

  // ── Requisitions ──────────────────────────────────────────────────────────────
  const addRequisition = useCallback(async (data: any) => {
    return requisitionsCollection.insert(data);
  }, [requisitionsCollection]);

  const updateRequisition = useCallback(async (id: string, data: any) => {
    return requisitionsCollection.update(id, data);
  }, [requisitionsCollection]);

  const deleteRequisition = useCallback(async (id: string) => {
    return requisitionsCollection.remove(id);
  }, [requisitionsCollection]);

  const updateRequisitionStatus = useCallback(async (requisitionId: string, status: string) => {
    return requisitionsCollection.update(requisitionId, { status });
  }, [requisitionsCollection]);

  // ── Purchase Orders ───────────────────────────────────────────────────────────
  const addPurchaseOrder = useCallback(async (data: any) => {
    return purchaseOrdersCollection.insert(data);
  }, [purchaseOrdersCollection]);

  const updatePurchaseOrder = useCallback(async (id: string, data: any) => {
    return purchaseOrdersCollection.update(id, data);
  }, [purchaseOrdersCollection]);

  const deletePurchaseOrder = useCallback(async (id: string) => {
    return purchaseOrdersCollection.remove(id);
  }, [purchaseOrdersCollection]);

  // ── Stock Transactions ────────────────────────────────────────────────────────
  const addStockTransaction = useCallback(async (transactionData: Omit<allTypes.StockTransaction, 'id'>) => {
    return stockTransactionsCollection.insert(transactionData);
  }, [stockTransactionsCollection]);

  // ── RFQs ──────────────────────────────────────────────────────────────────────
  const addRfq = useCallback(async (data: any) => {
    return rfqsCollection.insert(data);
  }, [rfqsCollection]);

  const updateRfq = useCallback(async (id: string, data: any) => {
    return rfqsCollection.update(id, data);
  }, [rfqsCollection]);

  const deleteRfq = useCallback(async (id: string) => {
    return rfqsCollection.remove(id);
  }, [rfqsCollection]);

  return {
    // Data
    warehouses: warehousesCollection.data,
    itemCategoriesInv: itemCategoriesInvCollection.data,
    itemsInv: itemsInvCollection.data,
    fixedAssets: fixedAssetsCollection.data,
    requisitions: requisitionsCollection.data,
    purchaseOrders: purchaseOrdersCollection.data,
    stockLevels: stockLevelsCollection.data,
    stockTransactions: stockTransactionsCollection.data,
    rfqs: rfqsCollection.data,

    // CRUD
    addWarehouse, updateWarehouse, deleteWarehouse,
    addItemCategoryInv, updateItemCategoryInv, deleteItemCategoryInv,
    addItemInv, updateItemInv, deleteItemInv,
    addFixedAsset, updateFixedAsset, deleteFixedAsset,
    addAssetDepreciationLog,
    addRequisition, updateRequisition, deleteRequisition,
    updateRequisitionStatus,
    addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
    addStockTransaction,
    addRfq, updateRfq, deleteRfq,
  };
}
