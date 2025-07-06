// ABOUTME: Protected route component for authentication-based access control
// ABOUTME: Redirects unauthenticated users to login and handles permission checks

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredModule?: string;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredModule,
  fallbackPath = '/login'
}) => {
  const { isAuthenticated, isLoading, hasPermission, hasModuleAccess } = useAuth();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);

  // Check permissions and module access
  useEffect(() => {
    const checkAccess = async () => {
      if (isLoading) return;

      console.log('🔍 [ProtectedRoute] Checking access:', { requiredPermission, requiredModule, isAuthenticated });
      setCheckingAccess(true);
      try {
        let access = true;

        // Check specific permission if required
        if (requiredPermission) {
          const hasPerm = await hasPermission(requiredPermission);
          console.log('🔍 [ProtectedRoute] Permission check:', { permission: requiredPermission, hasPerm });
          access = access && hasPerm;
        }

        // Check module access if required
        if (requiredModule) {
          const hasModule = await hasModuleAccess(requiredModule);
          console.log('🔍 [ProtectedRoute] Module check:', { module: requiredModule, hasModule });
          access = access && hasModule;
        }

        console.log('🔍 [ProtectedRoute] Final access result:', access);
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [isAuthenticated, isLoading, requiredPermission, requiredModule, hasPermission, hasModuleAccess]);

  // Show loading spinner while checking authentication
  if (isLoading || checkingAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Show access denied if user doesn't have required permissions
  if (hasAccess === false) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            {requiredPermission && `You don't have the required permission: ${requiredPermission}`}
            {requiredModule && `You don't have access to the module: ${requiredModule}`}
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
};

export default ProtectedRoute; 