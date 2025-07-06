import React, { useState, useMemo } from 'react';
import { AdminPartnerType as Partner } from '../data/types';
import { PartnerType } from '../data/types';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, UserCircleIcon as PartnersIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type PartnerFormData = Omit<Partial<Partner>, 'id' | 'created_at' | 'updated_at' | 'partner_type'> & {
    partner_type: PartnerType; // Make type required for the form
};

const PartnersPage: React.FC = () => {
  const {
    partners = [],
    loading,
    addPartner,
    updatePartner,
    deletePartner
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const initialFormData: PartnerFormData = { 
    name: '', 
    partner_type: PartnerType.OTHER,
    contact_person: '', 
    email: '', 
    phone: '',
    address: ''
  };
  const [formData, setFormData] = useState<PartnerFormData>(initialFormData);

  const openModal = (partner?: Partner) => {
    setEditingPartner(partner || null);
    setFormData(partner ? 
      { 
        name: partner.name, 
        partner_type: partner.partner_type, 
        contact_person: partner.contact_person, 
        email: partner.email, 
        phone: partner.phone,
        address: partner.address
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPartner(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.partner_type) {
      alert("Partner name and type are required.");
      return;
    }
    const payload: Omit<Partner, 'id' | 'created_at' | 'updated_at'> = {
      name: formData.name!,
      partner_type: formData.partner_type,
      contact_person: formData.contact_person || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
    };

    if (editingPartner) {
      await updatePartner({ ...editingPartner, ...payload });
    } else {
      await addPartner(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this partner?')) {
      await deletePartner(id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof Partner },
    { header: 'Partner Name', accessor: 'name' as keyof Partner },
    { header: 'Type', accessor: 'partner_type' as keyof Partner },
    { header: 'Contact Person', accessor: 'contact_person' as keyof Partner },
    { header: 'Email', accessor: 'email' as keyof Partner },
    { header: 'Phone', accessor: 'phone' as keyof Partner },
    {
      header: 'Actions',
      accessor: 'id' as keyof Partner,
      render: (item: Partner) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  if (loading.partners && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Partners...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Partners Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Partner
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Manage school partners such as sponsors, board members, service providers, and government agencies.
        </p>
        <Table columns={columns} data={partners} isLoading={loading.partners && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPartner ? 'Edit Partner' : 'Add New Partner'} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.partners}>
              {loading.partners ? <Spinner size="sm"/> : (editingPartner ? 'Save Changes' : 'Add Partner')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
                name="name" 
                label="Partner Name" 
                value={formData.name || ''} 
                onChange={handleInputChange} 
                required 
                containerClassName="md:col-span-2"
            />
            <Select 
                name="partner_type" 
                label="Partner Type" 
                value={formData.partner_type} 
                onChange={handleInputChange}
                required
                >
                {Object.values(PartnerType).map((type) => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </Select>
            <Input 
                name="contact_person" 
                label="Contact Person" 
                value={formData.contact_person || ''} 
                onChange={handleInputChange} 
            />
            <Input 
                name="email" 
                label="Email Address" 
                type="email"
                value={formData.email || ''} 
                onChange={handleInputChange} 
            />
            <Input 
                name="phone" 
                label="Phone Number" 
                value={formData.phone || ''} 
                onChange={handleInputChange} 
            />
            <Input
                name="address"
                label="Address"
                value={formData.address || ''}
                onChange={handleInputChange}
                containerClassName="md:col-span-2"
            />
        </div>
      </Modal>
    </div>
  );
};

export default PartnersPage;
