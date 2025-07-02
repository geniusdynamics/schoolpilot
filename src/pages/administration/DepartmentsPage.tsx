import React, { useState } from 'react';
import { Department } from '../../types'; // Department is a core type
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/ui/icons';
import { useDepartmentData } from '../../modules/administration/data/useDepartmentData';
import { useTranslation } from 'react-i18next';

type DepartmentFormData = Omit<Partial<Department>, 'id' | 'created_at' | 'updated_at'>;

const DepartmentsPage: React.FC = () => {
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useDepartmentData();
  const { t } = useTranslation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const initialFormData: DepartmentFormData = { name: '', is_academic: false };
  const [formData, setFormData] = useState<DepartmentFormData>(initialFormData);

  const openModal = (dept?: Department) => {
    setEditingDepartment(dept || null);
    setFormData(dept ? { ...dept } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingDepartment(null);
    setFormData(initialFormData);
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert("Department name is required.");
      return;
    }
    const payload = {
      name: formData.name!,
      is_academic: formData.is_academic || false,
    };

    if (editingDepartment) {
      await updateDepartment({ ...editingDepartment, ...payload });
    } else {
      await addDepartment(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      await deleteDepartment(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof Department },
    { header: 'Department Name', accessor: 'name' as keyof Department },
    { header: 'Is Academic', accessor: 'is_academic' as keyof Department },
    {
      header: 'Actions',
      accessor: 'id' as keyof Department,
      render: (item: Department) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title={t('departments.management')} actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          {t('departments.addDepartment')}
        </Button>
      }>
        <Table columns={columns} data={departments} isLoading={isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingDepartment ? t('departments.editDepartment') : t('departments.addNewDepartment')}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('departments.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isModalOpen}>
              {editingDepartment ? t('departments.saveChanges') : t('departments.addDepartment')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label={t('departments.departmentName')} 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <div className="mt-4 flex items-center">
          <input 
            id="is_academic" 
            name="is_academic" 
            type="checkbox" 
            checked={formData.is_academic || false} 
            onChange={handleInputChange}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="is_academic" className="ml-2 block text-sm text-gray-900">
            {t('departments.isAcademicDepartment')}
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default DepartmentsPage;
