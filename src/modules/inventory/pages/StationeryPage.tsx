import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { PencilIcon, PlusIcon, TrashIcon, CubeIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { StationeryItem } from '../data/types';

const StationeryPage: React.FC = () => {
  const { t } = useTranslation('inventory');
  const { stationeryItems, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StationeryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const initialFormData: Partial<StationeryItem> = {
    name: '',
    category: 'Paper',
    description: '',
    unit: 'Pieces',
    quantity: 0,
    min_stock_level: 10,
    allocated_to: '',
    department: ''
  };
  const [formData, setFormData] = useState<Partial<StationeryItem>>(initialFormData);

  const allStationeryItems: StationeryItem[] = useMemo(() => {
    return stationeryItems || [];
  }, [stationeryItems]);

  const filteredStationery: StationeryItem[] = useMemo(() => {
    let filtered = allStationeryItems;

    if (selectedCategory) {
      filtered = filtered.filter(i => i.category === selectedCategory);
    }

    if (selectedStatus) {
      filtered = filtered.filter(i => i.status === selectedStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.department && i.department.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [allStationeryItems, selectedCategory, selectedStatus, searchTerm]);

  const openModal = (item?: StationeryItem) => {
    setEditingItem(item || null);
    setFormData(item ? {
      name: item.name,
      category: item.category,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      min_stock_level: item.min_stock_level,
      allocated_to: item.allocated_to,
      department: item.department
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
    console.log('Saving stationery item:', formData);
    closeModal();
  };

  const deleteItem = (item: StationeryItem) => {
    if (confirm('Are you sure you want to delete this item?')) {
      console.log('Deleting item:', item.id);
    }
  };

  const getCategoryBadge = (category: StationeryCategory) => {
    const styles = {
      'Paper': 'bg-blue-100 text-blue-800',
      'Pens': 'bg-green-100 text-green-800',
      'Notebooks': 'bg-yellow-100 text-yellow-800',
      'Files': 'bg-purple-100 text-purple-800',
      'Art Supplies': 'bg-pink-100 text-pink-800',
      'Office Supplies': 'bg-gray-100 text-gray-800',
      'Other': 'bg-orange-100 text-orange-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category]}`}>
        {category}
      </span>
    );
  };

  const getStatusBadge = (status: AllocationStatus) => {
    const styles = {
      'Available': 'bg-green-100 text-green-800',
      'Allocated': 'bg-blue-100 text-blue-800',
      'Low Stock': 'bg-yellow-100 text-yellow-800',
      'Out of Stock': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const categories: StationeryCategory[] = ['Paper', 'Pens', 'Notebooks', 'Files', 'Art Supplies', 'Office Supplies', 'Other'];
  const statuses: AllocationStatus[] = ['Available', 'Allocated', 'Low Stock', 'Out of Stock'];
  const departments = ['Administration', 'Academics', 'Finance', 'HR', 'Library', 'Sports'];

  const totals = useMemo(() => {
    return {
      total: mockStationery.length,
      available: mockStationery.filter(i => i.status === 'Available').length,
      lowStock: mockStationery.filter(i => i.status === 'Low Stock').length,
      outOfStock: mockStationery.filter(i => i.status === 'Out of Stock').length
    };
  }, [mockStationery]);

  if (loading && mockStationery.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading stationery...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Stationery Supply Management</h1>
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CubeIcon className="w-5 h-5 text-teal-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-teal-800">Department-wise Stationery Allocation</h3>
              <p className="text-sm text-teal-700 mt-1">
                Manage stationery supplies with department-wise allocation, consumable tracking, 
                and low stock alerts. Monitor inventory levels and restock as needed.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CubeIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Items</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CubeIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Available</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.available}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CubeIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">Low Stock</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {totals.lowStock}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CubeIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Out of Stock</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {totals.outOfStock}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Item, description, department..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={filteredStationery}
          columns={[
            {
              key: 'name',
              header: 'Item Name',
              sortable: true,
              filterable: true
            },
            {
              key: 'category',
              header: 'Category',
              sortable: true,
              render: (value) => getCategoryBadge(value)
            },
            {
              key: 'description',
              header: 'Description',
              sortable: false
            },
            {
              key: 'quantity',
              header: 'Quantity',
              sortable: true,
              render: (value, record) => (
                <div>
                  <span className="font-semibold">{value} {record.unit}</span>
                  <p className="text-xs text-gray-500">Min: {record.min_stock_level}</p>
                </div>
              )
            },
            {
              key: 'department',
              header: 'Department',
              sortable: true,
              render: (value) => value || '-'
            },
            {
              key: 'allocated_to',
              header: 'Allocated To',
              sortable: true,
              render: (value) => value || '-'
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (value) => getStatusBadge(value)
            },
            {
              key: 'last_restocked',
              header: 'Last Restocked',
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
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => deleteItem(record)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Add/Edit Item Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingItem ? 'Edit Stationery Item' : 'Add Stationery Item'}
      >
        <FormSection>
          <FormField label="Item Name" required>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Item name"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Category" required>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Description">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Item description"
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Unit" required>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              placeholder="e.g., Pieces, Packs, Reams"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Quantity" required>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              placeholder="Current quantity"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Minimum Stock Level" required>
            <input
              type="number"
              name="min_stock_level"
              value={formData.min_stock_level}
              onChange={handleInputChange}
              placeholder="Alert when below this level"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Department">
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Allocated To">
            <input
              type="text"
              name="allocated_to"
              value={formData.allocated_to}
              onChange={handleInputChange}
              placeholder="Who is this allocated to"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
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

export default StationeryPage;
