
import React, { useState } from 'react';
import { ClubAndSociety, ClubType, Staff } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, UserGroupIcon as ClubsIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type ClubFormData = Omit<Partial<ClubAndSociety>, 'id' | 'created_at' | 'updated_at' | 'patron_name' | 'type'> & {
    type: ClubType; // Make type required for the form
};

const ClubsPage: React.FC = () => {
  const { clubs, staff, loading, addClub, updateClub, deleteClub } = useAppData(); // Updated
  
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
      alert("Club name and type are required.");
      return;
    }
    const payload = {
      name: formData.name!,
      type: formData.type,
      patron_id: formData.patron_id || undefined,
    };

    if (editingClub) {
      await updateClub({ ...editingClub, ...payload });
    } else {
      await addClub(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this club/society?')) {
      await deleteClub(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof ClubAndSociety },
    { header: 'Club/Society Name', accessor: 'name' as keyof ClubAndSociety },
    { header: 'Type', accessor: 'type' as keyof ClubAndSociety },
    { header: 'Patron', accessor: 'patron_name' as keyof ClubAndSociety },
    {
      header: 'Actions',
      accessor: 'id' as keyof ClubAndSociety,
      render: (item: ClubAndSociety) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if ((loading.clubs || loading.staff) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Clubs & Societies...</span>
      </div>
    );
  }

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
        <Table columns={columns} data={clubs} isLoading={loading.clubs && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingClub ? 'Edit Club/Society' : 'Add New Club/Society'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.clubs}>
              {loading.clubs ? <Spinner size="sm"/> : (editingClub ? 'Save Changes' : 'Add Club/Society')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Name" 
          value={formData.name || ''} 
          onChange={handleInputChange} 
          required 
        />
        <Select 
          name="type" 
          label="Type" 
          value={formData.type || ClubType.CLUB} 
          onChange={handleInputChange}
          required
        >
          {Object.values(ClubType).map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
        <Select 
          name="patron_id" 
          label="Patron (Staff Member)" 
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
      </Modal>
    </div>
  );
};

export default ClubsPage;
