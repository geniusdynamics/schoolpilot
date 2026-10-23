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
import { PlusIcon, EditIcon, DeleteIcon, StarIcon } from '@/components/ui/icons';
import { useHousesData } from '../../data/houses/useHousesData';
import { useTranslation } from 'react-i18next';
import type { House } from '../../data/houses/types';
import { logger } from '@/utils/logging';


interface HouseFormData {
  name: string;
  description: string;
  color: string;
  motto: string;
  patronTeacherId: string;
  patronTeacherName: string;
  captainId: string;
  captainName: string;
  viceCaptainId: string;
  viceCaptainName: string;
}

const HOUSE_COLORS = [
  { value: '#6366f1', label: 'Blue' },
  { value: '#EF4444', label: 'Red' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#F97316', label: 'Orange' },
];

const HousesPage: React.FC = () => {
  const { t } = useTranslation('houses');
  const { houses, loading, createHouse, updateHouse, deleteHouse } = useHousesData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [houseToDelete, setHouseToDelete] = useState<House | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initialFormData: HouseFormData = {
    name: '',
    description: '',
    color: '#6366f1',
    motto: '',
    patronTeacherId: '',
    patronTeacherName: '',
    captainId: '',
    captainName: '',
    viceCaptainId: '',
    viceCaptainName: '',
  };

  const [formData, setFormData] = useState<HouseFormData>(initialFormData);

  const openCreateModal = () => {
    setEditingHouse(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (house: House) => {
    setEditingHouse(house);
    setFormData({
      name: house.name,
      description: house.description || '',
      color: house.color,
      motto: house.motto || '',
      patronTeacherId: house.patronTeacherId || '',
      patronTeacherName: house.patronTeacherName || '',
      captainId: house.captainId || '',
      captainName: house.captainName || '',
      viceCaptainId: house.viceCaptainId || '',
      viceCaptainName: house.viceCaptainName || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHouse(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.color) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        motto: formData.motto,
        patronTeacherId: formData.patronTeacherId || undefined,
        patronTeacherName: formData.patronTeacherName || undefined,
        captainId: formData.captainId || undefined,
        captainName: formData.captainName || undefined,
        viceCaptainId: formData.viceCaptainId || undefined,
        viceCaptainName: formData.viceCaptainName || undefined,
      };

      if (editingHouse) {
        await updateHouse(editingHouse.id, payload);
      } else {
        await createHouse(payload);
      }
      closeModal();
    } catch (error) {
      logger.error('Failed to save house:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (house: House) => {
    setHouseToDelete(house);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (houseToDelete) {
      try {
        await deleteHouse(houseToDelete.id);
      } catch (error) {
        logger.error('Failed to delete house:', error);
      }
    }
    setIsDeleteModalOpen(false);
    setHouseToDelete(null);
  };

  const columns: DataGridColumn<House>[] = [
    {
      key: 'name',
      header: t('houses.fields.name'),
      sortable: true,
      filterable: true,
      width: 180,
      render: (value, item) => (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border border-surface-border"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'motto',
      header: t('houses.fields.motto'),
      sortable: true,
      filterable: true,
      width: 220,
      render: (value) => value || '-',
    },
    {
      key: 'patronTeacherName',
      header: t('houses.fields.patronTeacher'),
      sortable: true,
      filterable: true,
      width: 180,
      render: (value) => value || '-',
    },
    {
      key: 'captainName',
      header: t('houses.fields.captain'),
      sortable: true,
      filterable: true,
      width: 160,
      render: (value) => value || '-',
    },
    {
      key: 'memberCount',
      header: t('houses.fields.memberCount'),
      sortable: true,
      filterable: false,
      width: 100,
      align: 'center',
    },
    {
      key: 'totalPoints',
      header: t('houses.fields.totalPoints'),
      sortable: true,
      filterable: false,
      width: 120,
      align: 'center',
      render: (value: number) => (
        <span className="font-semibold text-indigo-600">{value}</span>
      ),
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
    <div className="space-y-3">
      <Card
        title={t('houses.title')}
        info={t('description')}
        actions={
          <Button onClick={openCreateModal} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('houses.create')}
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
            data={houses}
            sortable
            filterable
            emptyState={
              <div className="text-center py-12">
                <StarIcon className="mx-auto h-12 w-12 text-surface-muted-fg" />
                <h3 className="mt-2 text-sm font-medium text-surface-foreground">
                  {t('common.noData')}
                </h3>
                <p className="mt-1 text-sm text-surface-muted-fg">
                  {t('houses.messages.createSuccess')}
                </p>
                <div className="mt-6">
                  <Button onClick={openCreateModal} leftIcon={<PlusIcon className="w-4 h-4" />}>
                    {t('houses.create')}
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
        title={editingHouse ? t('houses.edit') : t('houses.create')}
        size="lg"
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <FormSection columns={2}>
          <FormField label={t('houses.fields.name')} required>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label={t('houses.fields.color')} required>
            <Select
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              required
            >
              {HOUSE_COLORS.map(color => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('houses.fields.motto')}>
            <Input
              name="motto"
              value={formData.motto}
              onChange={handleInputChange}
            />
          </FormField>
          <FormField label={t('houses.fields.patronTeacher')}>
            <Input
              name="patronTeacherName"
              value={formData.patronTeacherName}
              onChange={handleInputChange}
            />
          </FormField>
          <FormField label={t('houses.fields.captain')}>
            <Input
              name="captainName"
              value={formData.captainName}
              onChange={handleInputChange}
            />
          </FormField>
          <FormField label={t('houses.fields.viceCaptain')}>
            <Input
              name="viceCaptainName"
              value={formData.viceCaptainName}
              onChange={handleInputChange}
            />
          </FormField>
        </FormSection>
        <FormSection>
          <FormField label={t('houses.fields.description')}>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {editingHouse ? t('common.save') : t('common.create')}
          </Button>
        </FormActions>
      </DialogForm>

      {/* Delete Confirmation Dialog */}
      <DialogForm
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('houses.delete')}
        size="sm"
      >
        <p className="text-sm text-surface-muted-fg">
          {t('houses.messages.deleteConfirm')}
          {houseToDelete && (
            <span className="font-semibold"> "{houseToDelete.name}"</span>
          )}
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

export default HousesPage;
