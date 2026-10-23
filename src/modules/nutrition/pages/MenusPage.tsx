import React, { useState, useCallback, useMemo } from 'react';
import { Menu, MealType } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, CakeIcon } from '@/components/ui/icons';
import { useNutrition } from '../hooks/useNutrition';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/components/ui/ConfirmDialog';

type MenuFormData = Omit<Partial<Menu>, 'id' | 'created_at' | 'updated_at' | 'meal_type'> & {
    meal_type: MealType;
};

export const MenusPageContent: React.FC = () => {
  const { menus, addMenu, updateMenu, deleteMenu } = useNutrition();
  const { t } = useTranslation('nutrition');
  const confirm = useConfirm();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const initialFormData: MenuFormData = useMemo(() => ({ 
    menu_date: new Date().toISOString().split('T')[0], 
    meal_type: MealType.LUNCH, 
    description: '' 
  }), []);
  const [formData, setFormData] = useState<MenuFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const openModal = useCallback((menu?: Menu) => {
    setEditingMenu(menu || null);
    setFormData(menu ? 
      { menu_date: menu.menu_date, meal_type: menu.meal_type, description: menu.description } : 
      initialFormData
    );
    setIsModalOpen(true);
  }, [initialFormData]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingMenu(null);
    setFormData(initialFormData);
  }, [initialFormData]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.menu_date || !formData.meal_type || !formData.description) {
      alert("Menu Date, Meal Type, and Description are required.");
      return;
    }
    const payload: Omit<Menu, 'id' | 'created_at' | 'updated_at'> = {
      menu_date: formData.menu_date!,
      meal_type: formData.meal_type,
      description: formData.description!,
    };

    setSaving(true);
    try {
      if (editingMenu) {
        await updateMenu(String(editingMenu.id), payload);
      } else {
        await addMenu(payload);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  }, [formData, editingMenu, updateMenu, addMenu, closeModal]);

  const handleDelete = useCallback(async (id: string) => {
    if (await confirm({ title: 'Delete menu', message: 'Are you sure you want to delete this menu? This might affect consumption logs.', variant: 'danger' })) {
      await deleteMenu(id);
    }
  }, [confirm, deleteMenu]);

  const columns: DataGridColumn<Menu>[] = useMemo(() => [
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
          <Button size="sm" variant="danger" onClick={() => handleDelete(String(row.id))} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ], [openModal, handleDelete]);

  return (
    <div className="space-y-3">
      <Card title={t('menus.management.title')} info={t('menus.management.description')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('menus.add.button')}
        </Button>
      }>
        <DataGrid 
          columns={columns} 
          data={menus || []} 
          sortable
          filterable
          emptyState={{
            icon: <CakeIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No menus found",
            description: "Create meal menus to plan and track student nutrition throughout the academic period.",
            action: {
              label: "Add Menu",
              onClick: () => openModal()
            }
          }}
        />
      </Card>

      <DialogForm 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingMenu ? t('menus.edit.title') : t('menus.add.title')} 
        size="lg"
        onSubmit={handleSubmit}
      >
        <FormSection>
          <FormField>
            <Input 
              name="menu_date" 
              label={t('menus.date.label')} 
              type="date"
              value={formData.menu_date || ''} 
              onChange={handleInputChange} 
              required 
            />
          </FormField>
          <FormField>
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
          </FormField>
          <FormField>
            <Textarea 
              name="description" 
              label={t('menus.description.label')} 
              value={formData.description || ''} 
              onChange={handleInputChange} 
              rows={4}
              required 
              placeholder={t('menus.description.placeholder')}
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>{t('menus.cancel.button')}</Button>
          <Button type="submit" loading={saving}>
            {editingMenu ? t('menus.save.button') : t('menus.add.button')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};
const MenusPage: React.FC = () => (
  <div className="space-y-3">
    <MenusPageContent />
  </div>
);

export default MenusPage;
