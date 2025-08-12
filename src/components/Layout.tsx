import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';
import { useRBAC } from '../hooks/useRBAC';
import { useAuth } from '../contexts/AuthContext';
import { ChevronUpIcon, Bars3Icon } from '@heroicons/react/24/outline';
import Header from './Header';
import Sidebar from './Sidebar';
import PrimarySidebar from './PrimarySidebar';
import SecondarySidebar from './SecondarySidebar';
import SettingsPopup from './SettingsPopup';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import NavigationErrorBoundary from './NavigationErrorBoundary';
import { useRoutePersistence } from '../hooks/useRoutePersistence';
import { useInteractionTracking } from '../hooks/usePerformanceMonitoring';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getMainModules, isLoading } = useDynamicNavigation(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModuleKey, setSelectedModuleKey] = useState('');
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [showScrollHelpers, setShowScrollHelpers] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getStoredRoute } = useRoutePersistence();
  const { trackNavigation } = useInteractionTracking('Layout');

  // Track scroll position to show/hide scroll helpers
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 200; // Show after scrolling 200px
      setShowScrollHelpers(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Set default module when navigation loads, but respect current route
  useEffect(() => {
    if (!isLoading) {
      const mainModules = getMainModules();
      
      if (mainModules.length > 0 && !selectedModuleKey) {
        // Determine the appropriate module based on current path
        const currentPath = location.pathname;
        
        // Find module that matches current path
        let matchingModule = null;
        for (const module of mainModules) {
          if (module.children) {
            for (const child of module.children) {
              if (child.path === currentPath) {
                matchingModule = module.name;
                break;
              }
            }
          }
          if (matchingModule) break;
        }
        
        // If we found a matching module, use it; otherwise use the first module
        const moduleToSelect = matchingModule || mainModules[0].name;
        setSelectedModuleKey(moduleToSelect);
        
        // Only navigate to dashboard if we're on the root path AND the first module is dashboard
        // AND there's no stored route from a previous session
        const storedRoute = getStoredRoute();
        if (currentPath === '/' && mainModules[0].name === 'navigation:dashboard' && !storedRoute) {
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [isLoading, getMainModules, selectedModuleKey, navigate, location.pathname]);

  const handleModuleSelect = (moduleKey: string) => {
    if (moduleKey === selectedModuleKey) {
      setIsSubmenuOpen((open: boolean) => !open); // toggle submenu
    } else {
      setSelectedModuleKey(moduleKey);
      setIsSubmenuOpen(true); // open submenu for new module
      // If Dashboard is selected, navigate to /dashboard
      if (moduleKey === 'navigation:dashboard') {
        const trackNav = trackNavigation(location.pathname, '/dashboard');
        navigate('/dashboard');
        // Track navigation completion after a brief delay
        setTimeout(trackNav, 100);
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToNavigation = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen w-screen bg-slate-100">
      <Header onSettings={() => setShowSettings(true)} />
      <div className="flex flex-1 pt-16 md:pt-16">
        <PrimarySidebar selectedModuleKey={selectedModuleKey} onModuleSelect={handleModuleSelect} />
        <SecondarySidebar selectedModuleKey={selectedModuleKey} isOpen={isSubmenuOpen} onClose={() => setIsSubmenuOpen(false)} />
        <main className="flex-1 p-2 sm:p-3 lg:p-4 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {/* Breadcrumb Navigation */}
            <div className="mb-2">
              <BreadcrumbNavigation 
                className="mb-1"
                onNavigationError={(path, error) => {
                  console.error(`Navigation error for ${path}:`, error);
                }}
              />
            </div>
            
            {/* Main content wrapped with navigation error boundary */}
            <NavigationErrorBoundary
              onError={(error, errorInfo, currentRoute) => {
                console.error(`Navigation boundary caught error on ${currentRoute}:`, error);
              }}
              maxRetries={2}
              enableFallbackRoutes={true}
              fallbackRoutes={['/dashboard', '/reports', '/administration']}
            >
              {children}
            </NavigationErrorBoundary>
          </div>
        </main>
        <SettingsPopup open={showSettings} onClose={() => setShowSettings(false)} />
      </div>

      {/* Floating Navigation Helpers - appear when scrolled down */}
      {showScrollHelpers && (
        <>
          {/* Navigation Button - positioned on the left where navigation is */}
          <div className="fixed bottom-6 left-6 z-50">
            <button
              onClick={scrollToNavigation}
              className="
                group flex items-center gap-2 px-3 py-2
                bg-white/80 hover:bg-white/90
                backdrop-blur-md
                text-slate-600 hover:text-slate-800
                rounded-lg shadow-sm hover:shadow-md
                border border-slate-200/50 hover:border-slate-300/70
                transition-all duration-300 ease-out
                hover:scale-105 focus:scale-105
                focus:outline-none focus:ring-2 focus:ring-slate-400/30
                opacity-80 hover:opacity-100
              "
              title="Back to Navigation"
            >
              <Bars3Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xs font-medium whitespace-nowrap">Menu</span>
            </button>
          </div>

          {/* Back to Top Button - remains on the right */}
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={scrollToTop}
              className="
                group flex items-center justify-center
                w-12 h-12
                bg-blue-600/90 hover:bg-blue-500/95
                backdrop-blur-md
                text-white
                rounded-full shadow-lg hover:shadow-xl
                border border-blue-400/20 hover:border-blue-300/30
                transition-all duration-300 ease-out
                hover:scale-110 focus:scale-110
                focus:outline-none focus:ring-2 focus:ring-blue-400/50
              "
              title="Back to Top"
            >
              <ChevronUpIcon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Layout;