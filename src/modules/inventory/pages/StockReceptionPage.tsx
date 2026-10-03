import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { useItemData, useWarehouseData, useStockTransactionData, useStockLevelData, StockTransactionType } from '../data';
import { Card, Input, Select, Button, Alert } from '@/components/ui';
import { DialogForm } from '@/components/ui/forms';

interface StockReceptionItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  batch_number?: string;
  expiry_date?: string;
  warehouse_id: number;
  warehouse_name: string;
  notes?: string;
}

interface StockReceptionForm {
  reception_date: string;
  reference_number?: string;
  supplier_reference?: string;
  notes?: string;
  items: StockReceptionItem[];
}

export const StockReceptionPageContent: React.FC = () => {
  const [receptions, setReceptions] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReception, setEditingReception] = useState<StockReceptionForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data hooks — the hooks expose { data, create, update, remove }
  const { data: items } = useItemData();
  const { data: warehouses } = useWarehouseData();
  const { data: stockTransactions, create: createStockTransaction } = useStockTransactionData();
  const { data: stockLevels, create: createStockLevel, update: updateStockLevel } = useStockLevelData();

  // Derive receptions from receipt transactions whenever the data changes
  useEffect(() => {
    try {
      setLoading(true);
      const receiptTransactions = (stockTransactions || []).filter(
        t => String(t.transaction_type) === StockTransactionType.RECEIPT
      );
      setReceptions(groupTransactionsByReception(receiptTransactions));
    } catch (err) {
      setError('Failed to load stock receptions');
    } finally {
      setLoading(false);
    }
  }, [stockTransactions]);

  const groupTransactionsByReception = (transactions: any[]) => {
    const grouped = transactions.reduce((acc, transaction) => {
      const key = transaction.source_id || transaction.transaction_date;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          reception_date: transaction.transaction_date,
          reference_number: transaction.source_id,
          items: [],
          total_quantity: 0
        };
      }
      acc[key].items.push(transaction);
      acc[key].total_quantity += transaction.quantity;
      return acc;
    }, {});
    return Object.values(grouped);
  };

  const handleOpenDialog = (reception?: any) => {
    if (reception) {
      setEditingReception({
        reception_date: reception.reception_date,
        reference_number: reception.reference_number,
        supplier_reference: '',
        notes: '',
        items: reception.items.map((item: any) => ({
          id: item.id,
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          warehouse_id: item.warehouse_id,
          warehouse_name: item.warehouse_name,
          notes: item.notes
        }))
      });
    } else {
      setEditingReception({
        reception_date: new Date().toISOString().split('T')[0],
        reference_number: `REC-${Date.now()}`,
        supplier_reference: '',
        notes: '',
        items: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingReception(null);
    setError(null);
    setSuccess(null);
  };

  const handleAddItem = () => {
    if (!editingReception) return;

    const newItem: StockReceptionItem = {
      id: `temp-${Date.now()}`,
      item_id: '',
      item_name: '',
      quantity: 0,
      batch_number: '',
      expiry_date: '',
      warehouse_id: 0,
      warehouse_name: '',
      notes: ''
    };

    setEditingReception({
      ...editingReception,
      items: [...editingReception.items, newItem]
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!editingReception) return;

    const updatedItems = editingReception.items.filter((_, i) => i !== index);
    setEditingReception({
      ...editingReception,
      items: updatedItems
    });
  };

  const handleItemChange = (index: number, field: keyof StockReceptionItem, value: any) => {
    if (!editingReception) return;

    const updatedItems = [...editingReception.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-populate item name when item is selected
    if (field === 'item_id') {
      const selectedItem = items.find(item => String(item.id) === String(value));
      if (selectedItem) {
        updatedItems[index].item_name = selectedItem.name;
      }
    }

    // Auto-populate warehouse name when warehouse is selected
    if (field === 'warehouse_id') {
      const selectedWarehouse = warehouses.find(wh => String(wh.id) === String(value));
      if (selectedWarehouse) {
        updatedItems[index].warehouse_name = selectedWarehouse.name;
      }
    }

    setEditingReception({
      ...editingReception,
      items: updatedItems
    });
  };

  const handleSaveReception = async () => {
    if (!editingReception) return;

    try {
      setLoading(true);
      setError(null);

      // Validate form
      if (editingReception.items.length === 0) {
        setError('Please add at least one item to receive');
        return;
      }

      for (const item of editingReception.items) {
        if (!item.item_id || !item.warehouse_id || item.quantity <= 0) {
          setError('Please fill in all required fields for each item');
          return;
        }
      }

      // Create stock transactions for each item and upsert stock levels
      for (const item of editingReception.items) {
        await createStockTransaction({
          item_id: item.item_id,
          warehouse_id: Number(item.warehouse_id),
          transaction_type: StockTransactionType.RECEIPT,
          quantity: item.quantity,
          source_table: 'stock_reception',
          source_id: editingReception.reference_number,
          transaction_date: editingReception.reception_date,
          notes: [
            editingReception.notes,
            item.notes,
            item.batch_number ? `Batch: ${item.batch_number}` : '',
            item.expiry_date ? `Expiry: ${item.expiry_date}` : ''
          ].filter(Boolean).join(' | ')
        });

        // Update stock levels (add to existing or create)
        const warehouseId = Number(item.warehouse_id);
        const existingLevel = stockLevels.find(
          l => String(l.item_id) === String(item.item_id) && l.warehouse_id === warehouseId
        );
        if (existingLevel) {
          await updateStockLevel(existingLevel.id, { quantity: existingLevel.quantity + item.quantity });
        } else {
          await createStockLevel({
            item_id: Number(item.item_id),
            warehouse_id: warehouseId,
            quantity: item.quantity
          });
        }
      }

      setSuccess('Stock reception recorded successfully');
      handleCloseDialog();
    } catch (err) {
      setError('Failed to save stock reception');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400">
            <ArchiveBoxIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-surface-foreground">Stock Reception</h1>
            <p className="text-sm text-surface-muted-fg">Record incoming stock into your warehouses</p>
          </div>
        </div>
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => handleOpenDialog()} disabled={loading}>
          New Reception
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card title="Recent Stock Receptions">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-border text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Items Count</th>
                <th className="px-4 py-3 text-left font-medium">Total Quantity</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-surface-muted-fg">
                    Loading...
                  </td>
                </tr>
              ) : receptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-surface-muted-fg">
                    No stock receptions found
                  </td>
                </tr>
              ) : (
                receptions.map((reception) => (
                  <tr key={reception.id} className="hover:bg-surface-accent/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-surface-foreground">{reception.reference_number || 'N/A'}</td>
                    <td className="px-4 py-3 text-surface-muted-fg">{new Date(reception.reception_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-surface-muted-fg">{reception.items.length}</td>
                    <td className="px-4 py-3 text-surface-muted-fg">{reception.total_quantity}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(reception)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reception Dialog */}
      <DialogForm
        isOpen={openDialog}
        onClose={handleCloseDialog}
        title={editingReception?.reference_number && editingReception.items.length > 0 ? 'View Stock Reception' : 'New Stock Reception'}
        description="Enter the received items, quantities and target warehouses."
        size="xl"
        onSubmit={(e) => { e.preventDefault(); void handleSaveReception(); }}
      >
        {editingReception && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5">
              <Input
                label="Reception Date"
                type="date"
                value={editingReception.reception_date}
                onChange={(e) => setEditingReception({
                  ...editingReception,
                  reception_date: e.target.value
                })}
              />
              <Input
                label="Reference Number"
                value={editingReception.reference_number}
                onChange={(e) => setEditingReception({
                  ...editingReception,
                  reference_number: e.target.value
                })}
              />
              <Input
                label="Supplier Reference"
                value={editingReception.supplier_reference}
                onChange={(e) => setEditingReception({
                  ...editingReception,
                  supplier_reference: e.target.value
                })}
              />
            </div>

            <Input
              label="Notes"
              value={editingReception.notes}
              onChange={(e) => setEditingReception({
                ...editingReception,
                notes: e.target.value
              })}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-surface-foreground">Items to Receive</h3>
                <Button type="button" variant="outline" size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={handleAddItem}>
                  Add Item
                </Button>
              </div>

              {editingReception.items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-surface-border px-4 py-8 text-center text-sm text-surface-muted-fg">
                  No items added. Click "Add Item" to start.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-surface-border">
                  <table className="min-w-full divide-y divide-surface-border text-sm">
                    <thead>
                      <tr className="table-header">
                        <th className="px-3 py-2.5 text-left font-medium">Item</th>
                        <th className="px-3 py-2.5 text-left font-medium">Warehouse</th>
                        <th className="px-3 py-2.5 text-left font-medium w-24">Qty</th>
                        <th className="px-3 py-2.5 text-left font-medium w-32">Batch/Lot</th>
                        <th className="px-3 py-2.5 text-left font-medium w-40">Expiry Date</th>
                        <th className="px-3 py-2.5 text-left font-medium w-32">Notes</th>
                        <th className="px-3 py-2.5 text-right font-medium w-14"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {editingReception.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 min-w-[200px]">
                            <Select
                              searchable
                              size="sm"
                              placeholder="Select item"
                              options={items.map(i => ({ value: String(i.id), label: i.name }))}
                              value={String(item.item_id ?? '')}
                              onValueChange={(value) => handleItemChange(index, 'item_id', value)}
                            />
                          </td>
                          <td className="px-3 py-2 min-w-[150px]">
                            <Select
                              size="sm"
                              placeholder="Select warehouse"
                              value={item.warehouse_id ? String(item.warehouse_id) : ''}
                              onChange={(e) => handleItemChange(index, 'warehouse_id', e.target.value)}
                            >
                              <option value="">Select warehouse…</option>
                              {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              size="sm"
                              type="number"
                              min={0}
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              size="sm"
                              value={item.batch_number}
                              onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              size="sm"
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              size="sm"
                              value={item.notes}
                              onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              aria-label={`Remove item ${index + 1}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-surface-border pt-4">
              <Button variant="secondary" onClick={handleCloseDialog} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={loading || !editingReception?.items.length}
              >
                Save Reception
              </Button>
            </div>
          </div>
        )}
      </DialogForm>
    </div>
  );
};

const StockReceptionPage: React.FC = () => (
  <div className="space-y-6">
    <StockReceptionPageContent />
  </div>
);

export default StockReceptionPage;
