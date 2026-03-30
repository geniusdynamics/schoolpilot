// ABOUTME: Reusable shell for module dashboards with consistent metrics, actions, charts, and notifications layout.
// ABOUTME: Provides an accessible, responsive, and route-safe structure while allowing module-specific content blocks.

import React from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type NotificationSeverity = 'normal' | 'warning' | 'high';

export interface DashboardMetric {
  key: string;
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
}

export interface DashboardQuickAction {
  key: string;
  label: string;
  to?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
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
  charts?: DashboardPanel[];
  notifications?: DashboardNotification[];
  children?: React.ReactNode;
}

const severityClasses: Record<NotificationSeverity, string> = {
  normal: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  high: 'border-rose-200 bg-rose-50',
};

const ModuleDashboardShell: React.FC<ModuleDashboardShellProps> = ({
  title,
  subtitle,
  heroIcon,
  metrics = [],
  quickActions = [],
  charts = [],
  notifications = [],
  children,
}) => {
  return (
    <div className="space-y-6 bg-slate-50/70 pb-4">
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="max-w-3xl text-sm text-blue-50 sm:text-base">{subtitle}</p>
          </div>
          {heroIcon && (
            <div aria-hidden className="rounded-xl border border-white/25 bg-white/10 p-3 backdrop-blur-sm">
              {heroIcon}
            </div>
          )}
        </div>
      </section>

      {metrics.length > 0 && (
        <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.key} className="border-slate-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-600">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{metric.value}</p>
                  {metric.description && <p className="mt-1 text-xs text-slate-500">{metric.description}</p>}
                </div>
                {metric.icon && <div className="rounded-lg bg-blue-50 p-2">{metric.icon}</div>}
              </div>
            </Card>
          ))}
        </section>
      )}

      {(quickActions.length > 0 || notifications.length > 0) && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {quickActions.length > 0 && (
            <Card title="Quick Actions" className="border-slate-200 bg-white shadow-sm xl:col-span-2" bodyClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          )}

          {notifications.length > 0 && (
            <Card title="Notifications" className="border-slate-200 bg-white shadow-sm" bodyClassName="space-y-3">
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

      {charts.length > 0 && (
        <section aria-label="Dashboard charts" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {charts.map((panel) => (
            <Card key={panel.key} title={panel.title} className="border-slate-200 bg-white shadow-sm">
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
