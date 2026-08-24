import React, { useState } from 'react';
import { AdminPartnerType as Partner, PartnerType } from '../data/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, UserCircleIcon as PartnersIcon } from '@/components/ui/icons';
import { usePartnerData } from '../data/usePartnerData'; // Use module-specific hook
import Spinner from '@/components/ui/Spinner';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type PartnerFormData = Omit<Partial<Partner>, 'id' | 'created_at' | 'updated_at' | 'partner_type'> & {
    partner_type: PartnerType; // Make type required for the form
};

export const PartnersContent: React.FC = () => {
  const {
    data: partners,
    create: addPartner,
    update: updatePartner,
    remove: deletePartner
  } = usePartnerData(); // Use module-specific hook
  
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


  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.name || !formData.partner_type) {
      toast.showWarning('Partner name and type are required');
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

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this partner?' }))) {
      await deletePartner(id);
    }
  };

  const columns: DataGridColumn<Partner>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value, item) => value
    },
    { 
      key: 'name', 
      header: 'Partner Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, item) => value
    },
    { 
      key: 'partner_type', 
      header: 'Type', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, item) => value
    },
    { 
      key: 'contact_person', 
      header: 'Contact Person', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, item) => value || '-'
    },
    { 
      key: 'email', 
      header: 'Email', 
      sortable: true, 
      filterable: true, 
      width: 180,
      render: (value, item) => value || '-'
    },
    { 
      key: 'phone', 
      header: 'Phone', 
      sortable: true, 
      filterable: true, 
      width: 130,
      render: (value, item) => value || '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 160,
      sticky: 'right',
      render: (value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  // Module-specific hooks don't have loading states like global context
  // Remove loading check since data is immediately available

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
        <DataGrid 
          columns={columns} 
          data={partners} 
          sortable 
          filterable 
          emptyState={{
            icon: <PartnersIcon className="h-12 w-12 text-gray-400" />,
            title: 'No partners found',
            description: 'Get started by adding your first partner.',
          }}
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPartner ? 'Edit Partner' : 'Add New Partner'}
        size="xl"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection columns={2}>
          <FormField label="Partner Name" required>
            <Input
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label="Partner Type" required>
            <Select
              name="partner_type"
              value={formData.partner_type}
              onChange={handleInputChange}
              required
            >
              {Object.values(PartnerType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Contact Person">
            <Input
              name="contact_person"
              value={formData.contact_person || ''}
              onChange={handleInputChange}
            />
          </FormField>
          <FormField label="Email Address">
            <Input
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleInputChange}
            />
          </FormField>
          <FormField label="Phone Number">
            <Input
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
            />
          </FormField>
          <FormField label="Address" containerClassName="md:col-span-2">
            <Input
              name="address"
              value={formData.address || ''}
              onChange={handleInputChange}
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit">
            {editingPartner ? 'Save Changes' : 'Add Partner'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const PartnersPage: React.FC = () => (
  <div className="space-y-6">
    <PartnersContent />
  </div>
);

export default PartnersPage;
