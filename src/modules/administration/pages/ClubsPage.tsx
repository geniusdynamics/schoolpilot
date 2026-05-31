
import React, { useState } from 'react';
import { Staff } from '@/types';
import { AdminClubAndSocietyType as ClubAndSociety, ClubType } from '@/modules/administration/data/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, UserGroupIcon as ClubsIcon } from '@/components/ui/icons';
import { useClubAndSocietyData } from '@/modules/administration/data/useClubAndSocietyData';
import { useAppData } from '@/hooks/useAppData'; // For staff data only
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import DialogForm from '../../../components/ui/forms/DialogForm';
import FormSection from '../../../components/ui/forms/FormSection';
import FormField from '../../../components/ui/forms/FormField';
import FormActions from '../../../components/ui/forms/FormActions';

type ClubFormData = Omit<Partial<ClubAndSociety>, 'id' | 'created_at' | 'updated_at' | 'patron_name' | 'type'> & {
    type: ClubType; // Make type required for the form
};

const ClubsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: clubsAndSocieties, create: addClubAndSociety, update: updateClubAndSociety, remove: deleteClubAndSociety } = useClubAndSocietyData();
  const { staff = [] } = useAppData(); // Only for staff data
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<ClubAndSociety | null>(null);
  const initialFormData: ClubFormData = { name: '', type: ClubType.CLUB, patron_id: undefined };
  const [formData, setFormData] = useState<ClubFormData>(initialFormData);

  const openModal = (club?: ClubAndSociety) => {
    setEditingClub(club || null);
    setFormData(club ? { name: club.name, type: club.type, patron_id: club.patron_id } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClub(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' && name === 'patron_id' ? undefined : value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.type) {
      alert(t('validation.clubNameAndTypeAreRequired'));
      return;
    }
    const payload = {
      name: formData.name!,
      type: formData.type,
      patron_id: formData.patron_id || undefined,
    };

    if (editingClub) {
      updateClubAndSociety({ ...editingClub, ...payload });
    } else {
      addClubAndSociety(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this club/society?')) {
      deleteClubAndSociety(id);
    }
  };

  const columns: DataGridColumn<ClubAndSociety>[] = [
    { 
      key: 'id',
      header: 'ID', 
      sortable: true,
      filterable: true,
      width: 80,
      render: (value, item) => item.id
    },
    { 
      key: 'name',
      header: 'Club/Society Name', 
      sortable: true,
      filterable: true,
      width: 250,
      render: (value, item) => item.name
    },
    { 
      key: 'type',
      header: 'Type', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, item) => item.type
    },
    { 
      key: 'patron_name',
      header: 'Patron', 
      sortable: true,
      filterable: true,
      width: 200,
      render: (value, item) => item.patron_name
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 200,
      sticky: 'right',
      render: (value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="Clubs & Societies Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Club/Society
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Manage school clubs, societies, and sports teams. Assign patrons from the staff list.
        </p>
        <DataGrid 
          columns={columns} 
          data={clubsAndSocieties}
          sortable
          filterable
          emptyState={
            <div className="text-center py-12">
              <ClubsIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No clubs or societies found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first club or society.</p>
            </div>
          }
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingClub ? 'Edit Club/Society' : 'Add New Club/Society'}
        size="lg"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection>
          <FormField label="Name" required>
            <Input 
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label="Type" required>
            <Select
              name="type"
              value={formData.type || ClubType.CLUB}
              onChange={handleInputChange}
              required
            >
              {Object.values(ClubType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Patron (Staff Member)">
            <Select
              name="patron_id"
              value={formData.patron_id || ''}
              onChange={handleInputChange}
            >
              <option value="">Select Patron</option>
              {staff.filter(s => s.is_active).map((staffMember: Staff) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.first_name} {staffMember.last_name}
                </option>
              ))}
            </Select>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit">
            {editingClub ? 'Save Changes' : 'Add Club/Society'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default ClubsPage;

export const ClubsContent = ClubsPage;
