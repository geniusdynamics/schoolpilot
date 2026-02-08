/**
 * Protected Route
 * 
 * Route component that checks permissions before rendering.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRBAC } from '../useRBAC';
import type { Resource, Permission } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  resource: Resource;
  permission: Permission;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Protected Route Component
 * 
 * @example
 * ```tsx
 * <Route path="/students/new" element={
 *   <ProtectedRoute resource="students" permission="create">
 *     <NewStudentPage />
 *   </ProtectedRoute>
 * } />
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  resource,
  permission,
  fallback,
  redirectTo = '/unauthorized',
}) => {
  const { can } = useRBAC();
  const location = useLocation();

  if (!can(resource, permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
