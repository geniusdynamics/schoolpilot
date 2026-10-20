import { logger } from '@/utils/logging';

// ABOUTME: StockLevelService - Business logic for stock level tracking
// ABOUTME: Replaces trg_inv_updateStockLevel trigger from the Akademico database
// ABOUTME: Maintains stock_levels table in sync with stock_transactions

import { StockTransactionType } from '../data/types';

/**
 * Result of processing a single stock transaction
 */
export interface StockLevelUpdateResult {
  /** Item ID that was affected */
  itemId: string;
  /** Warehouse ID that was affected */
  warehouseId: string;
  /** Previous quantity (0 if no prior record) */
  previousQuantity: number;
  /** New quantity after the transaction */
  newQuantity: number;
  /** The transaction type that was processed */
  transactionType: StockTransactionType;
  /** Whether this was an upsert (new record created) or update */
  wasUpsert: boolean;
}

/**
 * Dependencies required by StockLevelService
 * These are injected to decouple the service from specific data access implementations
 */
export interface StockLevelServiceDependencies {
  /** Find an existing stock level record by item_id and warehouse_id */
  findStockLevel: (itemId: string, warehouseId: string) => Promise<StockLevelRecord | null>;
  /** Insert a new stock level record */
  insertStockLevel: (record: Omit<StockLevelRecord, 'id'> & { id?: string }) => Promise<StockLevelRecord | null>;
  /** Update an existing stock level record */
  updateStockLevel: (id: string, changes: { quantity: number }) => Promise<StockLevelRecord | null>;
  /** Generate a unique ID for new records */
  generateId: () => string;
}

/**
 * Minimal shape of a StockLevel record as needed by this service
 */
export interface StockLevelRecord {
  id: string;
  item_id: string;
  warehouse_id: string;
  quantity: number;
  item_name?: string | null;
  warehouse_name?: string | null;
  category_name?: string | null;
}

/**
 * Minimal shape of a StockTransaction record as needed by this service
 */
export interface StockTransactionRecord {
  id: string;
  item_id: string;
  warehouse_id: string;
  transaction_type: StockTransactionType;
  quantity: number;
  source_table?: string | null;
  source_id?: string | null;
  transaction_date?: string | null;
  notes?: string | null;
}

/**
 * StockLevelService
 *
 * Replaces the PostgreSQL trigger `inv.fn_update_stock_level()` and the
 * trigger `trg_inv_updateStockLevel` which kept the `stock_levels` table
 * in sync with `stock_transactions`.
 *
 * On each stock transaction:
 * - Receive / Return to Store: ADD quantity to stock_levels (upsert)
 * - Issue / Return to Supplier: SUBTRACT quantity from stock_levels
 * - Stock Adjustment: ADD or SUBTRACT based on the sign of the quantity
 *
 * Usage:
 *   const service = new StockLevelService(deps);
 *   await service.onStockTransaction(transaction);
 *
 * Or via React hook:
 *   const { processTransaction, processTransactions } = useStockLevelService();
 */
export class StockLevelService {
  private deps: StockLevelServiceDependencies;

  constructor(deps: StockLevelServiceDependencies) {
    this.deps = deps;
  }

  /**
   * Process a single stock transaction and update the stock_levels table.
   * Mirrors the logic of `inv.fn_update_stock_level()`:
   *   - Receive: UPSERT (add quantity)
   *   - Issue: SUBTRACT quantity
   *   - Return to Store: ADD quantity
   *   - Return to Supplier: SUBTRACT quantity
   *   - Stock Adjustment: ADD quantity (quantity can be negative for downward adjustments)
   */
  async onStockTransaction(transaction: StockTransactionRecord): Promise<StockLevelUpdateResult> {
    const { item_id, warehouse_id, transaction_type, quantity } = transaction;

    // Determine the quantity delta based on transaction type
    const delta = this.calculateDelta(transaction_type, quantity);

    // Find existing stock level
    const existing = await this.deps.findStockLevel(item_id, String(warehouse_id));

    if (existing) {
      // Update existing record
      const newQuantity = Math.round((existing.quantity + delta) * 100) / 100;
      await this.deps.updateStockLevel(existing.id, { quantity: newQuantity });

      return {
        itemId: item_id,
        warehouseId: String(warehouse_id),
        previousQuantity: existing.quantity,
        newQuantity,
        transactionType: transaction_type,
        wasUpsert: false,
      };
    } else {
      // No existing record: insert new one
      const newQuantity = Math.round(delta * 100) / 100;
      const id = this.deps.generateId();

      await this.deps.insertStockLevel({
        id,
        item_id,
        warehouse_id: String(warehouse_id),
        quantity: newQuantity,
      });

      return {
        itemId: item_id,
        warehouseId: String(warehouse_id),
        previousQuantity: 0,
        newQuantity,
        transactionType: transaction_type,
        wasUpsert: true,
      };
    }
  }

  /**
   * Process multiple stock transactions in order.
   * Each transaction is processed sequentially to maintain consistency.
   */
  async onStockTransactions(transactions: StockTransactionRecord[]): Promise<StockLevelUpdateResult[]> {
    const results: StockLevelUpdateResult[] = [];
    for (const transaction of transactions) {
      try {
        const result = await this.onStockTransaction(transaction);
        results.push(result);
      } catch (error) {
        logger.error(`[StockLevelService] Error processing transaction ${transaction.id}:`, error);
        // Continue processing remaining transactions
      }
    }
    return results;
  }

  /**
   * Get the current stock level for a specific item at a specific warehouse.
   * Returns null if no stock level record exists.
   */
  async getStockLevel(itemId: string, warehouseId: string): Promise<StockLevelRecord | null> {
    return this.deps.findStockLevel(itemId, warehouseId);
  }

  /**
   * Calculate the quantity delta based on transaction type.
   * Positive delta = add to stock, Negative delta = subtract from stock.
   */
  private calculateDelta(transactionType: StockTransactionType, quantity: number): number {
    switch (transactionType) {
      case StockTransactionType.RECEIPT:
      case StockTransactionType.RETURN_TO_STORE:
        // Adding stock
        return Math.abs(quantity);

      case StockTransactionType.ISSUE:
      case StockTransactionType.RETURN_TO_SUPPLIER:
        // Removing stock
        return -Math.abs(quantity);

      case StockTransactionType.STOCK_ADJUSTMENT:
        // Adjustment: quantity can be positive (add) or negative (subtract)
        return quantity;

      default:
        // Unknown transaction type: treat as no-op
        logger.warn(`[StockLevelService] Unknown transaction type: ${transactionType}`);
        return 0;
    }
  }
}

export default StockLevelService;