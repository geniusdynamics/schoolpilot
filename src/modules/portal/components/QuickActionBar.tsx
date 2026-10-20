// ABOUTME: Quick action bar for portal dashboard
// ABOUTME: Horizontal scrollable button bar with management actions

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  UserMinusIcon,
  DocumentCheckIcon,
  TrophyIcon,
  AcademicCapIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/ui/icons';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo';
}

export interface QuickActionBarProps {
  actions?: QuickAction[];
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
}

const getDefaultActions = (t: (key: string) => string): QuickAction[] => [
  {
    id: 'data-protection',
    label: t('portal.quickActions.dataProtection'),
    icon: <ShieldCheckIcon className="w-4 h-4" />,
    onClick: () => {},
    color: 'blue',
  },
  {
    id: 'discipline',
    label: t('portal.quickActions.disciplineManagement'),
    icon: <ExclamationTriangleIcon className="w-4 h-4" />,
    onClick: () => {},
    color: 'amber',
  },
  {
    id: 'estates',
    label: t('portal.quickActions.estatesManagement'),
    icon: <BuildingOfficeIcon className="w-4 h-4" />,
    onClick: () => {},
    color: 'emerald',
  },
  {
    id: 'exclusions',
    label: t('portal.quickActions.exclusionsManagement'),
    icon: <UserMinusIcon className="w-4 h-4" />,
    onClick: () => {},
    color: 'rose',
  },
  {
    id: 'external-exams',
    label: t('portal.quickActions.externalExams'),
    icon: <DocumentCheckIcon className="w-4 h-4" />,
    onClick: () => {},
    color: 'purple',
  },
  {
    id: 'off-games',
    label: t('portal.quickActions.offGamesManagement'),
    icon: <TrophyIcon className="w-4 h-4" />,
    onClick: () => {},
    color: 'indigo',
  },
  {
    id: 'online-learning',
    label: t('portal.quickActions.onlineLearning'),
    icon: <AcademicCapIcon className="w-4 h-4" />,
    onClick: () => {},
    color: 'blue',
  },
];

const colorClasses: Record<string, { bg: string; hover: string; text: string }> = {
  blue: { bg: 'bg-primary-500', hover: 'hover:bg-primary-600', text: 'text-white' },
  emerald: { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', text: 'text-white' },
  amber: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', text: 'text-white' },
  rose: { bg: 'bg-rose-500', hover: 'hover:bg-rose-600', text: 'text-white' },
  purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-white' },
  indigo: { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', text: 'text-white' },
};

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  actions,
  onScrollLeft,
  onScrollRight,
}) => {
  const { t } = useTranslation('portal');
  const resolvedActions = actions || getDefaultActions(t);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
    onScrollLeft?.();
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
    onScrollRight?.();
  };

  return (
    <div className="flex items-center gap-2">
      {/* Scroll Left */}
      <button
        onClick={handleScrollLeft}
        className="flex-shrink-0 w-8 h-10 flex items-center justify-center rounded bg-surface-card border border-surface-border text-surface-muted-fg hover:text-surface-foreground hover:border-surface-border transition-colors"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>

      {/* Actions Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center gap-2 py-1">
          {resolvedActions.map((action) => {
            const colors = colorClasses[action.color || 'blue'];
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors ${colors.bg} ${colors.hover} ${colors.text}`}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scroll Right */}
      <button
        onClick={handleScrollRight}
        className="flex-shrink-0 w-8 h-10 flex items-center justify-center rounded bg-surface-card border border-surface-border text-surface-muted-fg hover:text-surface-foreground hover:border-surface-border transition-colors"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default QuickActionBar;
