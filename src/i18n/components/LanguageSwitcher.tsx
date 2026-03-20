/**
 * Language Switcher
 * 
 * Component for switching between supported languages.
 */

import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from '../useTranslation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/Button';

export interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'select' | 'buttons';
  showIcons?: boolean;
  className?: string;
}

const LOCALE_NAMES: Record<string, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇺🇸' },
  es: { name: 'Español', flag: '🇪🇸' },
  fr: { name: 'Français', flag: '🇫🇷' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  ar: { name: 'العربية', flag: '🇸🇦' },
  sw: { name: 'Kiswahili', flag: '🇰🇪' },
  hi: { name: 'हिन्दी', flag: '🇮🇳' },
  zh: { name: '中文', flag: '🇨🇳' },
  pt: { name: 'Português', flag: '🇵🇹' },
  ru: { name: 'Русский', flag: '🇷🇺' },
};

/**
 * Language Switcher Component
 * 
 * @example
 * ```tsx
 * <LanguageSwitcher variant="dropdown" />
 * ```
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  showIcons = true,
  className,
}) => {
  const { locale, setLocale, isLoading } = useTranslation();
  const i18n = (window as any).__i18n;
  
  const supportedLocales = i18n?.getSupportedLocales() || ['en'];

  const handleChange = async (newLocale: string) => {
    await setLocale(newLocale);
  };

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={className}
            disabled={isLoading}
          >
            <Globe className="w-4 h-4 mr-2" />
            {showIcons && LOCALE_NAMES[locale]?.flag}
            <span className="ml-2">{LOCALE_NAMES[locale]?.name || locale}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {supportedLocales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onClick={() => handleChange(loc)}
              className={loc === locale ? 'bg-accent' : ''}
            >
              {showIcons && (
                <span className="mr-2">{LOCALE_NAMES[loc]?.flag || '🌐'}</span>
              )}
              {LOCALE_NAMES[loc]?.name || loc}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {supportedLocales.map((loc) => (
          <Button
            key={loc}
            variant={loc === locale ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleChange(loc)}
            disabled={isLoading}
          >
            {showIcons && (
              <span className="mr-1">{LOCALE_NAMES[loc]?.flag || '🌐'}</span>
            )}
            {LOCALE_NAMES[loc]?.name || loc}
          </Button>
        ))}
      </div>
    );
  }

  // Select variant
  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isLoading}
      className={`px-3 py-2 border rounded-md bg-background ${className}`}
    >
      {supportedLocales.map((loc) => (
        <option key={loc} value={loc}>
          {showIcons ? `${LOCALE_NAMES[loc]?.flag || '🌐'} ` : ''}
          {LOCALE_NAMES[loc]?.name || loc}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
