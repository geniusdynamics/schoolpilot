// ABOUTME: User menu component for displaying user info and logout functionality
// ABOUTME: Shows user role, demo mode indicator, and logout option

import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import { UserCircleIcon, LogoutIcon, CogIcon, ChevronDownIcon } from './ui/icons';
import { SyncStatusComponent } from './OfflineCapability';
import { useUnifiedConfig } from '../contexts/UnifiedConfigContext';
import HookErrorBoundary from './HookErrorBoundary';

const UserMenu: React.FC = () => {
  const { user, logout, isDemoMode } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation('common');
  const { config } = useUnifiedConfig();
  

  
  if (!user) {
    return null;
  }

  const handleLogout = useCallback(async () => {
    await logout();
    setIsOpen(false);
  }, [logout]); // logout function is stable from AuthContext

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []); // No dependencies needed for state setter function

  const handleSettingsClick = useCallback(() => {
    setIsOpen(false);
    // Navigate to settings
    window.location.hash = '#/settings';
  }, []); // No dependencies needed for navigation

  const handleBackdropClick = useCallback(() => {
    setIsOpen(false);
  }, []); // No dependencies needed for state setter function

  // Memoize current mode to prevent unnecessary recalculations
  const memoizedCurrentMode = useMemo(() => {
    return config.dataMode === 'demo' ? 'demo' : 'production';
  }, [config.dataMode]);

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
                <span className={`text-xs font-medium ${
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

export default UserMenu;