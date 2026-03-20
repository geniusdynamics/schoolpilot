import React, { useState, useMemo } from 'react';
import DataGrid, { DataGridColumn } from './DataGrid';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export interface TaskItem {
  id: string | number;
  name: string;
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'to_test' | 'new' | 'closed';
  teams: string;
  assigned: string;
  priority: number;
  approved: boolean;
  [key: string]: any;
}

export interface DataTableProps {
  data: TaskItem[];
  loading?: boolean;
  onView?: (item: TaskItem) => void;
  onEdit?: (item: TaskItem) => void;
  onDelete?: (item: TaskItem) => void;
  onStatusChange?: (item: TaskItem, newStatus: string) => void;
  selectable?: boolean;
  onSelectionChange?: (selected: TaskItem[]) => void;
  className?: string;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  selectable = false,
  onSelectionChange,
  className = ''
}) => {
  const [sortState, setSortState] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filterState, setFilterState] = useState<Record<string, string>>({});

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'green', icon: CheckCircleIcon, label: 'Active' },
      inactive: { color: 'gray', icon: ClockIcon, label: 'Inactive' },
      pending: { color: 'yellow', icon: ClockIcon, label: 'Pending' },
      completed: { color: 'green', icon: CheckCircleIcon, label: 'Completed' },
      to_test: { color: 'blue', icon: ExclamationCircleIcon, label: 'To Test' },
      new: { color: 'purple', icon: ExclamationCircleIcon, label: 'New' },
      closed: { color: 'gray', icon: CheckCircleIcon, label: 'Closed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <Badge 
        variant={config.color as any}
        className="inline-flex items-center gap-1"
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Priority badge styling
  const getPriorityBadge = (priority: number) => {
    if (priority >= 800) {
      return <Badge variant="red">Critical</Badge>;
    } else if (priority >= 600) {
      return <Badge variant="orange">High</Badge>;
    } else if (priority >= 400) {
      return <Badge variant="yellow">Medium</Badge>;
    } else {
      return <Badge variant="gray">Low</Badge>;
    }
  };

  // Teams badge styling
  const getTeamsBadge = (teams: string) => {
    const teamList = teams.split(',').map(team => team.trim()).filter(Boolean);
    
    if (teamList.length === 0) return <span className="text-gray-400">-</span>;
    
    if (teamList.length === 1) {
      const team = teamList[0];
      const teamColors: Record<string, string> = {
        'devops': 'blue',
        'frontend': 'green',
        'backend': 'purple',
        'api': 'indigo',
        'other': 'gray'
      };
      
      const color = teamColors[team.toLowerCase()] || 'gray';
      return <Badge variant={color as any}>{team}</Badge>;
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {teamList.slice(0, 2).map((team, index) => {
          const teamColors: Record<string, string> = {
            'devops': 'blue',
            'frontend': 'green', 
            'backend': 'purple',
            'api': 'indigo',
            'other': 'gray'
          };
          
          const color = teamColors[team.toLowerCase()] || 'gray';
          return <Badge key={index} variant={color as any} className="text-xs">{team}</Badge>;
        })}
        {teamList.length > 2 && (
          <Badge variant="gray" className="text-xs">+{teamList.length - 2}</Badge>
        )}
      </div>
    );
  };

  // Define columns for the DataGrid
  const columns: DataGridColumn<TaskItem>[] = useMemo(() => [
    {
      key: 'id',
      header: '#',
      width: 60,
      sortable: true,
      render: (value) => (
        <span className="font-mono text-xs text-gray-500">#{value}</span>
      )
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
      render: (value) => (
        <div className="max-w-xs">
          <div className="font-medium text-gray-900 truncate" title={value}>
            {value}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'teams',
      header: 'Teams',
      width: 150,
      filterable: true,
      render: (value) => getTeamsBadge(value)
    },
    {
      key: 'assigned',
      header: 'Assigned',
      width: 140,
      sortable: true,
      filterable: true,
      render: (value) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
            <span className="text-xs font-medium text-gray-600">
              {value ? value.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <span className="text-sm text-gray-900">{value || 'Unassigned'}</span>
        </div>
      )
    },
    {
      key: 'priority',
      header: 'Priority',
      width: 100,
      sortable: true,
      align: 'center' as const,
      render: (value) => (
        <div className="flex flex-col items-center">
          {getPriorityBadge(value)}
          <span className="text-xs text-gray-500 mt-1">{value}</span>
        </div>
      )
    },
    {
      key: 'approved',
      header: 'Approved',
      width: 100,
      sortable: true,
      align: 'center' as const,
      render: (value) => (
        <div className="flex justify-center">
          {value ? (
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          ) : (
            <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      align: 'center' as const,
      render: (_, row) => (
        <div className="flex items-center justify-center space-x-1">
          {onView && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onView(row);
              }}
              title="View details"
            >
              <EyeIcon className="w-4 h-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onEdit(row);
              }}
              title="Edit task"
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onDelete(row);
              }}
              title="Delete task"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ], [onView, onEdit, onDelete]);

  // Handle sorting
  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortState({ key, direction });
  };

  // Handle filtering
  const handleFilter = (filters: Record<string, string>) => {
    setFilterState(filters);
  };

  // Process data for local sorting and filtering
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filtering
    if (Object.keys(filterState).length > 0) {
      result = result.filter(row => {
        return Object.entries(filterState).every(([key, filterValue]) => {
          const cellValue = String(row[key] || '').toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      });
    }

    // Apply sorting
    if (sortState) {
      result.sort((a, b) => {
        const aValue = a[sortState.key];
        const bValue = b[sortState.key];
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortState.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, sortState, filterState]);

  const emptyState = (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📋</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
      <p className="text-gray-500">There are no tasks to display at the moment.</p>
    </div>
  );

  return (
    <DataGrid<TaskItem>
      columns={columns}
      data={processedData}
      loading={loading}
      sortable={true}
      filterable={true}
      selectable={selectable}
      onSort={handleSort}
      onFilter={handleFilter}
      onSelectionChange={onSelectionChange}
      emptyState={emptyState}
      className={className}
    />
  );
};

export default DataTable;
export type { TaskItem, DataTableProps };