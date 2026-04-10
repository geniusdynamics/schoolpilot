import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  ClipboardDocumentCheckIcon,
  BookOpenIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  to: string;
}

const navItems: NavItem[] = [
  {
    id: 'students',
    title: 'Student Management',
    description: 'Profiles, admissions, guardians, and records',
    icon: <UsersIcon className="h-6 w-6" />,
    bgColor: 'bg-blue-100 text-blue-600',
    to: '/administration/students',
  },
  {
    id: 'attendance',
    title: 'Attendance Tracking',
    description: 'Daily registers, trends, and interventions',
    icon: <ClipboardDocumentCheckIcon className="h-6 w-6" />,
    bgColor: 'bg-emerald-100 text-emerald-600',
    to: '/administration/student-attendance',
  },
  {
    id: 'grades',
    title: 'Grade Books',
    description: 'Assessments, grading schemes, and outcomes',
    icon: <BookOpenIcon className="h-6 w-6" />,
    bgColor: 'bg-violet-100 text-violet-600',
    to: '/academics/exam-results',
  },
  {
    id: 'scheduling',
    title: 'Scheduling',
    description: 'Timetables, exam sessions, and periods',
    icon: <CalendarIcon className="h-6 w-6" />,
    bgColor: 'bg-amber-100 text-amber-600',
    to: '/academics/timetable-entries',
  },
  {
    id: 'finance',
    title: 'Finance',
    description: 'Fee collection, invoices, and payments',
    icon: <CurrencyDollarIcon className="h-6 w-6" />,
    bgColor: 'bg-cyan-100 text-cyan-600',
    to: '/finance/student-payments',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Enrollment, finance, and performance insights',
    icon: <ChartBarIcon className="h-6 w-6" />,
    bgColor: 'bg-rose-100 text-rose-600',
    to: '/reports/analytics',
  },
];

export const QuickNavigation: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="mt-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Quick Navigation
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.to)}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left"
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${item.bgColor}`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
              <p className="text-xs text-gray-500 truncate">{item.description}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickNavigation;
