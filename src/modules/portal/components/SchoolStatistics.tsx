// ABOUTME: School statistics widget showing student counts by year group
// ABOUTME: Displays Male/Female/Total breakdown with role-based footer

import React from 'react';
import { useTranslation } from 'react-i18next';
import PortalWidgetCard from './PortalWidgetCard';
import { UserGroupIcon, UserIcon, UsersIcon } from '@/components/ui/icons';

export interface YearGroupStats {
  yearGroup: string;
  male: number;
  female: number;
  total: number;
}

export interface SchoolStatisticsProps {
  stats?: YearGroupStats[];
  studentManagerName?: string;
  schoolManagerName?: string;
}

const defaultStats: YearGroupStats[] = [
  { yearGroup: 'Year 6', male: 60, female: 61, total: 121 },
  { yearGroup: 'Year 7', male: 61, female: 62, total: 123 },
  { yearGroup: 'Year 8', male: 61, female: 61, total: 122 },
];

export const SchoolStatistics: React.FC<SchoolStatisticsProps> = ({
  stats = defaultStats,
  studentManagerName = 'Student Manager',
  schoolManagerName = 'School Manager',
}) => {
  const { t } = useTranslation('portal');

  const totalMale = stats.reduce((sum, s) => sum + s.male, 0);
  const totalFemale = stats.reduce((sum, s) => sum + s.female, 0);
  const totalStudents = stats.reduce((sum, s) => sum + s.total, 0);

  return (
    <PortalWidgetCard
      title={t('portal.statistics.title')}
      showMoreOptions={true}
    >
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">
        <div className="col-span-4 flex items-center gap-1">
          <UserGroupIcon className="w-3.5 h-3.5" />
          {t('portal.statistics.yearGroup')}
        </div>
        <div className="col-span-2 text-center flex items-center justify-center gap-1">
          <UserIcon className="w-3.5 h-3.5" />
          {t('portal.statistics.male')}
        </div>
        <div className="col-span-2 text-center flex items-center justify-center gap-1">
          <UserIcon className="w-3.5 h-3.5" />
          {t('portal.statistics.female')}
        </div>
        <div className="col-span-2 text-center flex items-center justify-center gap-1">
          <UsersIcon className="w-3.5 h-3.5" />
          {t('portal.statistics.total')}
        </div>
      </div>

      {/* Stats List */}
      <div className="space-y-1">
        {stats.map((stat) => (
          <div
            key={stat.yearGroup}
            className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
          >
            {/* Year Group */}
            <div className="col-span-4 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-purple-100 text-purple-600 flex items-center justify-center">
                <span className="text-xs font-bold">Y</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stat.yearGroup}</span>
            </div>

            {/* Male */}
            <div className="col-span-2 text-center text-sm text-gray-700">
              {stat.male}
            </div>

            {/* Female */}
            <div className="col-span-2 text-center text-sm text-gray-700">
              {stat.female}
            </div>

            {/* Total */}
            <div className="col-span-2 text-center text-sm font-semibold text-gray-900">
              {stat.total}
            </div>
          </div>
        ))}
      </div>

      {/* Totals Row */}
      <div className="grid grid-cols-12 gap-2 items-center p-2.5 mt-2 bg-gray-50 rounded-lg font-medium">
        <div className="col-span-4 text-sm text-gray-700">{t('portal.statistics.totalLabel')}</div>
        <div className="col-span-2 text-center text-sm text-gray-700">{totalMale}</div>
        <div className="col-span-2 text-center text-sm text-gray-700">{totalFemale}</div>
        <div className="col-span-2 text-center text-sm text-gray-900">{totalStudents}</div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 text-xs text-gray-500">
        <span>{studentManagerName}</span>
        <span>{schoolManagerName}</span>
      </div>
    </PortalWidgetCard>
  );
};

export default SchoolStatistics;
