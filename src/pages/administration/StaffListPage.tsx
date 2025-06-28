

import React, { useState, useMemo } from 'react';
import { Staff, Department, Designation } from '../../../types';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/ui/icons';
// import { useMockData } from '../hooks/useMockData'; // Switch to useAppData
import { useAppData } from '@/contexts/AppDataContext'; // Import useAppData
import Spinner from '../../components/ui/Spinner';

interface StaffFormData extends Omit<Partial<Staff>, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'department_name' | 'designation_title' | 'email' | 'hod_of_department_name' | 'display_name' | 'user_username' | 'deleted_at'> { 
  department_id?: number; 
  designation_id?: number;
  hod_of_department_id?: number; 
}


const StaffListPage: React.FC = () => {
  const { 
    staff, loading, addStaffMember, updateStaffMember, deleteStaffMember: mockDeleteStaff,
    departments, 
    designations
   } = useAppData(); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');

  const initialStaffFormData: StaffFormData = { staff_no: '', first_name: '', last_name: '', is_active: true };
  const [formData, setFormData] = useState<StaffFormData>(initialStaffFormData);

  const openModal = (staffMember?: Staff) => {
    setEditingStaff(staffMember || null);
    if (staffMember) {
      setFormData({
        ...staffMember,
        department_id: staffMember.department_id,
        designation_id: staffMember.designation_id,
        hod_of_department_id: staffMember.hod_of_department_id,
      });
    } else {
      const existingStaffNos = staff.map(s => parseInt(s.staff_no.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
      const nextStaffNoSuffix = existingStaffNos.length > 0 ? Math.max(...existingStaffNos) + 1 : 1;
      const nextStaffNo = `EMP${String(nextStaffNoSuffix).padStart(3, '0')}`;
      setFormData({...initialStaffFormData, staff_no: nextStaffNo});
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setFormData(initialStaffFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let val: string | number | boolean | undefined = value;

    if (type === 'checkbox' && 'checked' in e.target) {
        val = (e.target as HTMLInputElement).checked;
    } else if (name === 'designation_id' || name === 'department_id' || name === 'hod_of_department_id') {
        val = value ? parseInt(value, 10) : undefined;
        if (Number.isNaN(val as number)) val = undefined;
    }
    setFormData(prev => ({ ...prev, [name]: val }));
  };
  

  const handleSubmit = async () => {
    const payload: Omit<Staff, 'id'|'created_at'|'updated_at'|'department_name'|'designation_title'|'hod_of_department_name'|'user_username'|'email'|'display_name'|'user_id'|'deleted_at'> = {
      staff_no: formData.staff_no || '',
      first_name: formData.first_name || '',
      last_name: formData.last_name || '',
      is_active: formData.is_active || false,
      phone: formData.phone,
      department_id: formData.department_id,
      designation_id: formData.designation_id,
      hod_of_department_id: formData.hod_of_department_id,
    };

    if (editingStaff) {
      await updateStaffMember({ ...editingStaff, ...payload } );
    } else {
      await addStaffMember(payload);
    }
    closeModal();
  };

  const handleDelete = async (staffId: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      await mockDeleteStaff(staffId);
    }
  };

  const filteredStaff = useMemo(() => {
    return staff
      .filter(s =>
        `${s.first_name} ${s.last_name} ${s.staff_no} ${s.email || ''} ${s.department_name || ''} ${s.designation_title || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .filter(s =>
        statusFilter ? (statusFilter === 'active' ? s.is_active : !s.is_active) : true
      );
  }, [staff, searchTerm, statusFilter]);

  const columns = [
    { header: 'Staff No', accessor: 'staff_no' as keyof Staff },
    { header: 'Name', accessor: ((item: Staff) => `${item.first_name} ${item.last_name}`) },
    { header: 'Department', accessor: 'department_name' as keyof Staff },
    { header: 'Designation', accessor: 'designation_title' as keyof Staff },
    { header: 'HOD Of', accessor: 'hod_of_department_name' as keyof Staff},
    { header: 'Phone', accessor: 'phone' as keyof Staff },
    { header: 'Email', accessor: 'email' as keyof Staff},
    { header: 'Status', accessor: 'is_active' as keyof Staff },
    {
      header: 'Actions',
      accessor: 'id' as keyof Staff,
      render: (item: Staff) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  const pageIsLoading = loading.staff || loading.all;

  return (
    <div className="space-y-6">
      <Card title="Staff Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Staff
        </Button>
      }>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <Table columns={columns} data={filteredStaff} isLoading={loading.staff && isModalOpen} />
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'} size="xl"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={loading.staff}>
              {loading.staff ? <Spinner size="sm"/> : (editingStaff ? 'Save Changes' : 'Add Staff Member')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input name="staff_no" label="Staff No." value={formData.staff_no || ''} onChange={handleInputChange} required />
          <Input name="first_name" label="First Name" value={formData.first_name || ''} onChange={handleInputChange} required />
          <Input name="last_name" label="Last Name" value={formData.last_name || ''} onChange={handleInputChange} required />
          <Input name="phone" label="Phone" value={formData.phone || ''} onChange={handleInputChange} />
          
          <Select name="department_id" label="Department" value={formData.department_id || ''} onChange={handleInputChange}>
            <option value="">Select Department</option>
            {departments.map(dep => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
          </Select>

          <Select name="designation_id" label="Designation" value={formData.designation_id || ''} onChange={handleInputChange}>
            <option value="">Select Designation</option>
            {designations.map(des => <option key={des.id} value={des.id}>{des.title}</option>)}
          </Select>
          <Select name="hod_of_department_id" label="Head of Department (If applicable)" value={formData.hod_of_department_id || ''} onChange={handleInputChange}>
            <option value="">None</option>
            {departments.filter(d => d.is_academic).map(dep => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
          </Select>
          <div className="flex items-center mt-2 md:col-span-3">
             <input id="is_active" name="is_active" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                checked={formData.is_active || false} onChange={handleInputChange} />
             <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Is Active Staff Member</label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffListPage;
