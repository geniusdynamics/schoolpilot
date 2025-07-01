// ABOUTME: This component provides UI for switching between supported languages.
// ABOUTME: It uses i18next to change the application's current language.
// ENHANCED: Flag-based language switcher with popout dropdown for better scalability

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, GlobeAltIcon } from './icons';
import { LanguageOption } from '../../core/types';

// Available languages with flags and native names
const languages: LanguageOption[] = [
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English',
    flag: '🇺🇸'
  },
  { 
    code: 'fr', 
    name: 'French', 
    nativeName: 'Français',
    flag: '🇫🇷'
  },
  { 
    code: 'es', 
    name: 'Spanish', 
    nativeName: 'Español',
    flag: '🇪🇸'
  },
  { 
    code: 'de', 
    name: 'German', 
    nativeName: 'Deutsch',
    flag: '🇩🇪'
  },
  { 
    code: 'it', 
    name: 'Italian', 
    nativeName: 'Italiano',
    flag: '🇮🇹'
  },
  { 
    code: 'pt', 
    name: 'Portuguese', 
    nativeName: 'Português',
    flag: '🇵🇹'
  },
  { 
    code: 'ru', 
    name: 'Russian', 
    nativeName: 'Русский',
    flag: '🇷🇺'
  },
  { 
    code: 'zh', 
    name: 'Chinese', 
    nativeName: '中文',
    flag: '🇨🇳'
  },
  { 
    code: 'ja', 
    name: 'Japanese', 
    nativeName: '日本語',
    flag: '🇯🇵'
  },
  { 
    code: 'ko', 
    name: 'Korean', 
    nativeName: '한국어',
    flag: '🇰🇷'
  },
  { 
    code: 'ar', 
    name: 'Arabic', 
    nativeName: 'العربية',
    flag: '🇸🇦',
    isRTL: true
  },
  { 
    code: 'hi', 
    name: 'Hindi', 
    nativeName: 'हिन्दी',
    flag: '🇮🇳'
  },
  { 
    code: 'sw', 
    name: 'Swahili', 
    nativeName: 'Kiswahili',
    flag: '🇰🇪'
  }
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current language info
  const currentLanguage = languages.find(lang => lang.code === i18n.resolvedLanguage) || languages[0];

  // Filter languages based on search query
  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 hover:bg-white/90 shadow text-slate-600 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label={`Current language: ${currentLanguage.name}. Click to change language.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-lg" role="img" aria-label={`${currentLanguage.name} flag`}>
          {currentLanguage.flag}
        </span>
        <span className="hidden sm:inline text-sm font-medium text-slate-700">
          {currentLanguage.code.toUpperCase()}
        </span>
        <ChevronDownIcon 
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Popout */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <GlobeAltIcon className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">Select Language</h3>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search languages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pl-10 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                autoFocus
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Language List */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {filteredLanguages.length > 0 ? (
              <div className="py-2">
                {filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors duration-150 ${
                      i18n.resolvedLanguage === lang.code 
                        ? 'bg-blue-50 border-r-2 border-blue-500' 
                        : ''
                    }`}
                    aria-label={`Switch to ${lang.name}`}
                  >
                    <span className="text-xl" role="img" aria-label={`${lang.name} flag`}>
                      {lang.flag}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        {lang.name}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {lang.nativeName}
                      </div>
                    </div>
                    {i18n.resolvedLanguage === lang.code && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500">
                <p className="text-sm">No languages found matching "{searchQuery}"</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center">
              {filteredLanguages.length} language{filteredLanguages.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;