import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PrimarySidebar from './PrimarySidebar';
import SecondarySidebar from './SecondarySidebar';
import SettingsPopup from './SettingsPopup';
import Header from './Header';
import { NAVIGATION_ITEMS } from '../constants';
import useDynamicNavigation from '../hooks/useDynamicNavigation';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getMainModules, isLoading } = useDynamicNavigation(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModuleKey, setSelectedModuleKey] = useState('');
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const navigate = useNavigate();

  // Set default module when navigation loads
  useEffect(() => {
    if (!isLoading) {
      const mainModules = getMainModules();
      console.log('🔍 [Layout] Debug Info:', {
        isLoading,
        modulesReady: true,
        mainModulesCount: mainModules.length,
        mainModules: mainModules,
        selectedModuleKey,
        willSetDefault: mainModules.length > 0 && !selectedModuleKey
      });
      
      if (mainModules.length > 0 && !selectedModuleKey) {
        setSelectedModuleKey(mainModules[0].name);
        // If the first module is Dashboard, navigate to /dashboard
        if (mainModules[0].name === 'navigation:dashboard') {
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [isLoading, getMainModules, selectedModuleKey, navigate]);

  const handleModuleSelect = (moduleKey: string) => {
    console.log('🔍 [Layout] Module selected:', moduleKey, 'current:', selectedModuleKey);
    if (moduleKey === selectedModuleKey) {
      setIsSubmenuOpen((open: boolean) => !open); // toggle submenu
    } else {
      setSelectedModuleKey(moduleKey);
      setIsSubmenuOpen(true); // open submenu for new module
      // If Dashboard is selected, navigate to /dashboard
      if (moduleKey === 'navigation:dashboard') {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-screen bg-slate-100">
      <Header onSettings={() => setShowSettings(true)} />
      <div className="flex flex-1 pt-16">
        <PrimarySidebar selectedModuleKey={selectedModuleKey} onModuleSelect={handleModuleSelect} />
        <SecondarySidebar selectedModuleKey={selectedModuleKey} isOpen={isSubmenuOpen} onClose={() => setIsSubmenuOpen(false)} />
        <main className="flex-1 p-6">
          {children}
        </main>
        <SettingsPopup open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    </div>
  );
};

export default Layout;
