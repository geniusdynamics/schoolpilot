import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BellIcon, 
  ClipboardDocumentListIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ArrowRightIcon
} from '@/components/ui/icons';

export type AlertType = 'message' | 'task' | 'overdue' | 'approval' | 'emergency' | 'fees';

interface AlertBannerProps {
  type: AlertType;
  count: number;
  label: string;
  description?: string;
  to?: string;
  onClick?: () => void;
  className?: string;
}

const alertConfig: Record<AlertType, {
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
}> = {
  message: {
    icon: <BellIcon className="h-5 w-5" />,
    gradient: 'from-amber-50 via-orange-50 to-yellow-50',
    borderColor: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-white',
  },
  task: {
    icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
    gradient: 'from-cyan-50 via-sky-50 to-primary-50',
    borderColor: 'border-cyan-200',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    badgeBg: 'bg-cyan-500',
    badgeText: 'text-white',
  },
  overdue: {
    icon: <ExclamationTriangleIcon className="h-5 w-5" />,
    gradient: 'from-rose-50 via-pink-50 to-red-50',
    borderColor: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-500',
    badgeText: 'text-white',
  },
  approval: {
    icon: <CheckCircleIcon className="h-5 w-5" />,
    gradient: 'from-emerald-50 via-green-50 to-teal-50',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
  },
  emergency: {
    icon: <ExclamationTriangleIcon className="h-5 w-5" />,
    gradient: 'from-red-50 via-rose-50 to-pink-50',
    borderColor: 'border-red-300',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    badgeBg: 'bg-red-500',
    badgeText: 'text-white',
  },
  fees: {
    icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
    gradient: 'from-violet-50 via-purple-50 to-fuchsia-50',
    borderColor: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    badgeBg: 'bg-violet-500',
    badgeText: 'text-white',
  },
};

const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  count,
  label,
  description,
  to,
  onClick,
  className = '',
}) => {
  const config = alertConfig[type];
  
  const content = (
    <div
      className={`
        relative overflow-hidden rounded-xl border ${config.borderColor}
        bg-gradient-to-r ${config.gradient}
        p-4 shadow-sm transition-all duration-300
        hover:shadow-md hover:scale-[1.02]
        cursor-pointer group
        ${className}
      `}
    >
      {/* Decorative background element */}
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/30 blur-xl transition-all group-hover:scale-150" />
      
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`
            flex h-10 w-10 items-center justify-center rounded-lg
            ${config.iconBg} ${config.iconColor}
            shadow-sm transition-transform group-hover:scale-110
          `}>
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`
                inline-flex h-5 min-w-[1.25rem] items-center justify-center 
                rounded-full px-1.5 text-xs font-bold
                ${config.badgeBg} ${config.badgeText}
              `}>
                {count}
              </span>
              <span className="text-sm font-semibold text-surface-foreground">
                {label}
              </span>
            </div>
            {description && (
              <p className="mt-0.5 text-xs text-surface-muted-fg">{description}</p>
            )}
          </div>
        </div>
        
        <div className={`
          flex h-8 w-8 items-center justify-center rounded-full
          bg-white/60 dark:bg-slate-900/60 text-surface-muted-fg transition-all
          group-hover:bg-surface-card group-hover:text-surface-foreground
          ${to || onClick ? 'opacity-100' : 'opacity-0'}
        `}>
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block" onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} role="button" tabIndex={0}>
      {content}
    </div>
  );
};

export default AlertBanner;
