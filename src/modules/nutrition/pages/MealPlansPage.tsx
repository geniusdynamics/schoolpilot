import React, { useState } from 'react';
import { MealPlan } from '@/types';
import { Card, DataGrid, Button, Modal, Input, Textarea, Toast, Spinner } from '@/components/ui';
import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import { useTranslation } from 'react-i18next';

type MealPlanFormData = Omit<Partial<MealPlan>, 'id' | 'created_at' | 'updated_at'>;

const MealPlansPage: React.FC = () => {
  const { mealPlans, loading, addMealPlan, updateMealPlan, deleteMealPlan } = useAppData();
  const { t } = useTranslation('nutrition');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const initialFormData: MealPlanFormData = { name: '', description: '', cost_per_period: 0 };
  const [formData, setFormData] = useState<MealPlanFormData>(initialFormData);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const openModal = (plan?: MealPlan) => {
    setEditingPlan(plan || null);
    setFormData(plan ? 
      { name: plan.name, description: plan.description, cost_per_period: plan.cost_per_period } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'cost_per_period' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      setToast({ message: "Meal plan name is required.", type: 'error' });
      return;
    }
    const payload: Omit<MealPlan, 'id' | 'created_at' | 'updated_at'> = {
      name: formData.name!,
      description: formData.description || undefined,
      cost_per_period: Number(formData.cost_per_period) || 0, // Default to 0 if undefined/NaN
    };

    try {
      if (editingPlan) {
        await updateMealPlan({ ...editingPlan, ...payload });
        setToast({ message: `Meal plan "${formData.name}" updated successfully!`, type: 'success' });
      } else {
        await addMealPlan(payload);
        setToast({ message: `Meal plan "${formData.name}" created successfully!`, type: 'success' });
      }
      closeModal();
    } catch (error) {
      setToast({ message: 'Failed to save meal plan. Please try again.', type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this meal plan?')) {
      try {
        await deleteMealPlan(id);
        setToast({ message: 'Meal plan deleted successfully!', type: 'success' });
      } catch (error) {
        setToast({ message: 'Failed to delete meal plan. Please try again.', type: 'error' });
      }
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) {
      setToast({ message: 'Please select meal plans to delete.', type: 'info' });
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${selectedRows.length} meal plan(s)?`)) {
      try {
        for (const id of selectedRows) {
          await deleteMealPlan(parseInt(id));
        }
        setToast({ message: `${selectedRows.length} meal plan(s) deleted successfully!`, type: 'success' });
        setSelectedRows([]);
      } catch (error) {
        setToast({ message: 'Failed to delete some meal plans. Please try again.', type: 'error' });
      }
    }
  };

  const columns = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true,
      width: 80
    },
    { 
      key: 'name', 
      header: 'Plan Name', 
      sortable: true,
      searchable: true
    },
    { 
      key: 'description', 
      header: 'Description', 
      render: (item: MealPlan) => <p className="truncate max-w-xs">{item.description || '-'}</p>,
      searchable: true
    },
    { 
      key: 'cost_per_period', 
      header: 'Cost per Period (KES)', 
      render: (item: MealPlan) => item.cost_per_period?.toFixed(2) || '0.00',
      sortable: true,
      align: 'right' as const
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: MealPlan) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
      width: 200
    },
  ];

  if (loading.mealPlans && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Meal Plans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('mealPlans.managementTitle')} actions={
        <div className="flex space-x-2">
          {selectedRows.length > 0 && (
            <Button 
              variant="danger" 
              onClick={handleBulkDelete}
              leftIcon={<DeleteIcon className="w-4 h-4" />}
            >
              Delete Selected ({selectedRows.length})
            </Button>
          )}
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('mealPlans.addMealPlan')}
          </Button>
        </div>
      }>
        <p className="text-sm text-gray-600 mb-4">
          {t('mealPlans.managementDescription')}
        </p>
        <DataGrid 
          columns={columns} 
          data={mealPlans} 
          loading={loading.mealPlans && isModalOpen}
          selectable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          searchable
          sortable
          pagination
          pageSize={10}
        />
      </Card>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPlan ? t('mealPlans.editMealPlan') : t('mealPlans.addNewMealPlan')} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('mealPlans.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading.mealPlans}>
              {loading.mealPlans ? <Spinner size="sm"/> : (editingPlan ? t('mealPlans.saveChanges') : t('mealPlans.addPlan'))}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label={t('mealPlans.planName')} 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Textarea 
          name="description" 
          label={t('mealPlans.description')} 
          value={formData.description || ''} 
          onChange={handleInputChange} 
          rows={3}
        />
        <Input 
          name="cost_per_period" 
          label={t('mealPlans.costPerPeriod')} 
          type="number" 
          step="0.01"
          value={formData.cost_per_period || ''} 
          onChange={handleInputChange} 
        />
      </Modal>
    </div>
  );
};

export default MealPlansPage;
