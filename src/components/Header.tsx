// ABOUTME: This component renders the main application header.
// ABOUTME: It includes the mobile sidebar toggle, page title/welcome message, and user profile area.

import React, { useRef, useEffect, useState } from 'react';
import { BellIcon, CogIcon, UserCircleIcon, ChevronDownIcon } from './ui/icons';
import LanguageSwitcher from './ui/LanguageSwitcher';

const notifications = 3; // Example notification count

const Header: React.FC<{ onSettings: () => void }> = ({ onSettings }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
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
      <div className="max-w-full mx-auto flex items-center justify-between h-16 px-6">
        {/* Left: Logo & App Name */}
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg shadow-md select-none">
            E
          </div>
          <span className="font-bold text-xl text-slate-800 tracking-tight">EduGen OS</span>
        </div>
        {/* Center: Search Bar */}
        <div className="flex-1 flex justify-center">
          <input
            type="text"
            placeholder="Search students, classes, reports..."
            className="w-[420px] max-w-full px-5 py-2 rounded-xl bg-white/60 border border-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 placeholder-slate-400"
          />
        </div>
        {/* Right: Actions */}
        <div className="flex items-center gap-3 min-w-[260px] justify-end">
          {/* Notifications */}
          <div className="relative">
            <button className="p-2 rounded-xl bg-white/70 hover:bg-white/90 shadow text-slate-600 relative">
              <BellIcon className="w-6 h-6" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 shadow">{notifications}</span>
              )}
            </button>
          </div>
          {/* Language Switcher */}
          <LanguageSwitcher />
          {/* Theme Toggle (using CogIcon as placeholder) */}
          <button className="p-2 rounded-xl bg-white/70 hover:bg-white/90 shadow text-slate-600">
            <CogIcon className="w-6 h-6" />
          </button>
          {/* User Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-2 py-1 rounded-xl bg-white/70 hover:bg-white/90 shadow text-slate-700"
              onClick={() => setShowDropdown(v => !v)}
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-fuchsia-500 flex items-center justify-center text-white font-bold text-base">MG</span>
              <span className="font-medium text-slate-800">Mr GENIUS</span>
              <ChevronDownIcon className="w-4 h-4 text-slate-500" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white/90 rounded-2xl shadow-xl py-2 z-50 backdrop-blur border border-slate-100">
                <a href="#" className="block px-5 py-2 text-slate-700 hover:bg-slate-100 rounded-xl">Your Profile</a>
                <button className="block w-full text-left px-5 py-2 text-slate-700 hover:bg-slate-100 rounded-xl" onClick={onSettings}>Settings</button>
                <button className="block w-full text-left px-5 py-2 text-slate-700 hover:bg-slate-100 rounded-xl">Sign out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;