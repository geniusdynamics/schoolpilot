import React, { useState, useMemo } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useCanonicalStaff } from '../data/useCanonicalStaff';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { UserIcon, PrinterIcon, DownloadIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { logger } from '@/utils/logging';

/** ID-card view of a live staff record. */
interface StaffIDCardRow {
  id: string;
  staff_id: string;
  staff_name: string;
  employee_id: string;
  department: string;
  designation: string;
  photo_url?: string;
  joining_date: string;
  phone: string;
  email: string;
}

const StaffIDCardsPage: React.FC = () => {
  const { staff, isLoading } = useCanonicalStaff();

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffIDCardRow | null>(null);

  // Live staff records rendered as ID card rows
  const cardRows: StaffIDCardRow[] = useMemo(() => {
    let rows: StaffIDCardRow[] = (staff || [])
      .filter(s => !s.deleted_at)
      .map(s => ({
        id: String(s.id),
        staff_id: String(s.id),
        staff_name: s.display_name || `${s.first_name} ${s.last_name}`.trim(),
        employee_id: s.staff_no,
        department: s.department_name || '-',
        designation: s.designation_title || '-',
        photo_url: undefined,
        joining_date: s.created_at || '',
        phone: s.phone || '-',
        email: s.email || '-'
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
  }, [staff, selectedDepartment, searchTerm]);

  const handlePrintCard = (staffMember: StaffIDCardRow) => {
    setSelectedStaff(staffMember);
    logger.info('Printing ID card for:', staffMember.staff_name);
  };

  const handleDownloadCard = (staffMember: StaffIDCardRow) => {
    logger.info('Downloading ID card for:', staffMember.staff_name);
  };

  const handlePrintAll = () => {
    logger.info('Printing all ID cards for department:', selectedDepartment || 'all departments');
  };

  const columns: DataGridColumn<StaffIDCardRow>[] = [
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
      key: 'joining_date',
      header: 'Joining Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handlePrintCard(record)}>
            <PrinterIcon className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleDownloadCard(record)}>
            <DownloadIcon className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const uniqueDepartments = useMemo(() => {
    const depts = [...new Set(cardRows.map(s => s.department))];
    return depts.filter(dept => dept !== '-');
  }, [cardRows]);

  if (isLoading && cardRows.length === 0) {
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
        title="Staff ID Cards"
        info="Generate and print staff ID cards with photos, department information, and contact details. Print individual cards or bulk print for entire departments."
        actions={
          <Button onClick={handlePrintAll} variant="primary">
            <PrinterIcon className="w-4 h-4 mr-2" />
            Print All
          </Button>
        }
      >

        {/* ID Card Preview */}
        {selectedStaff && (
          <div className="mb-6 p-6 bg-surface-card border border-surface-border rounded-lg">
            <h3 className="text-lg font-semibold text-surface-foreground mb-4">ID Card Preview: {selectedStaff.staff_name}</h3>
            <div className="border-2 border-surface-border rounded-lg p-6 max-w-sm mx-auto bg-gradient-to-br from-cyan-50 to-primary-50">
              <div className="text-center mb-4">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <UserIcon className="w-12 h-12 text-surface-muted-fg" />
                </div>
                <h4 className="text-xl font-bold text-surface-foreground">{selectedStaff.staff_name}</h4>
                <p className="text-sm text-surface-muted-fg">{selectedStaff.employee_id}</p>
                <p className="text-sm font-semibold text-cyan-700 mt-1">{selectedStaff.designation}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">Department:</span>
                  <span className="font-semibold">{selectedStaff.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">Joining Date:</span>
                  <span className="font-semibold">{selectedStaff.joining_date ? new Date(selectedStaff.joining_date).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">Phone:</span>
                  <span className="font-semibold">{selectedStaff.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-muted-fg">Email:</span>
                  <span className="font-semibold text-xs">{selectedStaff.email}</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
          data={cardRows}
          columns={columns}
        />
      </Card>
    </div>
  );
};

const StaffIDCardsPageWithRepository = withCanonicalRepository(StaffIDCardsPage);
export default StaffIDCardsPageWithRepository;

export const StaffIDCardsContent = StaffIDCardsPage;
