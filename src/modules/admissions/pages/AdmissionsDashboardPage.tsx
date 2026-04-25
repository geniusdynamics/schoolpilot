// ABOUTME: Admissions Dashboard matching Faria International School design
// ABOUTME: Features metric cards, charts, calendar, pipeline cards, and tabs

import React, { useState, useMemo } from 'react';
import {
  ChartBarIcon,
  PlusIcon,
  CalendarIcon,
  ChevronDownIcon,
  FilterIcon,
  ArrowRightIcon,
  MessageIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  UsersIcon,
  BellIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  DocumentDuplicateIcon,
} from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAdmissionsData } from '../data/useAdmissionsData';
import { ProgramType } from '../data/types';

// Chart components
import EnquiryConversionChart from '../components/EnquiryConversionChart';
import ApplicationsChart from '../components/ApplicationsChart';
import EnrollmentChart from '../components/EnrollmentChart';
import ConversionFunnelChart from '../components/ConversionFunnelChart';
import PostAdmissionsDonut from '../components/PostAdmissionsDonut';
import ConversionTable from '../components/ConversionTable';

// Simple Calendar Component matching the image
const MiniCalendar: React.FC = () => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  const currentMonth = monthNames[now.getMonth()];
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="bg-white rounded-lg p-3 h-full">
      <div className="flex items-center justify-between mb-2">
        <button className="p-1 hover:bg-gray-100 rounded text-gray-500">&lt;</button>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{currentMonth}</span>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded text-gray-500">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {weekDays.map(d => <div key={d} className="text-gray-400 py-1 font-medium">{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = day === now.getDate();
          const hasEvent = [3, 10, 17, 25].includes(day);
          return (
            <div key={day} className={`py-1 rounded cursor-pointer ${isToday ? 'bg-violet-100 text-violet-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'} ${hasEvent ? 'relative' : ''}`}>
              {day}
              {hasEvent && <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />}
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2 text-xs">
        <span className="flex items-center gap-1 text-gray-600"><span className="w-2 h-2 rounded-full bg-amber-500" /> Tour</span>
        <span className="flex items-center gap-1 text-gray-600"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Open Day</span>
        <span className="flex items-center gap-1 text-gray-600"><span className="w-2 h-2 rounded-full bg-blue-500" /> Interview</span>
        <span className="flex items-center gap-1 text-gray-600"><span className="w-2 h-2 rounded-full bg-purple-500" /> Other</span>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  trend?: { direction: 'up' | 'down' | 'neutral'; value: string };
  color: string;
}> = ({ title, value, trend, color }) => (
  <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
    <p className="text-sm text-gray-500 mb-1">{title}</p>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
    {trend && (
      <p className={`text-xs mt-1 ${trend.direction === 'up' ? 'text-emerald-600' : trend.direction === 'down' ? 'text-rose-600' : 'text-gray-500'}`}>
        {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '−'} {trend.value}
      </p>
    )}
  </div>
);

// Pipeline Card Component
const PipelineCard: React.FC<{
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  colorClass: string;
  textClass: string;
}> = ({ label, count, isActive, onClick, colorClass, textClass }) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-start p-4 rounded-lg border-2 transition-all duration-200 w-full text-left group
      ${isActive 
        ? 'border-violet-600 bg-white shadow-md' 
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
  >
    <div className="flex items-center justify-between w-full mb-2">
      <span className={`text-sm font-medium ${isActive ? 'text-violet-700' : textClass}`}>
        {label} {isActive && <span className="ml-1">▼</span>}
      </span>
      <ArrowRightIcon className={`w-4 h-4 ${isActive ? 'text-violet-600 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-opacity`} />
    </div>
    <span className="text-2xl font-bold text-gray-900">{count}</span>
  </button>
);

// Recently Viewed Item
const RecentApplicantItem: React.FC<{
  name: string;
  grade: string;
  status: string;
  statusColor: string;
  onClick: () => void;
}> = ({ name, grade, status, statusColor, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-sm font-medium">
      {name.split(' ').map(n => n[0]).join('')}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
      <p className="text-xs text-gray-500">{grade}, <span className={statusColor}>{status}</span></p>
    </div>
    <ArrowRightIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>
);

const AdmissionsDashboardPage: React.FC = () => {
  const { statistics, loading } = useAdmissionsData();
  const [selectedPeriod, setSelectedPeriod] = useState<'YTD' | 'YoY' | 'MoM'>('YTD');
  const [selectedProgram, setSelectedProgram] = useState<ProgramType>(ProgramType.ALL);
  const [activePipelineFilter, setActivePipelineFilter] = useState<string | null>('enquired');
  const [activeTab, setActiveTab] = useState<'focus' | 'task' | 'activity' | 'review'>('focus');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const recentApplicants = useMemo(() => [
    { id: '1', name: 'Samuel Epelbaum', grade: 'M, Kindergarten', status: 'Applied', statusColor: 'text-blue-600' },
    { id: '2', name: 'Chloe Epelbaum', grade: 'F, Grade 11', status: 'Graduated', statusColor: 'text-emerald-600' },
    { id: '3', name: 'Helen Austen', grade: 'F, Grade 4', status: 'Withdrawn', statusColor: 'text-rose-600' },
  ], []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const enquiries = statistics.monthlyData.reduce((sum, m) => sum + m.enquiries, 0);
  const applicants = statistics.totalApplications;
  const enrolled = statistics.enrolled;
  const events = 155;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="px-6 py-4">
        <p className="text-sm text-gray-500 mb-1">{today}</p>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome, Sharon</h1>
      </div>

      {/* Main Dashboard Card */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-100">
            {/* Time Period Filters */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['YTD', 'YoY', 'MoM'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-r border-gray-200 last:border-r-0
                    ${selectedPeriod === period
                      ? 'bg-white text-violet-700 border-2 border-violet-600 m-[-1px] z-10'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {period}
                </button>
              ))}
            </div>

            {/* Academic Year Selector */}
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <span>2023 - 2024 Academic Year</span>
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              </button>
              <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FilterIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Enquiries</p>
              <p className="text-3xl font-bold text-blue-600">{enquiries}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Applicants</p>
              <p className="text-3xl font-bold text-blue-600">{applicants}</p>
              <p className={`text-xs mt-1 ${statistics.trends.applications.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                ▲ {statistics.trends.applications.value}
              </p>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Enrollment</p>
              <p className="text-3xl font-bold text-blue-600">{enrolled}</p>
              <p className={`text-xs mt-1 ${statistics.trends.enrollment.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                ▲ {statistics.trends.enrollment.value}
              </p>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Events</p>
              <p className="text-3xl font-bold text-blue-600">{events}</p>
              <p className="text-xs mt-1 text-emerald-600">▲ 0%</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
            {/* Enquiry & Conversion Chart */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-600">Enquiry & Conversion</h3>
                <button className="text-gray-400 hover:text-gray-600">
                  <span className="text-lg">☰</span>
                </button>
              </div>
              <EnquiryConversionChart data={statistics.monthlyData} />
            </div>

            {/* Applications Chart */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-amber-600">Applications</h3>
                <button className="text-gray-400 hover:text-gray-600">
                  <span className="text-lg">☰</span>
                </button>
              </div>
              <ApplicationsChart data={statistics.monthlyData} />
            </div>

            {/* Enrollment Chart */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-emerald-600">Total Enrolled Students</h3>
                <button className="text-gray-400 hover:text-gray-600">
                  <span className="text-lg">☰</span>
                </button>
              </div>
              <EnrollmentChart data={statistics.monthlyData} />
            </div>

            {/* Calendar */}
            <div className="p-4 bg-white">
              <MiniCalendar />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            Stats last updated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between border-b border-gray-200 mb-4">
          <div className="flex">
            {[
              { key: 'focus', label: 'Focus' },
              { key: 'task', label: 'Task' },
              { key: 'activity', label: 'Latest Activity' },
              { key: 'review', label: 'Applicant Review' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.key
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">New</span>
            <button className="text-gray-400 hover:text-gray-600">
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-4">
            {activeTab === 'focus' && (
              <>
                {/* Program Filters */}
                <div className="flex items-center gap-2">
                  {(['All', 'Primary', 'Secondary'] as ProgramType[]).map((program) => (
                    <button
                      key={program}
                      onClick={() => setSelectedProgram(program)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors
                        ${selectedProgram === program
                          ? 'bg-violet-50 border-violet-300 text-violet-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {program === 'All' ? 'All programs' : program}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    <FilterIcon className="w-4 h-4" />
                    Filter
                  </button>
                </div>

                {/* Pipeline Cards */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Pipeline</h3>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <FilterIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <PipelineCard
                      label="Contacts"
                      count={statistics.pipeline.contacts}
                      isActive={activePipelineFilter === 'contacts'}
                      onClick={() => setActivePipelineFilter('contacts')}
                      colorClass="bg-gray-50"
                      textClass="text-gray-600"
                    />
                    <PipelineCard
                      label="Enquired"
                      count={statistics.pipeline.enquired}
                      isActive={activePipelineFilter === 'enquired'}
                      onClick={() => setActivePipelineFilter('enquired')}
                      colorClass="bg-amber-50"
                      textClass="text-amber-600"
                    />
                    <PipelineCard
                      label="Applied"
                      count={statistics.pipeline.applied}
                      isActive={activePipelineFilter === 'applied'}
                      onClick={() => setActivePipelineFilter('applied')}
                      colorClass="bg-blue-50"
                      textClass="text-blue-600"
                    />
                    <PipelineCard
                      label="Admitted"
                      count={statistics.pipeline.admitted}
                      isActive={activePipelineFilter === 'admitted'}
                      onClick={() => setActivePipelineFilter('admitted')}
                      colorClass="bg-emerald-50"
                      textClass="text-emerald-600"
                    />
                    <PipelineCard
                      label="Enrolled"
                      count={statistics.pipeline.enrolled}
                      isActive={activePipelineFilter === 'enrolled'}
                      onClick={() => setActivePipelineFilter('enrolled')}
                      colorClass="bg-violet-50"
                      textClass="text-violet-600"
                    />
                  </div>
                </div>

                {/* Conversion Funnel Section */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Funnel Header */}
                  <div className="bg-violet-900 text-white px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Conversion Funnel</h2>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg text-sm hover:bg-white/20">
                        <DocumentDuplicateIcon className="w-4 h-4" />
                        Copy link
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-violet-900 text-sm font-medium hover:bg-gray-100">
                        <span className="text-violet-500">✨</span>
                        AI Analyst Beta
                      </button>
                    </div>
                  </div>

                  {/* Funnel Navigation */}
                  <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                      <button className="text-gray-400 hover:text-gray-600">&lt;</button>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-gray-800">All Academic Years</h3>
                        <span className="text-gray-400 cursor-pointer">ⓘ</span>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">&gt;</button>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      <FilterIcon className="w-4 h-4" />
                      Filter
                    </button>
                  </div>

                  {/* Disclaimer */}
                  <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500">
                    The statistics on this page are based on status entries recorded in the Applicant History section. Since each student can have multiple status entries, a student may be counted more than once in the data.
                  </div>

                  {/* Charts */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ConversionFunnelChart data={statistics.funnel} />
                    <div className="flex flex-col">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Post-Admissions</h4>
                      <PostAdmissionsDonut
                        declined={statistics.postAdmissions.declined}
                        enrolled={statistics.postAdmissions.enrolled}
                        title=""
                      />
                    </div>
                  </div>

                  {/* Conversion Table */}
                  <div className="border-t border-gray-100">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-700">Conversion Table</h3>
                    </div>
                    <div className="p-6">
                      <ConversionTable
                        funnel={statistics.funnel}
                        postAdmissions={statistics.postAdmissions}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'task' && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No tasks pending</p>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No recent activity</p>
              </div>
            )}

            {activeTab === 'review' && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No applicants pending review</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-4">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <PlusIcon className="w-4 h-4 text-gray-500" />
                  Add a New Enquiry
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  Schedule an Event
                  <ChevronDownIcon className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
              </div>
            </div>

            {/* Recently Viewed */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recently Viewed</h3>
              <div className="space-y-1">
                {recentApplicants.map((applicant) => (
                  <RecentApplicantItem
                    key={applicant.id}
                    name={applicant.name}
                    grade={applicant.grade}
                    status={applicant.status}
                    statusColor={applicant.statusColor}
                    onClick={() => console.log('View:', applicant.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionsDashboardPage;
