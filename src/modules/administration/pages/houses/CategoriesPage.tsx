import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Spinner from '@/components/ui/Spinner';
import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '@/components/ui/icons';
import { useHousesData } from '../../data/houses/useHousesData';
import { useTranslation } from 'react-i18next';
import type { PointCategory } from '../../data/houses/types';
import { TransactionType } from '../../data/houses/types';

interface CategoryFormData {
  name: string;
  type: TransactionType;
  defaultPoints: number;
  description: string;
  requiresApproval: boolean;
  evidenceRequired: boolean;
  maxDailyAwards: number | undefined;
  isActive: boolean;
}

const CategoriesPage: React.FC = () => {
  const { t } = useTranslation('houses');
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useHousesData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PointCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<PointCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initialFormData: CategoryFormData = {
    name: '',
    type: TransactionType.MERIT,
    defaultPoints: 5,
    description: '',
    requiresApproval: false,
    evidenceRequired: false,
    maxDailyAwards: undefined,
    isActive: true,
  };

  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (category: PointCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      defaultPoints: category.defaultPoints,
      description: category.description || '',
      requiresApproval: category.requiresApproval,
      evidenceRequired: category.evidenceRequired,
      maxDailyAwards: category.maxDailyAwards,
      isActive: category.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type: inputType } = e.target;
    if (inputType === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'defaultPoints' || name === 'maxDailyAwards') {
      const numValue = value === '' ? undefined : Number(value);
      setFormData(prev => ({ ...prev, [name]: name === 'defaultPoints' ? (numValue || 0) : numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        defaultPoints: formData.defaultPoints,
        description: formData.description,
        requiresApproval: formData.requiresApproval,
        evidenceRequired: formData.evidenceRequired,
        maxDailyAwards: formData.maxDailyAwards,
        isActive: formData.isActive,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
      } else {
        await createCategory(payload);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (category: PointCategory) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (categoryToDelete) {
      try {
        await deleteCategory(categoryToDelete.id);
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
    setIsDeleteModalOpen(false);
    setCategoryToDelete(null);
  };

  const columns: DataGridColumn<PointCategory>[] = [
    {
      key: 'name',
      header: t('categories.fields.name'),
      sortable: true,
      filterable: true,
      width: 220,
      render: (value, item) => (
        <div>
          <span className="font-medium">{value}</span>
          {!item.isActive && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
              Inactive
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: t('categories.fields.type'),
      sortable: true,
      filterable: true,
      width: 120,
      render: (value: TransactionType) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === TransactionType.MERIT
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {value === TransactionType.MERIT ? t('categories.types.merit') : t('categories.types.demerit')}
        </span>
      ),
    },
    {
      key: 'defaultPoints',
      header: t('categories.fields.defaultPoints'),
      sortable: true,
      filterable: false,
      width: 120,
      align: 'center',
      render: (value: number, item) => (
        <span className={`font-semibold ${item.type === TransactionType.DEMERIT ? 'text-red-600' : 'text-green-600'}`}>
          {item.type === TransactionType.DEMERIT ? '-' : '+'}{Math.abs(value)}
        </span>
      ),
    },
    {
      key: 'description',
      header: t('categories.fields.description'),
      sortable: false,
      filterable: true,
      width: 250,
      render: (value) => value || '-',
    },
    {
      key: 'requiresApproval',
      header: t('categories.fields.requiresApproval'),
      sortable: true,
      filterable: true,
      width: 140,
      align: 'center',
    },
    {
      key: 'evidenceRequired',
      header: t('categories.fields.evidenceRequired'),
      sortable: true,
      filterable: true,
      width: 140,
      align: 'center',
    },
    {
      key: 'actions',
      header: t('common.actions'),
      sortable: false,
      filterable: false,
      width: 160,
      sticky: 'right',
      render: (_, item) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEditModal(item)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            {t('common.edit')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(item)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            {t('common.delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('categories.title')}
        subtitle="Manage merit and demerit point categories"
        actions={
          <Button onClick={openCreateModal} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('categories.create')}
          </Button>
        }
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <DataGrid
            columns={columns}
            data={categories}
            sortable
            filterable
            emptyState={
              <div className="text-center py-12">
                <ListBulletIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {t('common.noData')}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a point category.
                </p>
                <div className="mt-6">
                  <Button onClick={openCreateModal} leftIcon={<PlusIcon className="w-4 h-4" />}>
                    {t('categories.create')}
                  </Button>
                </div>
              </div>
            }
          />
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? t('categories.edit') : t('categories.create')}
        size="lg"
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <FormSection columns={2}>
          <FormField label={t('categories.fields.name')} required>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label={t('categories.fields.type')} required>
            <Select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
            >
              <option value={TransactionType.MERIT}>{t('categories.types.merit')}</option>
              <option value={TransactionType.DEMERIT}>{t('categories.types.demerit')}</option>
            </Select>
          </FormField>
          <FormField label={t('categories.fields.defaultPoints')} required>
            <Input
              name="defaultPoints"
              type="number"
              min="0"
              value={formData.defaultPoints}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label={t('categories.fields.maxDailyAwards')}>
            <Input
              name="maxDailyAwards"
              type="number"
              min="0"
              value={formData.maxDailyAwards ?? ''}
              onChange={handleInputChange}
              placeholder="No limit"
            />
          </FormField>
        </FormSection>
        <FormSection>
          <FormField label={t('categories.fields.description')}>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={2}
            />
          </FormField>
        </FormSection>
        <FormSection columns={2}>
          <FormField label={t('categories.fields.requiresApproval')}>
            <div className="flex items-center mt-1">
              <input
                type="checkbox"
                name="requiresApproval"
                checked={formData.requiresApproval}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label className="ml-2 text-sm text-gray-700">
                Require approval before points are applied
              </label>
            </div>
          </FormField>
          <FormField label={t('categories.fields.evidenceRequired')}>
            <div className="flex items-center mt-1">
              <input
                type="checkbox"
                name="evidenceRequired"
                checked={formData.evidenceRequired}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label className="ml-2 text-sm text-gray-700">
                Evidence attachment required
              </label>
            </div>
          </FormField>
          <FormField label={t('categories.fields.isActive')}>
            <div className="flex items-center mt-1">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label className="ml-2 text-sm text-gray-700">
                Category is active and available for use
              </label>
            </div>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {editingCategory ? t('common.save') : t('common.create')}
          </Button>
        </FormActions>
      </DialogForm>

      {/* Delete Confirmation Dialog */}
      <DialogForm
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('common.delete')}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete the category
          {categoryToDelete && (
            <span className="font-semibold"> "{categoryToDelete.name}"</span>
          )}
          ? This action cannot be undone.
        </p>
        <FormActions>
          <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            {t('common.delete')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default CategoriesPage;
