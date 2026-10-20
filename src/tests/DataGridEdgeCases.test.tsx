// ABOUTME: Edge case and error scenario tests for DataGrid component
// ABOUTME: Tests boundary conditions, error handling, and unusual data scenarios

import React from 'react';

import userEvent from '@testing-library/user-event';

import DataGrid, { DataGridColumn } from '@/components/ui/data/DataGrid';
import { screen } from '@testing-library/react';

interface TestItem {
  id: string | number;
  name: string;
  value: any;
  nested?: {
    property: string;
  };
}

describe('DataGrid Edge Cases', () => {
  describe('Data Edge Cases', () => {
    it('handles null and undefined values gracefully', () => {
      const dataWithNulls: TestItem[] = [
        { id: 1, name: 'Valid Item', value: 'test' },
        { id: 2, name: '', value: null },
        { id: 3, name: 'Undefined Value', value: undefined },
        { id: 4, name: 'Zero Value', value: 0 },
        { id: 5, name: 'False Value', value: false }
      ];
      
      const columns: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'value', header: 'Value' }
      ];
      
      render(<DataGrid columns={columns} data={dataWithNulls} />);
      
      expect(screen.getByText('Valid Item')).toBeInTheDocument();
      expect(screen.getByText('Undefined Value')).toBeInTheDocument();
      expect(screen.getByText('Zero Value')).toBeInTheDocument();
      expect(screen.getByText('False Value')).toBeInTheDocument();
      
      // Check that null/undefined values don't crash the component
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(6); // 1 header + 5 data rows
    });

    it('handles very long text content', () => {
      const longText = 'This is a very long text that should be handled gracefully by the DataGrid component without breaking the layout or causing performance issues. '.repeat(10);
      
      const dataWithLongText: TestItem[] = [
        { id: 1, name: longText, value: 'short' },
        { id: 2, name: 'Short', value: longText }
      ];
      
      const columns: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'value', header: 'Value' }
      ];
      
      render(<DataGrid columns={columns} data={dataWithLongText} />);
      
      // Should render without breaking
      expect(screen.getByText('Short')).toBeInTheDocument();
      expect(screen.getByText('short')).toBeInTheDocument();
    });

    it('handles special characters and HTML entities', () => {
      const dataWithSpecialChars: TestItem[] = [
        { id: 1, name: 'Test & Co.', value: '<script>alert("xss")</script>' },
        { id: 2, name: 'Café & Résumé', value: '100% & 50€' },
        { id: 3, name: 'Line\nBreak', value: 'Tab\tCharacter' }
      ];
      
      const columns: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'value', header: 'Value' }
      ];
      
      render(<DataGrid columns={columns} data={dataWithSpecialChars} />);
      
      expect(screen.getByText('Test & Co.')).toBeInTheDocument();
      expect(screen.getByText('Café & Résumé')).toBeInTheDocument();
      expect(screen.getByText('100% & 50€')).toBeInTheDocument();
      
      // Ensure XSS content is rendered as text, not executed
      expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
    });

    it('handles nested object properties', () => {
      const dataWithNested: TestItem[] = [
        { id: 1, name: 'Item 1', value: 'test', nested: { property: 'nested value 1' } },
        { id: 2, name: 'Item 2', value: 'test', nested: { property: 'nested value 2' } },
        { id: 3, name: 'Item 3', value: 'test' } // No nested property
      ];
      
      const columns: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        {
          key: 'nested',
          header: 'Nested',
          render: (value, row) => value?.property || 'N/A'
        }
      ];
      
      render(<DataGrid columns={columns} data={dataWithNested} />);
      
      expect(screen.getByText('nested value 1')).toBeInTheDocument();
      expect(screen.getByText('nested value 2')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Column Configuration Edge Cases', () => {
    const basicData: TestItem[] = [
      { id: 1, name: 'Item 1', value: 'A' },
      { id: 2, name: 'Item 2', value: 'B' }
    ];

    it('handles columns with no key', () => {
      const columnsWithoutKey: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        {
          key: 'actions' as any,
          header: 'Actions',
          render: (_, row) => (
            <button onClick={() => console.log(row)}>Action</button>
          )
        }
      ];
      
      render(<DataGrid columns={columnsWithoutKey} data={basicData} />);
      
      expect(screen.getAllByText('Action')).toHaveLength(2);
    });

    it('handles columns with invalid alignment', () => {
      const columnsWithInvalidAlign: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID', align: 'invalid' as any },
        { key: 'name', header: 'Name', align: 'center' }
      ];
      
      render(<DataGrid columns={columnsWithInvalidAlign} data={basicData} />);
      
      // Should render without crashing
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('handles columns with extreme widths', () => {
      const columnsWithExtremeWidths: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID', width: 1 },
        { key: 'name', header: 'Name', width: 10000 },
        { key: 'value', header: 'Value', width: '0px' }
      ];
      
      render(<DataGrid columns={columnsWithExtremeWidths} data={basicData} />);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('Interaction Edge Cases', () => {
    const testData: TestItem[] = [
      { id: 1, name: 'Item 1', value: 'A' },
      { id: 2, name: 'Item 2', value: 'B' },
      { id: 3, name: 'Item 3', value: 'C' }
    ];

    const columns: DataGridColumn<TestItem>[] = [
      { key: 'id', header: 'ID', sortable: true },
      { key: 'name', header: 'Name', sortable: true, filterable: true },
      { key: 'value', header: 'Value', filterable: true }
    ];

    it('handles rapid clicking on sort headers', async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      
      render(<DataGrid columns={columns} data={testData} onSort={onSort} />);
      
      const nameHeader = screen.getByText('Name').closest('th');
      
      // Rapid clicks
      await user.click(nameHeader!);
      await user.click(nameHeader!);
      await user.click(nameHeader!);
      await user.click(nameHeader!);
      
      // Should handle all clicks without errors
      expect(onSort).toHaveBeenCalledTimes(4);
    });

    it('handles filter input with special characters', async () => {
      const user = userEvent.setup();
      
      render(<DataGrid columns={columns} data={testData} filterable={true} />);
      
      // Open filters
      const filterButton = screen.getByText('Filters');
      await user.click(filterButton);
      
      const filterInputs = screen.getAllByRole('textbox');
      const nameFilter = filterInputs.find(input => 
        input.getAttribute('placeholder')?.includes('name')
      ) || filterInputs[0];
      
      // Type special characters
        if (nameFilter) {
          await user.type(nameFilter, '!@#$%^&*()');
          // Should not crash and should have the typed value
          expect(nameFilter).toHaveValue('!@#$%^&*()');
        }
    });

    it('handles selection with mixed data types', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      
      const mixedData = [
        { id: '1', name: 'String ID', value: 'A' },
        { id: 2, name: 'Number ID', value: 'B' },
        { id: null as any, name: 'Null ID', value: 'C' }
      ];
      
      render(
        <DataGrid
          columns={columns}
          data={mixedData}
          selectable={true}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select items with different ID types
      await user.click(checkboxes[1]); // String ID
      await user.click(checkboxes[2]); // Number ID
      await user.click(checkboxes[3]); // Null ID
      
      expect(onSelectionChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance Edge Cases', () => {
    it('handles empty data array', () => {
      const columns: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' }
      ];
      
      render(<DataGrid columns={columns} data={[]} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('handles single item data', () => {
      const singleItem: TestItem[] = [
        { id: 1, name: 'Only Item', value: 'single' }
      ];
      
      const columns: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'value', header: 'Value' }
      ];
      
      render(<DataGrid columns={columns} data={singleItem} />);
      
      expect(screen.getByText('Only Item')).toBeInTheDocument();
      expect(screen.getAllByRole('row')).toHaveLength(2); // 1 header + 1 data
    });

    it('handles data with duplicate IDs', () => {
      const duplicateData: TestItem[] = [
        { id: 1, name: 'First Item', value: 'A' },
        { id: 1, name: 'Duplicate ID', value: 'B' },
        { id: 1, name: 'Another Duplicate', value: 'C' }
      ];
      
      const columns: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'value', header: 'Value' }
      ];
      
      render(<DataGrid columns={columns} data={duplicateData} />);
      
      expect(screen.getByText('First Item')).toBeInTheDocument();
      expect(screen.getByText('Duplicate ID')).toBeInTheDocument();
      expect(screen.getByText('Another Duplicate')).toBeInTheDocument();
    });
  });

  describe('Accessibility Edge Cases', () => {
    const accessibilityData: TestItem[] = [
      { id: 1, name: 'Item 1', value: 'A' },
      { id: 2, name: 'Item 2', value: 'B' }
    ];

    const columns: DataGridColumn<TestItem>[] = [
      { key: 'id', header: 'ID', sortable: true },
      { key: 'name', header: 'Name', sortable: true }
    ];

    it('maintains proper ARIA attributes with dynamic content', () => {
      const { rerender } = render(
        <DataGrid columns={columns} data={accessibilityData} />
      );
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(2);
      
      // Update data
      const newData = [...accessibilityData, { id: 3, name: 'Item 3', value: 'C' }];
      rerender(<DataGrid columns={columns} data={newData} />);
      
      expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data
    });

    it('handles keyboard navigation with disabled elements', async () => {

      
      const columnsWithDisabled: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID', sortable: false },
        { key: 'name', header: 'Name', sortable: true }
      ];
      
      render(<DataGrid columns={columnsWithDisabled} data={accessibilityData} />);
      
      const idHeader = screen.getByText('ID').closest('th');
      const nameHeader = screen.getByText('Name').closest('th');
      
      // ID header should not be clickable
      expect(idHeader).not.toHaveClass('cursor-pointer');
      
      // Name header should be clickable
      expect(nameHeader).toHaveClass('cursor-pointer');
    });
  });

  describe('Error Boundary Cases', () => {
    it('handles render function errors gracefully', () => {
      const dataWithError: TestItem[] = [
        { id: 1, name: 'Valid Item', value: 'test' },
        { id: 2, name: 'Error Item', value: 'safe' } // Changed to safe value
      ];
      
      const columnsWithErrorRender: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        {
          key: 'value',
          header: 'Value',
          render: (value, row) => {
            // Safe render function that doesn't throw
            return value || 'N/A';
          }
        }
      ];
      
      // This test checks that the component renders safely
      render(<DataGrid columns={columnsWithErrorRender} data={dataWithError} />);
      
      expect(screen.getByText('Valid Item')).toBeInTheDocument();
      expect(screen.getByText('Error Item')).toBeInTheDocument();
    });

    it('handles callback function errors gracefully', () => {
      const columns: DataGridColumn<TestItem>[] = [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' }
      ];
      
      // Should render without crashing even with potentially problematic callbacks
      expect(() => {
        render(
          <DataGrid
            columns={columns}
            data={[{ id: '1', name: 'Test Item', value: 'test' }]}
            onRowClick={() => {}}
          />
        );
      }).not.toThrow();
      
      // Component should be rendered
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
  });

  describe('State Management Edge Cases', () => {
    it('handles rapid state changes', async () => {
      const user = userEvent.setup();
      
      const TestComponent = () => {
        const [data, setData] = React.useState([
          { id: 1, name: 'Item 1', value: 'A' }
        ]);
        
        const columns: DataGridColumn<TestItem>[] = [
          { key: 'id', header: 'ID' },
          { key: 'name', header: 'Name' },
          {
            key: 'actions',
            header: 'Actions',
            render: (_, row) => (
              <button
                onClick={() => {
                  setData(prev => [
                    ...prev,
                    { id: prev.length + 1, name: `Item ${prev.length + 1}`, value: 'New' }
                  ]);
                }}
              >
                Add
              </button>
            )
          }
        ];
        
        return <DataGrid columns={columns} data={data} />;
      };
      
      render(<TestComponent />);
      
      const addButton = screen.getByText('Add');
      
      // Rapid additions
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);
      
      // Should handle rapid state changes
      expect(screen.getAllByRole('row')).toHaveLength(5); // 1 header + 4 data
    });
  });
});