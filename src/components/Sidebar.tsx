// ABOUTME: This component renders the main navigation sidebar for the application.
// ABOUTME: It displays navigation links, handles group expansion, and adapts for mobile.
// ENHANCED: Modern styling with gradients, animations, and improved visual hierarchy
// PHASE 2: Advanced animations, loading states, and micro-interactions
// PHASE 3: Advanced search, user menu, notifications, customizable actions, and themes

import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { APP_NAME_KEY } from '../constants';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useTabNavigation } from '../hooks/useTabNavigation';
import { NavItem } from '../core/types';
import { 
  SchoolIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  IconProps, 
  XIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  BellIcon,
  PlusIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from './ui/icons';
import SettingsPopup from './SettingsPopup';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface SearchResult {
  item: NavItem;
  relevance: number;
  category: string;
}

interface QuickAction {
  id: string;
  name: string;
  icon: React.ReactElement;
  path: string;
  isCustom?: boolean;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  read: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { t } = useTranslation(['navigation', 'common']);
  const { navigationItems } = useDynamicNavigation(true);
  const { navigateToModule, navigateToUrl } = useTabNavigation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'auto'>('dark');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [customQuickActions, setCustomQuickActions] = useState<QuickAction[]>([]);
  const [showQuickActionSettings, setShowQuickActionSettings] = useState(false);
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize with mock notifications
  useEffect(() => {
    setNotifications([
      {
        id: '1',
        type: 'info',
        message: 'New student registration completed',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        read: false
      },
      {
        id: '2',
        type: 'warning',
        message: 'Low inventory alert: Textbooks',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: false
      },
      {
        id: '3',
        type: 'success',
        message: 'Fee collection target achieved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true
      }
    ]);
  }, []);

  const handleToggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };
  
  useEffect(() => {
    navigationItems?.forEach(item => {
      if (item.isGroup && item.children) {
        const isModuleActive = item.modulePath && location.pathname.startsWith(item.modulePath);
        const groupKey = item.name; 
        const isChildActive = item.children.some(child => 
          location.pathname === child.path || (child.path !== '/' && location.pathname.startsWith(child.path))
        );
        
        if ((isModuleActive || isChildActive)) {
           setOpenGroups(prev => ({ ...prev, [groupKey]: true }));
        }
      }
    });
  }, [location.pathname, navigationItems]); // Removed openGroups from dependencies

  // Dynamically generate quick actions for all modules
  const defaultQuickActions: QuickAction[] = navigationItems?.map(item => {
    let iconElement: React.ReactElement = <CogIcon />;
    if (typeof item.icon === 'function') {
      const Icon = item.icon as React.FC<any>;
      iconElement = <Icon />;
    }
    return {
      id: item.name,
      name: t(item.name),
      icon: iconElement,
      path: item.path
    };
  }) || [];

  // Combined quick actions (default + custom)
  const allQuickActions = [...defaultQuickActions, ...customQuickActions];

  // Advanced search functionality with filtering and relevance scoring
  const performAdvancedSearch = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const searchTerms = query.toLowerCase().split(' ');

    const calculateRelevance = (item: NavItem, searchTerms: string[]): number => {
      const itemName = t(item.name).toLowerCase();
      let relevance = 0;

      searchTerms.forEach(term => {
        if (itemName.includes(term)) {
          relevance += 10; // Exact match gets high score
        }
        if (itemName.startsWith(term)) {
          relevance += 5; // Starts with gets medium score
        }
        if (itemName.includes(term)) {
          relevance += 2; // Contains gets low score
        }
      });

      return relevance;
    };

    // Search through all navigation items
    const searchInItems = (items: NavItem[], category: string) => {
      items.forEach(item => {
        const relevance = calculateRelevance(item, searchTerms);
        if (relevance > 0) {
          results.push({ item, relevance, category });
        }

        // Search in children if it's a group
        if (item.isGroup && item.children) {
          searchInItems(item.children, `${category} > ${t(item.name)}`);
        }
      });
    };

    searchInItems(navigationItems, 'Navigation');

    // Sort by relevance and return top results
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10); // Limit to top 10 results
  }, [t]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setShowSearchResults(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const results = performAdvancedSearch(query);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  };

  // Theme switching functionality
  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    setCurrentTheme(theme);
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    // Store in localStorage
    localStorage.setItem('sidebar-theme', theme);
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('sidebar-theme') as 'light' | 'dark' | 'auto';
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Notification management
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Custom quick actions management
  const addCustomQuickAction = (action: Omit<QuickAction, 'id' | 'isCustom'>) => {
    const newAction: QuickAction = {
      ...action,
      id: `custom-${Date.now()}`,
      isCustom: true
    };
    setCustomQuickActions(prev => [...prev, newAction]);
    localStorage.setItem('custom-quick-actions', JSON.stringify([...customQuickActions, newAction]));
  };

  const removeCustomQuickAction = (id: string) => {
    setCustomQuickActions(prev => prev.filter(action => action.id !== id));
    localStorage.setItem('custom-quick-actions', JSON.stringify(customQuickActions.filter(action => action.id !== id)));
  };

  // Load custom quick actions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('custom-quick-actions');
    if (saved) {
      try {
        setCustomQuickActions(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load custom quick actions:', error);
      }
    }
  }, []);

  // Loading skeleton component
  const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-slate-600/20 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-600/20 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );

  // Collapsible toggle handler
  const handleCollapseToggle = () => setCollapsed((prev) => !prev);

  // Tooltip component for collapsed mode
  const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="group relative flex items-center">
      {children}
      {text && (
        <span className="absolute left-full ml-3 z-50 whitespace-nowrap rounded bg-slate-900/90 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all pointer-events-none shadow-lg shadow-slate-900/30">
          {text}
        </span>
      )}
    </div>
  );

  const NavItemLink: React.FC<{ item: NavItem; isChild?: boolean; index?: number }> = ({ 
    item, 
    isChild = false, 
    index = 0 
  }) => {
    const translatedName = t(item.name);
    const isActive = location.pathname === item.path || 
                    (item.path !== '/' && location.pathname.startsWith(item.path));

    if (item.isGroup && item.children) {
      const groupKey = item.name; 
      const isOpen = openGroups[groupKey] || false;
      const groupPath = item.modulePath || item.path;
      const isGroupActive = location.pathname.startsWith(groupPath);

      return (
        <li
          style={{ '--item-index': index } as React.CSSProperties}
          className={`${isChild ? 'ml-0' : ''} nav-item-staggered`}
        >
          <div
            onClick={() => handleToggleGroup(groupKey)}
            className={`
              nav-group-header group
              flex items-center justify-between p-3 rounded-xl
              bg-slate-700/5 border border-slate-600/10
              hover:bg-slate-600/10 hover:border-slate-600/20
              transition-all duration-500 ease-out cursor-pointer
              hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-900/20
              ${isGroupActive ? 'bg-blue-500/10 border-blue-500/20 shadow-lg shadow-blue-500/10' : ''}
            `}
            aria-label={translatedName} 
            aria-expanded={isOpen} 
          >
            <div 
              className="flex items-center space-x-3 flex-grow cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation(); 
                navigateToModule(item.path, groupPath);
                if(window.innerWidth < 1024) toggleSidebar();
              }}
            >
              <div className={`
                nav-icon-container
                flex items-center justify-center w-9 h-9 rounded-lg
                bg-slate-600/5 group-hover:bg-slate-600/15
                transition-all duration-500 ease-out
                group-hover:scale-110 group-hover:rotate-3
                ${isGroupActive ? 'bg-blue-500/20 shadow-lg shadow-blue-500/20' : ''}
              `}>
                {item.icon && React.cloneElement(item.icon as React.ReactElement<IconProps>, { 
                  className: `w-5 h-5 transition-all duration-500 ${
                    isGroupActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                  }` 
                })}
              </div>
              <span className={`
                nav-item-text
                font-medium text-sm tracking-tight
                transition-all duration-500
                ${isGroupActive ? 'text-blue-100 font-semibold' : 'text-slate-300 group-hover:text-slate-100'}
              `}>
                {translatedName}
              </span>
            </div>
            <ChevronDownIcon 
              className={`
                nav-group-chevron
                w-4 h-4 transition-all duration-500 ease-out
                ${isOpen ? 'rotate-180 scale-110' : ''}
                ${isGroupActive ? 'text-blue-400' : 'text-slate-400'}
                group-hover:scale-110
              `} 
            />
          </div>
          {isOpen && (
            <div className="nav-group-children ml-3 pl-3 border-l-2 border-slate-600/10 relative overflow-hidden">
              <div className="absolute left-[-1px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-transparent opacity-0 transition-all duration-500 ease-out nav-group-open:opacity-100"></div>
              <ul className="space-y-1 mt-2">
                {item.children.map((child: NavItem, childIndex: number) => (
                  <NavItemLink 
                    key={child.name} 
                    item={child} 
                    isChild={true} 
                    index={childIndex}
                  />
                ))}
              </ul>
            </div>
          )}
        </li>
      );
    }

    return (
      <li className={`my-1 ${collapsed ? 'flex justify-center' : ''}`}> 
        <Tooltip text={collapsed ? translatedName : ''}>
          <button
            onClick={() => {
              navigateToUrl(item.path, translatedName);
              if(window.innerWidth < 1024) toggleSidebar();
            }}
            className={`
              flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all duration-300
              ${collapsed ? 'justify-center' : ''}
              ${isActive ? 'bg-gradient-to-r from-blue-400/80 to-blue-600/80 text-white shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-slate-600/20 hover:text-slate-100'}
              group relative
            `}
            style={{ minHeight: 48 }}
          >
            <span className={`flex items-center justify-center w-10 h-10 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-600/10'} transition-all`}>
              {item.icon}
            </span>
            {!collapsed && <span className="font-medium text-base truncate">{translatedName}</span>}
          </button>
        </Tooltip>
      </li>
    );
  };

  const appNameTranslated = t(APP_NAME_KEY, { ns: 'common' });

  // Fix: Ensure loading state is not stuck
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Sidebar width and style
  const sidebarWidth = collapsed ? 'w-20' : 'w-64';
  const sidebarBg = 'bg-slate-900/80 backdrop-blur-xl border-r border-slate-900/30 shadow-2xl shadow-black/30';

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-40 flex flex-col ${sidebarWidth} transition-all duration-500 ${sidebarBg} rounded-r-3xl overflow-x-hidden`}
      aria-label="Sidebar"
    >
      {/* Header */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} h-20 px-4`}> 
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-purple-900 rounded-2xl flex items-center justify-center shadow-lg">
            <SchoolIcon className="w-6 h-6 text-white" />
          </div>
          {!collapsed && <span className="text-xl font-bold text-slate-100 tracking-tight">{t(APP_NAME_KEY, { ns: 'common' })}</span>}
        </div>
        <button
          onClick={handleCollapseToggle}
          className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800/40 transition-all duration-300"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon className="w-6 h-6" /> : <ChevronLeftIcon className="w-6 h-6" />}
        </button>
      </div>
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden mt-2">
        <ul className="space-y-1 pr-1">
          {navigationItems?.map((item: NavItem, idx: number) => (
            <NavItemLink key={item.name} item={item} index={idx} />
          )) || []}
        </ul>
      </nav>
      {/* Footer: fixed settings icon */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} p-4 mt-auto`}>
        <Tooltip text={collapsed ? t('common:settings') : ''}>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 text-slate-400 hover:bg-slate-700/40 hover:text-slate-100">
            <CogIcon className="w-6 h-6" />
            {!collapsed && <span className="font-medium text-base text-slate-100">{t('common:settings')}</span>}
          </button>
        </Tooltip>
      </div>
      <SettingsPopup open={showSettings} onClose={() => setShowSettings(false)} />
    </aside>
  );
};

export default Sidebar;