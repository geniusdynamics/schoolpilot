// ABOUTME: Timetable widget showing daily schedule with periods
// ABOUTME: Displays P1-P6 schedule with subjects and times

import React from 'react';
import { useTranslation } from 'react-i18next';
import PortalWidgetCard from './PortalWidgetCard';
import {
  PrinterIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PlusIcon,
  CogIcon,
  BookOpenIcon,
  CalculatorIcon,
  BeakerIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  ClockIcon,
} from '@/components/ui/icons';

export interface Period {
  id: string;
  name: string; // P1, P2, etc.
  subject: string;
  startTime: string;
  endTime: string;
  color?: string;
}

export interface TimetableWidgetProps {
  periods?: Period[];
  date?: string;
  onDateChange?: (direction: 'prev' | 'next') => void;
  onPrint?: () => void;
  onExport?: () => void;
  onView?: () => void;
  onCreate?: () => void;
  onManage?: () => void;
}

const defaultPeriods: Period[] = [
  { id: '1', name: 'P1', subject: 'English', startTime: '08:00', endTime: '09:00', color: 'bg-primary-50 text-primary-700' },
  { id: '2', name: 'P2', subject: 'Mathematics', startTime: '09:00', endTime: '10:00', color: 'bg-emerald-50 text-emerald-700' },
  { id: '3', name: 'P3', subject: 'French', startTime: '10:25', endTime: '11:25', color: 'bg-purple-50 text-purple-700' },
  { id: '4', name: 'P4', subject: 'Spanish', startTime: '11:10', endTime: '12:10', color: 'bg-orange-50 text-orange-700' },
  { id: '5', name: 'P5', subject: 'Design', startTime: '12:20', endTime: '13:20', color: 'bg-pink-50 text-pink-700' },
  { id: '6', name: 'P6', subject: 'Free Period', startTime: '13:05', endTime: '14:30', color: 'bg-surface-muted text-surface-muted-fg' },
];

const getSubjectIcon = (subject: string) => {
  const lowerSubject = subject.toLowerCase();
  if (lowerSubject.includes('math')) return <CalculatorIcon className="w-4 h-4" />;
  if (lowerSubject.includes('science') || lowerSubject.includes('chemistry') || lowerSubject.includes('physics')) return <BeakerIcon className="w-4 h-4" />;
  if (lowerSubject.includes('geography') || lowerSubject.includes('history')) return <GlobeAltIcon className="w-4 h-4" />;
  if (lowerSubject.includes('art') || lowerSubject.includes('design')) return <PaintBrushIcon className="w-4 h-4" />;
  return <BookOpenIcon className="w-4 h-4" />;
};

export const TimetableWidget: React.FC<TimetableWidgetProps> = ({
  periods = defaultPeriods,
  date,
  onDateChange,
  onPrint,
  onExport,
  onView,
  onCreate,
  onManage,
}) => {
  const { t } = useTranslation('portal');

  const actions = [
    { label: t('portal.timetable.print'), icon: <PrinterIcon className="w-3.5 h-3.5" />, onClick: onPrint || (() => {}), variant: 'ghost' as const },
    { label: t('portal.timetable.export'), icon: <ArrowDownTrayIcon className="w-3.5 h-3.5" />, onClick: onExport || (() => {}), variant: 'ghost' as const },
    { label: t('portal.timetable.view'), icon: <EyeIcon className="w-3.5 h-3.5" />, onClick: onView || (() => {}), variant: 'ghost' as const },
    { label: t('portal.timetable.create'), icon: <PlusIcon className="w-3.5 h-3.5" />, onClick: onCreate || (() => {}), variant: 'ghost' as const },
    { label: t('portal.timetable.manage'), icon: <CogIcon className="w-3.5 h-3.5" />, onClick: onManage || (() => {}), variant: 'ghost' as const },
  ];

  return (
    <PortalWidgetCard
      title={t('portal.timetable.title')}
      date={date}
      onDateChange={onDateChange}
      actions={actions}
    >
      <div className="space-y-2">
        {periods.map((period, index) => (
          <div
            key={period.id}
            className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-surface-border hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            {/* Period Number */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
              period.color || 'bg-surface-accent text-surface-foreground'
            }`}>
              {period.name}
            </div>

            {/* Subject Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {getSubjectIcon(period.subject)}
                <span className="text-sm font-medium text-surface-foreground truncate">
                  {period.subject}
                </span>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-1 text-xs text-surface-muted-fg">
              <ClockIcon className="w-3.5 h-3.5" />
              <span>{period.startTime}</span>
              <span className="text-gray-300">-</span>
              <span className={index < 2 ? 'text-rose-500 font-medium' : ''}>
                {period.endTime}
              </span>
            </div>
          </div>
        ))}
      </div>
    </PortalWidgetCard>
  );
};

export default TimetableWidget;
