import { ListBulletIcon } from '@/components/ui/icons';

export const todosModule = {
  id: 'todos',
  name: 'Todos',
  icon: ListBulletIcon,
  description: 'Task management and reminders',
  path: '/todos',
  pages: [
    {
      name: 'navigation:todos.title',
      path: '/todos',
      icon: ListBulletIcon,
      page: 'TODOPage'
    }
  ],
  features: [
    'task-management'
  ],
  dependencies: [],
  settings: {
    enableTaskPriorities: true,
    enableTaskCategories: true,
    enableTaskReminders: true
  }
};

export default todosModule;
