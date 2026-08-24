import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { UserIcon, ArrowPathIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';

interface StaffRecord {
  id: string;
  staff_id: string;
  staff_name: string;
  employee_id: string;
  department: string;
  designation: string;
  phone: string;
  email: string;
  address: string;
}

export const BulkStaffUpdateContent: React.FC = () => {
  const { t } = useTranslation('administration');
  const { staff, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [updateField, setUpdateField] = useState('');
  const [updateValue, setUpdateValue] = useState('');

  // Mock data for staff records (in production, this would come from useAppData)
  const mockStaff: StaffRecord[] = useMemo(() => {
    const staff: StaffRecord[] = [
      {
        id: 'bsu-1',
        staff_id: '1',
        staff_name: 'Dr. Sarah Johnson',
        employee_id: 'EMP-001',
        department: 'Academic',
        designation: 'Principal',
        phone: '+1234567890',
        email: 'sarah.johnson@school.edu',
        address: '123 Education Lane'
      },
      {
        id: 'bsu-2',
        staff_id: '2',
        staff_name: 'Prof. Michael Chen',
        employee_id: 'EMP-002',
        department: 'Academic',
        designation: 'Vice Principal',
        phone: '+1234567891',
        email: 'michael.chen@school.edu',
        address: '456 Academic Road'
      },
      {
        id: 'bsu-3',
        staff_id: '3',
        staff_name: 'Ms. Emily Davis',
        employee_id: 'EMP-003',
        department: 'Academic',
        designation: 'Math Teacher',
        phone: '+1234567892',
        email: 'emily.davis@school.edu',
        address: '789 Teacher Street'
      },
      {
        id: 'bsu-4',
        staff_id: '4',
        staff_name: 'Mr. Robert Wilson',
        employee_id: 'EMP-004',
        department: 'Administration',
        designation: 'Accountant',
        phone: '+1234567893',
        email: 'robert.wilson@school.edu',
        address: '321 Finance Avenue'
      },
      {
        id: 'bsu-5',
        staff_id: '5',
        staff_name: 'Mrs. Lisa Anderson',
        employee_id: 'EMP-005',
        department: 'Administration',
        designation: 'HR Manager',
        phone: '+1234567894',
        email: 'lisa.anderson@school.edu',
        address: '654 HR Boulevard'
      }
    ];

    let filtered = staff;

    if (selectedDepartment) {
      filtered = filtered.filter(s => s.department === selectedDepartment);
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        (s.staff_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (s.employee_id?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedDepartment, searchTerm]);

  const handleSelectStaff = (staffId: string) => {
    const newSelection = new Set(selectedStaff);
    if (newSelection.has(staffId)) {
      newSelection.delete(staffId);
    } else {
      newSelection.add(staffId);
    }
    setSelectedStaff(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedStaff.size === mockStaff.length) {
      setSelectedStaff(new Set());
    } else {
      setSelectedStaff(new Set(mockStaff.map(s => s.id)));
    }
  };

  const toast = useToast();
  const openUpdateModal = () => {
    if (selectedStaff.size === 0 && !selectedDepartment) {
      toast.showWarning('Please select a department or specific staff to update.');
      return;
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setUpdateField('');
    setUpdateValue('');
  };

  const handleBulkUpdate = () => {
    const staffToUpdate = selectedStaff.size > 0 
      ? Array.from(selectedStaff) 
      : mockStaff.filter(s => s.department === selectedDepartment).map(s => s.id);
    
    logger.info('Bulk updating staff:', {
      field: updateField,
      value: updateValue,
      staffIds: staffToUpdate
    });
    closeModal();
    setSelectedStaff(new Set());
  };

  const columns: DataGridColumn<StaffRecord>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedStaff.size === mockStaff.length && mockStaff.length > 0}
          onChange={handleSelectAll}
          className="w-4 h-4"
        />
      ),
      sortable: false,
      render: (_, record) => (
        <input
          type="checkbox"
          checked={selectedStaff.has(record.id)}
          onChange={() => handleSelectStaff(record.id)}
          className="w-4 h-4"
        />
      )
    },
    {
      key: 'staff_name',
      header: 'Staff Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'employee_id',
      header: 'Employee ID',
      sortable: true,
      filterable: true
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      filterable: true
    },
    {
      key: 'designation',
      header: 'Designation',
      sortable: true,
      filterable: true
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (value) => value
    }
  ];

  const uniqueDepartments = useMemo(() => {
    const depts = [...new Set(mockStaff.map(s => s.department))];
    return depts;
  }, [mockStaff]);

  const updateFields = ['department', 'designation', 'phone', 'email', 'address'];

  const totals = useMemo(() => {
    return {
      total: mockStaff.length,
      selected: selectedStaff.size
    };
  }, [mockStaff, selectedStaff]);

  if (loading?.all && mockStaff.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading staff records...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Bulk Staff Update</h1>
        <Button onClick={openUpdateModal} variant="primary">
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Bulk Update
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <UserIcon className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Multi-Field Batch Update for Staff Records</h3>
              <p className="text-sm text-orange-700 mt-1">
                Update multiple staff records at once. Select a department or specific staff members, 
                then choose the field to update and apply the new value.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600">
            <UserIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Selected: {totals.selected} / {totals.total}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Staff, employee ID..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockStaff}
          columns={columns}
        />
      </Card>

      {/* Bulk Update Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Bulk Update Staff"
      >
        <FormSection>
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              {selectedStaff.size > 0 
                ? `Updating ${selectedStaff.size} selected staff member(s).`
                : `Updating all staff in ${selectedDepartment || 'selected department'}.`
              }
            </p>
          </div>

          <FormField label="Field to Update" required>
            <select
              value={updateField}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUpdateField(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select field</option>
              {updateFields.map(field => (
                <option key={field} value={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</option>
              ))}
            </select>
          </FormField>

          <FormField label="New Value" required>
            <input
              type="text"
              value={updateValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUpdateValue(e.target.value)}
              placeholder="Enter new value"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleBulkUpdate} variant="primary">
            Update Records
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

const BulkStaffUpdatePage: React.FC = () => (
  <div className="space-y-6">
    <BulkStaffUpdateContent />
  </div>
);

export default BulkStaffUpdatePage;

