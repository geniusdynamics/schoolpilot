import React, { useState, useEffect } from 'react';
import PrimarySidebar from './PrimarySidebar';
import SecondarySidebar from './SecondarySidebar';
import SettingsPopup from './SettingsPopup';
import Header from './Header';
import { NAVIGATION_ITEMS } from '../constants';
import useDynamicNavigation from '../hooks/useDynamicNavigation';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getMainModules, isLoading } = useDynamicNavigation();
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModuleKey, setSelectedModuleKey] = useState('');
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

  // Set default module when navigation loads
  useEffect(() => {
    if (!isLoading) {
      const mainModules = getMainModules();
      if (mainModules.length > 0 && !selectedModuleKey) {
        setSelectedModuleKey(mainModules[0].name);
      }
    }
  }, [isLoading, getMainModules, selectedModuleKey]);

  const handleModuleSelect = (moduleKey: string) => {
    if (moduleKey === selectedModuleKey) {
      setIsSubmenuOpen((open: boolean) => !open); // toggle submenu
    } else {
      setSelectedModuleKey(moduleKey);
      setIsSubmenuOpen(true); // open submenu for new module
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100">
      <Header onSettings={() => setShowSettings(true)} />
      <div className="flex flex-1 min-h-0 pt-16">
        <PrimarySidebar selectedModuleKey={selectedModuleKey} onModuleSelect={handleModuleSelect} />
        <SecondarySidebar selectedModuleKey={selectedModuleKey} isOpen={isSubmenuOpen} onClose={() => setIsSubmenuOpen(false)} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
        <SettingsPopup open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    </div>
  );
};

export default Layout;
