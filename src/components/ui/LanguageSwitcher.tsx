// ABOUTME: This component provides UI for switching between supported languages.
// ABOUTME: It uses i18next to change the application's current language.

import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button'; 

const languages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center space-x-1">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          variant={i18n.resolvedLanguage === lang.code ? 'primary' : 'ghost'}
          size="sm"
          className={`px-2 py-1 text-xs ${i18n.resolvedLanguage === lang.code ? '' : 'text-gray-600 hover:text-indigo-600'}`}
          aria-pressed={i18n.resolvedLanguage === lang.code}
          aria-label={`Switch to ${lang.name}`}
        >
          {lang.name.substring(0,2).toUpperCase()}
        </Button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;