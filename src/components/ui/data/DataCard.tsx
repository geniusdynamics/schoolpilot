// ABOUTME: DataCard component for displaying structured data with modern styling
// ABOUTME: Optimized for data visualization with metrics, stats, and key-value pairs

import React, { ReactNode } from 'react';
import Card, { CardVariant, CardSize } from '../Card';

export interface DataCardMetric {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period?: string;
  };
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
}

export interface DataCardField {
  label: string;
  value: ReactNode;
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'status';
}

interface DataCardProps {
  title?: string;
  subtitle?: string;
  metric?: DataCardMetric;
  fields?: DataCardField[];
  actions?: ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  className?: string;
  onClick?: () => void;
  loading?: boolean;
  children?: ReactNode;
}

const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  metric,
  fields = [],
  actions,
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
  loading = false,
  children,
}) => {
  // Format metric value
  const formatMetricValue = (value: string | number): string => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  // Get change indicator styles
  const getChangeStyles = (type: 'increase' | 'decrease' | 'neutral'): string => {
    switch (type) {
      case 'increase':
        return 'text-green-600 bg-green-50';
      case 'decrease':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Get change icon
  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral'): string => {
    switch (type) {
      case 'increase':
        return '↗';
      case 'decrease':
        return '↘';
      default:
        return '→';
    }
  };

  // Format field value based on type
  const formatFieldValue = (field: DataCardField): ReactNode => {
    const { value, type } = field;
    
    if (React.isValidElement(value)) {
      return value;
    }
    
    const stringValue = String(value);
    
    switch (type) {
      case 'currency':
        return `$${parseFloat(stringValue).toLocaleString()}`;
      case 'percentage':
        return `${stringValue}%`;
      case 'number':
        return parseFloat(stringValue).toLocaleString();
      case 'date':
        return new Date(stringValue).toLocaleDateString();
      case 'status':
        return (
          <span className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${stringValue.toLowerCase() === 'active' ? 'bg-green-100 text-green-800' :
              stringValue.toLowerCase() === 'inactive' ? 'bg-red-100 text-red-800' :
              stringValue.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'}
          `}>
            {stringValue}
          </span>
        );
      default:
        return stringValue;
    }
  };

  // Get metric color styles
  const getMetricColorStyles = (color: string = 'blue'): string => {
    switch (color) {
      case 'green':
        return 'text-green-600';
      case 'red':
        return 'text-red-600';
      case 'yellow':
        return 'text-yellow-600';
      case 'purple':
        return 'text-purple-600';
      case 'gray':
        return 'text-gray-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <Card
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
      interactive={!!onClick}
      loading={loading}
    >
      {/* Header with title and subtitle */}
      {(title || subtitle || actions) && (
        <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="ml-4 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-4 sm:px-6">
        {/* Main metric display */}
        {metric && (
          <div className="mb-6">
            <div className="flex items-center">
              {metric.icon && (
                <div className={`mr-3 ${getMetricColorStyles(metric.color)}`}>
                  {metric.icon}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-baseline">
                  <p className={`text-3xl font-bold ${getMetricColorStyles(metric.color)}`}>
                    {formatMetricValue(metric.value)}
                  </p>
                  {metric.change && (
                    <div className={`
                      ml-3 flex items-center text-sm font-medium px-2 py-1 rounded-full
                      ${getChangeStyles(metric.change.type)}
                    `}>
                      <span className="mr-1">
                        {getChangeIcon(metric.change.type)}
                      </span>
                      {Math.abs(metric.change.value)}%
                      {metric.change.period && (
                        <span className="ml-1 text-xs opacity-75">
                          {metric.change.period}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {metric.label}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data fields */}
        {fields.length > 0 && (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <dt className="text-sm font-medium text-gray-500">
                  {field.label}
                </dt>
                <dd className="text-sm text-gray-900 font-medium">
                  {formatFieldValue(field)}
                </dd>
              </div>
            ))}
          </div>
        )}

        {/* Custom children content */}
        {children && (
          <div className={fields.length > 0 ? 'mt-6' : ''}>
            {children}
          </div>
        )}
      </div>
    </Card>
  );
};

export default DataCard;