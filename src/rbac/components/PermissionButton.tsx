/**
 * Permission Button
 * 
 * Button that is disabled or hidden based on permissions.
 */

import React from 'react';
import { useRBAC } from '../useRBAC';
import type { Resource, Permission } from '../types';
import { Button, ButtonProps } from '@/components/ui/Button';

interface PermissionButtonProps extends Omit<ButtonProps, 'resource' | 'permission'> {
  resource: Resource;
  permission: Permission;
  hideWhenUnauthorized?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Permission Button Component
 * 
 * @example
 * ```tsx
 * <PermissionButton 
 *   resource="students" 
 *   permission="create"
 *   onClick={handleAddStudent}
 * >
 *   Add Student
 * </PermissionButton>
 * ```
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  resource,
  permission,
  hideWhenUnauthorized = false,
  fallback,
  children,
  ...buttonProps
}) => {
  const { can } = useRBAC();
  const allowed = can(resource, permission);

  if (!allowed) {
    if (hideWhenUnauthorized) {
      return null;
    }
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <Button {...buttonProps} disabled>
        {children}
      </Button>
    );
  }

  return <Button {...buttonProps}>{children}</Button>;
};

export default PermissionButton;
