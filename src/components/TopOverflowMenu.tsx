import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDynamicNavigation } from '@/hooks/useDynamicNavigation';
import { useNavigate } from 'react-router-dom';
import { useTabs } from '@/hooks/tabs';
import {
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  SunIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  BellIcon,
  HomeIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface TopOverflowMenuProps {
  currentModule?: string;
  onModuleSelect?: (moduleKey: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action?: () => void;
  shortcut?: string;
  divider?: boolean;
  children?: MenuItem[];
}

const TopOverflowMenu: React.FC<TopOverflowMenuProps> = ({
  currentModule = 'dashboard',
  onModuleSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('navigation');
  const { navigationItems } = useDynamicNavigation(true);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current module display info
  const getCurrentModuleInfo = () => {
    return {
      name: t(`${currentModule}.title`) || currentModule,
      icon: Squares2X2Icon
    };
  };

  const currentModuleInfo = getCurrentModuleInfo();

  // Main menu items
  const mainMenuItems: MenuItem[] = [
    {
      id: 'desktop',
      label: t('common:desktop') || 'Desktop',
      icon: ComputerDesktopIcon,
      action: () => openTab('/dashboard', { pinned: true })
    },
    {
      id: 'workspaces',
      label: t('common:workspaces') || 'Workspaces',
      icon: BuildingOfficeIcon,
      children: navigationItems.filter(item => item.isGroup).map(item => {
        // Parse the translation key - format is "navigation:module.title"
        const [namespace, key] = item.name.includes(':') 
          ? item.name.split(':') 
          : ['navigation', item.name];
        
        return {
          id: item.name,
          label: t(key, { ns: namespace }),
          icon: item.icon || Squares2X2Icon,
          action: () => {
            if (onModuleSelect) onModuleSelect(item.name);
            setIsOpen(false);
          }
        };
      })
    },
    {
      id: 'website',
      label: t('common:website') || 'Website',
      icon: GlobeAltIcon,
      action: () => window.open('/', '_blank')
    },
    { id: 'divider1', label: '', icon: Squares2X2Icon, divider: true },
    {
      id: 'reload',
      label: t('common:reload') || 'Reload',
      icon: ArrowPathIcon,
      action: () => window.location.reload()
    },
    {
      id: 'toggleWidth',
      label: t('common:toggleFullWidth') || 'Toggle Full Width',
      icon: ArrowsPointingOutIcon,
      action: () => {
        document.body.classList.toggle('full-width');
        setIsOpen(false);
      }
    },
    {
      id: 'toggleTheme',
      label: t('common:toggleTheme') || 'Toggle Theme',
      icon: SunIcon,
      action: () => {
        document.documentElement.classList.toggle('dark');
        setIsOpen(false);
      }
    },
    { id: 'divider2', label: '', icon: Squares2X2Icon, divider: true },
    {
      id: 'help',
      label: t('common:help') || 'Help',
      icon: QuestionMarkCircleIcon,
      children: [
        {
          id: 'about',
          label: t('common:about') || 'About',
          icon: Squares2X2Icon,
          action: () => navigate('/about')
        },
        {
          id: 'keyboard',
          label: t('common:keyboardShortcuts') || 'Keyboard Shortcuts',
          icon: Squares2X2Icon,
          action: () => navigate('/keyboard-shortcuts')
        }
      ]
    }
  ];

  const handleItemClick = (item: MenuItem) => {
    if (item.children) {
      setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
    } else if (item.action) {
      item.action();
      if (!item.children) setIsOpen(false);
    }
  };

  return (
    <div ref={menuRef} className="relative w-full">
      {/* Trigger Button - Compact: just logo + down arrow */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-2 py-2 rounded-lg
          bg-slate-800/80 hover:bg-slate-700/80
          text-white transition-all duration-200
          border border-white/10 hover:border-white/20
          ${isOpen ? 'bg-slate-700/80 border-white/20' : ''}
        `}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
          <currentModuleInfo.icon className="w-5 h-5 text-white" />
        </div>
        <ChevronDownIcon className={`
          w-4 h-4 text-white/60 transition-transform duration-200
          ${isOpen ? 'rotate-180' : ''}
        `} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="
          absolute top-full left-0 mt-2
          w-64 bg-slate-900/95 backdrop-blur-xl
          rounded-xl border border-white/10
          shadow-2xl shadow-black/50
          overflow-hidden z-50
        ">
          {/* Main Menu Items */}
          <div className="p-2 max-h-96 overflow-y-auto custom-scrollbar">
            {mainMenuItems.map((item) => (
              <React.Fragment key={item.id}>
                {item.divider ? (
                  <div className="my-2 border-t border-white/10" />
                ) : (
                  <div className="relative group">
                    <button
                      onClick={() => handleItemClick(item)}
                      className="
                        w-full flex items-center justify-between px-3 py-2 rounded-lg
                        text-white/80 hover:text-white hover:bg-white/10
                        transition-colors duration-150
                      "
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {item.children && (
                        <ChevronRightIcon className="w-4 h-4 text-white/40" />
                      )}
                    </button>

                    {/* Submenu */}
                    {item.children && activeSubmenu === item.id && (
                      <div className="
                        absolute left-full top-0 ml-2
                        w-56 bg-slate-800/95 backdrop-blur-xl
                        rounded-xl border border-white/10
                        shadow-2xl shadow-black/50
                        p-2 z-50
                      ">
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => handleItemClick(child)}
                            className="
                              w-full flex items-center gap-3 px-3 py-2 rounded-lg
                              text-white/80 hover:text-white hover:bg-white/10
                              transition-colors duration-150
                            "
                          >
                            {child.icon && <child.icon className="w-5 h-5" />}
                            <span className="text-sm">{child.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default TopOverflowMenu;
