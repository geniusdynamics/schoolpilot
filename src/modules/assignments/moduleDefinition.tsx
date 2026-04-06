// ABOUTME: Assignments module definition
// ABOUTME: Self-contained module definition for assignment management

import React from 'react';
import { ModuleDefinition } from '../../core/types';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  InboxIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
} from '../../components/ui/icons';
import { assignmentsPermissions, assignmentsDefaultRoles } from './rbac';

export const assignmentsModule: ModuleDefinition = {
  id: 'assignments',
  name: 'navigation:assignments.title',
  description: 'navigation:assignments.description',
  icon: ClipboardDocumentListIcon,
  path: '/assignments',
  isActive: true,
  version: '1.0.0',
  navigation: [
    {
      name: 'navigation:allAssignments',
      path: '/assignments',
      icon: ClipboardDocumentListIcon,
      page: 'AssignmentsListPage',
    },
    {
      name: 'navigation:createAssignment',
      path: '/assignments/create',
      icon: PlusIcon,
      page: 'AssignmentsListPage',
    },
    {
      name: 'navigation:myAssignments',
      path: '/assignments/my',
      icon: InboxIcon,
      page: 'AssignmentsListPage',
    },
    {
      name: 'navigation:gradeAssignments',
      path: '/assignments/grade',
      icon: ClipboardDocumentCheckIcon,
      page: 'AssignmentGradingPage',
    },
  ],
  features: [
    'create-assignment',
    'submit-assignment',
    'grade-assignment',
    'assignment-analytics',
  ],
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true,
    },
    {
      moduleId: 'academics',
      version: '^1.0.0',
      required: true,
    },
  ],
  settings: {
    category: 'assignments',
    items: [
      {
        key: 'enableSubmissions',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableRubrics',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableAttachments',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableAnalytics',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'defaultDueTime',
        type: 'string',
        defaultValue: '23:59',
      },
    ],
  },
  rbacPermissions: assignmentsPermissions,
  defaultRoles: assignmentsDefaultRoles,
};

export default assignmentsModule;
