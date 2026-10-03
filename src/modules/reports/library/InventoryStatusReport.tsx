// ABOUTME: Inventory Status Report for inventory management
// ABOUTME: Shows comprehensive inventory status including stock levels and basic tracking

import React, { useState, useCallback, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { CubeIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { DataGrid } from '@/components/ui/data';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { formatKES } from '@/utils/format';

interface InventoryStatusItem {
  itemId: string;
  itemName: string;
  categoryName: string;
  warehouseName: string;
  currentStock: number;
  unitOfMeasure: string;
  unitCost?: number;
  totalValue: number;
  status: 'adequate' | 'out_of_stock';
}

type StatusFilter = 'all' | 'adequate' | 'out_of_stock';

const InventoryStatusReport: React.FC = () => {
  const { itemsInv, warehouses, itemCategoriesInv, stockLevels, loading } = useAppData();

  const [selectedWarehouse, setSelectedWarehouse] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [filteredInventoryItems, setFilteredInventoryItems] = useState<InventoryStatusItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateInventoryStatus = useCallback(() => {
    const inventoryItems: InventoryStatusItem[] = [];

    (stockLevels || []).forEach(stockLevel => {
      const item = (itemsInv || []).find(i => i.id === stockLevel.item_id);
      const warehouse = (warehouses || []).find(w => w.id === stockLevel.warehouse_id);
      const category = item ? (itemCategoriesInv || []).find(c => c.id === item.category_id) : null;

      if (!item || !warehouse) return;

      const currentStock = stockLevel.quantity || 0;
      const unitCost = item.current_price || 0;
      const totalValue = currentStock * unitCost;

      // Determine status
      let status: 'adequate' | 'out_of_stock' = 'adequate';
      if (currentStock === 0) {
        status = 'out_of_stock';
      }

      inventoryItems.push({
        itemId: item.id,
        itemName: item.name,
        categoryName: category?.name || 'Uncategorized',
        warehouseName: warehouse.name,
        currentStock,
        unitOfMeasure: item.unit_of_measure || 'pcs',
        unitCost: item.current_price || 0,
        totalValue,
        status
      });
    });

    return inventoryItems.sort((a, b) => {
      // Sort by status priority (out_of_stock, low, overstocked, adequate)
      const statusPriority = { out_of_stock: 4, low: 3, overstocked: 2, adequate: 1 };
      return statusPriority[b.status] - statusPriority[a.status];
    });
  }, [stockLevels, itemsInv, warehouses, itemCategoriesInv]);

  const handleGenerateReport = useCallback(() => {
    setIsGenerating(true);
    
    let inventoryItems = generateInventoryStatus();

    // Apply filters
    if (selectedWarehouse !== 'all') {
      const warehouse = (warehouses || []).find(w => w.id === selectedWarehouse);
      if (warehouse) {
        inventoryItems = inventoryItems.filter(item => item.warehouseName === warehouse.name);
      }
    }

    if (selectedCategory !== 'all') {
      const category = (itemCategoriesInv || []).find(c => c.id === selectedCategory);
      if (category) {
        inventoryItems = inventoryItems.filter(item => item.categoryName === category.name);
      }
    }

    if (selectedStatus !== 'all') {
      inventoryItems = inventoryItems.filter(item => item.status === selectedStatus);
    }

    setFilteredInventoryItems(inventoryItems);
    setIsGenerating(false);
  }, [generateInventoryStatus, selectedWarehouse, selectedCategory, selectedStatus, warehouses, itemCategoriesInv]);

  // Generate report on initial mount once data is loaded
  useEffect(() => {
    if (!loading.itemsInv && !loading.warehouses && !loading.itemCategoriesInv && !loading.stockLevels) {
      handleGenerateReport();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      adequate: { color: 'bg-green-100 text-green-800', text: 'Adequate' },
      low: { color: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' },
      out_of_stock: { color: 'bg-red-100 text-red-800', text: 'Out of Stock' },
      overstocked: { color: 'bg-primary-100 text-primary-800', text: 'Overstocked' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.adequate;
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const columns = [
    { header: 'Item Name', key: 'itemName' as keyof InventoryStatusItem },
    { header: 'Category', key: 'categoryName' as keyof InventoryStatusItem },
    { header: 'Warehouse', key: 'warehouseName' as keyof InventoryStatusItem },
    // Keys must match the camelCase fields so DataGrid sorting/filtering works
    { header: 'Current Stock', key: 'currentStock', render: (_v: any, item: InventoryStatusItem) => `${item.currentStock} ${item.unitOfMeasure}` },
    { header: 'Unit Cost', key: 'unitCost', align: 'right' as const, render: (_v: any, item: InventoryStatusItem) =>
      item.unitCost ? formatKES(item.unitCost) : 'N/A'
    },
    { header: 'Total Value', key: 'totalValue', align: 'right' as const, render: (_v: any, item: InventoryStatusItem) => formatKES(item.totalValue) },
    { header: 'Status', key: 'status', render: (_v: any, item: InventoryStatusItem) => getStatusBadge(item.status) },
  ];

  const isLoadingPage = loading.itemsInv || loading.warehouses || loading.itemCategoriesInv || loading.stockLevels;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Item Name', 'Category', 'Warehouse', 'Current Stock', 'Unit', 'Unit Cost', 'Total Value', 'Status'];
    const rows = (filteredInventoryItems || []).map(item => [
      item.itemName,
      item.categoryName,
      item.warehouseName,
      item.currentStock?.toString() ?? '',
      item.unitOfMeasure,
      item.unitCost?.toString() || '0',
      item.totalValue.toString(),
      item.status.replace('_', ' ')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_status_report_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Calculate summary statistics
  const totalItems = filteredInventoryItems.length;
  const outOfStockItems = filteredInventoryItems.filter(item => item.status === 'out_of_stock').length;
  const totalValue = filteredInventoryItems.reduce((sum, item) => sum + item.totalValue, 0);

  return (
    <div className="space-y-6">
      <Card title="Inventory Status Report" icon={CubeIcon}>
        <div className="p-4 border-b mb-4 bg-surface-muted rounded-md filter-section">
          <p className="text-sm text-surface-muted-fg mb-4">
            Generate a comprehensive report of inventory status including stock levels, alerts, and valuation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
            <Select 
              label="Warehouse" 
              value={selectedWarehouse} 
              onChange={e => setSelectedWarehouse(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            >
              <option value="all">All Warehouses</option>
              {(warehouses || []).map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </Select>

            <Select 
              label="Category" 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            >
              <option value="all">All Categories</option>
              {(itemCategoriesInv || []).map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>

            <Select 
              label="Status Filter" 
              value={selectedStatus} 
              onChange={e => setSelectedStatus(e.target.value as StatusFilter)}
            >
              <option value="all">All Status</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="adequate">In Stock</option>
            </Select>

            <Button 
              onClick={handleGenerateReport} 
              disabled={isGenerating || isLoadingPage} 
              className="h-10"
            >
              {isGenerating ? <Spinner size="sm" /> : 'Generate Report'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{totalItems}</p>
              <p className="text-sm text-surface-muted-fg">Total Items</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{outOfStockItems}</p>
              <p className="text-sm text-surface-muted-fg">Out of Stock</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{formatKES(totalValue)}</p>
              <p className="text-sm text-surface-muted-fg">Total Value</p>
            </div>
          </Card>
        </div>

        {isLoadingPage && !isGenerating ? (
          <div className="flex justify-center items-center py-10">
            <Spinner size="lg" />
            <span className="ml-2">Loading initial data...</span>
          </div>
        ) : isGenerating ? (
          <div className="flex justify-center items-center py-10">
            <Spinner />
            <span className="ml-2">Generating report...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-end space-x-2 mb-4 print-hide">
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                Print Report
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportCSV}>
                Export CSV
              </Button>
            </div>
            <DataGrid 
              columns={columns} 
              data={filteredInventoryItems} 
              loading={isGenerating} 
              emptyState="No inventory items found"
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default InventoryStatusReport;
