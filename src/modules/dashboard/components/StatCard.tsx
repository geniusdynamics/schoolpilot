import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@/components/ui/icons';

export type StatTrend = 'up' | 'down' | 'neutral';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: StatTrend;
  trendValue?: string;
  to?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'gradient' | 'outlined' | 'filled';
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'indigo';
}

const colorSchemes = {
  blue: {
    gradient: 'from-primary-500 to-cyan-500',
    bg: 'bg-primary-50 dark:bg-primary-500/10',
    text: 'text-primary-600 dark:text-primary-300',
    border: 'border-primary-200 dark:border-primary-500/30',
    fill: 'bg-primary-500',
  },
  emerald: {
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    fill: 'bg-emerald-500',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-500/30',
    fill: 'bg-amber-500',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-500/30',
    fill: 'bg-rose-500',
  },
  violet: {
    gradient: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-500/30',
    fill: 'bg-violet-500',
  },
  cyan: {
    gradient: 'from-cyan-500 to-sky-500',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-500/30',
    fill: 'bg-cyan-500',
  },
  indigo: {
    gradient: 'from-indigo-500 to-primary-500',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-500/30',
    fill: 'bg-indigo-500',
  },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  to,
  onClick,
  className = '',
  variant = 'default',
  colorScheme = 'blue',
}) => {
  const colors = colorSchemes[colorScheme];
  const clickable = Boolean(to || onClick);

  const trendConfig = {
    up: { icon: <ArrowUpIcon className="h-3 w-3" />, color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/10' },
    down: { icon: <ArrowDownIcon className="h-3 w-3" />, color: 'text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-500/10' },
    neutral: { icon: <MinusIcon className="h-3 w-3" />, color: 'text-surface-muted-fg bg-surface-accent' },
  };

  const variantStyles = {
    default: `${colors.bg} border ${colors.border}`,
    gradient: `bg-gradient-to-br ${colors.gradient} text-white border-transparent`,
    outlined: `bg-surface-card border-2 ${colors.border}`,
    filled: `${colors.fill} text-white border-transparent`,
  };

  const isGradientOrFilled = variant === 'gradient' || variant === 'filled';

  const content = (
    <div
      className={`
        relative overflow-hidden rounded-xl p-5 shadow-sm
        transition-all duration-300
        ${clickable ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {/* Decorative gradient overlay for default variant */}
      {variant === 'default' && (
        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${colors.gradient} opacity-10`} />
      )}

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-sm font-medium ${isGradientOrFilled ? 'text-white/80' : 'text-surface-muted-fg'}`}>
              {title}
            </p>
            <h3 className={`mt-2 text-3xl font-bold tracking-tight ${isGradientOrFilled ? 'text-white' : 'text-surface-foreground'}`}>
              {value}
            </h3>
            
            {subtitle && (
              <p className={`mt-1 text-xs ${isGradientOrFilled ? 'text-white/70' : 'text-surface-muted-fg'}`}>
                {subtitle}
              </p>
            )}

            {trend && trendValue && (
              <div className="mt-3 flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${trendConfig[trend].color}`}>
                  {trendConfig[trend].icon}
                  {trendValue}
                </span>
              </div>
            )}
          </div>

          <div className={`
            flex h-12 w-12 items-center justify-center rounded-xl
            ${variant === 'gradient' || variant === 'filled' ? 'bg-white/20 text-white' : `${colors.bg} ${colors.text}`}
            transition-transform duration-300 ${clickable ? 'group-hover:scale-110' : ''}
          `}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block group">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left group">
        {content}
      </button>
    );
  }

  return content;
};

export default StatCard;
