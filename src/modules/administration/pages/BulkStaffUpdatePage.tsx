// ABOUTME: Bulk staff update page — filter staff by department or selection and set one field on all of them.
// ABOUTME: Writes go through useAdministration().updateStaff; department/designation changes store id and label.

import React, { useState, useMemo } from 'react';
import { useAdministration } from '../hooks/useAdministration';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { UserIcon, ArrowPathIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';
import type { Staff } from '@/core/types';

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
  const { staff, loading, updateStaff, departments, designations } = useAdministration();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [updateField, setUpdateField] = useState('');
  const [updateValue, setUpdateValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Live staff records from the database
  const staffRows: StaffRecord[] = useMemo(() => {
    let rows: StaffRecord[] = ((staff || []) as Staff[])
      .filter(s => !s.deleted_at)
      .map(s => ({
        id: String(s.id),
        staff_id: String(s.id),
        staff_name: s.display_name || `${s.first_name} ${s.last_name}`.trim(),
        employee_id: s.staff_no,
        department: departments.find(d => String(d.id) === String(s.department_id))?.name || s.department_name || '',
        designation: designations.find(d => String(d.id) === String(s.designation_id))?.title || s.designation_title || '',
        phone: s.phone || '',
        email: s.email || '',
        address: ''
      }));

    if (selectedDepartment) {
      rows = rows.filter(s => s.department === selectedDepartment);
    }

    if (searchTerm) {
      rows = rows.filter(s =>
        (s.staff_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (s.employee_id?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return rows;
  }, [staff, departments, designations, selectedDepartment, searchTerm]);

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

  const sameName = (a: string | null | undefined, b: string) => (a ?? '').trim().toLowerCase() === b.trim().toLowerCase();

  // Maps grid fields onto real staff entity fields persisted via updateStaff; null when the value is unknown
  const resolveStaffPatch = (field: string, value: string): Record<string, unknown> | null => {
    switch (field) {
      case 'department': {
        const department = departments.find(d => sameName(d.name, value));
        return department ? { department_id: String(department.id), department_name: department.name } : null;
      }
      case 'designation': {
        const designation = designations.find(d => sameName(d.title, value));
        return designation ? { designation_id: designation.id, designation_title: designation.title } : null;
      }
      case 'phone':
        return { phone: value };
      case 'email':
        return { email: value };
      default:
        return null;
    }
  };

  const handleBulkUpdate = async () => {
    const staffToUpdate = selectedStaff.size > 0
      ? Array.from(selectedStaff)
      : staffRows.filter(s => s.department === selectedDepartment).map(s => s.id);

    if (!updateField || !updateValue || staffToUpdate.length === 0) {
      toast.showWarning('Please select a field and enter a value.');
      return;
    }

    const patch = resolveStaffPatch(updateField, updateValue);
    if (!patch) {
      toast.showWarning(`No ${updateField} named "${updateValue}" exists.`);
      return;
    }

    setIsUpdating(true);
    logger.info('Bulk updating staff:', {
      field: updateField,
      value: updateValue,
      staffIds: staffToUpdate
    });
    try {
      for (const staffId of staffToUpdate) {
        await updateStaff(String(staffId), patch);
      }
      toast.showSuccess(`Updated ${staffToUpdate.length} staff member(s).`);
      closeModal();
      setSelectedStaff(new Set());
    } catch (err) {
      logger.error('Failed to bulk update staff:', err);
      toast.showError('Failed to update staff records.');
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: DataGridColumn<StaffRecord>[] = [
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

  const uniqueDepartments = useMemo(
    () => [...new Set(departments.map(d => d.name).filter(Boolean))],
    [departments]
  );

  const updateFields = ['department', 'designation', 'phone', 'email'];

  const totals = useMemo(() => {
    return {
      total: staffRows.length,
      selected: selectedStaff.size
    };
  }, [staffRows, selectedStaff]);

  if (loading === true && staffRows.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading staff records...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card
        title="Bulk Staff Update"
        info="Update multiple staff records at once. Select a department or specific staff members, then choose the field to update and apply the new value."
        actions={
          <Button onClick={openUpdateModal} variant="primary">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Bulk Update
          </Button>
        }
      >

        {/* Summary Card */}
        <div className="mb-6 bg-surface-card border border-surface-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-surface-muted-fg">
            <UserIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Selected: {totals.selected} / {totals.total}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDepartment(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Staff, employee ID..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={staffRows}
          columns={columns}
          selectable={true}
          onSelectionChange={(selected: StaffRecord[]) =>
            setSelectedStaff(new Set(selected.map(row => row.id)))
          }
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
              className="w-full border border-surface-border rounded-md px-3 py-2"
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
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={() => void handleBulkUpdate()} variant="primary" disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update Records'}
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

const BulkStaffUpdatePage: React.FC = () => (
  <div className="space-y-3">
    <BulkStaffUpdateContent />
  </div>
);

export default BulkStaffUpdatePage;
