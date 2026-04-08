// ABOUTME: School calendar widget showing events
// ABOUTME: Displays events with categories, start/end times

import React from 'react';
import { useTranslation } from 'react-i18next';
import PortalWidgetCard from './PortalWidgetCard';
import {
  PrinterIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  CogIcon,
  HomeIcon,
  AcademicCapIcon,
  UsersIcon,
  TrophyIcon,
  CalendarIcon,
  FlagIcon,
} from '@/components/ui/icons';

export interface CalendarEvent {
  id: string;
  title: string;
  category: 'house' | 'examination' | 'assembly' | 'sports' | 'academic' | 'other';
  startTime: string;
  endTime: string;
  icon?: React.ReactNode;
}

export interface SchoolCalendarWidgetProps {
  events?: CalendarEvent[];
  date?: string;
  onDateChange?: (direction: 'prev' | 'next') => void;
  onPrint?: () => void;
  onExport?: () => void;
  onCreate?: () => void;
  onManage?: () => void;
}

const defaultEvents: CalendarEvent[] = [
  { 
    id: '1', 
    title: 'House Touch Typing Competition', 
    category: 'house', 
    startTime: '19:00', 
    endTime: '20:00',
    icon: <HomeIcon className="w-4 h-4" />
  },
  { 
    id: '2', 
    title: 'Spanish A2 Oral Examinations', 
    category: 'examination', 
    startTime: '14:00', 
    endTime: '15:00',
    icon: <AcademicCapIcon className="w-4 h-4" />
  },
  { 
    id: '3', 
    title: 'Year 7 & 8 Assembly', 
    category: 'assembly', 
    startTime: '09:40', 
    endTime: '10:10',
    icon: <UsersIcon className="w-4 h-4" />
  },
];

const categoryColors: Record<string, string> = {
  house: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  examination: 'bg-amber-50 text-amber-700 border-amber-200',
  assembly: 'bg-blue-50 text-blue-700 border-blue-200',
  sports: 'bg-rose-50 text-rose-700 border-rose-200',
  academic: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

// Category translation keys - actual translations resolved in component
const categoryTranslationKeys: Record<string, string> = {
  house: 'calendar.categoryHouse',
  examination: 'calendar.categoryExamination',
  assembly: 'calendar.categoryAssembly',
  sports: 'calendar.categorySports',
  academic: 'calendar.categoryAcademic',
  other: 'calendar.categoryOther',
};

export const SchoolCalendarWidget: React.FC<SchoolCalendarWidgetProps> = ({
  events = defaultEvents,
  date,
  onDateChange,
  onPrint,
  onExport,
  onCreate,
  onManage,
}) => {
  const { t } = useTranslation('portal');

  const actions = [
    { label: t('portal.calendar.print'), icon: <PrinterIcon className="w-3.5 h-3.5" />, onClick: onPrint || (() => {}), variant: 'ghost' as const },
    { label: t('portal.calendar.export'), icon: <ArrowDownTrayIcon className="w-3.5 h-3.5" />, onClick: onExport || (() => {}), variant: 'ghost' as const },
    { label: t('portal.calendar.create'), icon: <PlusIcon className="w-3.5 h-3.5" />, onClick: onCreate || (() => {}), variant: 'ghost' as const },
    { label: t('portal.calendar.manage'), icon: <CogIcon className="w-3.5 h-3.5" />, onClick: onManage || (() => {}), variant: 'ghost' as const },
  ];

  return (
    <PortalWidgetCard
      title={t('portal.calendar.title')}
      date={date}
      onDateChange={onDateChange}
      actions={actions}
    >
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">
        <div className="col-span-5">{t('portal.calendar.event')}</div>
        <div className="col-span-3">{t('portal.calendar.category')}</div>
        <div className="col-span-2 text-center">{t('portal.calendar.start')}</div>
        <div className="col-span-2 text-center">{t('portal.calendar.end')}</div>
      </div>

      {/* Events List */}
      <div className="space-y-1">
        {events.map((event) => (
          <div
            key={event.id}
            className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* Event Title */}
            <div className="col-span-5 flex items-center gap-2 min-w-0">
              <div className="flex-shrink-0 w-6 h-6 rounded bg-rose-100 text-rose-600 flex items-center justify-center">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm text-gray-900 truncate">{event.title}</span>
            </div>

            {/* Category */}
            <div className="col-span-3">
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${
                categoryColors[event.category]
              }`}>
                {t(categoryTranslationKeys[event.category] || 'calendar.categoryOther')}
              </span>
            </div>

            {/* Start Time */}
            <div className="col-span-2 text-center text-sm text-gray-600">
              {event.startTime}
            </div>

            {/* End Time */}
            <div className="col-span-2 text-center text-sm text-gray-600">
              {event.endTime}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">{t('common.noData')}</p>
        </div>
      )}
    </PortalWidgetCard>
  );
};

export default SchoolCalendarWidget;
