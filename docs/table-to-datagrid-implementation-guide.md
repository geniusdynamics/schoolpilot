# Table to DataGrid Implementation Guide

## Quick Reference Migration Checklist

### Pre-Migration Checklist
- [ ] Identify current Table usage patterns
- [ ] Review data structure and types
- [ ] Plan enhanced features (sorting, filtering, selection)
- [ ] Backup current implementation

### Migration Steps
- [ ] Update imports
- [ ] Convert column definitions
- [ ] Update component usage
- [ ] Add enhanced features
- [ ] Test functionality
- [ ] Update styling if needed

## Detailed Implementation Examples

### Example 1: Basic Migration (AcademicYearsPage)

#### Before (Table Implementation)
```typescript
import Table from '@/components/ui/Table';

const columns = [
  { header: 'ID', accessor: 'id' as keyof AcademicYear },
  { header: 'Year Name', accessor: 'name' as keyof AcademicYear },
  { header: 'Structure', accessor: 'structure_name' as keyof AcademicYear },
  { 
    header: 'Start Date', 
    accessor: 'start_date' as keyof AcademicYear, 
    render: (item: AcademicYear) => new Date(item.start_date).toLocaleDateString() 
  },
  { 
    header: 'End Date', 
    accessor: 'end_date' as keyof AcademicYear, 
    render: (item: AcademicYear) => new Date(item.end_date).toLocaleDateString() 
  },
  {
    header: 'Actions',
    accessor: 'id' as keyof AcademicYear,
    render: (item: AcademicYear) => (
      <div className="space-x-2">
        <Button size="sm" variant="ghost" onClick={() => openModal(item)}>
          <EditIcon className="w-4 h-4" />Edit
        </Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>
          <DeleteIcon className="w-4 h-4" />Delete
        </Button>
      </div>
    )
  }
];

<Table
  columns={columns}
  data={academicYears}
  isLoading={loading}
  emptyStateMessage="No academic years found."
/>
```

#### After (DataGrid Implementation)
```typescript
import DataGrid from '@/components/ui/data/DataGrid';
import type { DataGridColumn } from '@/components/ui/data/DataGrid';

const columns: DataGridColumn<AcademicYear>[] = [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: 80
  },
  {
    key: 'name',
    header: 'Year Name',
    sortable: true,
    filterable: true
  },
  {
    key: 'structure_name',
    header: 'Structure',
    sortable: true,
    filterable: true
  },
  {
    key: 'start_date',
    header: 'Start Date',
    sortable: true,
    render: (value, row) => new Date(value).toLocaleDateString()
  },
  {
    key: 'end_date',
    header: 'End Date',
    sortable: true,
    render: (value, row) => new Date(value).toLocaleDateString()
  },
  {
    key: 'actions',
    header: 'Actions',
    width: 200,
    render: (_, row) => (
      <div className="flex space-x-2">
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => openModal(row)}
          leftIcon={<EditIcon className="w-4 h-4" />}
        >
          Edit
        </Button>
        <Button 
          size="sm" 
          variant="danger" 
          onClick={() => handleDelete(row.id)}
          leftIcon={<DeleteIcon className="w-4 h-4" />}
        >
          Delete
        </Button>
      </div>
    )
  }
];

<DataGrid
  columns={columns}
  data={academicYears}
  loading={loading}
  sortable={true}
  filterable={true}
  emptyState={
    <div className="text-center py-12">
      <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">No academic years</h3>
      <p className="mt-1 text-sm text-gray-500">Get started by creating a new academic year.</p>
      <div className="mt-6">
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-4 h-4" />}>
          Add Academic Year
        </Button>
      </div>
    </div>
  }
  className="mt-6"
/>
```

### Example 2: Advanced Migration with Selection (StudentsListPage)

```typescript
import { useState } from 'react';
import DataGrid from '@/components/ui/data/DataGrid';
import type { DataGridColumn } from '@/components/ui/data/DataGrid';

const StudentsListPage: React.FC = () => {
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const columns: DataGridColumn<Student>[] = [
    {
      key: 'admission_no',
      header: 'Admission No',
      sortable: true,
      filterable: true,
      sticky: true,
      width: 120
    },
    {
      key: 'full_name',
      header: 'Full Name',
      sortable: true,
      filterable: true,
      render: (_, row) => `${row.first_name} ${row.last_name}`
    },
    {
      key: 'gender',
      header: 'Gender',
      sortable: true,
      filterable: true,
      width: 100,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'MALE' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
          value === 'INACTIVE' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'current_class_stream_name',
      header: 'Class',
      sortable: true,
      filterable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 150,
      render: (_, row) => (
        <div className="flex space-x-1">
          <Button size="sm" variant="ghost" onClick={() => viewStudent(row.id)}>
            <UserCircleIcon className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => editStudent(row)}>
            <EditIcon className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="danger" onClick={() => deleteStudent(row.id)}>
            <DeleteIcon className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
    // Implement sorting logic or API call
  };

  const handleFilter = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    // Implement filtering logic or API call
  };

  const handleSelectionChange = (selected: Student[]) => {
    setSelectedStudents(selected);
  };

  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'activate':
        // Bulk activate students
        break;
      case 'deactivate':
        // Bulk deactivate students
        break;
      case 'export':
        // Export selected students
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      {selectedStudents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedStudents.length} student(s) selected
            </span>
            <div className="flex space-x-2">
              <Button size="sm" onClick={() => handleBulkAction('activate')}>
                Activate
              </Button>
              <Button size="sm" onClick={() => handleBulkAction('deactivate')}>
                Deactivate
              </Button>
              <Button size="sm" onClick={() => handleBulkAction('export')}>
                Export
              </Button>
            </div>
          </div>
        </div>
      )}

      <DataGrid
        columns={columns}
        data={students}
        loading={loading}
        sortable={true}
        filterable={true}
        selectable={true}
        onSort={handleSort}
        onFilter={handleFilter}
        onSelectionChange={handleSelectionChange}
        emptyState={
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first student.
            </p>
            <div className="mt-6">
              <Button onClick={handleAddStudent} leftIcon={<PlusIcon className="w-4 h-4" />}>
                Add Student
              </Button>
            </div>
          </div>
        }
        className="bg-white shadow rounded-lg"
      />
    </div>
  );
};
```

### Example 3: Complex Data with Nested Objects (InventoryPage)

```typescript
const columns: DataGridColumn<InventoryItem>[] = [
  {
    key: 'item_code',
    header: 'Item Code',
    sortable: true,
    filterable: true,
    sticky: true,
    width: 120
  },
  {
    key: 'name',
    header: 'Item Name',
    sortable: true,
    filterable: true
  },
  {
    key: 'category',
    header: 'Category',
    sortable: true,
    filterable: true,
    render: (_, row) => row.category?.name || 'N/A'
  },
  {
    key: 'current_stock',
    header: 'Stock Level',
    sortable: true,
    align: 'right',
    render: (value, row) => (
      <div className="text-right">
        <div className={`font-medium ${
          value <= row.minimum_stock ? 'text-red-600' :
          value <= row.reorder_level ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {value.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500">
          Min: {row.minimum_stock}
        </div>
      </div>
    )
  },
  {
    key: 'unit_price',
    header: 'Unit Price',
    sortable: true,
    align: 'right',
    render: (value) => (
      <span className="font-mono">
        ${value.toFixed(2)}
      </span>
    )
  },
  {
    key: 'total_value',
    header: 'Total Value',
    sortable: true,
    align: 'right',
    render: (_, row) => (
      <span className="font-mono font-medium">
        ${(row.current_stock * row.unit_price).toFixed(2)}
      </span>
    )
  },
  {
    key: 'last_updated',
    header: 'Last Updated',
    sortable: true,
    render: (value) => (
      <div className="text-sm">
        <div>{new Date(value).toLocaleDateString()}</div>
        <div className="text-gray-500">
          {new Date(value).toLocaleTimeString()}
        </div>
      </div>
    )
  }
];
```

## Common Migration Patterns

### 1. Status Badges
```typescript
const renderStatus = (status: string) => {
  const statusConfig = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
    INACTIVE: { bg: 'bg-red-100', text: 'text-red-800', label: 'Inactive' },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' }
  };
  
  const config = statusConfig[status] || statusConfig.PENDING;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};
```

### 2. Date Formatting
```typescript
const renderDate = (date: string, includeTime = false) => {
  const dateObj = new Date(date);
  return (
    <div className="text-sm">
      <div>{dateObj.toLocaleDateString()}</div>
      {includeTime && (
        <div className="text-gray-500 text-xs">
          {dateObj.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};
```

### 3. Currency Formatting
```typescript
const renderCurrency = (amount: number, currency = 'USD') => (
  <span className="font-mono">
    {new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)}
  </span>
);
```

### 4. Action Buttons
```typescript
const renderActions = (row: any, actions: Array<{label: string, icon: any, onClick: (row: any) => void, variant?: string}>) => (
  <div className="flex space-x-1">
    {actions.map((action, index) => (
      <Button
        key={index}
        size="sm"
        variant={action.variant || 'ghost'}
        onClick={() => action.onClick(row)}
        title={action.label}
      >
        <action.icon className="w-4 h-4" />
      </Button>
    ))}
  </div>
);
```

## Performance Optimization Tips

### 1. Memoize Column Definitions
```typescript
const columns = useMemo<DataGridColumn<ItemType>[]>(() => [
  // column definitions
], []);
```

### 2. Optimize Render Functions
```typescript
const renderStatus = useCallback((status: string) => {
  // render logic
}, []);
```

### 3. Virtual Scrolling for Large Datasets
```typescript
// For datasets > 1000 items, consider implementing virtual scrolling
const pagination = {
  page: currentPage,
  pageSize: 50,
  total: totalItems
};
```

## Testing Checklist

### Functional Testing
- [ ] Data displays correctly
- [ ] Sorting works for all sortable columns
- [ ] Filtering works for all filterable columns
- [ ] Selection works (if enabled)
- [ ] Actions work correctly
- [ ] Empty state displays properly
- [ ] Loading state displays properly

### Visual Testing
- [ ] Responsive design works on mobile
- [ ] Styling is consistent with design system
- [ ] Icons and buttons are properly aligned
- [ ] Text truncation works for long content
- [ ] Hover states work correctly

### Performance Testing
- [ ] Page loads quickly with large datasets
- [ ] Sorting is responsive
- [ ] Filtering is responsive
- [ ] No memory leaks during interactions

## Troubleshooting Common Issues

### Issue 1: "data is not iterable"
**Cause:** Data prop is not an array
**Solution:** Ensure data is always an array, use `data || []` as fallback

### Issue 2: Sorting not working
**Cause:** Missing sortable prop or incorrect key
**Solution:** Verify column key matches data property and sortable is true

### Issue 3: Custom rendering not displaying
**Cause:** Incorrect render function signature
**Solution:** Use `(value, row) => ReactNode` signature

### Issue 4: Performance issues with large datasets
**Cause:** Too many items rendered at once
**Solution:** Implement pagination or virtual scrolling

### Issue 5: Styling inconsistencies
**Cause:** Missing or incorrect CSS classes
**Solution:** Use design system classes and verify responsive breakpoints

## Migration Validation Script

```typescript
// Add this to validate successful migration
const validateDataGridMigration = (component: string) => {
  const checks = {
    hasDataGridImport: false,
    hasColumnDefinitions: false,
    hasProperProps: false,
    hasEmptyState: false
  };
  
  // Implementation would check file contents
  // This is a conceptual example
  
  console.log(`Migration validation for ${component}:`, checks);
};
```

This implementation guide provides comprehensive examples and patterns for successfully migrating from the legacy Table component to the modern DataGrid component while maintaining functionality and improving user experience.