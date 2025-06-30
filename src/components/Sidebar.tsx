// ABOUTME: This component renders the main navigation sidebar for the application.
// ABOUTME: It displays navigation links, handles group expansion, and adapts for mobile.

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { NAVIGATION_ITEMS, APP_NAME_KEY } from '../constants';
import { NavItem } from '../types';
import { SchoolIcon, ChevronDownIcon, ChevronUpIcon, IconProps, XIcon } from './ui/icons';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { t } = useTranslation(['navigation', 'common']); // Specify namespaces
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const location = useLocation();

  const handleToggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };
  
  useEffect(() => {
    NAVIGATION_ITEMS.forEach(item => {
      if (item.isGroup && item.children) {
        const isModuleActive = item.modulePath && location.pathname.startsWith(item.modulePath);
        const groupKey = item.name; 
        const isChildActive = item.children.some(child => location.pathname === child.path || (child.path !== '/' && location.pathname.startsWith(child.path)));
        
        if ((isModuleActive || isChildActive) && !openGroups[groupKey]) {
           setOpenGroups(prev => ({ ...prev, [groupKey]: true }));
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);


  const NavItemLink: React.FC<{ item: NavItem; isChild?: boolean; parentGroupPath?: string }> = ({ item, isChild = false }) => {
    const baseClasses = "flex items-center space-x-3 p-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200";
    const activeClasses = "bg-gray-700 text-white font-semibold";
    const translatedName = t(item.name); 

    if (item.isGroup && item.children) {
      const groupKey = item.name; 
      const isOpen = openGroups[groupKey] || false;
      const groupPath = item.modulePath || item.path;

      return (
        <li>
          <div
            onClick={() => handleToggleGroup(groupKey)}
            className={`${baseClasses} justify-between cursor-pointer ${location.pathname.startsWith(groupPath) && !isChild ? activeClasses : ''}`}
            aria-label={translatedName} 
            aria-expanded={isOpen} 
          >
            <Link to={groupPath} className="flex items-center space-x-3 flex-grow" onClick={(e) => {e.stopPropagation(); if(window.innerWidth < 1024) toggleSidebar();}}>
              {item.icon && React.cloneElement(item.icon as React.ReactElement<IconProps>, { className: `w-5 h-5` })}
              <span>{translatedName}</span>
            </Link>
            {isOpen ? <ChevronUpIcon className="w-4 h-4 flex-shrink-0" /> : <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />}
          </div>
          {isOpen && (
            <ul className="pl-4 mt-1 space-y-1">
              {item.children.map(child => (
                <NavItemLink key={child.name} item={child} isChild={true} />
              ))}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li className={isChild ? 'ml-0' : ''}>
        <NavLink
          to={item.path}
          onClick={() => {if(window.innerWidth < 1024) toggleSidebar();}}
          className={({ isActive }) =>
            `${baseClasses} ${isChild ? 'text-sm pl-7' : ''} ${isActive ? activeClasses : ''}`
          }
        >
          {item.icon && React.cloneElement(item.icon as React.ReactElement<IconProps>, { className: `w-5 h-5 ${isChild ? 'mr-2' : ''}` })}
          <span>{translatedName}</span>
        </NavLink>
      </li>
    );
  };

  const appNameTranslated = t(APP_NAME_KEY, { ns: 'common' });

  return (
    <>
{/* Sidebar for larger screens */}
      <div className={`hidden lg:flex lg:flex-col bg-gray-800 text-white min-h-screen transition-all duration-300 ease-in-out ${
        isOpen ? 'w-72' : 'w-0'
      } overflow-hidden`}
      aria-hidden={!isOpen}
      >
        {isOpen && (
          <>
            <div className="flex items-center justify-between h-20 border-b border-gray-700 px-4 min-w-[18rem]">
              <div className="flex items-center">
                <SchoolIcon className="w-10 h-10 mr-2 text-indigo-400 flex-shrink-0" />
                <h1 className="text-xl font-bold text-indigo-400 truncate">{appNameTranslated}</h1>
              </div>
              <button 
                onClick={toggleSidebar} 
                className="p-2 text-gray-400 hover:text-white"
                aria-label={t('common:closeSidebar')} 
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-w-[18rem]" aria-label={t('navigation:sidebarNavigation')}>
              <ul>
                {NAVIGATION_ITEMS.map((item) => (
                  <NavItemLink key={item.name} item={item} />
                ))}
              </ul>
            </nav>
            <div className="p-4 border-t border-gray-700 min-w-[18rem]">
              <p className="text-xs text-gray-500 text-center">&copy; {new Date().getFullYear()} {appNameTranslated}</p>
            </div>
          </>
        )}
      </div>

      {/* Mobile/Tablet sidebar (overlay) */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-gray-800 text-white transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:hidden flex flex-col min-h-screen`}
        role="dialog" 
        aria-modal="true" 
        aria-label={t('navigation:sidebarNavigation')} 
      >
        <div className="flex items-center justify-between h-20 border-b border-gray-700 px-4">
            <div className="flex items-center">
                <SchoolIcon className="w-8 h-8 mr-2 text-indigo-400 flex-shrink-0" />
                <h1 className="text-lg font-bold text-indigo-400 truncate">{appNameTranslated}</h1>
            </div>
            <button 
              onClick={toggleSidebar} 
              className="p-2 text-gray-400 hover:text-white"
              aria-label={t('common:closeSidebar')} 
            >
                <XIcon className="w-6 h-6" />
            </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label={t('navigation:sidebarNavigationMobile')}>
          <ul>
            {NAVIGATION_ITEMS.map((item) => (
              <NavItemLink key={item.name} item={item} />
            ))}
          </ul>
        </nav>
         <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">&copy; {new Date().getFullYear()} {appNameTranslated}</p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;