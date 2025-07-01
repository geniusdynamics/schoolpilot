import { Permission } from '../../core/rbacService';

export const libraryPermissions: Permission[] = [
  {
    id: 'library.books.read',
    name: 'View Books',
    description: 'View library books',
    resource: 'library.books',
    action: 'read',
    moduleId: 'library',
    feature: 'book-management',
  },
  {
    id: 'library.books.create',
    name: 'Add Books',
    description: 'Add new books to library',
    resource: 'library.books',
    action: 'create',
    moduleId: 'library',
    feature: 'book-management',
  },
  {
    id: 'library.books.update',
    name: 'Update Books',
    description: 'Update book information',
    resource: 'library.books',
    action: 'update',
    moduleId: 'library',
    feature: 'book-management',
  },
  {
    id: 'library.books.delete',
    name: 'Remove Books',
    description: 'Remove books from library',
    resource: 'library.books',
    action: 'delete',
    moduleId: 'library',
    feature: 'book-management',
  },
  {
    id: 'library.loans.read',
    name: 'View Loans',
    description: 'View book loans',
    resource: 'library.loans',
    action: 'read',
    moduleId: 'library',
    feature: 'loan-tracking',
  },
  {
    id: 'library.loans.create',
    name: 'Create Loans',
    description: 'Create book loans',
    resource: 'library.loans',
    action: 'create',
    moduleId: 'library',
    feature: 'loan-tracking',
  },
  {
    id: 'library.loans.update',
    name: 'Update Loans',
    description: 'Update loan information',
    resource: 'library.loans',
    action: 'update',
    moduleId: 'library',
    feature: 'loan-tracking',
  },
];

export const libraryDefaultRoles = ['librarian', 'administrator']; 