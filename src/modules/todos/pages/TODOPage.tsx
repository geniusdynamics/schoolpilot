import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import Select from '@/components/ui/Select';
import { CheckCircleIcon, PlusIcon, TrashIcon, PencilIcon, CalendarIcon } from '@/components/ui/icons';
import { useTranslation } from 'react-i18next';

import { logger } from '@/utils/logging';

type Priority = 'Low' | 'Medium' | 'High';
type Status = 'Pending' | 'In Progress' | 'Completed';

interface TODO {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  category: string;
  due_date?: string;
  created_at: string;
  completed_at?: string;
}

const TODOPage: React.FC = () => {
  const { t } = useTranslation('todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTODO, setEditingTODO] = useState<TODO | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const initialFormData: Partial<TODO> = {
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Pending',
    category: 'General',
    due_date: ''
  };
  const [formData, setFormData] = useState<Partial<TODO>>(initialFormData);

  // Mock data for TODOs (in production, this would come from useAppData)
  const mockTODOs: TODO[] = useMemo(() => {
    const todos: TODO[] = [
      {
        id: 'todo-1',
        title: 'Prepare monthly fee report',
        description: 'Generate and review the monthly fee collection report for the finance department',
        priority: 'High',
        status: 'In Progress',
        category: 'Finance',
        due_date: '2024-01-20',
        created_at: '2024-01-15'
      },
      {
        id: 'todo-2',
        title: 'Review exam schedule',
        description: 'Review and approve the upcoming mid-term exam schedule',
        priority: 'High',
        status: 'Pending',
        category: 'Academics',
        due_date: '2024-01-18',
        created_at: '2024-01-14'
      },
      {
        id: 'todo-3',
        title: 'Update staff attendance records',
        description: 'Ensure all staff attendance for the current week is recorded',
        priority: 'Medium',
        status: 'Completed',
        category: 'HR',
        due_date: '2024-01-15',
        created_at: '2024-01-10',
        completed_at: '2024-01-15'
      },
      {
        id: 'todo-4',
        title: 'Organize parent-teacher meeting',
        description: 'Schedule and coordinate the upcoming parent-teacher meeting for Grade 10',
        priority: 'Medium',
        status: 'Pending',
        category: 'Administration',
        due_date: '2024-01-25',
        created_at: '2024-01-12'
      },
      {
        id: 'todo-5',
        title: 'Review library inventory',
        description: 'Conduct quarterly review of library books and resources',
        priority: 'Low',
        status: 'Pending',
        category: 'Library',
        due_date: '2024-01-30',
        created_at: '2024-01-08'
      }
    ];

    let filtered = todos;

    if (selectedStatus) {
      filtered = filtered.filter(t => t.status === selectedStatus);
    }

    if (selectedPriority) {
      filtered = filtered.filter(t => t.priority === selectedPriority);
    }

    if (searchTerm) {
      filtered = filtered.filter(t => 
        (t.title?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (t.description?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (t.category?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedStatus, selectedPriority, searchTerm]);

  const openModal = (todo?: TODO) => {
    setEditingTODO(todo || null);
    setFormData(todo ? {
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      status: todo.status,
      category: todo.category,
      due_date: todo.due_date
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTODO(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.title) {
      alert('Title is required.');
      return;
    }
    logger.info('Saving TODO:', formData);
    closeModal();
  };

  const toggleComplete = (todo: TODO) => {
    const newStatus = todo.status === 'Completed' ? 'Pending' : 'Completed';
    logger.info('Toggling TODO:', todo.id, newStatus);
  };

  const deleteTODO = (todo: TODO) => {
    if (confirm('Are you sure you want to delete this task?')) {
      logger.info('Deleting TODO:', todo.id);
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    const styles = {
      'Low': 'bg-surface-accent text-surface-foreground',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'High': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  const getStatusBadge = (status: Status) => {
    const styles = {
      'Pending': 'bg-primary-100 text-primary-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const priorities: Priority[] = ['Low', 'Medium', 'High'];
  const statuses: Status[] = ['Pending', 'In Progress', 'Completed'];
  const categories = ['General', 'Finance', 'Academics', 'HR', 'Administration', 'Library', 'Sports'];

  const totals = useMemo(() => {
    return {
      total: mockTODOs.length,
      pending: mockTODOs.filter(t => t.status === 'Pending').length,
      inProgress: mockTODOs.filter(t => t.status === 'In Progress').length,
      completed: mockTODOs.filter(t => t.status === 'Completed').length
    };
  }, [mockTODOs]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-surface-foreground">Tasks</h1>
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-indigo-800">Task Management</h3>
              <p className="text-sm text-indigo-700 mt-1">
                Create, edit, complete, and remove tasks. Organize by priority, category, and status. 
                Set due dates and track your progress.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Tasks</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckCircleIcon className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-primary-600 mt-2">
              {totals.pending}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckCircleIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {totals.inProgress}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.completed}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Status</label>
            <Select
              value={selectedStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatus(e.target.value)}
              className="w-full"
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Priority</label>
            <Select
              value={selectedPriority}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPriority(e.target.value)}
              className="w-full"
            >
              <option value="">All Priorities</option>
              {priorities.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Task, description, category..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {mockTODOs.map(todo => (
            <div
              key={todo.id}
              className={`p-4 border rounded-lg ${
                todo.status === 'Completed' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-surface-card border-surface-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleComplete(todo)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                      todo.status === 'Completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-surface-border hover:border-green-500'
                    }`}
                  >
                    {todo.status === 'Completed' && <CheckCircleIcon className="w-3 h-3" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-semibold ${todo.status === 'Completed' ? 'line-through text-surface-muted-fg' : 'text-surface-foreground'}`}>
                        {todo.title}
                      </h4>
                      {getPriorityBadge(todo.priority)}
                      {getStatusBadge(todo.status)}
                    </div>
                    <p className="text-sm text-surface-muted-fg mt-1">{todo.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-surface-muted-fg">
                      <span className="bg-surface-accent px-2 py-1 rounded">{todo.category}</span>
                      {todo.due_date && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          Due: {new Date(todo.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openModal(todo)}>
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => deleteTODO(todo)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add/Edit Task Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTODO ? 'Edit Task' : 'Add Task'}
      >
        <FormSection>
          <FormField label="Title" required>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Task title"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Task description"
              rows={3}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Priority" required>
            <Select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full"
            >
              {priorities.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Status" required>
            <Select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full"
            >
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Category" required>
            <Select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Due Date">
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleInputChange}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary">
            {editingTODO ? 'Update' : 'Add'}
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};

export default TODOPage;
