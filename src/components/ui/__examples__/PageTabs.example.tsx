/**
 * Example: PageTabs Usage (follows ClassListsPage pattern)
 * 
 * This demonstrates how to use PageTabs to simplify page implementations
 * with consistent tab navigation + filters + content switching.
 */

import React, { useState } from 'react';
import { PageTabs, PageTab, Card, FilterBar } from '@/components/ui';
import { 
  HomeIcon, 
  BookOpenIcon, 
  ChartPieIcon, 
  ChartBarIcon,
  PlusIcon
} from '@/components/ui/icons';

// ============================================================================
// EXAMPLE 1: Exam Analysis Page with PageTabs
// ============================================================================

const ExamAnalysisPageWithPageTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('analysis');

  // Define tabs
  const tabs: PageTab[] = [
    { id: 'my-classes', label: 'My Classes', icon: <HomeIcon className="h-4 w-4" /> },
    { id: 'manage-exams', label: 'Manage Exams', icon: <BookOpenIcon className="h-4 w-4" /> },
    { id: 'create-exam', label: 'Create Exam', icon: <PlusIcon className="h-4 w-4" /> },
    { id: 'grading-systems', label: 'Grading Systems', icon: <ChartBarIcon className="h-4 w-4" /> },
    { id: 'analysis', label: 'Analysis', icon: <ChartPieIcon className="h-4 w-4" /> },
  ];

  // Define filters (shown for all tabs)
  const filters = [
    {
      id: 'exam-session',
      label: 'Exam Session',
      placeholder: 'Select Exam Session',
      options: [
        { value: '', label: 'Select Exam Session' },
        { value: 'session-1', label: 'Term 1 CAT 1' },
        { value: 'session-2', label: 'Term 1 CAT 2' },
      ],
    },
    {
      id: 'class-stream',
      label: 'Class Stream',
      placeholder: 'Select Class Stream',
      options: [
        { value: '', label: 'Select Class Stream' },
        { value: 'form-1a', label: 'Form 1 Alpha' },
        { value: 'form-1b', label: 'Form 1 Beta' },
      ],
    },
  ];

  // Render content based on active tab
  const renderContent = (tabId: string) => {
    switch (tabId) {
      case 'my-classes':
        return (
          <Card>
            <div className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900">My Classes</h3>
              <p className="text-gray-500 mt-2">View your assigned classes</p>
            </div>
          </Card>
        );
      
      case 'manage-exams':
        return (
          <Card>
            <div className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900">Manage Exams</h3>
              <p className="text-gray-500 mt-2">View and edit exam sessions</p>
            </div>
          </Card>
        );
      
      case 'create-exam':
        return (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Exam</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exam Type</label>
                    <select className="mt-1 w-full rounded-lg border-gray-300">
                      <option>Ordinary Exam</option>
                      <option>Consolidated Exam</option>
                      <option>Year Average</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Form</label>
                    <select className="mt-1 w-full rounded-lg border-gray-300">
                      <option>Form 1</option>
                      <option>Form 2</option>
                      <option>Form 3</option>
                      <option>Form 4</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button className="px-4 py-2 text-gray-600 hover:text-gray-800">
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                    Create Exam
                  </button>
                </div>
              </div>
            </div>
          </Card>
        );
      
      case 'grading-systems':
        return (
          <Card>
            <div className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900">Grading Systems</h3>
              <p className="text-gray-500 mt-2">Configure grading schemes</p>
            </div>
          </Card>
        );
      
      case 'analysis':
      default:
        return (
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Exam Analysis</h3>
              <p className="text-gray-500">
                Select an exam session and class stream above to view analysis.
              </p>
            </div>
          </Card>
        );
    }
  };

  return (
    <PageTabs
      tabs={tabs}
      defaultTabId="analysis"
      activeTabId={activeTab}
      onTabChange={setActiveTab}
      variant="sidebar"
      globalFilters={filters}
      renderContent={renderContent}
      searchLabel="Generate Analysis"
      onSearch={(tabId, values) => {
        console.log('Search:', tabId, values);
      }}
      onClear={(tabId) => {
        console.log('Clear filters for:', tabId);
      }}
    />
  );
};

// ============================================================================
// EXAMPLE 2: Reports ClassLists with PageTabs (Simpler)
// ============================================================================

const ClassListsWithPageTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('class-lists');

  const tabs: PageTab[] = [
    { id: 'class-lists', label: 'Class Lists', icon: <HomeIcon className="h-4 w-4" /> },
    { id: 'analysis-report', label: 'Analysis Report', icon: <ChartBarIcon className="h-4 w-4" /> },
    { id: 'report-forms', label: 'Report Forms', icon: <BookOpenIcon className="h-4 w-4" /> },
    { id: 'merit-lists', label: 'Merit Lists', icon: <ChartPieIcon className="h-4 w-4" /> },
  ];

  const filters = [
    {
      id: 'form',
      label: 'Form',
      placeholder: 'Select Form',
      options: [
        { value: '', label: 'Select Form' },
        { value: 'form-1', label: 'Form 1' },
        { value: 'form-2', label: 'Form 2' },
        { value: 'form-3', label: 'Form 3' },
        { value: 'form-4', label: 'Form 4' },
      ],
    },
    {
      id: 'stream',
      label: 'Stream',
      placeholder: 'Select Stream (Optional)',
      options: [
        { value: '', label: 'Select Stream (Optional)' },
        { value: 'alpha', label: 'Alpha' },
        { value: 'moxie', label: 'Moxie' },
        { value: 'north', label: 'North' },
      ],
      optional: true,
    },
  ];

  return (
    <PageTabs
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={setActiveTab}
      variant="sidebar"
      globalFilters={filters}
      searchLabel="Generate Report"
      renderContent={(tabId) => {
        // Return content based on tab
        return (
          <Card>
            <div className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 capitalize">
                {tabs.find(t => t.id === tabId)?.label}
              </h3>
              <p className="text-gray-500 mt-2">
                Select filters above and click "Generate Report" to view results.
              </p>
            </div>
          </Card>
        );
      }}
    />
  );
};

// ============================================================================
// EXAMPLE 3: Simple Page Tabs (no filters)
// ============================================================================

import { SimplePageTabs } from '@/components/ui';

const SimpleExample: React.FC = () => {
  return (
    <SimplePageTabs
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'details', label: 'Details' },
        { id: 'settings', label: 'Settings' },
      ]}
      defaultTabId="overview"
      variant="sidebar"
      renderContent={(tabId) => (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium capitalize">{tabId} Content</h3>
          </div>
        </Card>
      )}
    />
  );
};

// ============================================================================
// MIGRATION: From ClassListsPage pattern to PageTabs
// ============================================================================

/**
 * BEFORE (ClassListsPage pattern):
 * ```tsx
 * const [activeTab, setActiveTab] = useState('class-lists');
 * 
 * return (
 *   <div className="space-y-6 pb-8">
 *     <TabNavigation 
 *       tabs={tabs} 
 *       variant="sidebar"
 *       activeTabId={activeTab}
 *       onTabChange={setActiveTab}
 *     />
 *     <FilterBar filters={filters} ... />
 *     {activeTab === 'class-lists' && <Content />}
 *     {activeTab === 'analysis' && <OtherContent />}
 *   </div>
 * );
 * ```
 * 
 * AFTER (with PageTabs):
 * ```tsx
 * <PageTabs
 *   tabs={tabs}
 *   defaultTabId="class-lists"
 *   variant="sidebar"
 *   globalFilters={filters}
 *   renderContent={(tabId) => {
 *     if (tabId === 'class-lists') return <Content />;
 *     if (tabId === 'analysis') return <OtherContent />;
 *     return null;
 *   }}
 * />
 * ```
 * 
 * Benefits:
 * - Consistent structure across all pages
 * - Less boilerplate code
 * - Built-in filter state management
 * - Easy to add/remove tabs
 */

export default ExamAnalysisPageWithPageTabs;
