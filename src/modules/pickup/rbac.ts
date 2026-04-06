import { Permission } from '@/core/rbacService';

export const pickupPermissions: Permission[] = [
  {
    id: 'pickup.codes.read',
    name: 'View Pickup Codes',
    description: 'View pickup codes',
    resource: 'pickup.codes',
    action: 'read',
    moduleId: 'pickup',
    feature: 'pickup-codes',
  },
  {
    id: 'pickup.codes.create',
    name: 'Create Pickup Codes',
    description: 'Generate pickup codes for students',
    resource: 'pickup.codes',
    action: 'create',
    moduleId: 'pickup',
    feature: 'pickup-codes',
  },
  {
    id: 'pickup.authorizedPersons.read',
    name: 'View Authorized Persons',
    description: 'View list of authorized pickup persons',
    resource: 'pickup.authorizedPersons',
    action: 'read',
    moduleId: 'pickup',
    feature: 'authorized-persons',
  },
  {
    id: 'pickup.authorizedPersons.manage',
    name: 'Manage Authorized Persons',
    description: 'Add, edit, and remove authorized pickup persons',
    resource: 'pickup.authorizedPersons',
    action: 'update',
    moduleId: 'pickup',
    feature: 'authorized-persons',
  },
  {
    id: 'pickup.verify.execute',
    name: 'Verify Pickup',
    description: 'Verify pickup codes at dismissal',
    resource: 'pickup.verify',
    action: 'execute',
    moduleId: 'pickup',
    feature: 'qr-verification',
  },
  {
    id: 'pickup.logs.read',
    name: 'View Pickup Logs',
    description: 'View pickup history and logs',
    resource: 'pickup.logs',
    action: 'read',
    moduleId: 'pickup',
    feature: 'pickup-logs',
  },
  {
    id: 'pickup.notifications.send',
    name: 'Send Notifications',
    description: 'Send pickup notifications to parents',
    resource: 'pickup.notifications',
    action: 'execute',
    moduleId: 'pickup',
    feature: 'pickup-codes',
  },
];

export const pickupDefaultRoles = ['administrator', 'teacher', 'security_staff'];
