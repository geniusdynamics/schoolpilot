import React from 'react';
import { ModuleDefinition } from '../../core/types';
import {
  StarIcon,
  ListBulletIcon,
  PlusIcon,
  ChartBarIcon,
  UserGroupIcon,
  UsersIcon,
} from '../../components/ui/icons';
import { housesPermissions, housesDefaultRoles } from './rbac';

export const housesModule: ModuleDefinition = {
  id: 'houses',
  name: 'navigation:houses.title',
  description: 'navigation:houses.description',
  icon: StarIcon,
  path: '/houses',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:houses', path: '/houses', icon: StarIcon, page: 'HousesPage' },
    { name: 'navigation:categories', path: '/houses/categories', icon: ListBulletIcon, page: 'CategoriesPage' },
    { name: 'navigation:award', path: '/houses/award', icon: PlusIcon, page: 'AwardPointsPage' },
    { name: 'navigation:leaderboard', path: '/houses/leaderboard', icon: ChartBarIcon, page: 'LeaderboardPage' },
    { name: 'navigation:studentPoints', path: '/houses/student-points', icon: UserGroupIcon, page: 'StudentPointsPage' },
    { name: 'navigation:classStandings', path: '/houses/class-standings', icon: UsersIcon, page: 'ClassStandingsPage' },
  ],
  features: ['house-management', 'point-transactions', 'merits', 'demerits', 'leaderboard'],
  dependencies: [
    { moduleId: 'administration', version: '^1.0.0', required: true },
  ],
  settings: {
    category: 'houses',
    items: [
      { key: 'enableHouseSystem', type: 'boolean', defaultValue: true },
      { key: 'requireApprovalForMerits', type: 'boolean', defaultValue: false },
      { key: 'requireApprovalForDemerits', type: 'boolean', defaultValue: true },
      { key: 'maxDailyAwards', type: 'number', defaultValue: 5 },
    ],
  },
  rbacPermissions: housesPermissions,
  defaultRoles: housesDefaultRoles,
};

export default housesModule;
