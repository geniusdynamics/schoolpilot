
import React, { useState } from 'react';
import { Menu, MealType } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, CakeIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';

type MenuFormData = Omit<Partial<Menu>, 'id' | 'created_at' | 'updated_at' | 'meal_type'> & {
    meal_type: MealType;
};

const MenusPage: React.FC = () => {
  const { menus, loading, addMenu, updateMenu, deleteMenu } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const initialFormData: MenuFormData = { 
    menu_date: new Date().toISOString().split('T')[0], 
    meal_type: MealType.LUNCH, 
    description: '' 
  };
  const [formData, setFormData] = useState<MenuFormData>(initialFormData);

  const openModal = (menu?: Menu) => {
    setEditingMenu(menu || null);
    setFormData(menu ? 
      { menu_date: menu.menu_date, meal_type: menu.meal_type, description: menu.description } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMenu(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.menu_date || !formData.meal_type || !formData.description) {
      alert("Menu Date, Meal Type, and Description are required.");
      return;
    }
    const payload: Omit<Menu, 'id' | 'created_at' | 'updated_at'> = {
      menu_date: formData.menu_date!,
      meal_type: formData.meal_type,
      description: formData.description!,
    };

    if (editingMenu) {
      await updateMenu({ ...editingMenu, ...payload });
    } else {
      await addMenu(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this menu? This might affect consumption logs.')) {
      await deleteMenu(id);
    }
  };

  const columns = [
    { header: 'Date', accessor: 'menu_date' as keyof Menu, render: (item: Menu) => new Date(item.menu_date).toLocaleDateString() },
    { header: 'Meal Type', accessor: 'meal_type' as keyof Menu },
    { header: 'Description / Items', accessor: 'description' as keyof Menu, render: (item:Menu) => <p className="max-w-md truncate">{item.description}</p> },
    {
      header: 'Actions',
      accessor: 'id' as keyof Menu,
      render: (item: Menu) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.menus && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Menus...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Daily/Weekly Menus Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Menu
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Create and manage menus for different meal types on specific dates.
        </p>
        <Table columns={columns} data={menus} isLoading={loading.menus && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMenu ? 'Edit Menu' : 'Add New Menu'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.menus}>
              {loading.menus ? <Spinner size="sm"/> : (editingMenu ? 'Save Changes' : 'Add Menu')}
            </Button>
          </>
        }
      >
        <Input 
          name="menu_date" 
          label="Menu Date" 
          type="date"
          value={formData.menu_date || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Select 
          name="meal_type" 
          label="Meal Type" 
          value={formData.meal_type} 
          onChange={handleInputChange}
          required
        >
          {Object.values(MealType).map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
        <Textarea 
          name="description" 
          label="Menu Description / Items" 
          value={formData.description || ''} 
          onChange={handleInputChange} 
          rows={4}
          required 
          placeholder="e.g., Rice, Beef Stew, Cabbage, and a Banana"
        />
      </Modal>
    </div>
  );
};

export default MenusPage;
