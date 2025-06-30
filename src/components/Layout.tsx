
import React, { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppData } from '@/contexts/AppDataContext'; // Import useAppData

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const { loading } = useAppData(); // Consume the AppDataContext

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
      }`}>
        <Header toggleSidebar={toggleSidebar} />
        <main 
          className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6"
          aria-busy={loading.all} // Set aria-busy based on global loading state
          aria-live="polite" // Inform screen readers of changes in busy state
        >
          {/* Overlay for mobile when sidebar is open */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 z-10 bg-black opacity-50 lg:hidden" 
              onClick={toggleSidebar}
            ></div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
