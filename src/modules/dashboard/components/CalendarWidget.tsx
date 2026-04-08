// ABOUTME: Mini calendar widget for dashboard showing events and navigation
// ABOUTME: Displays current month with event indicators

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths } from 'date-fns';

export interface CalendarEvent {
  date: Date;
  title: string;
  type: 'exam' | 'holiday' | 'event' | 'meeting';
}

interface CalendarWidgetProps {
  events?: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onAddEvent?: () => void;
  className?: string;
}

const eventTypeColors = {
  exam: 'bg-purple-500',
  holiday: 'bg-amber-500',
  event: 'bg-blue-500',
  meeting: 'bg-emerald-500',
};

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  events = [],
  onDateClick,
  onAddEvent,
  className = '',
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(addMonths(currentDate, direction === 'prev' ? -1 : 1));
  };

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Upcoming Events</h3>
          {onAddEvent && (
            <button
              onClick={onAddEvent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              Add Event
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-gray-900 min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize',
                  viewMode === mode
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((weekDay) => (
            <div
              key={weekDay}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {weekDay}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isToday = isSameDay(date, new Date());
            const dayEvents = getEventsForDate(date);
            const hasEvents = dayEvents.length > 0;

            return (
              <button
                key={index}
                onClick={() => onDateClick?.(date)}
                className={cn(
                  'relative h-10 flex items-center justify-center rounded-lg text-sm transition-colors',
                  !isCurrentMonth && 'text-gray-300',
                  isCurrentMonth && 'text-gray-700 hover:bg-gray-50',
                  isToday && 'bg-amber-100 text-amber-700 font-semibold',
                  hasEvents && !isToday && 'font-medium'
                )}
              >
                {format(date, 'd')}
                
                {/* Event Indicators */}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <span
                        key={i}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          eventTypeColors[event.type]
                        )}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-gray-400">+</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Event Legend */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-gray-500">Events:</span>
          {Object.entries(eventTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-full', color)} />
              <span className="text-gray-600 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
