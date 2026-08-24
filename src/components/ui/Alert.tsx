// ABOUTME: Alert component for displaying notifications and status messages
// ABOUTME: Compatible with shadcn/ui styling patterns

import React, { ReactNode } from 'react';
import { Box, Alert as MuiAlert, AlertTitle, AlertProps as MuiAlertProps } from '@mui/material';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface AlertProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  children: ReactNode;
  className?: string;
  title?: string;
}

interface AlertDescriptionProps {
  children: ReactNode;
  className?: string;
}

const getAlertSeverity = (variant: AlertProps['variant']): MuiAlertProps['severity'] => {
  switch (variant) {
    case 'destructive':
      return 'error';
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
};

const getAlertIcon = (variant: AlertProps['variant']) => {
  switch (variant) {
    case 'destructive':
      return <XCircleIcon className="h-4 w-4" />;
    case 'success':
      return <CheckCircleIcon className="h-4 w-4" />;
    case 'warning':
      return <ExclamationTriangleIcon className="h-4 w-4" />;
    default:
      return <InformationCircleIcon className="h-4 w-4" />;
  }
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'default',
  children,
  className = '',
  title
}) => {
  return (
    <MuiAlert
      severity={getAlertSeverity(variant)}
      icon={getAlertIcon(variant)}
      className={`rounded-lg border ${className}`}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {children}
    </MuiAlert>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({
  children,
  className = ''
}) => {
  return (
    <Box className={`text-sm ${className}`}>
      {children}
    </Box>
  );
};
