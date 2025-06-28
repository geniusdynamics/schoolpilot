
import React from 'react';
import { useUser } from '../contexts/UserContext';
import { BellIcon, UserCircleIcon, ChevronDownIcon, MenuIcon } from './ui/icons'; // Assuming you create an icons.tsx

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { currentUser } = useUser();

  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center h-20 border-b">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="text-gray-500 focus:outline-none focus:text-gray-700 lg:hidden mr-3" // Hidden on large screens
          aria-label="Toggle sidebar"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        {/* Placeholder for breadcrumbs or page title */}
        <h2 className="text-xl font-semibold text-gray-700">Welcome</h2>
      </div>
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <BellIcon className="w-6 h-6" />
        </button>
        {currentUser && (
          <div className="flex items-center space-x-2">
            <UserCircleIcon className="w-8 h-8 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">{currentUser.username}</p>
              <p className="text-xs text-gray-500">{currentUser.role || currentUser.user_type}</p>
            </div>
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;