import React, { useState } from 'react';
import { Designation } from '@/types'; // Designation is a core type
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon, IdentificationIcon } from '@/components/ui/icons';
import { useDesignationData } from '@/modules/administration/data/useDesignationData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type DesignationFormData = Omit<Partial<Designation>, 'id' | 'created_at' | 'updated_at'>;

const DesignationsPage: React.FC = () => {
  const { designations, loading, addDesignation, updateDesignation, deleteDesignation } = useDesignationData();
  const { t } = useTranslation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const initialFormData: DesignationFormData = { title: '' };
  const [formData, setFormData] = useState<DesignationFormData>(initialFormData);

  const openModal = (desig?: Designation) => {
    setEditingDesignation(desig || null);
    setFormData(desig ? { title: desig.title } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDesignation(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      alert("Designation title is required.");
      return;
    }
    const payload = {
      title: formData.title!,
    };

    if (editingDesignation) {
      await updateDesignation({ ...editingDesignation, ...payload });
    } else {
      await addDesignation(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this designation?')) {
      await deleteDesignation(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof Designation },
    { header: 'Designation Title', accessor: 'title' as keyof Designation },
    {
      header: 'Actions',
      accessor: 'id' as keyof Designation,
      render: (item: Designation) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.designations && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Designations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('designations.management')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('designations.addDesignation')}
        </Button>
      }>
        <Table columns={columns} data={designations} isLoading={loading.designations && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingDesignation ? t('designations.editDesignation') : t('designations.addNewDesignation')}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('designations.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading.designations}>
               {loading.designations ? <Spinner size="sm"/> : (editingDesignation ? t('designations.saveChanges') : t('designations.addDesignation'))}
            </Button>
          </>
        }
      >
        <Input 
          name="title" 
          label={t('designations.designationTitle')} 
          value={formData.title || ''} 
          onChange={handleInputChange} 
          required 
        />
      </Modal>
    </div>
  );
};

export default DesignationsPage;
