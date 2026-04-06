// ABOUTME: Pickup module definition
// ABOUTME: Self-contained module definition for student pickup management and verification

import React from 'react';
import { ModuleDefinition } from '../../core/types';
import {
  HomeIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  QrCodeIcon,
  ClipboardDocumentListIcon,
  BellIcon,
} from '../../components/ui/icons';
import { pickupPermissions, pickupDefaultRoles } from './rbac';

// Note: QrCodeIcon may not exist - fallback to a suitable icon
const PickupIcon = ShieldCheckIcon;
const ScannerIcon = ShieldCheckIcon;

export const pickupModule: ModuleDefinition = {
  id: 'pickup',
  name: 'navigation:pickup.title',
  description: 'navigation:pickup.description',
  icon: PickupIcon,
  path: '/pickup',
  isActive: true,
  version: '1.0.0',
  navigation: [
    {
      name: 'navigation:dashboard',
      path: '/pickup',
      icon: HomeIcon,
      page: 'PickupDashboardPage',
    },
    {
      name: 'navigation:authorizedPersons',
      path: '/pickup/authorized-persons',
      icon: UserGroupIcon,
      page: 'PickupAuthorizedPersonsPage',
    },
    {
      name: 'navigation:studentAuth',
      path: '/pickup/student-auth',
      icon: ShieldCheckIcon,
      page: 'PickupAuthorizedPersonsPage',
    },
    {
      name: 'navigation:pickupCodes',
      path: '/pickup/codes',
      icon: PickupIcon,
      page: 'PickupCodesPage',
    },
    {
      name: 'navigation:pickupLog',
      path: '/pickup/log',
      icon: ClipboardDocumentListIcon,
      page: 'PickupLogsPage',
    },
    {
      name: 'navigation:verificationScanner',
      path: '/pickup/scan',
      icon: ScannerIcon,
      page: 'PickupLogsPage',
    },
  ],
  features: [
    'pickup-codes',
    'qr-verification',
    'authorized-persons',
    'pickup-logs',
  ],
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true,
    },
  ],
  settings: {
    category: 'pickup',
    items: [
      {
        key: 'enableQrVerification',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'enableParentNotifications',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'codeExpiryMinutes',
        type: 'number',
        defaultValue: 30,
      },
      {
        key: 'maxAuthorizedPersons',
        type: 'number',
        defaultValue: 5,
      },
      {
        key: 'requirePhotoId',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
  rbacPermissions: pickupPermissions,
  defaultRoles: pickupDefaultRoles,
};

export default pickupModule;
