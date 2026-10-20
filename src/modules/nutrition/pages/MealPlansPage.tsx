import React, { useState } from 'react';
import { MealPlan } from '@/types';
import { Card, DataGrid, Button, Modal, Input, Textarea, Toast } from '@/components/ui';

import { useNutrition } from '../hooks/useNutrition';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';

type MealPlanFormData = Omit<Partial<MealPlan>, 'id' | 'created_at' | 'updated_at'>;

export const MealPlansPageContent: React.FC = () => {
  const { mealPlans, addMealPlan, updateMealPlan, deleteMealPlan } = useNutrition();
  const { t } = useTranslation('nutrition');
  const confirm = useConfirm();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const initialFormData: MealPlanFormData = { name: '', description: '', cost_per_period: 0 };
  const [formData, setFormData] = useState<MealPlanFormData>(initialFormData);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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

    setSaving(true);
    try {
      if (editingPlan) {
        await updateMealPlan(String(editingPlan.id), payload);
        setToast({ message: `Meal plan "${formData.name}" updated successfully!`, type: 'success' });
      } else {
        await addMealPlan(payload);
        setToast({ message: `Meal plan "${formData.name}" created successfully!`, type: 'success' });
      }
      closeModal();
    } catch {
      setToast({ message: 'Failed to save meal plan. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Delete meal plan', message: 'Are you sure you want to delete this meal plan?', variant: 'danger' })) {
      try {
        await deleteMealPlan(id);
        setToast({ message: 'Meal plan deleted successfully!', type: 'success' });
      } catch {
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
    
    if (await confirm({ title: 'Delete meal plans', message: `Are you sure you want to delete ${selectedRows.length} meal plan(s)?`, variant: 'danger' })) {
      try {
        for (const id of selectedRows) {
          await deleteMealPlan(id);
        }
        setToast({ message: `${selectedRows.length} meal plan(s) deleted successfully!`, type: 'success' });
        setSelectedRows([]);
      } catch {
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
      sortable: true
    },
    { 
      key: 'description', 
      header: 'Description', 
      render: (_v: any, item: MealPlan) => <p className="truncate max-w-xs">{item.description || '-'}</p>
    },
    { 
      key: 'cost_per_period', 
      header: 'Cost per Period (KES)', 
      render: (_v: any, item: MealPlan) => item.cost_per_period?.toFixed(2) || '0.00',
      sortable: true,
      align: 'right' as const
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_v: any, item: MealPlan) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(String(item.id))} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
      width: 200
    },
  ];

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
        <p className="text-sm text-surface-muted-fg mb-4">
          {t('mealPlans.managementDescription')}
        </p>
        <DataGrid 
          columns={columns} 
          data={mealPlans} 
          selectable
          onSelectionChange={(rows) => setSelectedRows(rows.map(r => String(r.id)))}
          sortable
          pagination={{ pageSize: 10 }}
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
            <Button onClick={handleSubmit} loading={saving}>
              {editingPlan ? t('mealPlans.saveChanges') : t('mealPlans.addPlan')}
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
const MealPlansPage: React.FC = () => (
  <div className="space-y-6">
    <MealPlansPageContent />
  </div>
);

export default MealPlansPage;
