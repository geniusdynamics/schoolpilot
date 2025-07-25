// ABOUTME: Integration tests for DataGrid component with real module data structures
// ABOUTME: Tests specific implementations across different modules to ensure compatibility

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DataGrid, { DataGridColumn } from '../components/ui/data/DataGrid';

// Mock data structures from different modules
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_number: string;
  class_name: string;
  status: 'active' | 'inactive' | 'graduated';
  enrollment_date: string;
}

interface StockTransaction {
  id: string;
  item_name: string;
  warehouse_name: string;
  transaction_type: 'in' | 'out';
  quantity: number;
  unit_cost: number;
  transaction_date: string;
  reference_number: string;
}

interface FixedAsset {
  id: string;
  item_name: string;
  asset_tag: string;
  serial_number: string;
  purchase_date: string;
  purchase_cost: number;
  current_value: number;
  depreciation_method: string;
  status: 'active' | 'disposed' | 'maintenance';
}

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  credit_hours: number;
  department: string;
  is_active: boolean;
}

// Mock data
const mockStudents: Student[] = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@school.edu',
    student_number: 'STU001',
    class_name: 'Grade 10A',
    status: 'active',
    enrollment_date: '2024-01-15'
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@school.edu',
    student_number: 'STU002',
    class_name: 'Grade 10B',
    status: 'active',
    enrollment_date: '2024-01-16'
  }
];

const mockStockTransactions: StockTransaction[] = [
  {
    id: '1',
    item_name: 'Laptop Dell Inspiron',
    warehouse_name: 'Main Warehouse',
    transaction_type: 'in',
    quantity: 5,
    unit_cost: 800.00,
    transaction_date: '2024-01-20',
    reference_number: 'PO-2024-001'
  },
  {
    id: '2',
    item_name: 'Office Chair',
    warehouse_name: 'Storage Room A',
    transaction_type: 'out',
    quantity: 2,
    unit_cost: 150.00,
    transaction_date: '2024-01-21',
    reference_number: 'REQ-2024-005'
  }
];

const mockFixedAssets: FixedAsset[] = [
  {
    id: '1',
    item_name: 'Projector Epson',
    asset_tag: 'PROJ-001',
    serial_number: 'EP123456789',
    purchase_date: '2023-08-15',
    purchase_cost: 1200.00,
    current_value: 1000.00,
    depreciation_method: 'Straight Line',
    status: 'active'
  },
  {
    id: '2',
    item_name: 'Server HP ProLiant',
    asset_tag: 'SRV-001',
    serial_number: 'HP987654321',
    purchase_date: '2023-06-10',
    purchase_cost: 3500.00,
    current_value: 2800.00,
    depreciation_method: 'Declining Balance',
    status: 'active'
  }
];

const mockSubjects: Subject[] = [
  {
    id: '1',
    name: 'Mathematics',
    code: 'MATH101',
    description: 'Basic Mathematics',
    credit_hours: 3,
    department: 'Mathematics',
    is_active: true
  },
  {
    id: '2',
    name: 'Physics',
    code: 'PHYS101',
    description: 'Introduction to Physics',
    credit_hours: 4,
    department: 'Science',
    is_active: true
  }
];

describe('DataGrid Integration Tests', () => {
  describe('Students Module Integration', () => {
    const studentColumns: DataGridColumn<Student>[] = [
      { key: 'student_number', header: 'Student #', sortable: true, filterable: true },
      { key: 'first_name', header: 'First Name', sortable: true, filterable: true },
      { key: 'last_name', header: 'Last Name', sortable: true, filterable: true },
      { key: 'email', header: 'Email', filterable: true },
      { key: 'class_name', header: 'Class', sortable: true, filterable: true },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (value) => (
          <span className={`px-2 py-1 rounded text-xs ${
            value === 'active' ? 'bg-green-100 text-green-800' :
            value === 'inactive' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        )
      },
      {
        key: 'enrollment_date',
        header: 'Enrollment Date',
        sortable: true,
        render: (value) => new Date(value).toLocaleDateString()
      }
    ];

    it('renders student data correctly', () => {
      render(<DataGrid columns={studentColumns} data={mockStudents} />);
      
      expect(screen.getByText('STU001')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@school.edu')).toBeInTheDocument();
      expect(screen.getByText('Grade 10A')).toBeInTheDocument();
    });

    it('handles student status rendering', () => {
      render(<DataGrid columns={studentColumns} data={mockStudents} />);
      
      const statusElements = screen.getAllByText('Active');
      expect(statusElements).toHaveLength(2);
      
      // Check for proper CSS classes
      statusElements.forEach(element => {
        expect(element).toHaveClass('bg-green-100', 'text-green-800');
      });
    });

    it('handles student filtering', async () => {
      const user = userEvent.setup();
      
      render(<DataGrid columns={studentColumns} data={mockStudents} filterable={true} />);
      
      // Open filters
      const filterButton = screen.getByText('Filters');
      await user.click(filterButton);
      
      // Filter by first name
      const filterInputs = screen.getAllByRole('textbox');
      const firstNameFilter = filterInputs.find(input => 
        input.getAttribute('placeholder')?.includes('first_name')
      ) || filterInputs[0];
      
      if (firstNameFilter) {
        await user.type(firstNameFilter, 'John');
        expect(firstNameFilter).toHaveValue('John');
      }
    });
  });

  describe('Inventory Module Integration', () => {
    const stockTransactionColumns: DataGridColumn<StockTransaction>[] = [
      { key: 'reference_number', header: 'Reference #', sortable: true, filterable: true },
      { key: 'item_name', header: 'Item', sortable: true, filterable: true },
      { key: 'warehouse_name', header: 'Warehouse', sortable: true, filterable: true },
      {
        key: 'transaction_type',
        header: 'Type',
        sortable: true,
        render: (value) => (
          <span className={`px-2 py-1 rounded text-xs ${
            value === 'in' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
          }`}>
            {value.toUpperCase()}
          </span>
        )
      },
      {
        key: 'quantity',
        header: 'Quantity',
        sortable: true,
        align: 'right' as const
      },
      {
        key: 'unit_cost',
        header: 'Unit Cost',
        sortable: true,
        align: 'right' as const,
        render: (value) => `$${value.toFixed(2)}`
      },
      {
        key: 'transaction_date',
        header: 'Date',
        sortable: true,
        render: (value) => new Date(value).toLocaleDateString()
      }
    ];

    it('renders stock transaction data correctly', () => {
      render(<DataGrid columns={stockTransactionColumns} data={mockStockTransactions} />);
      
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('Laptop Dell Inspiron')).toBeInTheDocument();
      expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
      expect(screen.getByText('$800.00')).toBeInTheDocument();
    });

    it('handles transaction type rendering', () => {
      render(<DataGrid columns={stockTransactionColumns} data={mockStockTransactions} />);
      
      expect(screen.getByText('IN')).toBeInTheDocument();
      expect(screen.getByText('OUT')).toBeInTheDocument();
      
      const inElement = screen.getByText('IN');
      const outElement = screen.getByText('OUT');
      
      expect(inElement).toHaveClass('bg-blue-100', 'text-blue-800');
      expect(outElement).toHaveClass('bg-orange-100', 'text-orange-800');
    });

    it('handles numeric sorting for quantities', async () => {
      const user = userEvent.setup();
      
      render(<DataGrid columns={stockTransactionColumns} data={mockStockTransactions} />);
      
      const quantityHeader = screen.getByText('Quantity').closest('th');
      await user.click(quantityHeader!);
      
      // After sorting, 2 should come before 5
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('2'); // First data row
      expect(rows[2]).toHaveTextContent('5'); // Second data row
    });
  });

  describe('Fixed Assets Integration', () => {
    const fixedAssetColumns: DataGridColumn<FixedAsset>[] = [
      { key: 'asset_tag', header: 'Asset Tag', sortable: true, filterable: true },
      { key: 'item_name', header: 'Item Name', sortable: true, filterable: true },
      { key: 'serial_number', header: 'Serial No.', filterable: true },
      {
        key: 'purchase_cost',
        header: 'Purchase Cost',
        sortable: true,
        align: 'right' as const,
        render: (value) => `$${value.toLocaleString()}`
      },
      {
        key: 'current_value',
        header: 'Current Value',
        sortable: true,
        align: 'right' as const,
        render: (value) => `$${value.toLocaleString()}`
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (value) => (
          <span className={`px-2 py-1 rounded text-xs ${
            value === 'active' ? 'bg-green-100 text-green-800' :
            value === 'disposed' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        )
      }
    ];

    it('renders fixed asset data correctly', () => {
      render(<DataGrid columns={fixedAssetColumns} data={mockFixedAssets} />);
      
      expect(screen.getByText('PROJ-001')).toBeInTheDocument();
      expect(screen.getByText('Projector Epson')).toBeInTheDocument();
      expect(screen.getByText('EP123456789')).toBeInTheDocument();
      expect(screen.getByText('$1,200')).toBeInTheDocument();
      expect(screen.getByText('$1,000')).toBeInTheDocument();
    });

    it('handles serial number filtering', async () => {
      const user = userEvent.setup();
      
      render(<DataGrid columns={fixedAssetColumns} data={mockFixedAssets} filterable={true} />);
      
      // Open filters
      const filterButton = screen.getByText('Filters');
      await user.click(filterButton);
      
      // Filter by serial number
      const filterInputs = screen.getAllByRole('textbox');
      const serialFilter = filterInputs.find(input => 
        input.getAttribute('placeholder')?.includes('serial_number')
      ) || filterInputs[0];
      
      if (serialFilter) {
        await user.type(serialFilter, 'EP123');
        expect(serialFilter).toHaveValue('EP123');
      }
    });
  });

  describe('Academics Module Integration', () => {
    const subjectColumns: DataGridColumn<Subject>[] = [
      { key: 'code', header: 'Code', sortable: true, filterable: true },
      { key: 'name', header: 'Subject Name', sortable: true, filterable: true },
      { key: 'department', header: 'Department', sortable: true, filterable: true },
      {
        key: 'credit_hours',
        header: 'Credit Hours',
        sortable: true,
        align: 'center' as const
      },
      {
        key: 'is_active',
        header: 'Status',
        sortable: true,
        render: (value) => (
          <span className={`px-2 py-1 rounded text-xs ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Active' : 'Inactive'}
          </span>
        )
      }
    ];

    it('renders subject data correctly', () => {
      render(<DataGrid columns={subjectColumns} data={mockSubjects} />);
      
      expect(screen.getByText('MATH101')).toBeInTheDocument();
      expect(screen.getAllByText('Mathematics')).toHaveLength(2); // Subject name and department
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('PHYS101')).toBeInTheDocument();
      expect(screen.getByText('Physics')).toBeInTheDocument();
      expect(screen.getByText('Science')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('handles boolean status rendering', () => {
      render(<DataGrid columns={subjectColumns} data={mockSubjects} />);
      
      const activeElements = screen.getAllByText('Active');
      expect(activeElements).toHaveLength(2);
      
      activeElements.forEach(element => {
        expect(element).toHaveClass('bg-green-100', 'text-green-800');
      });
    });
  });

  describe('Cross-Module Features', () => {
    it('handles selection across different data types', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      
      const columns: DataGridColumn<Student>[] = [
        { key: 'student_number', header: 'Student #' },
        { key: 'first_name', header: 'First Name' }
      ];
      
      render(
        <DataGrid
          columns={columns}
          data={mockStudents}
          selectable={true}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      const firstRowCheckbox = checkboxes[1];
      
      await user.click(firstRowCheckbox);
      
      expect(onSelectionChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: mockStudents[0].id })]));
    });

    it('handles pagination with different data structures', () => {
      const pagination = {
        page: 1,
        pageSize: 1,
        total: 2
      };
      
      const columns: DataGridColumn<StockTransaction>[] = [
        { key: 'reference_number', header: 'Reference #' },
        { key: 'item_name', header: 'Item' }
      ];
      
      render(
        <DataGrid
          columns={columns}
          data={mockStockTransactions}
          pagination={pagination}
        />
      );
      
      // Should show pagination controls
      expect(screen.getAllByText('Next')).toHaveLength(2); // Mobile and desktop
      expect(screen.getAllByText('Previous')).toHaveLength(2);
    });

    it('handles empty states for different modules', () => {
      const columns: DataGridColumn<FixedAsset>[] = [
        { key: 'asset_tag', header: 'Asset Tag' },
        { key: 'item_name', header: 'Item Name' }
      ];
      
      const customEmptyState = (
        <div className="text-center py-8">
          <p className="text-gray-500">No fixed assets found</p>
          <p className="text-sm text-gray-400">Add your first asset to get started</p>
        </div>
      );
      
      render(
        <DataGrid
          columns={columns}
          data={[]}
          emptyState={customEmptyState}
        />
      );
      
      expect(screen.getByText('No fixed assets found')).toBeInTheDocument();
      expect(screen.getByText('Add your first asset to get started')).toBeInTheDocument();
    });
  });
});