// ABOUTME: Library module definition
// ABOUTME: Self-contained module definition for library management

import React from 'react';
import { ModuleDefinition } from '../../core/types';
import {
  BookOpenIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
} from '../../components/ui/icons';
import { libraryPermissions, libraryDefaultRoles } from './rbac';

export const libraryModule: ModuleDefinition = {
  id: 'library',
  name: 'navigation:library.title',
  description: 'navigation:library.description',
  icon: <BookOpenIcon />,
  path: '/library',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:library.dashboard', path: '/library/dashboard', icon: <BookOpenIcon /> },
    { name: 'navigation:library.books', path: '/library/books', icon: <BookOpenIcon /> },
    { name: 'navigation:library.bookCategories', path: '/library/book-categories', icon: <DocumentTextIcon /> },
    { name: 'navigation:library.bookLoans', path: '/library/book-loans', icon: <ClipboardDocumentListIcon /> },
    { name: 'navigation:library.fines', path: '/library/fines', icon: <CurrencyDollarIcon /> },
  ],
  features: ['book-management', 'loan-tracking', 'fine-management'],
  dependencies: ['administration'],
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