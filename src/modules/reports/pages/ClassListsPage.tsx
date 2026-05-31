import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TabNavigation, FilterBar } from '@/components/ui';
import { GradeBreakdownTable } from '../components';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  ListBulletIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  TrophyIcon,
  PrinterIcon
} from '@/components/ui/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { initialMockGradeBreakdownData, initialMockClassChartData } from '../data/mockData';
import type { GradeBreakdown, ClassChartData } from '../data/types';

export const ClassListsPageContent: React.FC = () => {
  useTranslation('reports');
  const [activeTab, setActiveTab] = useState('class-lists');

  // Filter states
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const tabs = [
    { 
      id: 'class-lists', 
      label: 'Class Lists', 
      icon: <ListBulletIcon className="h-4 w-4" />,
      onClick: () => setActiveTab('class-lists')
    },
    { 
      id: 'analysis-report', 
      label: 'Analysis Report', 
      icon: <ChartBarIcon className="h-4 w-4" />,
      onClick: () => setActiveTab('analysis-report')
    },
    { 
      id: 'report-forms', 
      label: 'Report Forms', 
      icon: <DocumentTextIcon className="h-4 w-4" />,
      onClick: () => setActiveTab('report-forms')
    },
    { 
      id: 'merit-lists', 
      label: 'Merit Lists', 
      icon: <TrophyIcon className="h-4 w-4" />,
      onClick: () => setActiveTab('merit-lists')
    },
  ];

  // Filter options
  const formOptions = [
    { value: '', label: 'Select Form' },
    { value: 'form-1', label: 'Form 1' },
    { value: 'form-2', label: 'Form 2' },
    { value: 'form-3', label: 'Form 3' },
    { value: 'form-4', label: 'Form 4' },
  ];

  const streamOptions = [
    { value: '', label: 'Select Stream (Optional)' },
    { value: 'alpha', label: 'Alpha' },
    { value: 'moxie', label: 'Moxie' },
    { value: 'north', label: 'North' },
  ];

  const subjectOptions = [
    { value: '', label: 'Select Subject (Optional)' },
    { value: 'kiswahili', label: 'Kiswahili' },
    { value: 'english', label: 'English' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'biology', label: 'Biology' },
  ];

  const handleClearFilters = () => {
    setSelectedForm('');
    setSelectedStream('');
    setSelectedSubject('');
  };

  const handleSearch = () => {
    console.log('Searching with filters:', { selectedForm, selectedStream, selectedSubject });
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Tab Navigation */}
      <TabNavigation 
        tabs={tabs} 
        variant="sidebar"
        activeTabId={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Filters */}
      <FilterBar
        filters={[
          {
            id: 'form',
            label: 'Form',
            placeholder: 'Select Form',
            options: formOptions,
            value: selectedForm,
            onChange: setSelectedForm,
          },
          {
            id: 'stream',
            label: 'Stream',
            placeholder: 'Select Stream (Optional)',
            options: streamOptions,
            value: selectedStream,
            onChange: setSelectedStream,
            optional: true,
          },
          {
            id: 'subject',
            label: 'Subject',
            placeholder: 'Select Subject (Optional)',
            options: subjectOptions,
            value: selectedSubject,
            onChange: setSelectedSubject,
            optional: true,
          },
        ]}
        onClear={handleClearFilters}
        onSearch={handleSearch}
        searchLabel="Generate Report"
      />

      {/* Content based on active tab */}
      {activeTab === 'class-lists' && (
        <div className="space-y-6">
          {/* Grade Breakdown Section */}
          <Card>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Grade Breakdown</h2>
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50 text-emerald-700">
                <option>Kiswahili</option>
                <option>English</option>
                <option>Mathematics</option>
              </select>
            </div>
            <div className="p-4">
              <GradeBreakdownTable 
                rows={initialMockGradeBreakdownData}
                showTeacher={true}
              />
            </div>
          </Card>

          {/* Performance Chart */}
          <Card>
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Mean Marks by Stream</h2>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={initialMockClassChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} domain={[40, 50]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="mean" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Print Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              leftIcon={<PrinterIcon className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              View Print Format
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'analysis-report' && (
        <Card>
          <div className="p-8 text-center">
            <ChartBarIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Report</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Select filters above and click "Generate Report" to view detailed analysis.
            </p>
          </div>
        </Card>
      )}

      {activeTab === 'report-forms' && (
        <Card>
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Report Forms</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Generate and download student report forms for the selected class and exam.
            </p>
          </div>
        </Card>
      )}

      {activeTab === 'merit-lists' && (
        <Card>
          <div className="p-8 text-center">
            <TrophyIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Merit Lists</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              View and print merit lists for top performing students.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
const ClassListsPage: React.FC = () => (
  <div className="space-y-6">
    <ClassListsPageContent />
  </div>
);

export default ClassListsPage;
