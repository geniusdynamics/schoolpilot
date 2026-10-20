// ABOUTME: Kitchen Management page - food inventory, kitchen meal plans and cost analysis tabs.
// ABOUTME: Reads foodInventory and kitchenMealPlans from AppDataContext.

import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid } from '@/components/ui/data';

import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import Select from '@/components/ui/Select';
import { PlusIcon, TrashIcon, CubeIcon, CurrencyDollarIcon, ExclamationTriangleIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { FoodItem, KitchenMealPlan, InventoryStatus } from '../data/types';
import { logger } from '@/utils/logging';

export const KitchenManagementPageContent: React.FC = () => {
  // GAP(P1-E05): the canonical registry models no food item and no kitchen meal plan, so
  // the kitchen page keeps reading the legacy collections.
  const { foodInventory, kitchenMealPlans, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'meal-plans' | 'costs'>('inventory');

  const initialFormData: Partial<FoodItem> = {
    name: '',
    category: 'Grains',
    unit: 'kg',
    quantity: 0,
    min_stock_level: 10,
    cost_per_unit: 0,
    supplier: '',
    dietary_suitable: ['None']
  };
  const [formData, setFormData] = useState<Partial<FoodItem>>(initialFormData);

  const allFoodInventory: FoodItem[] = useMemo(() => {
    return foodInventory || [];
  }, [foodInventory]);

  const filteredFoodInventory: FoodItem[] = useMemo(() => {
    let filtered = allFoodInventory;

    if (selectedCategory) {
      filtered = filtered.filter(i => i.category === selectedCategory);
    }

    if (selectedStatus) {
      filtered = filtered.filter(i => i.status === selectedStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(i =>
        (i.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (i.category?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [allFoodInventory, selectedCategory, selectedStatus, searchTerm]);

  const mealPlans: KitchenMealPlan[] = useMemo(() => {
    return kitchenMealPlans || [];
  }, [kitchenMealPlans]);

  const categories = ['Grains', 'Proteins', 'Vegetables', 'Dairy', 'Bakery', 'Fruits', 'Oils', 'Spices'];
  const statuses: InventoryStatus[] = ['In Stock', 'Low Stock', 'Out of Stock'];

  const totals = useMemo(() => {
    return {
      totalItems: filteredFoodInventory.length,
      totalValue: filteredFoodInventory.reduce((sum, item) => sum + (item.total_cost ?? 0), 0),
      lowStock: filteredFoodInventory.filter(i => i.status === 'Low Stock').length,
      outOfStock: filteredFoodInventory.filter(i => i.status === 'Out of Stock').length,
      dailyMealCost: mealPlans.reduce((sum, meal) => sum + meal.total_cost, 0)
    };
  }, [filteredFoodInventory, mealPlans]);

  const openModal = (item?: FoodItem) => {
    setEditingItem(item || null);
    setFormData(item ? {
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      min_stock_level: item.min_stock_level,
      cost_per_unit: item.cost_per_unit,
      supplier: item.supplier,
      dietary_suitable: item.dietary_suitable
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.category) {
      alert('Name and category are required.');
      return;
    }
    logger.info('Saving food item:', formData);
    closeModal();
  };

  const deleteItem = (item: FoodItem) => {
    if (confirm('Are you sure you want to delete this item?')) {
      logger.info('Deleting item:', item.id);
    }
  };

  const getStatusBadge = (status: InventoryStatus) => {
    const styles = {
      'In Stock': 'bg-green-100 text-green-800',
      'Low Stock': 'bg-yellow-100 text-yellow-800',
      'Out of Stock': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  if (loading?.all && filteredFoodInventory.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading kitchen data...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-surface-foreground">School Kitchen Management</h1>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CubeIcon className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Kitchen Operations</h3>
              <p className="text-sm text-orange-700 mt-1">
                Manage food inventory with dietary restrictions tracking, monitor stock levels, 
                and track meal costs. Ensure all students receive appropriate meals based on their dietary needs.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CubeIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Items</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.totalItems}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Inventory Value</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              KES {totals.totalValue.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">Low Stock</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {totals.lowStock}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Out of Stock</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {totals.outOfStock}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CurrencyDollarIcon className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium">Daily Meal Cost</span>
            </div>
            <p className="text-2xl font-bold text-primary-600 mt-2">
              KES {totals.dailyMealCost.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-surface-border">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`pb-2 px-4 font-medium ${activeTab === 'inventory' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-surface-muted-fg'}`}
            >
              <CubeIcon className="w-4 h-4 inline mr-1" />
              Food Inventory
            </button>
            <button
              onClick={() => setActiveTab('meal-plans')}
              className={`pb-2 px-4 font-medium ${activeTab === 'meal-plans' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-surface-muted-fg'}`}
            >
              Meal Plans
            </button>
            <button
              onClick={() => setActiveTab('costs')}
              className={`pb-2 px-4 font-medium ${activeTab === 'costs' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-surface-muted-fg'}`}
            >
              <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
              Cost Analysis
            </button>
          </div>
        </div>

        {activeTab === 'inventory' && (
          <>
            <div className="mb-6 flex justify-between items-center">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-surface-foreground mb-1">Category</label>
                  <Select
                    value={selectedCategory}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
                    className="w-full"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-surface-foreground mb-1">Status</label>
                  <Select
                    value={selectedStatus}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatus(e.target.value)}
                    className="w-full"
                  >
                    <option value="">All Statuses</option>
                    {statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Item, category..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="w-full border border-surface-border rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <Button onClick={() => openModal()} variant="primary">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            <DataGrid
              data={filteredFoodInventory}
              columns={[
                {
                  key: 'name',
                  header: 'Item Name',
                  sortable: true
                },
                {
                  key: 'category',
                  header: 'Category',
                  sortable: true
                },
                {
                  key: 'quantity',
                  header: 'Quantity',
                  sortable: true,
                  render: (value, record) => (
                    <div>
                      <span className="font-semibold">{value} {record.unit}</span>
                      <p className="text-xs text-surface-muted-fg">Min: {record.min_stock_level}</p>
                    </div>
                  )
                },
                {
                  key: 'cost_per_unit',
                  header: 'Cost/Unit',
                  sortable: true,
                  render: (value) => `KES ${value}`
                },
                {
                  key: 'total_cost',
                  header: 'Total Cost',
                  sortable: true,
                  render: (value) => `KES ${Number(value ?? 0).toLocaleString()}`
                },
                {
                  key: 'dietary_suitable',
                  header: 'Dietary',
                  sortable: false,
                  render: (value) => (
                    <div className="flex flex-wrap gap-1">
                      {(value ?? []).slice(0, 2).map((diet: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          {diet}
                        </span>
                      ))}
                      {(value ?? []).length > 2 && <span className="text-xs text-surface-muted-fg">+{value.length - 2}</span>}
                    </div>
                  )
                },
                {
                  key: 'status',
                  header: 'Status',
                  sortable: true,
                  render: (value) => getStatusBadge(value)
                },
                {
                  key: 'expiry_date',
                  header: 'Expiry',
                  sortable: true,
                  render: (value) => value ? new Date(value).toLocaleDateString() : '-'
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  sortable: false,
                  render: (_, record) => (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openModal(record)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => deleteItem(record)}>
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </>
        )}

        {activeTab === 'meal-plans' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-surface-foreground">Weekly Meal Plans</h3>
              <Button size="sm" variant="secondary">
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Meal Plan
              </Button>
            </div>
            <div className="space-y-3">
              {mealPlans.map(meal => (
                <div key={meal.id} className="p-4 border border-surface-border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-surface-foreground">{meal.day} - {meal.meal_type}</h4>
                      </div>
                      <p className="text-sm text-surface-muted-fg mt-1">Menu: {meal.menu_items.join(', ')}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {meal.dietary_options.map((diet, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                            {diet}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-surface-muted-fg mt-2">
                        {meal.total_students} students × KES {meal.estimated_cost_per_student} = KES {meal.total_cost.toLocaleString()}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'costs' && (
          <div>
            <h3 className="text-lg font-semibold text-surface-foreground mb-4">Cost Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-muted border border-surface-border rounded-lg">
                <h4 className="font-semibold text-surface-foreground mb-2">Inventory Value by Category</h4>
                {categories.map(cat => {
                  const catValue = allFoodInventory
                    .filter(i => i.category === cat)
                    .reduce((sum, i) => sum + (i.total_cost ?? 0), 0);
                  return (
                    <div key={cat} className="flex justify-between text-sm py-1">
                      <span>{cat}</span>
                      <span className="font-semibold">KES {catValue.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 bg-surface-muted border border-surface-border rounded-lg">
                <h4 className="font-semibold text-surface-foreground mb-2">Items Requiring Attention</h4>
                <div className="space-y-2">
                  {filteredFoodInventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-surface-card rounded border">
                      <span>{item.name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Item Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingItem ? 'Edit Food Item' : 'Add Food Item'}
      >
        <FormSection>
          <FormField label="Item Name" required>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Item name"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Category" required>
            <Select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Unit" required>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              placeholder="e.g., kg, liters, pieces"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Quantity" required>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              placeholder="Current quantity"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Minimum Stock Level" required>
            <input
              type="number"
              name="min_stock_level"
              value={formData.min_stock_level}
              onChange={handleInputChange}
              placeholder="Alert when below this level"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Cost Per Unit (KES)" required>
            <input
              type="number"
              name="cost_per_unit"
              value={formData.cost_per_unit}
              onChange={handleInputChange}
              placeholder="Cost per unit"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Supplier">
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleInputChange}
              placeholder="Supplier name"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary">
            {editingItem ? 'Update' : 'Add'}
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};
const KitchenManagementPage: React.FC = () => (
  <div className="space-y-6">
    <KitchenManagementPageContent />
  </div>
);

export default KitchenManagementPage;
