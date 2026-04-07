// ABOUTME: Demo component showcasing DataGrid functionality and features
// ABOUTME: Demonstrates sorting, filtering, selection, and responsive design

import React, { useState } from 'react';
import { DataGrid, DataGridColumn } from '../ui/data/DataGrid';

interface SampleData {
  id: number;
  name: string;
  email: string;
  role: string;
  status: boolean;
  joinDate: string;
  salary: number;
}

const sampleData: SampleData[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Administrator',
    status: true,
    joinDate: '2023-01-15',
    salary: 75000
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'Teacher',
    status: true,
    joinDate: '2023-02-20',
    salary: 55000
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    role: 'Staff',
    status: false,
    joinDate: '2023-03-10',
    salary: 45000
  },
  {
    id: 4,
    name: 'Alice Brown',
    email: 'alice.brown@example.com',
    role: 'Teacher',
    status: true,
    joinDate: '2023-04-05',
    salary: 58000
  },
  {
    id: 5,
    name: 'Charlie Wilson',
    email: 'charlie.wilson@example.com',
    role: 'Administrator',
    status: true,
    joinDate: '2023-05-12',
    salary: 80000
  }
];

const DataGridDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<SampleData[]>([]);

  const columns: DataGridColumn<SampleData>[] = [
    {
      key: 'id',
      header: 'ID',
      width: 80,
      align: 'center',
      sortable: true
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
            <span className="text-sm font-medium text-blue-800">
              {row.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      filterable: true,
      render: (value) => (
        <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800">
          {value}
        </a>
      )
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value === 'Administrator' ? 'bg-purple-100 text-purple-800' :
          value === 'Teacher' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      width: 100
    },
    {
      key: 'joinDate',
      header: 'Join Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'salary',
      header: 'Salary',
      align: 'right',
      sortable: true,
      render: (value) => `$${value.toLocaleString()}`
    }
  ];

  const handleRowClick = (row: SampleData) => {
    console.log('Row clicked:', row);
  };

  const handleSelectionChange = (selected: SampleData[]) => {
    setSelectedRows(selected);
    console.log('Selected rows:', selected);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    console.log('Sort:', key, direction);
  };

  const handleFilter = (filters: Record<string, string>) => {
    console.log('Filters:', filters);
  };

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">DataGrid Demo</h2>
        <p className="text-gray-600">
          Modern data grid with sorting, filtering, selection, and responsive design.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={simulateLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Simulate Loading
        </button>
        <div className="text-sm text-gray-600 flex items-center">
          Selected: {selectedRows.length} rows
        </div>
      </div>

      <DataGrid
        columns={columns}
        data={sampleData}
        loading={loading}
        sortable={true}
        filterable={true}
        selectable={true}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        onSort={handleSort}
        onFilter={handleFilter}
        emptyState={
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-lg font-medium text-gray-900 mb-2">No data found</div>
            <div className="text-gray-500">Try adjusting your filters or search criteria</div>
          </div>
        }
      />

      {/* Example with pagination */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">With Pagination</h3>
        <DataGrid
          columns={columns}
          data={sampleData}
          pagination={{
            page: 1,
            pageSize: 3,
            total: sampleData.length,
            showSizeChanger: true,
            pageSizeOptions: [3, 5, 10, 20]
          }}
          selectable={false}
        />
      </div>

      {/* Example with minimal features */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Minimal Configuration</h3>
        <DataGrid
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'role', header: 'Role' }
          ]}
          data={sampleData.slice(0, 3)}
          sortable={false}
          filterable={false}
          selectable={false}
        />
      </div>
    </div>
  );
};

export default DataGridDemo;