// ABOUTME: Reusable shell for module dashboards with consistent metrics, actions, charts, and notifications layout.
// ABOUTME: Provides an accessible, responsive, and route-safe structure while allowing module-specific content blocks.
// ABOUTME: Enhanced with alert banners, quick nav cards, and trend-enabled metric cards.

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { InfoHint } from '@/components/ui/feedback';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  ArrowRightIcon,
  BellIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@/components/ui/icons';

type NotificationSeverity = 'normal' | 'warning' | 'high';
export type AlertType = 'message' | 'task' | 'overdue' | 'approval' | 'emergency' | 'fees';
export type StatTrend = 'up' | 'down' | 'neutral';
export type ColorScheme = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'indigo' | 'slate' | 'teal' | 'orange';

export interface DashboardMetric {
  key: string;
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: StatTrend;
  trendValue?: string;
  to?: string;
  onClick?: () => void;
  colorScheme?: ColorScheme;
}

export interface DashboardQuickAction {
  key: string;
  label: string;
  to?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  description?: string;
  colorScheme?: ColorScheme;
}

export interface DashboardAlertBanner {
  type: AlertType;
  count: number;
  label: string;
  description?: string;
  to?: string;
  onClick?: () => void;
}

export interface DashboardPanel {
  key: string;
  title: string;
  content: React.ReactNode;
}

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  severity?: NotificationSeverity;
}

interface ModuleDashboardShellProps {
  title: string;
  subtitle: string;
  heroIcon?: React.ReactNode;
  metrics?: DashboardMetric[];
  quickActions?: DashboardQuickAction[];
  quickNavCards?: boolean;
  alertBanners?: DashboardAlertBanner[];
  charts?: DashboardPanel[];
  notifications?: DashboardNotification[];
  children?: React.ReactNode;
  accentColor?: ColorScheme;
}

const severityClasses: Record<NotificationSeverity, string> = {
  normal: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  high: 'border-rose-200 bg-rose-50',
};

const colorSchemes: Record<ColorScheme, { gradient: string; bg: string; text: string; border: string; fill: string }> = {
  blue: { gradient: 'from-primary-500 to-cyan-500', bg: 'bg-primary-50', text: 'text-primary-600', border: 'border-primary-200', fill: 'bg-primary-500' },
  emerald: { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', fill: 'bg-emerald-500' },
  amber: { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', fill: 'bg-amber-500' },
  rose: { gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', fill: 'bg-rose-500' },
  violet: { gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', fill: 'bg-violet-500' },
  cyan: { gradient: 'from-cyan-500 to-sky-500', bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', fill: 'bg-cyan-500' },
  indigo: { gradient: 'from-indigo-500 to-primary-500', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', fill: 'bg-indigo-500' },
  slate: { gradient: 'from-slate-500 to-gray-500', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', fill: 'bg-slate-500' },
  teal: { gradient: 'from-teal-500 to-emerald-500', bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', fill: 'bg-teal-500' },
  orange: { gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', fill: 'bg-orange-500' },
};

const alertConfig: Record<AlertType, { icon: React.ReactNode; gradient: string; borderColor: string; iconBg: string; iconColor: string; badgeBg: string; badgeText: string }> = {
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

// Alert Banner Component
const AlertBannerItem: React.FC<DashboardAlertBanner> = ({ type, count, label, description, to, onClick }) => {
  const config = alertConfig[type];
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) navigate(to);
    else if (onClick) onClick();
  };

  return (
    <div
      onClick={handleClick}
      role={to || onClick ? 'button' : undefined}
      tabIndex={to || onClick ? 0 : undefined}
      className={`
        relative overflow-hidden rounded-xl border ${config.borderColor}
        bg-gradient-to-r ${config.gradient}
        p-3 shadow-sm transition-all duration-300
        hover:shadow-md hover:scale-[1.02]
        ${to || onClick ? 'cursor-pointer group' : ''}
      `}
    >
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/30 blur-xl transition-all group-hover:scale-150" />
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.iconBg} ${config.iconColor} shadow-sm transition-transform group-hover:scale-110`}>
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${config.badgeBg} ${config.badgeText}`}>
                {count}
              </span>
              <span className="text-sm font-semibold text-surface-foreground">{label}</span>
            </div>
            {description && <p className="text-xs text-surface-muted-fg">{description}</p>}
          </div>
        </div>
        {(to || onClick) && (
          <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-white/60 dark:bg-slate-900/60 text-surface-muted-fg transition-all group-hover:bg-surface-card group-hover:text-surface-foreground`}>
            <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Metric Card Component
const EnhancedMetricCard: React.FC<DashboardMetric> = ({ label, value, description, icon, trend, trendValue, to, onClick, colorScheme = 'blue' }) => {
  const colors = colorSchemes[colorScheme];
  const clickable = Boolean(to || onClick);

  const trendConfig = {
    up: { icon: <ArrowUpIcon className="h-3 w-3" />, color: 'text-emerald-600 bg-emerald-100' },
    down: { icon: <ArrowDownIcon className="h-3 w-3" />, color: 'text-rose-600 bg-rose-100' },
    neutral: { icon: <MinusIcon className="h-3 w-3" />, color: 'text-surface-muted-fg bg-surface-accent' },
  };

  const content = (
    <div
      className={`
        relative overflow-hidden rounded-xl p-4 shadow-sm border ${colors.border} ${colors.bg}
        transition-all duration-300
        ${clickable ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''}
        group
      `}
    >
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${colors.gradient} opacity-10`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${colors.text}`}>{label}</p>
            <h3 className="mt-1 text-2xl font-bold text-surface-foreground">{value}</h3>
            {description && <p className="mt-0.5 text-xs text-surface-muted-fg">{description}</p>}
            {trend && trendValue && (
              <div className="mt-2 flex items-center gap-1">
                <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${trendConfig[trend].color}`}>
                  {trendConfig[trend].icon}
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg} ${colors.text} transition-transform duration-300 ${clickable ? 'group-hover:scale-110' : ''}`}>
              {icon}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (to) {
    return <Link to={to} className="block">{content}</Link>;
  }

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
  }

  return content;
};

// Quick Nav Card Component
const QuickNavCard: React.FC<DashboardQuickAction> = ({ label, description, icon, to, onClick, colorScheme = 'blue' }) => {
  const colors = colorSchemes[colorScheme];
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) navigate(to);
    else if (onClick) onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-start gap-3 rounded-xl border border-surface-border bg-surface-card p-3 text-left
        transition-all duration-200 hover:shadow-md hover:border-${colorScheme}-200 hover:bg-${colorScheme}-50
        focus:outline-none focus-visible:ring-2 focus-visible:ring-${colorScheme}-500
        group
      `}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-surface-foreground text-sm">{label}</p>
        {description && <p className="mt-0.5 text-xs text-surface-muted-fg line-clamp-2">{description}</p>}
      </div>
      <ArrowRightIcon className="h-5 w-5 flex-shrink-0 text-surface-muted-fg transition-transform group-hover:translate-x-0.5" />
    </button>
  );
};

const ModuleDashboardShell: React.FC<ModuleDashboardShellProps> = ({
  title,
  subtitle,
  heroIcon,
  metrics = [],
  quickActions = [],
  quickNavCards = false,
  alertBanners = [],
  charts = [],
  notifications = [],
  children,
  accentColor = 'blue',
}) => {
  const accentColors = colorSchemes[accentColor];

  return (
    <div className="space-y-6 bg-slate-50/70 pb-4">
      {/* Hero Section */}
      <section className={`rounded-2xl border border-${accentColor}-100 bg-gradient-to-r ${accentColors.gradient} p-5 text-white shadow-sm sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              {subtitle && <InfoHint text={subtitle} label="About this dashboard" tone="onColor" />}
            </div>
          </div>
          {heroIcon && (
            <div aria-hidden className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
              {heroIcon}
            </div>
          )}
        </div>
      </section>

      {/* Alert Banners */}
      {alertBanners.length > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {alertBanners.map((banner) => (
            <AlertBannerItem key={`${banner.type}-${banner.label}`} {...banner} />
          ))}
        </section>
      )}

      {/* Enhanced Metrics */}
      {metrics.length > 0 && (
        <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {metrics.map((metric) => (
            <EnhancedMetricCard key={metric.key} {...metric} />
          ))}
        </section>
      )}

      {/* Quick Actions - Card Style or Button Style */}
      {(quickActions.length > 0 || notifications.length > 0) && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {quickActions.length > 0 && (
            quickNavCards ? (
              <div className="xl:col-span-2">
                <h2 className="text-sm font-semibold text-surface-muted-fg uppercase tracking-wider mb-3">Quick Navigation</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {quickActions.map((action) => (
                    <QuickNavCard key={action.key} {...action} />
                  ))}
                </div>
              </div>
            ) : (
              <Card title="Quick Actions" className="border-slate-200 bg-surface-card shadow-sm xl:col-span-2" bodyClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.key}
                    variant={action.variant || 'outline'}
                    leftIcon={action.icon}
                    onClick={action.onClick}
                    as={action.to ? Link : undefined}
                    to={action.to}
                    aria-label={action.label}
                  >
                    {action.label}
                  </Button>
                ))}
              </Card>
            )
          )}

          {notifications.length > 0 && (
            <Card title="Notifications" className="border-slate-200 bg-surface-card shadow-sm" bodyClassName="space-y-3">
              <div role="status" aria-live="polite" className="space-y-3">
                {notifications.map((notice) => (
                  <div
                    key={notice.id}
                    className={`rounded-lg border p-3 ${severityClasses[notice.severity || 'normal']}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{notice.title}</p>
                    <p className="mt-1 text-xs text-slate-700">{notice.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      )}

      {/* Charts */}
      {charts.length > 0 && (
        <section aria-label="Dashboard charts" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {charts.map((panel) => (
            <Card key={panel.key} title={panel.title} className="border-slate-200 bg-surface-card shadow-sm">
              {panel.content}
            </Card>
          ))}
        </section>
      )}

      {children}
    </div>
  );
};

export default ModuleDashboardShell;
