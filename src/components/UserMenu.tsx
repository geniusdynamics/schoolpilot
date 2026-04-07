// ABOUTME: User menu component for displaying user info and logout functionality
// ABOUTME: Shows user role, demo mode indicator, and logout option

import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTabNavigation } from '@/hooks/useTabNavigation';
import Button from './ui/Button';
import { UserCircleIcon, LogoutIcon, CogIcon, ChevronDownIcon } from './ui/icons';
import { SyncStatusComponent } from './OfflineCapability';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import HookErrorBoundary from './HookErrorBoundary';
// Removed: import { safeDeps, HookErrorHandler } from '@/utils/hookUtils';
import { HookErrorBoundary as ErrorBoundary } from './ErrorBoundary/HookErrorBoundary';

interface UserMenuProps {
  onSettingsClick?: () => void;
}

const UserMenuContent: React.FC<UserMenuProps> = ({ onSettingsClick }) => {
  const { t } = useTranslation('common');
  const { user, logout, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const { navigateToTab } = useTabNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const { config } = useUnifiedConfig();
  

  


  const handleLogout = useCallback(async () => {
    try {
      if (!logout || typeof logout !== 'function') {
        console.error('[UserMenu] Logout function not available');
        return;
      }
      
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('[UserMenu] Logout failed:', error);
    }
  }, [logout]); // Changed: safeDeps([logout]) -> [logout]

  const toggleDropdown = useCallback(() => {
    try {
      setIsOpen(prev => !prev);
    } catch (error) {
      console.error('[UserMenu] Error in toggleDropdown:', error);
    }
  }, []); // Changed: safeDeps([]) -> []

  const handleSettingsClick = useCallback(async () => {
    try {
      if (onSettingsClick && typeof onSettingsClick === 'function') {
        onSettingsClick();
      } else {
        // Use tab navigation to create a settings tab
        await navigateToTab('/settings', {
          title: 'Settings',
          icon: 'CogIcon',
          module: 'settings',
          contentType: 'component',
          component: 'DynamicPageComponent',
          metadata: {
            source: 'user-menu',
            timestamp: new Date().toISOString()
          }
        });
      }
      setIsOpen(false);
    } catch (error) {
      console.error('[UserMenu] Error in handleSettingsClick:', error);
      // Fallback to regular navigation if tab navigation fails
      navigate('/settings');
      setIsOpen(false);
    }
  }, [onSettingsClick, navigateToTab, navigate]); // Changed: safeDeps([onSettingsClick]) -> [onSettingsClick]

  const handleBackdropClick = useCallback((e?: React.MouseEvent) => {
    try {
      if (!e || e.target === e.currentTarget) {
        setIsOpen(false);
      }
    } catch (error) {
      console.error('[UserMenu] Error in handleBackdropClick:', error);
    }
  }, []); // Changed: safeDeps([]) -> []

  // Memoize current mode to prevent unnecessary recalculations
  const memoizedCurrentMode = useMemo(() => {
    try {
      return config?.dataMode === 'demo' ? 'demo' : 'production';
    } catch (error) {
      console.error('[UserMenu] Error getting current mode:', error);
      return 'demo';
    }
  }, [config?.dataMode]); // Changed: safeDeps([config?.dataMode]) -> [config?.dataMode]

  if (!user) {
    return null;
  }

  return (
    <HookErrorBoundary>
      <div className="relative">
      {/* User Button */}
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
          <UserCircleIcon className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <div className="font-medium text-gray-900">{user.fullName}</div>
          <div className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</div>
        </div>
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <UserCircleIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{user.fullName}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
                <div className="text-xs text-gray-400 capitalize">{user.role.replace('_', ' ')}</div>
              </div>
            </div>
            
            {/* Mode Indicator */}
            <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  memoizedCurrentMode === 'demo' ? 'bg-yellow-400' : 'bg-green-400'
                }`}></div>
                <span className={`text-xs text-gray-500 font-medium ${
                  memoizedCurrentMode === 'demo' ? 'text-yellow-800' : 'text-green-800'
                }`}>
                  {memoizedCurrentMode === 'demo' ? 'Demo Mode' : 'Production Mode'}
                </span>
              </div>
            </div>
          </div>

          {/* Sync Status Section */}
          <div className="p-2 border-b border-gray-200">
            <SyncStatusComponent className="!p-2 !shadow-none !bg-transparent" />
          </div>

          <div className="p-2">
            {/* Settings Link */}
            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <CogIcon className="w-4 h-4 mr-3 text-gray-400" />
              Settings
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogoutIcon className="w-4 h-4 mr-3 text-red-400" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleBackdropClick}
        />
      )}
      </div>
    </HookErrorBoundary>
  );
};

const UserMenu: React.FC<UserMenuProps> = ({ onSettingsClick }) => {
  return (
    <ErrorBoundary componentName="UserMenu">
      <UserMenuContent onSettingsClick={onSettingsClick} />
    </ErrorBoundary>
  );
};

export default UserMenu;
