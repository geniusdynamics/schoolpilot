import React, { useState } from 'react';
import { Menu, MealType } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, CakeIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type MenuFormData = Omit<Partial<Menu>, 'id' | 'created_at' | 'updated_at' | 'meal_type'> & {
    meal_type: MealType;
};

const MenusPage: React.FC = () => {
  const { menus, loading, addMenu, updateMenu, deleteMenu } = useAppData();
  const { t } = useTranslation('nutrition');
  
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

  const columns: DataGridColumn<Menu>[] = [
    { 
      key: 'menu_date', 
      header: 'Date', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => new Date(row.menu_date).toLocaleDateString()
    },
    { 
      key: 'meal_type', 
      header: 'Meal Type', 
      sortable: true, 
      filterable: true, 
      width: 120
    },
    { 
      key: 'description', 
      header: 'Description / Items', 
      sortable: true, 
      filterable: true, 
      width: 300,
      render: (value, row) => <p className="max-w-md truncate">{row.description}</p>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
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
      <Card title={t('menus.management.title')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('menus.add.button')}
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          {t('menus.management.description')}
        </p>
        <DataGrid 
          columns={columns} 
          data={menus || []} 
          isLoading={loading.menus && isModalOpen}
          sortable
          filterable
          emptyState={{
            icon: <CakeIcon className="w-12 h-12 text-gray-400" />,
            title: "No menus found",
            description: "Create meal menus to plan and track student nutrition throughout the academic period.",
            action: {
              label: "Add Menu",
              onClick: () => openModal()
            }
          }}
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMenu ? t('menus.edit.title') : t('menus.add.title')} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('menus.cancel.button')}</Button>
            <Button onClick={handleSubmit} disabled={loading.menus}>
              {loading.menus ? <Spinner size="sm"/> : (editingMenu ? t('menus.save.button') : t('menus.add.button'))}
            </Button>
          </>
        }
      >
        <Input 
          name="menu_date" 
          label={t('menus.date.label')} 
          type="date"
          value={formData.menu_date || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Select 
          name="meal_type" 
          label={t('menus.mealType.label')} 
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
          label={t('menus.description.label')} 
          value={formData.description || ''} 
          onChange={handleInputChange} 
          rows={4}
          required 
          placeholder={t('menus.description.placeholder')}
        />
      </Modal>
    </div>
  );
};

export default MenusPage;
