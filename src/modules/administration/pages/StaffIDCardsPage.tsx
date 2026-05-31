import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { IdentificationIcon, UserIcon, PrinterIcon, DownloadIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { StaffIDCard } from '../data/types';

const StaffIDCardsPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const { staffIDCards, staff, loading } = useAppData();

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffIDCard | null>(null);

  const mockStaff: StaffIDCard[] = useMemo(() => {
    let filtered = staffIDCards || [];

    if (selectedDepartment) {
      filtered = filtered.filter(s => s.department === selectedDepartment);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedDepartment, searchTerm]);

  const handlePrintCard = (staff: StaffIDCard) => {
    setSelectedStaff(staff);
    console.log('Printing ID card for:', staff.staff_name);
  };

  const handleDownloadCard = (staff: StaffIDCard) => {
    console.log('Downloading ID card for:', staff.staff_name);
  };

  const handlePrintAll = () => {
    console.log('Printing all ID cards for department:', selectedDepartment || 'all departments');
  };

  const columns: DataGridColumn<StaffIDCard>[] = [
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
    const depts = [...new Set(mockStaff.map(s => s.department))];
    return depts;
  }, [mockStaff]);

  if (loading && mockStaff.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-800">Staff ID Cards</h1>
        <Button onClick={handlePrintAll} variant="primary">
          <PrinterIcon className="w-4 h-4 mr-2" />
          Print All
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
          <div className="flex items-start gap-3">
            <IdentificationIcon className="w-5 h-5 text-cyan-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-cyan-800">Generate Printable Staff ID Cards</h3>
              <p className="text-sm text-cyan-700 mt-1">
                Generate and print staff ID cards with photos, department information, and contact details. 
                Print individual cards or bulk print for entire departments.
              </p>
            </div>
          </div>
        </div>

        {/* ID Card Preview */}
        {selectedStaff && (
          <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">ID Card Preview: {selectedStaff.staff_name}</h3>
            <div className="border-2 border-gray-300 rounded-lg p-6 max-w-sm mx-auto bg-gradient-to-br from-cyan-50 to-blue-50">
              <div className="text-center mb-4">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <UserIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h4 className="text-xl font-bold text-gray-800">{selectedStaff.staff_name}</h4>
                <p className="text-sm text-gray-600">{selectedStaff.employee_id}</p>
                <p className="text-sm font-semibold text-cyan-700 mt-1">{selectedStaff.designation}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Department:</span>
                  <span className="font-semibold">{selectedStaff.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Joining Date:</span>
                  <span className="font-semibold">{new Date(selectedStaff.joining_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-semibold">{selectedStaff.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-semibold text-xs">{selectedStaff.email}</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
    </div>
  );
};

export default StaffIDCardsPage;

export const StaffIDCardsContent = StaffIDCardsPage;

