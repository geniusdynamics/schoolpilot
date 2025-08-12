import React from 'react';
import DataTable, { TaskItem } from './data/DataTable';
import { Tab } from '../../types/tabbedWorkspace';

export interface ContentRendererProps {
  tab: Tab;
  className?: string;
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

const ContentRenderer: React.FC<ContentRendererProps> = ({ tab, className = '' }) => {
  // Handle task actions
  const handleTaskView = (task: TaskItem) => {
    console.log('View task:', task);
    // TODO: Implement task view modal or navigation
  };

  const handleTaskEdit = (task: TaskItem) => {
    console.log('Edit task:', task);
    // TODO: Implement task edit modal or navigation
  };

  const handleTaskDelete = (task: TaskItem) => {
    console.log('Delete task:', task);
    // TODO: Implement task deletion with confirmation
  };

  const handleTaskStatusChange = (task: TaskItem, newStatus: string) => {
    console.log('Change task status:', task, newStatus);
    // TODO: Implement status change logic
  };

  const handleSelectionChange = (selected: TaskItem[]) => {
    console.log('Selection changed:', selected);
    // TODO: Implement bulk actions for selected tasks
  };

  // Render content based on tab type and content
  const renderContent = () => {
    switch (tab.content?.type) {
      case 'tasks':
        return (
          <div className="h-full">
            <DataTable
              data={mockTasksData}
              onView={handleTaskView}
              onEdit={handleTaskEdit}
              onDelete={handleTaskDelete}
              onStatusChange={handleTaskStatusChange}
              selectable={true}
              onSelectionChange={handleSelectionChange}
              className="h-full"
            />
          </div>
        );
      
      case 'kanban':
        return (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Kanban Board</h3>
              <p className="text-gray-500">Kanban view will be implemented here.</p>
            </div>
          </div>
        );
      
      case 'calendar':
        return (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar View</h3>
              <p className="text-gray-500">Calendar view will be implemented here.</p>
            </div>
          </div>
        );
      
      case 'dashboard':
        return (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard</h3>
              <p className="text-gray-500">Dashboard widgets will be implemented here.</p>
            </div>
          </div>
        );
      
      case 'form':
        return (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Form View</h3>
              <p className="text-gray-500">Dynamic form will be rendered here.</p>
            </div>
          </div>
        );
      
      case 'list':
        return (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">List View</h3>
              <p className="text-gray-500">List content will be displayed here.</p>
            </div>
          </div>
        );
      
      case 'chart':
        return (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chart View</h3>
              <p className="text-gray-500">Charts and analytics will be displayed here.</p>
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
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
                    {JSON.stringify(tab.content.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          );
        }
        
        return (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{tab.title}</h3>
              <p className="text-gray-500">Content for this tab will be displayed here.</p>
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