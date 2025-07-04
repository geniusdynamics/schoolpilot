// ABOUTME: Modern, modular, collapsible sidebar for portal UIs (vendor, student, parent, etc.)
// ABOUTME: Accepts a navigation config, supports RBAC, i18n, and is fully responsive.
//
// Usage:
// <PortalSidebar
//   navItems={navItems}
//   activeView={activeView}
//   onSelect={setActiveView}
//   rbacPermissions={userPermissions}
//   collapsed={collapsed}
//   onToggleCollapse={setCollapsed}
// />

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

export interface PortalNavItem {
  key: string;
  label: string; // translation key
  icon: React.ReactNode;
  permission?: string; // RBAC permission required
}

interface PortalSidebarProps {
  navItems: PortalNavItem[];
  activeView: string;
  onSelect: (key: string) => void;
  rbacPermissions?: string[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const PortalSidebar: React.FC<PortalSidebarProps> = ({ navItems, activeView, onSelect, rbacPermissions = [], collapsed, onToggleCollapse }) => {
  const { t } = useTranslation(['navigation', 'common']);
  // Filter nav items by RBAC
  const visibleNavItems = navItems.filter(item => !item.permission || rbacPermissions.includes(item.permission));

  return (
    <aside className={`transition-all duration-300 h-full flex flex-col bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900 shadow-xl border-r border-indigo-700 ${collapsed ? 'w-16' : 'w-56'} min-h-0 relative z-20`}> 
      {/* Collapse/Expand Button */}
      <button
        className="absolute top-4 right-2 z-30 p-1 rounded-full bg-indigo-700 hover:bg-indigo-600 text-white shadow"
        onClick={onToggleCollapse}
        title={collapsed ? t('common:expand') : t('common:collapse')}
      >
        {collapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
      </button>
      <nav className="flex-1 flex flex-col gap-1 mt-16">
        {visibleNavItems.map(item => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-base focus:outline-none
              ${activeView === item.key ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'}
              ${collapsed ? 'justify-center px-2' : ''}`}
            title={t(item.label)}
          >
            <span className="w-6 h-6 flex items-center justify-center">{item.icon}</span>
            {!collapsed && <span className="truncate">{t(item.label)}</span>}
          </button>
        ))}
      </nav>
      {/* Responsive: auto-collapse on small screens */}
      <style>{`
        @media (max-width: 768px) {
          aside { width: 3.5rem !important; }
        }
      `}</style>
    </aside>
  );
};

export default PortalSidebar; 