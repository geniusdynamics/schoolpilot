// ABOUTME: Test file for DataGrid table rendering with various data states
// ABOUTME: Tests empty modules array, missing/undefined properties, loading states, and console error prevention

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DataGrid, { DataGridColumn } from '@/components/ui/data/DataGrid';

// Mock module interface for testing
interface Module {
  id: string;
  name: string;
  version?: string;
  status: 'active' | 'inactive' | 'pending';
  description?: string;
  lastUpdated?: string;
  author?: string;
  isEnabled: boolean;
}

// Complete modules data for testing all properties
const completeModulesData: Module[] = [
  {
    id: 'mod1',
    name: 'Academic Management',
    version: '1.2.3',
    status: 'active',
    description: 'Comprehensive academic management system',
    lastUpdated: '2024-01-15',
    author: 'EduGen Team',
    isEnabled: true
  },
  {
    id: 'mod2',
    name: 'Financial Tracking',
    version: '2.1.0',
    status: 'inactive',
    description: 'Financial tracking and reporting module',
    lastUpdated: '2024-01-10',
    author: 'Finance Team',
    isEnabled: false
  },
  {
    id: 'mod3',
    name: 'Student Portal',
    version: '1.0.5',
    status: 'pending',
    description: 'Student information and services portal',
    lastUpdated: '2024-01-20',
    author: 'Portal Team',
    isEnabled: true
  }
];

// Modules with missing/undefined properties
const incompleteModulesData: Module[] = [
  {
    id: 'mod1',
    name: 'Incomplete Module 1',
    version: undefined,
    status: 'active',
    description: undefined,
    lastUpdated: undefined,
    author: undefined,
    isEnabled: true
  },
  {
    id: 'mod2',
    name: 'Incomplete Module 2',
    status: 'inactive',
    isEnabled: false
  } as Module, // Type assertion to allow missing properties
];

// Column definitions for modules table
const moduleColumns: DataGridColumn<Module>[] = [
  { key: 'id', header: 'ID', sortable: true, filterable: true },
  { key: 'name', header: 'Module Name', sortable: true, filterable: true },
  { key: 'version', header: 'Version', sortable: true, filterable: true },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    filterable: true,
    render: (value) => (
      <span className={`px-2 py-1 rounded text-xs ${
        value === 'active' ? 'bg-green-100 text-green-800' :
        value === 'inactive' ? 'bg-red-100 text-red-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        {value?.charAt(0).toUpperCase() + value?.slice(1)}
      </span>
    )
  },
  { key: 'description', header: 'Description', filterable: true },
  { key: 'lastUpdated', header: 'Last Updated', sortable: true },
  { key: 'author', header: 'Author', filterable: true },
  {
    key: 'isEnabled',
    header: 'Enabled',
    sortable: true,
    render: (value) => (
      <span className={`px-2 py-1 rounded text-xs ${
        value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {value ? 'Yes' : 'No'}
      </span>
    )
  }
];

describe('DataGrid Table Rendering - Various Data States', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock console methods to track warnings and errors
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('1. Test with Empty Modules Array', () => {
    it('displays custom empty state message when no modules are provided', () => {
      const customEmptyState = (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">ðŸ“¦</div>
          <div className="text-lg font-medium text-surface-foreground mb-2">No modules available</div>
          <div className="text-surface-muted-fg">Add your first module to get started</div>
        </div>
      );

      render(
        <DataGrid
          columns={moduleColumns}
          data={[]}
          emptyState={customEmptyState}
        />
      );

      expect(screen.getByText('No modules available')).toBeInTheDocument();
      expect(screen.getByText('Add your first module to get started')).toBeInTheDocument();
      expect(screen.getByText('ðŸ“¦')).toBeInTheDocument();
    });

    it('displays default empty state when no custom empty state is provided', () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={[]}
        />
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText('ðŸ“Š')).toBeInTheDocument();
    });

    it('renders table headers even when data is empty', () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={[]}
        />
      );

      // Check that all column headers are rendered
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Module Name')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();
      expect(screen.getByText('Author')).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });
  });

  describe('2. Test with Modules Having Missing/Undefined Properties', () => {
    it('handles undefined properties gracefully with default fallback', () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={incompleteModulesData}
        />
      );

      // Should display module names that are present
      expect(screen.getByText('Incomplete Module 1')).toBeInTheDocument();
      expect(screen.getByText('Incomplete Module 2')).toBeInTheDocument();

      // Should display default '-' for undefined properties
      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThan(0);
    });

    it('renders status badges correctly even with incomplete data', () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={incompleteModulesData}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders boolean properties correctly for incomplete data', () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={incompleteModulesData}
        />
      );

      const yesElements = screen.getAllByText('Yes');
      const noElements = screen.getAllByText('No');
      
      expect(yesElements.length).toBe(1); // One module with isEnabled: true
      expect(noElements.length).toBe(1);  // One module with isEnabled: false
    });

    it('handles missing properties without causing render errors', async () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={incompleteModulesData}
        />
      );

      // Wait a moment to ensure rendering is complete
      await waitFor(() => {
        expect(screen.getByText('Incomplete Module 1')).toBeInTheDocument();
      });

      // Should not have thrown any errors during rendering
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('3. Test with All Module Properties Populated', () => {
    it('displays all module data correctly when fully populated', () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={completeModulesData}
        />
      );

      // Check that all module names are displayed
      expect(screen.getByText('Academic Management')).toBeInTheDocument();
      expect(screen.getByText('Financial Tracking')).toBeInTheDocument();
      expect(screen.getByText('Student Portal')).toBeInTheDocument();

      // Check versions
      expect(screen.getByText('1.2.3')).toBeInTheDocument();
      expect(screen.getByText('2.1.0')).toBeInTheDocument();
      expect(screen.getByText('1.0.5')).toBeInTheDocument();

      // Check descriptions
      expect(screen.getByText('Comprehensive academic management system')).toBeInTheDocument();
      expect(screen.getByText('Financial tracking and reporting module')).toBeInTheDocument();
      expect(screen.getByText('Student information and services portal')).toBeInTheDocument();

      // Check authors
      expect(screen.getByText('EduGen Team')).toBeInTheDocument();
      expect(screen.getByText('Finance Team')).toBeInTheDocument();
      expect(screen.getByText('Portal Team')).toBeInTheDocument();
    });

    it('renders status badges with correct styling for all statuses', () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={completeModulesData}
        />
      );

      const activeStatus = screen.getByText('Active');
      const inactiveStatus = screen.getByText('Inactive');
      const pendingStatus = screen.getByText('Pending');

      expect(activeStatus).toHaveClass('bg-green-100', 'text-green-800');
      expect(inactiveStatus).toHaveClass('bg-red-100', 'text-red-800');
      expect(pendingStatus).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('renders boolean enabled/disabled status correctly', () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={completeModulesData}
        />
      );

      const yesElements = screen.getAllByText('Yes');
      const noElements = screen.getAllByText('No');

      expect(yesElements.length).toBe(2); // Two modules enabled
      expect(noElements.length).toBe(1);  // One module disabled

      // Check styling
      yesElements.forEach(element => {
        expect(element).toHaveClass('bg-green-100', 'text-green-800');
      });

      noElements.forEach(element => {
        expect(element).toHaveClass('bg-red-100', 'text-red-800');
      });
    });
  });

  describe('4. Verify Loading, Empty, and Populated States Render Correctly', () => {
    it('displays custom loading state when loading is true', () => {
      const customLoadingState = (
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse flex items-center">
            <div className="h-4 w-4 bg-primary-400 rounded-full mr-3"></div>
            <span className="text-surface-muted-fg">Loading modules data...</span>
          </div>
        </div>
      );

      render(
        <DataGrid
          columns={moduleColumns}
          data={[]}
          loading={true}
          loadingState={customLoadingState}
        />
      );

      expect(screen.getByText('Loading modules data...')).toBeInTheDocument();
    });

    it('displays default skeleton loader when loading without custom state', () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={[]}
          loading={true}
        />
      );

      // Check that loading state is displayed (SkeletonLoader should be rendered)
      const tableBody = screen.getByRole('table').querySelector('tbody');
      expect(tableBody).toBeInTheDocument();
    });

    it('transitions correctly from loading to populated state', async () => {
      const { rerender } = render(
        <DataGrid
          columns={moduleColumns}
          data={[]}
          loading={true}
          loadingState={<div>Loading...</div>}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Simulate data loading completion
      rerender(
        <DataGrid
          columns={moduleColumns}
          data={completeModulesData}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        expect(screen.getByText('Academic Management')).toBeInTheDocument();
      });
    });

    it('transitions correctly from loading to empty state', async () => {
      const { rerender } = render(
        <DataGrid
          columns={moduleColumns}
          data={[]}
          loading={true}
          loadingState={<div>Loading...</div>}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Simulate loading completion with no data
      rerender(
        <DataGrid
          columns={moduleColumns}
          data={[]}
          loading={false}
          emptyState={<div>No modules found</div>}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        expect(screen.getByText('No modules found')).toBeInTheDocument();
      });
    });
  });

  describe('5. Ensure No Console Errors About Undefined Properties', () => {
    it('does not generate console warnings for undefined properties in complete data', async () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={completeModulesData}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Academic Management')).toBeInTheDocument();
      });

      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('generates expected validation warnings for incomplete data but no errors', async () => {
      render(
        <DataGrid
          columns={moduleColumns}
          data={incompleteModulesData}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Incomplete Module 1')).toBeInTheDocument();
      });

      // Should have warnings for missing fields (this is expected behavior)
      expect(consoleWarnSpy).toHaveBeenCalled();
      // But should not have any render errors
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('handles null and undefined values with appropriate warnings but no errors', async () => {
      const nullUndefinedData: Module[] = [
        {
          id: 'test1',
          name: 'Test Module',
          version: null as any,
          status: 'active',
          description: undefined,
          lastUpdated: null as any,
          author: undefined,
          isEnabled: true
        }
      ];

      render(
        <DataGrid
          columns={moduleColumns}
          data={nullUndefinedData}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Module')).toBeInTheDocument();
      });

      // Should warn about missing data but not crash
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('handles completely empty objects without crashing', async () => {
      const emptyObjectData = [{}] as Module[];

      render(
        <DataGrid
          columns={moduleColumns}
          data={emptyObjectData}
        />
      );

      // Should render without crashing
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Error'));
    });

    it('validates data structure and provides warnings appropriately', async () => {
      // This test ensures our validation system works as expected
      const invalidData = [
        { id: 'valid', name: 'Valid Module', status: 'active', isEnabled: true },
        // Missing required properties should trigger validation warnings but not errors
        { id: null, name: null } as any
      ];

      render(
        <DataGrid
          columns={moduleColumns}
          data={invalidData}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Valid Module')).toBeInTheDocument();
      });

      // May have validation warnings but should not have render errors
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Error'));
    });
  });

  describe('6. Integration Tests - State Combinations', () => {
    it('handles rapid state changes without memory leaks or errors', async () => {
      const { rerender } = render(
        <DataGrid
          columns={moduleColumns}
          data={[]}
          loading={true}
        />
      );

      // Rapid state changes: loading -> empty -> populated -> loading -> populated
      rerender(<DataGrid columns={moduleColumns} data={[]} loading={false} />);
      rerender(<DataGrid columns={moduleColumns} data={completeModulesData} loading={false} />);
      rerender(<DataGrid columns={moduleColumns} data={completeModulesData} loading={true} />);
      rerender(<DataGrid columns={moduleColumns} data={incompleteModulesData} loading={false} />);

      await waitFor(() => {
        expect(screen.getByText('Incomplete Module 1')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('maintains table structure integrity across all data states', () => {
      const states = [
        { data: [], loading: false, name: 'empty' },
        { data: [], loading: true, name: 'loading' },
        { data: completeModulesData, loading: false, name: 'populated' },
        { data: incompleteModulesData, loading: false, name: 'incomplete' }
      ];

      states.forEach(state => {
        const { unmount } = render(
          <DataGrid
            columns={moduleColumns}
            data={state.data}
            loading={state.loading}
          />
        );

        // Every state should render a proper table structure
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        expect(thead).toBeInTheDocument();
        expect(tbody).toBeInTheDocument();

        unmount();
      });
    });
  });
});
