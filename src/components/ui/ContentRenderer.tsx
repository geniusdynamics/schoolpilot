import React from 'react';
import DataGrid, { DataGridColumn } from './data/DataGrid';
import Badge from './Badge';
import Button from './Button';
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  Bars3Icon,
  ArrowTrendingUpIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { Tab } from '@/types/tabbedWorkspace';
import { logger } from '@/utils/logging';


export interface ContentRendererProps {
  tab: Tab;
  className?: string;
}

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

// Mock data for demonstration
const mockTasksData: TaskItem[] = [
  {
    id: 1,
    name: 'Degero accesso veruutamen cimentarius v...',
    status: 'active',
    teams: 'devops',
    assigned: 'Mark Lynch',
    priority: 350,
    approved: false
  },
  {
    id: 2,
    name: 'Apto tergo cuppedia defendo.',
    status: 'inactive',
    teams: 'frontend',
    assigned: 'Kimberly Burnette',
    priority: 680,
    approved: false
  },
  {
    id: 3,
    name: 'Aeternus pauci ductus advivo vesper toll...',
    status: 'to_test',
    teams: 'frontend',
    assigned: 'Daniel Sykes',
    priority: 758,
    approved: false
  },
  {
    id: 4,
    name: 'Audacia vix non tergum.',
    status: 'to_test',
    teams: 'frontend, other',
    assigned: 'James Isaacs',
    priority: 95,
    approved: false
  },
  {
    id: 5,
    name: 'Nostrum vulticulus succurro clam.',
    status: 'to_test',
    teams: '',
    assigned: 'Patricia Ramirez',
    priority: 208,
    approved: false
  },
  {
    id: 6,
    name: 'Vapulus usque dapifer stabilis cinnatus a...',
    status: 'new',
    teams: 'devops',
    assigned: 'Daniel Sykes',
    priority: 434,
    approved: false
  },
  {
    id: 7,
    name: 'Apto unus vester.',
    status: 'to_test',
    teams: 'api',
    assigned: 'Daniel Sykes',
    priority: 176,
    approved: false
  },
  {
    id: 8,
    name: 'Aergotatio altus conecto crastinus ab tum...',
    status: 'to_test',
    teams: '',
    assigned: 'Clara Lewis',
    priority: 692,
    approved: false
  },
  {
    id: 9,
    name: 'Apto deridoo stabilis concedo assentator d...',
    status: 'to_test',
    teams: 'frontend',
    assigned: 'Daniel Sykes',
    priority: 85,
    approved: false
  },
  {
    id: 10,
    name: 'Amitto traho despecto.',
    status: 'new',
    teams: 'other',
    assigned: 'James Isaacs',
    priority: 638,
    approved: false
  },
  {
    id: 11,
    name: 'Pel amplitudo tamquam.',
    status: 'new',
    teams: '',
    assigned: 'Kimberly Burnette',
    priority: 680,
    approved: false
  },
  {
    id: 12,
    name: 'Carbo delectus odio vittas.',
    status: 'to_test',
    teams: 'api',
    assigned: 'James Isaacs',
    priority: 976,
    approved: false
  },
  {
    id: 13,
    name: 'Despio viduo defessus victus vita canonic...',
    status: 'to_test',
    teams: 'other',
    assigned: 'Daniel Sykes',
    priority: 42,
    approved: false
  },
  {
    id: 14,
    name: 'Cicula concupio totus contabesco depopul...',
    status: 'to_test',
    teams: 'devops',
    assigned: 'Patricia Ramirez',
    priority: 699,
    approved: false
  },
  {
    id: 15,
    name: 'Sit concedo curso suffoco adsidue est r...',
    status: 'closed',
    teams: 'frontend',
    assigned: 'Linda Sykes',
    priority: 175,
    approved: false
  },
  {
    id: 16,
    name: 'Adaequo voluntate thorax arto.',
    status: 'new',
    teams: 'api',
    assigned: 'James Isaacs',
    priority: 434,
    approved: false
  }
];

const TASK_STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircleIcon; label: string }> = {
  active: { color: 'success', icon: CheckCircleIcon, label: 'Active' },
  inactive: { color: 'secondary', icon: ClockIcon, label: 'Inactive' },
  pending: { color: 'warning', icon: ClockIcon, label: 'Pending' },
  completed: { color: 'success', icon: CheckCircleIcon, label: 'Completed' },
  to_test: { color: 'info', icon: ExclamationCircleIcon, label: 'To Test' },
  new: { color: 'primary', icon: ExclamationCircleIcon, label: 'New' },
  closed: { color: 'secondary', icon: CheckCircleIcon, label: 'Closed' }
};

const TEAM_COLORS: Record<string, string> = {
  'devops': 'info',
  'frontend': 'success',
  'backend': 'primary',
  'api': 'info',
  'other': 'secondary'
};

const ContentRenderer: React.FC<ContentRendererProps> = ({ tab, className = '' }) => {
  // Handle task actions
  const handleTaskView = (task: TaskItem) => {
    logger.info('View task:', task);
    // TODO: Implement task view modal or navigation
  };

  const handleTaskEdit = (task: TaskItem) => {
    logger.info('Edit task:', task);
    // TODO: Implement task edit modal or navigation
  };

  const handleTaskDelete = (task: TaskItem) => {
    logger.info('Delete task:', task);
    // TODO: Implement task deletion with confirmation
  };

  const handleSelectionChange = (selected: TaskItem[]) => {
    logger.info('Selection changed:', selected);
    // TODO: Implement bulk actions for selected tasks
  };

  const taskColumns: DataGridColumn<TaskItem>[] = [
    {
      key: 'id',
      header: '#',
      width: 60,
      render: (value) => (
        <span className="font-mono text-xs text-surface-muted-fg">#{value}</span>
      )
    },
    {
      key: 'name',
      header: 'Name',
      render: (value) => (
        <div className="max-w-xs">
          <div className="font-medium text-surface-foreground truncate" title={String(value ?? '')}>
            {value}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (value) => {
        const config = TASK_STATUS_CONFIG[String(value)] || TASK_STATUS_CONFIG.inactive;
        const Icon = config.icon;
        return (
          <Badge variant={config.color as any} className="inline-flex items-center gap-1">
            <Icon className="w-3 h-3" />
            {config.label}
          </Badge>
        );
      }
    },
    {
      key: 'teams',
      header: 'Teams',
      width: 150,
      render: (value) => {
        const teamList = String(value ?? '').split(',').map(t => t.trim()).filter(Boolean);
        if (teamList.length === 0) return <span className="text-surface-muted-fg">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {teamList.slice(0, 2).map((team) => (
              <Badge key={team} variant={(TEAM_COLORS[team.toLowerCase()] || 'secondary') as any} className="text-xs">
                {team}
              </Badge>
            ))}
            {teamList.length > 2 && (
              <Badge variant="secondary" className="text-xs">+{teamList.length - 2}</Badge>
            )}
          </div>
        );
      }
    },
    {
      key: 'assigned',
      header: 'Assigned',
      width: 160,
      render: (value) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
            <span className="text-xs font-medium text-surface-muted-fg">
              {value ? String(value).charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <span className="text-sm text-surface-foreground">{value || 'Unassigned'}</span>
        </div>
      )
    },
    {
      key: 'priority',
      header: 'Priority',
      width: 110,
      align: 'center',
      render: (value: number) => {
        const badge =
          value >= 800 ? <Badge variant="danger">Critical</Badge> :
          value >= 600 ? <Badge variant="warning">High</Badge> :
          value >= 400 ? <Badge variant="warning">Medium</Badge> :
          <Badge variant="secondary">Low</Badge>;
        return (
          <div className="flex flex-col items-center gap-1">
            {badge}
            <span className="text-xs text-surface-muted-fg">{value}</span>
          </div>
        );
      }
    },
    {
      key: 'approved',
      header: 'Approved',
      width: 100,
      align: 'center',
      render: (value) => (
        <div className="flex justify-center">
          {value ? (
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          ) : (
            <div className="w-5 h-5 border-2 border-surface-border rounded-full" />
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      align: 'center',
      sortable: false,
      filterable: false,
      render: (_, row) => (
        <div className="flex items-center justify-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleTaskView(row);
            }}
            title="View details"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleTaskEdit(row);
            }}
            title="Edit task"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleTaskDelete(row);
            }}
            title="Delete task"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  // Render content based on tab type and content
  const renderContent = () => {
    switch (tab.content?.type) {
      case 'tasks':
        return (
          <div className="h-full">
            <DataGrid<TaskItem>
              columns={taskColumns}
              data={mockTasksData}
              selectable={true}
              onSelectionChange={handleSelectionChange}
              emptyState={{
                title: 'No tasks found',
                description: 'There are no tasks to display at the moment.'
              }}
              className="h-full"
            />
          </div>
        );

      case 'kanban':
        return (
          <div className="flex items-center justify-center h-full bg-surface-muted">
            <div className="text-center">
              <Squares2X2Icon className="h-16 w-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
              <h3 className="text-lg font-medium text-surface-foreground mb-2">Kanban Board</h3>
              <p className="text-surface-muted-fg">Kanban view will be implemented here.</p>
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div className="flex items-center justify-center h-full bg-surface-muted">
            <div className="text-center">
              <CalendarDaysIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
              <h3 className="text-lg font-medium text-surface-foreground mb-2">Calendar View</h3>
              <p className="text-surface-muted-fg">Calendar view will be implemented here.</p>
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className="flex items-center justify-center h-full bg-surface-muted">
            <div className="text-center">
              <Squares2X2Icon className="h-16 w-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
              <h3 className="text-lg font-medium text-surface-foreground mb-2">Dashboard</h3>
              <p className="text-surface-muted-fg">Dashboard widgets will be implemented here.</p>
            </div>
          </div>
        );

      case 'form':
        return (
          <div className="flex items-center justify-center h-full bg-surface-muted">
            <div className="text-center">
              <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
              <h3 className="text-lg font-medium text-surface-foreground mb-2">Form View</h3>
              <p className="text-surface-muted-fg">Dynamic form will be rendered here.</p>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="flex items-center justify-center h-full bg-surface-muted">
            <div className="text-center">
              <Bars3Icon className="h-16 w-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
              <h3 className="text-lg font-medium text-surface-foreground mb-2">List View</h3>
              <p className="text-surface-muted-fg">List content will be displayed here.</p>
            </div>
          </div>
        );

      case 'chart':
        return (
          <div className="flex items-center justify-center h-full bg-surface-muted">
            <div className="text-center">
              <ArrowTrendingUpIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
              <h3 className="text-lg font-medium text-surface-foreground mb-2">Chart View</h3>
              <p className="text-surface-muted-fg">Charts and analytics will be displayed here.</p>
            </div>
          </div>
        );

      default:
        // Fallback for unknown content types or simple text content
        if (tab.content?.data) {
          return (
            <div className="p-6">
              <div className="prose max-w-none">
                {typeof tab.content.data === 'string' ? (
                  <p>{tab.content.data}</p>
                ) : (
                  <pre className="bg-surface-accent p-4 rounded-lg overflow-auto">
                    {JSON.stringify(tab.content.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-center h-full bg-surface-muted">
            <div className="text-center">
              <DocumentIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
              <h3 className="text-lg font-medium text-surface-foreground mb-2">{tab.title}</h3>
              <p className="text-surface-muted-fg">Content for this tab will be displayed here.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`w-full h-full overflow-hidden ${className}`}>
      {renderContent()}
    </div>
  );
};

export default ContentRenderer;
export type { ContentRendererProps };
