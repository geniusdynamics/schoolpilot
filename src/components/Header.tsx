// ABOUTME: This component renders the main application header.
// ABOUTME: It includes the mobile sidebar toggle, page title/welcome message, and user profile area.

import React, { useRef, useEffect, useState } from 'react';
import { BellIcon, CogIcon } from './ui/icons';
import LanguageSwitcher from './ui/LanguageSwitcher';
import UserMenu from './UserMenu';
import { NetworkStatusIndicator } from './OfflineCapability';
import ModuleHealthIndicator from './ModuleHealthIndicator';
import { isFeatureEnabled } from '../config/appConfig';

const notifications = 3; // Example notification count

const Header: React.FC<{ onSettings: () => void }> = ({ onSettings }) => {
  const [showHeader, setShowHeader] = useState(true);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 10) {
        setShowHeader(true);
        lastScrollY.current = window.scrollY;
        return;
      }
      if (window.scrollY > lastScrollY.current) {
        setShowHeader(false); // scrolling down
      } else {
        setShowHeader(true); // scrolling up
      }
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'} bg-white/70 backdrop-blur shadow-md border-b border-slate-100`}
      style={{ height: '64px' }}
    >
      <div className="max-w-full mx-auto flex items-center justify-between h-16 px-3 sm:px-6">
        {/* Left: Logo & App Name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-md select-none">
            E
          </div>
          <span className="font-bold text-lg sm:text-xl text-slate-800 tracking-tight hidden xs:block">schoolpilot</span>
        </div>
        
        {/* Center: Search Bar - Hidden on mobile, responsive on tablet+ */}
        <div className="hidden md:flex flex-1 justify-center mx-4">
          <input
            type="text"
            placeholder="Search students, classes, reports..."
            className="w-full max-w-md lg:max-w-lg xl:max-w-xl px-4 py-2 rounded-xl bg-white/60 border border-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 placeholder-slate-400 text-sm"
          />
        </div>
        
        {/* Right: Actions - Responsive layout */}
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
          {/* Mobile Search Button - Only on mobile */}
          <button
            className="md:hidden p-2 rounded-xl bg-white/70 hover:bg-white/90 shadow text-slate-600"
            title="Search"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {/* Network Status Indicator - Between search and notifications */}
          {isFeatureEnabled('networkStatusIndicator') && (
            <div className="hidden sm:block">
              <NetworkStatusIndicator className="px-2 py-1 rounded-lg bg-white/70 hover:bg-white/90 shadow text-xs" />
            </div>
          )}
          
          {/* Module Health Indicator */}
          <div className="hidden sm:block">
            <ModuleHealthIndicator className="rounded-lg bg-white/70 hover:bg-white/90 shadow" showCount={true} />
          </div>
          
          {/* Notifications */}
          <div className="relative">
            <button className="p-1.5 sm:p-2 rounded-xl bg-white/70 hover:bg-white/90 shadow text-slate-600 relative">
              <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold rounded-full px-1 sm:px-1.5 py-0.5 shadow min-w-[16px] h-4 flex items-center justify-center">{notifications}</span>
              )}
            </button>
          </div>
          
          {/* Language Switcher - Hidden on small mobile */}
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          
          {/* Settings - Hidden on small mobile */}
          <button className="hidden sm:block p-1.5 sm:p-2 rounded-xl bg-white/70 hover:bg-white/90 shadow text-slate-600" title="Settings" onClick={onSettings}>
            <CogIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          {/* User Menu - Always visible but responsive */}
          <UserMenu />
        </div>
      </div>
      
      {/* Mobile Search Bar - Only shows when toggled */}
      {showMobileSearch && (
        <div className="md:hidden border-t border-slate-200/50 bg-white/80 backdrop-blur px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-white/60 border border-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 placeholder-slate-400 text-sm"
              autoFocus
            />
            <button
              onClick={() => setShowMobileSearch(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600"
              title="Close search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;