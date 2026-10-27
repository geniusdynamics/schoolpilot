// ABOUTME: Library module definition
// ABOUTME: Self-contained module definition for library management

import { ModuleDefinition } from '@/core/types';
import {
  BookOpenIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
} from '@/components/ui/icons';
import { libraryPermissions, libraryDefaultRoles } from './rbac';

export const libraryModule: ModuleDefinition = {
  id: 'library',
  name: 'navigation:library.title',
  description: 'navigation:library.description',
  icon: BookOpenIcon,
  path: '/library',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:library.dashboard', path: '/library', icon: BookOpenIcon, page: 'LibraryDashboardPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:library.resources', path: '/library/resources', icon: BookOpenIcon, page: 'LibraryResourcesHubPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:library.books', path: '/library/books', icon: BookOpenIcon, page: 'BooksPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/library/resources?tab=books' },
    { name: 'navigation:library.bookCategories', path: '/library/book-categories', icon: DocumentTextIcon, page: 'BookCategoriesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/library/resources?tab=categories' },
    { name: 'navigation:library.bookLoans', path: '/library/book-loans', icon: ClipboardDocumentListIcon, page: 'BookLoansPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/library/resources?tab=loans' },
    { name: 'navigation:library.fines', path: '/library/fines', icon: CurrencyDollarIcon, page: 'FinesPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:library.userPortal', path: '/library/user-portal', icon: ClipboardDocumentListIcon, page: 'UserLibraryPortalPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:library.digitalResources', path: '/library/digital-resources', icon: DocumentTextIcon, page: 'DigitalResourcesPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/library/resources?tab=digital-resources' },
    { name: 'navigation:library.damagedLostBooks', path: '/library/damaged-lost-books', icon: ExclamationTriangleIcon, page: 'DamagedLostBooksPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/library/resources?tab=damaged-lost' },
    { name: 'navigation:library.importBooks', path: '/library/import-books', icon: ArrowUpTrayIcon, page: 'ImportBooksPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/library/resources?tab=import-books' },
    { name: 'navigation:library.settings', path: '/library/settings', icon: DocumentTextIcon, page: 'LibrarySettingsPage', showInModes: ['standard', 'fullwidth'] },
  ],
  routes: [
    { path: '/library', page: 'LibraryDashboardPage' },
    { path: '/library/resources', page: 'LibraryResourcesHubPage' },
    { path: '/library/books', page: 'BooksPage' },
    { path: '/library/book-categories', page: 'BookCategoriesPage' },
    { path: '/library/book-loans', page: 'BookLoansPage' },
    { path: '/library/fines', page: 'FinesPage' },
    { path: '/library/user-portal', page: 'UserLibraryPortalPage' },
    { path: '/library/digital-resources', page: 'DigitalResourcesPage' },
    { path: '/library/damaged-lost-books', page: 'DamagedLostBooksPage' },
    { path: '/library/import-books', page: 'ImportBooksPage' },
    { path: '/library/settings', page: 'LibrarySettingsPage' }
  ],
  features: ['book-management', 'loan-tracking', 'fine-management'],
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true
    }
  ],
  settings: {
    category: 'library',
    items: [
      {
        key: 'enableBookManagement',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableLoanTracking',
        type: 'boolean',
        defaultValue: true
      },
      {
        key: 'enableFineManagement',
        type: 'boolean',
        defaultValue: true
      }
    ]
  },
  rbacPermissions: libraryPermissions,
  defaultRoles: libraryDefaultRoles,
};

export default libraryModule;
