// ABOUTME: Inventory domain hook — Warehouses, ItemCategories, StockItems, FixedAssets,
// ABOUTME: AssetDepreciationLogs, Requisitions, PurchaseOrders, StockTransactions, RFQs

import { useState, useCallback } from 'react';
import type { AppDataContextType } from '@/types';
import { databaseService } from '@/services/database/databaseService';
import * as allTypes from '@/types';

type RawInitialData = AppDataContextType['rawInitialData'];

export function useInventoryData(_mockDataForSeeding: RawInitialData) {
  const [inventoryData] = useState<{
    warehouses: any[];
    itemCategoriesInv: any[];
    itemsInv: any[];
    fixedAssets: any[];
    requisitions: any[];
    purchaseOrders: any[];
    stockLevels: any[];
    stockTransactions: any[];
    rfqs: any[];
  }>({
    warehouses: [],
    itemCategoriesInv: [],
    itemsInv: [],
    fixedAssets: [],
    requisitions: [],
    purchaseOrders: [],
    stockLevels: [],
    stockTransactions: [],
    rfqs: [],
  });

  // ── Warehouses ────────────────────────────────────────────────────────────────
  const addWarehouse = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.warehouses?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding warehouse:', error); throw error; }
  }, []);

  const updateWarehouse = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.warehouses?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating warehouse:', error); throw error; }
  }, []);

  const deleteWarehouse = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.warehouses?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting warehouse:', error); throw error; }
  }, []);

  // ── Item Categories ───────────────────────────────────────────────────────────
  const addItemCategoryInv = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.item_categories_inv?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding item category:', error); throw error; }
  }, []);

  const updateItemCategoryInv = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.item_categories_inv?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating item category:', error); throw error; }
  }, []);

  const deleteItemCategoryInv = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.item_categories_inv?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting item category:', error); throw error; }
  }, []);

  // ── Inventory Items ───────────────────────────────────────────────────────────
  const addItemInv = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.items_inv?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding inventory item:', error); throw error; }
  }, []);

  const updateItemInv = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.items_inv?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating inventory item:', error); throw error; }
  }, []);

  const deleteItemInv = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.items_inv?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting inventory item:', error); throw error; }
  }, []);

  // ── Fixed Assets ──────────────────────────────────────────────────────────────
  const addFixedAsset = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.fixed_assets?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding fixed asset:', error); throw error; }
  }, []);

  const updateFixedAsset = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.fixed_assets?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating fixed asset:', error); throw error; }
  }, []);

  const deleteFixedAsset = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.fixed_assets?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting fixed asset:', error); throw error; }
  }, []);

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
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.requisitions?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding requisition:', error); throw error; }
  }, []);

  const updateRequisition = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.requisitions?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating requisition:', error); throw error; }
  }, []);

  const deleteRequisition = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.requisitions?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting requisition:', error); throw error; }
  }, []);

  const updateRequisitionStatus = useCallback(async (requisitionId: string, status: string) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.requisitions?.update(requisitionId, { status });
      return result?.doc || null;
    } catch (error) { console.error('Error updating requisition status:', error); throw error; }
  }, []);

  // ── Purchase Orders ───────────────────────────────────────────────────────────
  const addPurchaseOrder = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.purchase_orders?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding purchase order:', error); throw error; }
  }, []);

  const updatePurchaseOrder = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.purchase_orders?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating purchase order:', error); throw error; }
  }, []);

  const deletePurchaseOrder = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.purchase_orders?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting purchase order:', error); throw error; }
  }, []);

  // ── Stock Transactions ────────────────────────────────────────────────────────
  const addStockTransaction = useCallback(async (transactionData: Omit<allTypes.StockTransaction, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const transactionWithId = { ...transactionData, id: databaseService.generateId() };
      const result = await db.stock_transactions?.insert(transactionWithId);
      return result?.doc || null;
    } catch (error) { console.error('Error adding stock transaction:', error); throw error; }
  }, []);

  // ── RFQs ──────────────────────────────────────────────────────────────────────
  const addRfq = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.rfqs?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding RFQ:', error); throw error; }
  }, []);

  const updateRfq = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.rfqs?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating RFQ:', error); throw error; }
  }, []);

  const deleteRfq = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.rfqs?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting RFQ:', error); throw error; }
  }, []);

  return {
    // Data
    warehouses: inventoryData.warehouses,
    itemCategoriesInv: inventoryData.itemCategoriesInv,
    itemsInv: inventoryData.itemsInv,
    fixedAssets: inventoryData.fixedAssets,
    requisitions: inventoryData.requisitions,
    purchaseOrders: inventoryData.purchaseOrders,
    stockLevels: inventoryData.stockLevels,
    stockTransactions: inventoryData.stockTransactions,
    rfqs: inventoryData.rfqs,

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
