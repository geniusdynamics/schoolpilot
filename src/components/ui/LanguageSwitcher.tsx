import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';
import { HookErrorBoundary } from '../ErrorBoundary/HookErrorBoundary';

const LanguageSwitcherContent: React.FC = () => {
  const { i18n, t, ready } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Define available languages with stable reference
  const languages = useMemo(() => {
    try {
      return [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'it', name: 'Italiano', flag: '🇮🇹' },
        { code: 'pt', name: 'Português', flag: '🇵🇹' },
        { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
        { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' },
        { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' }
      ];
    } catch (error) {
      console.error('[LanguageSwitcher] Error creating languages array:', error);
      return [];
    }
  }, []);

  const handleLanguageChange = useCallback((languageCode: string) => {
    try {
      if (!languageCode || typeof languageCode !== 'string') {
        console.warn('[LanguageSwitcher] Invalid language code:', languageCode);
        return;
      }
      
      if (!i18n || typeof i18n.changeLanguage !== 'function') {
        console.error('[LanguageSwitcher] i18n not properly initialized');
        return;
      }
      
      i18n.changeLanguage(languageCode).catch(error => {
        console.error('[LanguageSwitcher] Failed to change language:', error);
      });
      setIsOpen(false);
    } catch (error) {
      console.error('[LanguageSwitcher] Error in handleLanguageChange:', error);
    }
  }, [i18n]);

  const toggleDropdown = useCallback(() => {
    try {
      setIsOpen(prev => !prev);
    } catch (error) {
      console.error('[LanguageSwitcher] Error in toggleDropdown:', error);
    }
  }, []);

  const currentLanguage = useMemo(() => {
    try {
      const currentLang = (ready && i18n?.language) || 'en';
      const foundLanguage = languages.find(lang => lang && lang.code === currentLang);
      return foundLanguage || languages[0] || { code: 'en', name: 'English', flag: '🇺🇸' };
    } catch (error) {
      console.error('[LanguageSwitcher] Error finding current language:', error);
      return { code: 'en', name: 'English', flag: '🇺🇸' };
    }
  }, [ready, i18n?.language, languages]);

  // Show loading state if i18n is not ready - moved after all hooks
  if (!ready || !i18n) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700">
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
    <button
      onClick={toggleDropdown}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-slate-300 transition-colors"
    >
      <span className="text-sm">{currentLanguage.flag}</span>
      <span className="text-sm font-medium">{currentLanguage.name}</span>
      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    
    {isOpen && (
      <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
              lang.code === currentLanguage.code ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    )}
    </div>
  );
};

const LanguageSwitcher: React.FC = () => {
  return (
    <HookErrorBoundary componentName="LanguageSwitcher">
      <LanguageSwitcherContent />
    </HookErrorBoundary>
  );
};

export default LanguageSwitcher;