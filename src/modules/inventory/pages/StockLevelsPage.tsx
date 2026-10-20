// ABOUTME: Read-only stock levels grid filterable by warehouse and item category.
// ABOUTME: Data comes from the useInventory module hook; ids are compared as strings (UUID-safe).

import React, { useState, useMemo } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Select from '@/components/ui/Select';
import { TableCellsIcon } from '@/components/ui/icons';
import { useInventory } from '../hooks/useInventory';
import type { StockLevel } from '@/core/types';

export const StockLevelsPageContent: React.FC = () => {
  const {
    stockLevels,
    warehouses,
    items: itemsInv, // Need items to get category for filtering
    itemCategories: itemCategoriesInv, // Need categories for filter dropdown
  } = useInventory();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedItemCategoryId, setSelectedItemCategoryId] = useState<string>('');

  const filteredStockLevels = useMemo(() => {
    return stockLevels.filter(sl => {
      const item = itemsInv.find(i => String(i.id) === String(sl.item_id));
      const warehouseMatch = selectedWarehouseId ? String(sl.warehouse_id) === selectedWarehouseId : true;
      const categoryMatch = selectedItemCategoryId && item ? String(item.category_id) === selectedItemCategoryId : true;
      return warehouseMatch && categoryMatch;
    });
  }, [stockLevels, selectedWarehouseId, selectedItemCategoryId, itemsInv]);

  const columns: DataGridColumn<StockLevel>[] = [
    { 
      key: 'item_name', 
      header: 'Item Name', 
      sortable: true, 
      filterable: true, 
      width: 200
    },
    { 
      key: 'warehouse_name', 
      header: 'Warehouse', 
      sortable: true, 
      filterable: true, 
      width: 150
    },
    { 
      key: 'quantity', 
      header: 'Quantity on Hand', 
      sortable: true, 
      filterable: true, 
      width: 150
    },
  ];


  return (
    <div className="space-y-6">
      <Card title="Current Stock Levels">
        <p className="text-sm text-surface-muted-fg mb-4">
          View current stock levels for all items across different warehouses. Use filters to narrow down the list.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border rounded-md bg-surface-muted">
            <Select
                label="Filter by Warehouse"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
            >
                <option value="">All Warehouses</option>
                {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
            </Select>
            <Select
                label="Filter by Item Category"
                value={selectedItemCategoryId}
                onChange={(e) => setSelectedItemCategoryId(e.target.value)}
            >
                <option value="">All Categories</option>
                {itemCategoriesInv.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </Select>
        </div>
        <DataGrid 
          columns={columns} 
          data={filteredStockLevels || []} 
          sortable
          filterable
          emptyState={{
            icon: <TableCellsIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No stock levels found",
            description: "No stock levels found for the current filter. Try adjusting your filter criteria.",
            action: undefined
          }}
        />
      </Card>
    </div>
  );
};
const StockLevelsPage: React.FC = () => (
  <div className="space-y-6">
    <StockLevelsPageContent />
  </div>
);

export default StockLevelsPage;
