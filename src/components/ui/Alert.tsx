// ABOUTME: Alert component for displaying notifications and status messages
// ABOUTME: Pure Tailwind implementation — no MUI dependency

import React, { ReactNode } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface AlertProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  children: ReactNode;
  className?: string;
  title?: string;
  /** When provided, shows a dismiss button. */
  onClose?: () => void;
}

interface AlertDescriptionProps {
  children: ReactNode;
  className?: string;
}

const alertStyles = {
  default: {
    container:
      'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-200',
    icon: <InformationCircleIcon className="h-4 w-4 flex-shrink-0 text-sky-500 dark:text-sky-400" aria-hidden="true" />,
    title: 'text-sky-900 dark:text-sky-100',
  },
  destructive: {
    container:
      'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-200',
    icon: <XCircleIcon className="h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" aria-hidden="true" />,
    title: 'text-red-900 dark:text-red-100',
  },
  success: {
    container:
      'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-200',
    icon: <CheckCircleIcon className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />,
    title: 'text-green-900 dark:text-green-100',
  },
  warning: {
    container:
      'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200',
    icon: <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400" aria-hidden="true" />,
    title: 'text-amber-900 dark:text-amber-100',
  },
} as const;

export const Alert: React.FC<AlertProps> = ({
  variant = 'default',
  children,
  className = '',
  title,
  onClose,
}) => {
  const styles = alertStyles[variant];

  return (
    <div role="alert" className={`flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${styles.container} ${className}`}>
      {styles.icon}
      <div className="min-w-0 flex-1">
        {title && (
          <div className={`mb-0.5 font-semibold leading-5 ${styles.title}`}>{title}</div>
        )}
        <div className="leading-5">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="-m-1 h-6 w-6 flex-shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
};
