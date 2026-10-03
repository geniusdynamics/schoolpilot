import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useFullWidth } from '../contexts/FullWidthContext';
import { useNavigate } from 'react-router-dom';
import { getModuleStyle, normalizeModuleId } from '../utils/moduleStyles';
import { DARK_MODE_ENABLED, useTheme } from '../hooks/useTheme';
import {
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  SunIcon,
  QuestionMarkCircleIcon,
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
  const { t } = useTranslation(['navigation', 'common']);
  const { navigationItems } = useDynamicNavigation(true);
  const { toggleFullWidth, isFullWidth } = useFullWidth();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Module style for current module — used in fullwidth mode (S2.1.1)
  const normalizedModule = useMemo(
    () => normalizeModuleId(currentModule),
    [currentModule]
  );
  const moduleStyle = useMemo(
    () => getModuleStyle(normalizedModule),
    [normalizedModule]
  );

  // Helper: close menu AND reset submenu state (S2.3.1, S2.3.3)
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setActiveSubmenu(null);
  }, []);

  // Close menu when clicking outside — also reset submenu state (S2.3.1)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeMenu]);

  // Build main menu items — every action calls closeMenu() to reset state
  const mainMenuItems: MenuItem[] = useMemo(
    () => [
      {
        id: 'desktop',
        label: t('common:desktop') || 'Desktop',
        icon: ComputerDesktopIcon,
        action: () => {
          navigate('/dashboard');
          closeMenu();
        }
      },
      {
        id: 'workspaces',
        label: t('common:workspaces') || 'Workspaces',
        icon: BuildingOfficeIcon,
        children: navigationItems
          .filter((item) => item.isGroup)
          .map((item) => ({
            id: item.path,
            label: t(item.name) || item.name,
            icon: item.icon || Squares2X2Icon,
            action: () => {
              if (onModuleSelect) onModuleSelect(item.path);
              closeMenu();
            }
          }))
      },
      {
        id: 'website',
        label: t('common:website') || 'Website',
        icon: GlobeAltIcon,
        action: () => {
          window.open('/', '_blank');
          closeMenu();
        }
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
        label: isFullWidth
          ? t('common:exitFullWidth') || 'Exit Full Width'
          : t('common:toggleFullWidth') || 'Toggle Full Width',
        icon: ArrowsPointingOutIcon,
        action: () => {
          toggleFullWidth();
          closeMenu();
        }
      },
      // Dark mode is temporarily disabled system-wide (see DARK_MODE_ENABLED in
      // src/hooks/useTheme.tsx) — the toggle item is hidden until it is
      // properly implemented.
      ...(DARK_MODE_ENABLED
        ? [{
            id: 'toggleTheme',
            label: t('common:toggleTheme') || 'Toggle Theme',
            icon: SunIcon,
            action: () => {
              toggleTheme();
              closeMenu();
            }
          } as MenuItem]
        : []),
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
            action: () => {
              navigate('/about');
              closeMenu();
            }
          },
          {
            id: 'keyboard',
            label: t('common:keyboardShortcuts') || 'Keyboard Shortcuts',
            icon: Squares2X2Icon,
            action: () => {
              navigate('/keyboard-shortcuts');
              closeMenu();
            }
          }
        ]
      }
    ],
    [
      t,
      navigationItems,
      isFullWidth,
      onModuleSelect,
      navigate,
      toggleFullWidth,
      closeMenu
    ]
  );

  const handleItemClick = (item: MenuItem) => {
    if (item.children) {
      // Toggle submenu open/closed
      setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
    } else if (item.action) {
      // Leaf click: action runs (which calls closeMenu internally)
      item.action();
    }
  };

  // Theme classes — switch in lock-step with isFullWidth (S2.1.1, S2.1.2, S2.1.3)
  const theme = isFullWidth
    ? {
        // Light glassmorphic — mirrors SecondarySidebar
        container: `bg-white/95 dark:bg-slate-900/95 ${moduleStyle.background} ${moduleStyle.border}`,
        text: 'text-slate-700',
        textHover: 'hover:text-slate-900',
        itemHover: moduleStyle.hover,
        chevron: 'text-slate-400',
        divider: 'border-slate-200',
        submenuBorder: moduleStyle.border
      }
    : {
        // Compact dark slate
        container: 'bg-slate-900/95 border-white/10',
        text: 'text-white/80',
        textHover: 'hover:text-white',
        itemHover: 'hover:bg-white/10',
        chevron: 'text-white/40',
        divider: 'border-white/10',
        submenuBorder: 'border-white/10'
      };

  return (
    <div ref={menuRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-2 py-2 rounded-lg
          ${
            isFullWidth
              ? `bg-white/80 dark:bg-slate-900/80 hover:bg-surface-card ${moduleStyle.border} border text-slate-800`
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-white border border-white/10 hover:border-white/20'
          }
          transition-all duration-200
          ${
            isOpen
              ? isFullWidth
                ? 'bg-surface-card'
                : 'bg-slate-700/80 border-white/20'
              : ''
          }
        `}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
          <Squares2X2Icon className="w-5 h-5 text-white" />
        </div>
        <ChevronDownIcon
          className={`
            w-4 h-4 transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
            ${isFullWidth ? 'text-slate-500' : 'text-white/60'}
          `}
        />
      </button>

      {/* Popover — single flex container, submenu sits adjacent at the same top edge (S2.2.2) */}
      {isOpen && (
        <div
          className={`
            absolute top-full left-0 mt-2
            flex items-stretch z-50
            rounded-xl border shadow-2xl shadow-black/50
            ${theme.container}
          `}
        >
          {/* Main Menu — w-52 (S2.2.1) */}
          <div className="w-52 p-2 max-h-96 overflow-y-auto custom-scrollbar">
            {mainMenuItems.map((item) => (
              <React.Fragment key={item.id}>
                {item.divider ? (
                  <div className={`my-2 border-t ${theme.divider}`} />
                ) : (
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-lg
                      ${theme.text} ${theme.textHover} ${theme.itemHover}
                      transition-colors duration-150
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {item.children && (
                      <ChevronRightIcon
                        className={`w-4 h-4 ${theme.chevron}`}
                      />
                    )}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Submenu — adjacent to main menu, same top edge, w-52 (S2.2.1, S2.2.2) */}
          {mainMenuItems.map((item) =>
            item.children && activeSubmenu === item.id ? (
              <div
                key={`submenu-${item.id}`}
                className={`w-52 p-2 border-l ${theme.submenuBorder}`}
              >
                {item.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => handleItemClick(child)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg
                      ${theme.text} ${theme.textHover} ${theme.itemHover}
                      transition-colors duration-150
                    `}
                  >
                    {child.icon && <child.icon className="w-5 h-5" />}
                    <span className="text-sm">{child.label}</span>
                  </button>
                ))}
              </div>
            ) : null
          )}
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
          background-color: ${
            isFullWidth ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255, 255, 255, 0.2)'
          };
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default TopOverflowMenu;
