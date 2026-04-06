// ABOUTME: Lesson Plans module definition
// ABOUTME: Self-contained module definition for lesson planning and tracking

import React from 'react';
import { ModuleDefinition } from '../../core/types';
import {
  CalendarDaysIcon,
  PlusIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
} from '../../components/ui/icons';
import { lessonplansPermissions, lessonplansDefaultRoles } from './rbac';

export const lessonplansModule: ModuleDefinition = {
  id: 'lessonplans',
  name: 'navigation:lessonplans.title',
  description: 'navigation:lessonplans.description',
  icon: CalendarDaysIcon,
  path: '/lessonplans',
  isActive: true,
  version: '1.0.0',
  navigation: [
    {
      name: 'navigation:weeklyPlans',
      path: '/lessonplans',
      icon: CalendarDaysIcon,
      page: 'WeeklyPlansPage',
    },
    {
      name: 'navigation:createPlan',
      path: '/lessonplans/create',
      icon: PlusIcon,
      page: 'WeeklyPlansPage',
    },
    {
      name: 'navigation:lessonNotes',
      path: '/lessonplans/notes',
      icon: DocumentTextIcon,
      page: 'LessonNotesPage',
    },
    {
      name: 'navigation:approvalQueue',
      path: '/lessonplans/approval',
      icon: ClipboardDocumentCheckIcon,
      page: 'ApprovalPage',
    },
    {
      name: 'navigation:coverageReport',
      path: '/lessonplans/coverage',
      icon: ChartBarIcon,
      page: 'WeeklyPlansPage',
    },
  ],
  features: [
    'weekly-plans',
    'daily-notes',
    'plan-approval',
    'coverage-report',
  ],
  dependencies: [
    {
      moduleId: 'academics',
      version: '^1.0.0',
      required: true,
    },
  ],
  settings: {
    category: 'lessonplans',
    items: [
      {
        key: 'enableApprovalWorkflow',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'requireWeeklyPlans',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableCoverageTracking',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'planTemplate',
        type: 'string',
        defaultValue: 'standard',
      },
    ],
  },
  rbacPermissions: lessonplansPermissions,
  defaultRoles: lessonplansDefaultRoles,
};

export default lessonplansModule;
