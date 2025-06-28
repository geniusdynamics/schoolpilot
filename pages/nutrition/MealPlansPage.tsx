
import React, { useState } from 'react';
import { MealPlan } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';

type MealPlanFormData = Omit<Partial<MealPlan>, 'id' | 'created_at' | 'updated_at'>;

const MealPlansPage: React.FC = () => {
  const { mealPlans, loading, addMealPlan, updateMealPlan, deleteMealPlan } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const initialFormData: MealPlanFormData = { name: '', description: '', cost_per_period: 0 };
  const [formData, setFormData] = useState<MealPlanFormData>(initialFormData);

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
      alert("Meal plan name is required.");
      return;
    }
    const payload: Omit<MealPlan, 'id' | 'created_at' | 'updated_at'> = {
      name: formData.name!,
      description: formData.description || undefined,
      cost_per_period: Number(formData.cost_per_period) || 0, // Default to 0 if undefined/NaN
    };

    if (editingPlan) {
      await updateMealPlan({ ...editingPlan, ...payload });
    } else {
      await addMealPlan(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this meal plan?')) {
      await deleteMealPlan(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof MealPlan },
    { header: 'Plan Name', accessor: 'name' as keyof MealPlan },
    { header: 'Description', accessor: 'description' as keyof MealPlan, render: (item: MealPlan) => <p className="truncate max-w-xs">{item.description || '-'}</p> },
    { header: 'Cost per Period (KES)', accessor: 'cost_per_period' as keyof MealPlan, render: (item: MealPlan) => item.cost_per_period?.toFixed(2) || '0.00' },
    {
      header: 'Actions',
      accessor: 'id' as keyof MealPlan,
      render: (item: MealPlan) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
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
      <Card title="Meal Plans Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Meal Plan
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Define and manage meal plans offered by the school.
        </p>
        <Table columns={columns} data={mealPlans} isLoading={loading.mealPlans && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPlan ? 'Edit Meal Plan' : 'Add New Meal Plan'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.mealPlans}>
              {loading.mealPlans ? <Spinner size="sm"/> : (editingPlan ? 'Save Changes' : 'Add Plan')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Plan Name" 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Textarea 
          name="description" 
          label="Description (Optional)" 
          value={formData.description || ''} 
          onChange={handleInputChange} 
          rows={3}
        />
        <Input 
          name="cost_per_period" 
          label="Cost per Period (KES)" 
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
