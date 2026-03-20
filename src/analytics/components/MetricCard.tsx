/**
 * Metric Card
 * 
 * Display a single metric with trend indicator.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Users, DollarSign, GraduationCap, CalendarCheck, UserPlus, BarChart2, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { MetricCard as MetricCardType } from '../types';

interface MetricCardProps {
  metric: MetricCardType;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  DollarSign,
  GraduationCap,
  CalendarCheck,
  UserPlus,
  BarChart2,
  Calculator,
};

export const MetricCardComponent: React.FC<MetricCardProps> = ({ metric, className }) => {
  const Icon = metric.icon ? iconMap[metric.icon] : BarChart2;

  const formatValue = (value: number | string): string => {
    if (typeof value === 'string') return value;

    switch (metric.format) {
      case 'currency':
        return `${metric.prefix || '$'}${value.toLocaleString()}`;
      case 'percentage':
        return `${value.toFixed(1)}${metric.suffix || '%'}`;
      case 'number':
        return value.toLocaleString();
      default:
        return String(value);
    }
  };

  const getTrendIcon = () => {
    switch (metric.changeType) {
      case 'increase':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    switch (metric.changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.title}
        </CardTitle>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(metric.value)}
        </div>
        
        {metric.change !== undefined && (
          <div className={`flex items-center text-xs mt-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="ml-1">
              {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCardComponent;
