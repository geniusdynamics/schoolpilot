import React, { useState, useMemo, useCallback } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormActions from '@/components/ui/forms/FormActions';
import FormField from '@/components/ui/forms/FormField';
import Spinner from '@/components/ui/Spinner';
import {
  PlusIcon,
  UserCircleIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  IdentificationIcon,
} from '@/components/ui/icons';
import { usePickupData } from '../../data/pickup/usePickupData';
import { AuthorizedPerson } from '../../data/pickup/types';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

const RELATIONSHIP_OPTIONS = [
  'Father', 'Mother', 'Guardian', 'Brother', 'Sister',
  'Uncle', 'Aunt', 'Grandparent', 'Other',
];

interface PersonFilters {
  searchQuery?: string;
  studentId?: string;
  relationship?: string;
}

const PickupAuthorizedPersonsPage: React.FC = () => {
  const { t } = useTranslation('pickup');
  const { authorizedPersons, loading, addAuthorizedPerson, removeAuthorizedPerson } = usePickupData();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<PersonFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<AuthorizedPerson | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add form state
  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    relationship: '',
    phone: '',
    email: '',
    idDocumentType: '',
    idDocumentNumber: '',
    isPrimary: false,
  });

  // Unique students from authorized persons
  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    return authorizedPersons
      .filter(p => p.studentName && !seen.has(p.studentId))
      .map(p => {
        seen.add(p.studentId);
        return { id: p.studentId, name: p.studentName || 'Unknown' };
      });
  }, [authorizedPersons]);

  // Filtered persons
  const filteredPersons = useMemo(() => {
    return authorizedPersons.filter(person => {
      if (filters.studentId && person.studentId !== filters.studentId) return false;
      if (filters.relationship && person.relationship !== filters.relationship) return false;
      if (filters.searchQuery) {
        const search = filters.searchQuery.toLowerCase();
        const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
        return (
          fullName.includes(search) ||
          person.phone.includes(search) ||
          (person.idDocumentNumber || '').includes(search)
        );
      }
      return true;
    });
  }, [authorizedPersons, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  const handleFilterChange = (key: keyof PersonFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => setFilters({});

  const resetForm = () => {
    setFormData({
      studentId: '',
      firstName: '',
      lastName: '',
      relationship: '',
      phone: '',
      email: '',
      idDocumentType: '',
      idDocumentNumber: '',
      isPrimary: false,
    });
  };

  const handleFormChange = (key: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectChange = (key: string) => (value: string | string[] | React.ChangeEvent<HTMLSelectElement>) => {
    const strValue = typeof value === 'string' ? value : '';
    setFormData(prev => ({ ...prev, [key]: strValue }));
  };

  // Add person handler
  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.relationship || !formData.phone.trim()) {
      showToast({ variant: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    setSaving(true);
    try {
      const selectedStudent = uniqueStudents.find(s => s.id === formData.studentId);
      await addAuthorizedPerson({
        ...formData,
        studentName: selectedStudent?.name || null,
        photoUrl: null,
        isActive: true,
      });
      showToast({ variant: 'success', message: 'Authorized person added successfully.' });
      setAddModalOpen(false);
      resetForm();
    } catch (error) {
      showToast({ variant: 'error', message: 'Failed to add authorized person.' });
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (person: AuthorizedPerson) => {
    setPersonToDelete(person);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (personToDelete) {
      setDeleting(true);
      try {
        await removeAuthorizedPerson(personToDelete.id);
        showToast({ variant: 'success', message: 'Authorized person removed successfully.' });
      } catch (error) {
        showToast({ variant: 'error', message: 'Failed to remove authorized person.' });
      } finally {
        setDeleting(false);
        setDeleteModalOpen(false);
        setPersonToDelete(null);
      }
    }
  };

  const columns: DataGridColumn<AuthorizedPerson>[] = [
    {
      key: 'photo',
      header: '',
      width: 50,
      sortable: false,
      filterable: false,
      render: (_, item) => (
        <div className="flex items-center justify-center">
          {item.photoUrl ? (
            <img
              src={item.photoUrl}
              alt={`${item.firstName} ${item.lastName}`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <UserCircleIcon className="w-5 h-5 text-slate-400" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
      width: 180,
      render: (_, item) => (
        <div>
          <span className="font-medium">{item.firstName} {item.lastName}</span>
          {item.isPrimary && (
            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
              Primary
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'relationship',
      header: 'Relationship',
      sortable: true,
      filterable: true,
      width: 130,
      render: (value) => {
        const translated = t(`authorizedPerson.relationship.${String(value)}`, String(value));
        return <span className="text-sm">{translated}</span>;
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      width: 150,
      render: (value) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      key: 'idDocumentNumber',
      header: 'ID Number',
      width: 140,
      render: (value) => value || '-',
    },
    {
      key: 'studentName',
      header: 'Student',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value) => value || 'N/A',
    },
    {
      key: 'isActive',
      header: 'Active',
      sortable: true,
      width: 80,
      render: (value) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          value ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (_, item) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(item)}
            leftIcon={<UserGroupIcon className="w-4 h-4" />}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card
        title={String(t('authorizedPerson.plural'))}
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
            >
              Filters
            </Button>
            <Button
              variant="primary"
              onClick={() => setAddModalOpen(true)}
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              {String(t('authorizedPerson.actions.add'))}
            </Button>
          </div>
        }
      >
        {/* Search and Filters */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                label="Search"
                placeholder="Search by name, phone, or ID..."
                value={filters.searchQuery || ''}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Student"
                value={filters.studentId || ''}
                onChange={(value) => handleFilterChange('studentId', typeof value === 'string' ? value : '')}
              >
                <option value="">All Students</option>
                {uniqueStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Select
                label="Relationship"
                value={filters.relationship || ''}
                onChange={(value) => handleFilterChange('relationship', typeof value === 'string' ? value : '')}
              >
                <option value="">All Relationships</option>
                {RELATIONSHIP_OPTIONS.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </Select>
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Data Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="md" />
          </div>
        ) : (
          <DataGrid
            columns={columns}
            data={filteredPersons}
            sortable
            filterable
            loading={false}
            emptyState={
              <div className="text-center py-12">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No authorized persons found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add authorized persons who can pick up students.
                </p>
                <div className="mt-6">
                  <Button
                    variant="primary"
                    onClick={() => setAddModalOpen(true)}
                    leftIcon={<PlusIcon className="w-5 h-5" />}
                  >
                    {String(t('authorizedPerson.actions.add'))}
                  </Button>
                </div>
              </div>
            }
          />
        )}
      </Card>

      {/* Add Authorized Person Modal */}
      <DialogForm
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); resetForm(); }}
        title={String(t('authorizedPerson.actions.add'))}
        size="lg"
        footer={
          <FormActions>
            <Button
              variant="secondary"
              onClick={() => { setAddModalOpen(false); resetForm(); }}
            >
              {String(t('common.cancel'))}
            </Button>
            <Button
              variant="primary"
              onClick={handleAddPerson}
              loading={saving}
            >
              {String(t('common.save'))}
            </Button>
          </FormActions>
        }
      >
        <form onSubmit={handleAddPerson}>
          <FormSection title="Personal Information" columns={2}>
            <FormField label={String(t('authorizedPerson.fields.firstName'))} required>
              <Input
                label={String(t('authorizedPerson.fields.firstName'))}
                value={formData.firstName}
                onChange={(e) => handleFormChange('firstName', e.target.value)}
                placeholder="First name"
              />
            </FormField>
            <FormField label={String(t('authorizedPerson.fields.lastName'))} required>
              <Input
                label={String(t('authorizedPerson.fields.lastName'))}
                value={formData.lastName}
                onChange={(e) => handleFormChange('lastName', e.target.value)}
                placeholder="Last name"
              />
            </FormField>
            <FormField label={String(t('authorizedPerson.fields.relationship'))} required>
              <Select
                value={formData.relationship}
                onChange={handleSelectChange('relationship')}
              >
                <option value="">Select relationship</option>
                {RELATIONSHIP_OPTIONS.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </Select>
            </FormField>
            <FormField label={String(t('authorizedPerson.fields.phone'))} required>
              <Input
                label={String(t('authorizedPerson.fields.phone'))}
                value={formData.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                placeholder="+2547XXXXXXXX"
                leftIcon={<PhoneIcon className="w-4 h-4 text-gray-400" />}
              />
            </FormField>
            <FormField label={String(t('authorizedPerson.fields.email'))}>
              <Input
                label={String(t('authorizedPerson.fields.email'))}
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="email@example.com"
              />
            </FormField>
            <FormField label={String(t('authorizedPerson.fields.isPrimary'))}>
              <label className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  checked={formData.isPrimary}
                  onChange={(e) => handleFormChange('isPrimary', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Primary contact</span>
              </label>
            </FormField>
          </FormSection>

          <FormSection title="Student Assignment" columns={1}>
            <FormField label={String(t('authorizedPerson.fields.student'))}>
              <Select
                value={formData.studentId}
                onChange={handleSelectChange('studentId')}
              >
                <option value="">Select student (optional)</option>
                {uniqueStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </FormField>
          </FormSection>

          <FormSection title="Identification" columns={2}>
            <FormField label={String(t('authorizedPerson.fields.idType'))}>
              <Select
                value={formData.idDocumentType}
                onChange={handleSelectChange('idDocumentType')}
              >
                <option value="">Select ID type</option>
                <option value="National ID">National ID</option>
                <option value="Passport">Passport</option>
                <option value="Driving License">Driving License</option>
                <option value="Other">Other</option>
              </Select>
            </FormField>
            <FormField label={String(t('authorizedPerson.fields.idNumber'))}>
              <Input
                label={String(t('authorizedPerson.fields.idNumber'))}
                value={formData.idDocumentNumber}
                onChange={(e) => handleFormChange('idDocumentNumber', e.target.value)}
                placeholder="ID number"
                leftIcon={<IdentificationIcon className="w-4 h-4 text-gray-400" />}
              />
            </FormField>
          </FormSection>
        </form>
      </DialogForm>

      {/* Delete Confirmation Modal */}
      <DialogForm
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Removal"
        size="sm"
        footer={
          <FormActions>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              {String(t('common.cancel'))}
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={deleting}
            >
              {String(t('authorizedPerson.actions.remove'))}
            </Button>
          </FormActions>
        }
      >
        <p>
          Are you sure you want to remove{' '}
          <strong>{personToDelete ? `${personToDelete.firstName} ${personToDelete.lastName}` : ''}</strong>
          {' '}as an authorized person for{' '}
          <strong>{personToDelete?.studentName || 'this student'}</strong>?
          This action cannot be undone.
        </p>
      </DialogForm>
    </div>
  );
};

export default PickupAuthorizedPersonsPage;
