// ABOUTME: This component renders the main application header.
// ABOUTME: It includes the mobile sidebar toggle, page title/welcome message, and user profile area.

import React from 'react';
import { useUser } from '../contexts/UserContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { BellIcon, UserCircleIcon, ChevronDownIcon, MenuIcon } from './ui/icons'; 
import LanguageSwitcher from './ui/LanguageSwitcher'; // Import LanguageSwitcher

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { t } = useTranslation('common'); // Assuming 'welcomeMessage' is in 'common' namespace
  const { currentUser } = useUser();

  const welcomeMessage = currentUser 
    ? t('welcomeMessage', { name: currentUser.display_name || currentUser.username }) 
    : t('welcomeMessageGuest');


  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center h-20 border-b">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="text-gray-500 focus:outline-none focus:text-gray-700 mr-3"
          aria-label={t('toggleSidebar')}
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold text-gray-700">{welcomeMessage}</h2>
      </div>
      <div className="flex items-center space-x-4">
        <LanguageSwitcher /> {/* Add LanguageSwitcher here */}
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700" aria-label={t('notifications')}>
          <BellIcon className="w-6 h-6" />
        </button>
        {currentUser && (
          <div className="flex items-center space-x-2">
            <UserCircleIcon className="w-8 h-8 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">{currentUser.display_name || currentUser.username}</p>
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