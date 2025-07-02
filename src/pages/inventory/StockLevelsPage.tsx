import React, { useState, useMemo } from 'react';
import { StockLevel, Warehouse, ItemCategoryInv } from '../../types'; // Assuming ItemInv has category_id
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import { TableCellsIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

const StockLevelsPage: React.FC = () => {
  const { 
    stockLevels, 
    warehouses, 
    itemsInv, // Need items to get category for filtering
    itemCategoriesInv, // Need categories for filter dropdown
    loading 
  } = useAppData(); // Updated
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
  const [selectedItemCategoryId, setSelectedItemCategoryId] = useState<number | undefined>(undefined);

  const filteredStockLevels = useMemo(() => {
    return stockLevels.filter(sl => {
      const item = itemsInv.find(i => i.id === sl.item_id);
      const warehouseMatch = selectedWarehouseId ? sl.warehouse_id === selectedWarehouseId : true;
      const categoryMatch = selectedItemCategoryId && item ? item.category_id === selectedItemCategoryId : true;
      return warehouseMatch && categoryMatch;
    });
  }, [stockLevels, selectedWarehouseId, selectedItemCategoryId, itemsInv]);

  const columns = [
    { header: 'Item Name', accessor: 'item_name' as keyof StockLevel },
    { header: 'Warehouse', accessor: 'warehouse_name' as keyof StockLevel },
    { header: 'Quantity on Hand', accessor: 'quantity' as keyof StockLevel },
    // Could add Item Category here if needed by joining/resolving
  ];

  if ((loading.stockLevels || loading.warehouses || loading.itemsInv || loading.itemCategoriesInv)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Stock Levels...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Current Stock Levels">
        <p className="text-sm text-gray-600 mb-4">
          View current stock levels for all items across different warehouses. Use filters to narrow down the list.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border rounded-md bg-gray-50">
            <Select
                label="Filter by Warehouse"
                value={selectedWarehouseId || ''}
                onChange={(e) => setSelectedWarehouseId(e.target.value ? parseInt(e.target.value) : undefined)}
            >
                <option value="">All Warehouses</option>
                {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
            </Select>
            <Select
                label="Filter by Item Category"
                value={selectedItemCategoryId || ''}
                onChange={(e) => setSelectedItemCategoryId(e.target.value ? parseInt(e.target.value) : undefined)}
            >
                <option value="">All Categories</option>
                {itemCategoriesInv.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </Select>
        </div>
        <Table columns={columns} data={filteredStockLevels} isLoading={loading.stockLevels} emptyStateMessage="No stock levels found for the current filter."/>
      </Card>
    </div>
  );
};

export default StockLevelsPage;
