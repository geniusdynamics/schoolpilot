import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import { PlusIcon, EditIcon, DeleteIcon, UserGroupIcon, EyeIcon } from '@/components/ui/icons';
// import { useMockData } from '@/hooks/useMockData'; // Switch to useAppData
import { useAppData } from '@/hooks/useAppData'; // Import useAppData
import Spinner from '@/components/ui/Spinner';

import EntityForm from '@/components/ui/forms/EntityForm';
import type { Staff } from '@/core/types';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export const StaffListContent: React.FC = () => {
  const navigate = useNavigate();
  const { 
    staff, loading, addStaffMember, updateStaffMember, deleteStaffMember: mockDeleteStaff,
    departments, 
    designations
   } = useAppData(); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [initialValues, setInitialValues] = useState<Record<string, any>>({ staff_no: '', first_name: '', last_name: '', is_active: true });

  const openModal = (staffMember?: Staff) => {
    setEditingStaff(staffMember || null);
    if (staffMember) {
      setInitialValues({
        staff_no: staffMember.staff_no,
        first_name: staffMember.first_name,
        last_name: staffMember.last_name,
        phone: staffMember.phone,
        department_id: staffMember.department_id,
        designation_id: staffMember.designation_id,
        hod_of_department_id: staffMember.hod_of_department_id,
        is_active: staffMember.is_active ?? true,
      });
    } else {
      const existingStaffNos = staff
        .map(s => parseInt(String(s.staff_no ?? '').replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));
      const nextStaffNoSuffix = existingStaffNos.length > 0 ? Math.max(...existingStaffNos) + 1 : 1;
      const nextStaffNo = `EMP${String(nextStaffNoSuffix).padStart(3, '0')}`;
      setInitialValues({ staff_no: nextStaffNo, first_name: '', last_name: '', phone: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  const confirm = useConfirm();
  const handleDelete = async (staffId: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this staff member?' }))) {
      await mockDeleteStaff(staffId);
    }
  };

  const handleView = (staffId: string) => {
    navigate(`/administration/staff/${staffId}`);
  };

  const filteredStaff = useMemo(() => {
    return (staff || [])
      .map(s => ({
        ...s,
        // Materialize the computed 'name' the grid column references so
        // DataGrid sorting/filtering operate on a real field
        name: s.display_name || [s.first_name, s.last_name].filter(Boolean).join(' ') || s.staff_no || '—',
      }))
      .filter(s =>
        [s.first_name, s.last_name, s.staff_no, s.email, s.department_name, s.designation_title, s.display_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .filter(s =>
        statusFilter ? (statusFilter === 'active' ? s.is_active : !s.is_active) : true
      );
  }, [staff, searchTerm, statusFilter]);

  const columns: DataGridColumn<(typeof filteredStaff)[number]>[] = [
    {
      key: 'staff_no',
      header: 'Staff No',
      sortable: true,
      filterable: true,
            render: (_value, item) => item.staff_no || '—'
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
            render: (_value, item) => item.name || '—'
    },
    {
      key: 'department_name',
      header: 'Department',
      sortable: true,
      filterable: true,
            render: (_value, item) => item.department_name || '—'
    },
    {
      key: 'designation_title',
      header: 'Designation',
      sortable: true,
      filterable: true,
            render: (_value, item) => item.designation_title || '—'
    },
    {
      key: 'hod_of_department_name',
      header: 'HOD Of',
      sortable: true,
      filterable: true,
            render: (_value, item) => item.hod_of_department_name || '—'
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      filterable: true,
            render: (_value, item) => item.phone || '—'
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      filterable: true,
            render: (_value, item) => (
        <span className="truncate block max-w-[180px]" title={item.email || ''}>{item.email || '—'}</span>
      )
    },
    { 
      key: 'is_active',
      header: 'Status', 
      sortable: true,
      filterable: true,
            render: (_value, item) => item.is_active ? 'Active' : 'Inactive'
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      
      sticky: 'right',
      render: (_value, item) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleView(item.id)} leftIcon={<EyeIcon className="w-4 h-4" />}>View</Button>
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  const pageIsLoading = loading.staff || loading.all;

  return (
    <div className="space-y-6">
      <Card title="Staff Management" bodyClassName="p-0" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Staff
        </Button>
      }>
        <div className="p-4 sm:p-6 pb-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            label="Search"
          />
          <Select
            name="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | '')}
            label="Filter by Status"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        {pageIsLoading && !isModalOpen ? (
          <div className="flex justify-center items-center py-10"> <Spinner /> <span className="ml-2">Loading staff...</span> </div>
        ) : (
          <div className="border-t border-surface-border">
            <DataGrid 
              columns={columns} 
              data={filteredStaff} 
              loading={loading.staff && !isModalOpen}
              sortable
              filterable
              emptyState={{
                icon: <UserGroupIcon className="h-12 w-12 text-surface-muted-fg" />,
                title: 'No staff members found',
                description: 'Get started by adding your first staff member.',
              }}
            />
          </div>
        )}
      </Card>

      <EntityForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
        initialData={initialValues}
        fields={[
          { name: 'staff_no', label: 'Staff No.', required: true },
          { name: 'first_name', label: 'First Name', required: true },
          { name: 'last_name', label: 'Last Name', required: true },
          { name: 'phone', label: 'Phone' },
          {
            name: 'department_id',
            label: 'Department',
            type: 'select',
            placeholder: 'Select Department',
            options: departments.map(dep => ({ value: dep.id, label: dep.name })),
          },
          {
            name: 'designation_id',
            label: 'Designation',
            type: 'select',
            placeholder: 'Select Designation',
            options: designations.map(des => ({ value: des.id, label: des.title })),
          },
          {
            name: 'hod_of_department_id',
            label: 'Head of Department (If applicable)',
            type: 'select',
            placeholder: 'None',
            options: departments.filter(d => d.is_academic).map(dep => ({ value: dep.id, label: dep.name })),
          },
          { name: 'is_active', label: 'Is Active Staff Member', type: 'checkbox' },
        ]}
        submitLabel={editingStaff ? 'Save Changes' : 'Add Staff Member'}
        cancelLabel="Cancel"
        onSubmit={async (values) => {
          const payload = {
            staff_no: String(values.staff_no ?? ''),
            first_name: String(values.first_name ?? ''),
            last_name: String(values.last_name ?? ''),
            is_active: Boolean(values.is_active),
            phone: values.phone ? String(values.phone) : undefined,
            department_id: values.department_id != null && values.department_id !== '' ? String(values.department_id) : undefined,
            designation_id: values.designation_id != null && values.designation_id !== '' ? Number(values.designation_id) : undefined,
            hod_of_department_id: values.hod_of_department_id != null && values.hod_of_department_id !== '' ? String(values.hod_of_department_id) : undefined,
          };
          if (editingStaff) {
            await updateStaffMember(String(editingStaff.id), payload);
          } else {
            await addStaffMember(payload);
          }
        }}
      />
    </div>
  );
};

const StaffListPage: React.FC = () => (
  <div className="space-y-6">
    <StaffListContent />
  </div>
);

export default StaffListPage;
