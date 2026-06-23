// ABOUTME: Alumni management page with directory, engagement, and events tabs
// ABOUTME: Provides data grids, filtering, and search for alumni engagement activities and events

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PageHeaderWithTabs, Tab } from '@/components/ui/PageHeaderWithTabs';
import { UserGroupIcon, GiftIcon, CalendarDaysIcon } from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { AlumniDirectoryContent } from './AlumniDirectoryPage';

interface AlumniEngagement {
  id: string;
  alumni_name: string;
  graduation_year: string;
  activity_type: string;
  activity_date: string;
  description: string;
  amount?: number;
}

interface AlumniEvent {
  id: string;
  event_name: string;
  event_date: string;
  location: string;
  event_type: string;
  expected_attendees: number;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  description: string;
}

const engagementMockData: AlumniEngagement[] = [
  { id: 'eng-001', alumni_name: 'James Mwangi', graduation_year: '2024', activity_type: 'Donation', activity_date: '2026-06-15', description: 'Donated KES 50,000 to scholarship fund', amount: 50000 },
  { id: 'eng-002', alumni_name: 'Grace Akinyi', graduation_year: '2023', activity_type: 'Mentorship', activity_date: '2026-06-10', description: 'Career mentorship session with Form 4 science students', amount: undefined },
  { id: 'eng-003', alumni_name: 'Sarah Wanjiku', graduation_year: '2022', activity_type: 'Donation', activity_date: '2026-05-28', description: 'Annual alumni donation drive contribution', amount: 25000 },
  { id: 'eng-004', alumni_name: 'Peter Kamau', graduation_year: '2023', activity_type: 'Event Participation', activity_date: '2026-05-20', description: 'Attended Alumni networking mixer', amount: undefined },
  { id: 'eng-005', alumni_name: 'David Ochieng', graduation_year: '2024', activity_type: 'Volunteer', activity_date: '2026-05-15', description: 'Volunteered as career day speaker for engineering students', amount: undefined },
  { id: 'eng-006', alumni_name: 'James Mwangi', graduation_year: '2024', activity_type: 'Mentorship', activity_date: '2026-05-10', description: 'Guided 3 students through software development internship applications', amount: undefined },
  { id: 'eng-007', alumni_name: 'Grace Akinyi', graduation_year: '2023', activity_type: 'Donation', activity_date: '2026-04-22', description: 'Donated medical textbooks to school library', amount: 15000 },
  { id: 'eng-008', alumni_name: 'Sarah Wanjiku', graduation_year: '2022', activity_type: 'Volunteer', activity_date: '2026-04-10', description: 'Financial literacy workshop for Form 3 students', amount: undefined },
];

const eventsMockData: AlumniEvent[] = [
  { id: 'evt-001', event_name: 'Annual Alumni Reunion 2026', event_date: '2026-08-15', location: 'School Main Hall', event_type: 'Reunion', expected_attendees: 200, status: 'Upcoming', description: 'Grand reunion for all alumni celebrating 50 years of excellence' },
  { id: 'evt-002', event_name: 'Scholarship Fundraiser Gala', event_date: '2026-07-20', location: 'Nairobi Serena Hotel', event_type: 'Fundraiser', expected_attendees: 150, status: 'Upcoming', description: 'Annual fundraising gala to support underprivileged students' },
  { id: 'evt-003', event_name: 'Career Networking Mixer', event_date: '2026-05-20', location: 'School Amphitheatre', event_type: 'Networking', expected_attendees: 80, status: 'Completed', description: 'Networking event connecting alumni with current students' },
  { id: 'evt-004', event_name: 'STEM Workshop Series', event_date: '2026-04-10', location: 'Science Lab Complex', event_type: 'Workshop', expected_attendees: 45, status: 'Completed', description: 'Hands-on workshops in robotics and programming for Form 2-3 students' },
  { id: 'evt-005', event_name: 'Class of 2020 Reunion', event_date: '2026-03-05', location: 'School Dining Hall', event_type: 'Reunion', expected_attendees: 60, status: 'Completed', description: '5-year reunion for the class of 2020' },
  { id: 'evt-006', event_name: 'Sports Day Alumni Challenge', event_date: '2026-09-10', location: 'School Sports Ground', event_type: 'Reunion', expected_attendees: 120, status: 'Upcoming', description: 'Friendly sports competition between alumni and current students' },
  { id: 'evt-007', event_name: 'Career Day 2026', event_date: '2026-02-15', location: 'School Hall', event_type: 'Workshop', expected_attendees: 300, status: 'Completed', description: 'Annual career day with alumni speakers from various professions' },
  { id: 'evt-008', event_name: 'Entrepreneurship Bootcamp', event_date: '2026-10-01', location: 'Business Studies Department', event_type: 'Workshop', expected_attendees: 50, status: 'Upcoming', description: 'Weekend bootcamp for students interested in entrepreneurship' },
  { id: 'evt-009', event_name: 'Alumni vs Staff Charity Match', event_date: '2026-06-30', location: 'School Sports Ground', event_type: 'Fundraiser', expected_attendees: 500, status: 'Cancelled', description: 'Charity football match cancelled due to ground renovations' },
];

const AlumniEngagementContent: React.FC = () => {
  const { t } = useTranslation('administration');

  const [searchQuery, setSearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('');

  const activityTypes = useMemo(() => {
    return Array.from(new Set(engagementMockData.map(e => e.activity_type))).sort();
  }, []);

  const filteredEngagements = useMemo(() => {
    let results = engagementMockData;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(e =>
        (e.alumni_name?.toLowerCase() ?? '').includes(q) ||
        (e.description?.toLowerCase() ?? '').includes(q) ||
        (e.activity_type?.toLowerCase() ?? '').includes(q)
      );
    }
    if (activityTypeFilter) {
      results = results.filter(e => e.activity_type === activityTypeFilter);
    }
    return results;
  }, [searchQuery, activityTypeFilter]);

  const totalDonations = useMemo(() => {
    return filteredEngagements
      .filter(e => e.activity_type === 'Donation' && e.amount)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredEngagements]);

  const columns: DataGridColumn<AlumniEngagement>[] = [
    { key: 'activity_type', header: 'Activity Type', width: 150, sortable: true, filterable: true },
    {
      key: 'alumni_name',
      header: 'Alumni Name',
      width: 180,
      sortable: true,
      filterable: true,
      render: (value, item) => `${item.alumni_name} (${item.graduation_year})`,
    },
    { key: 'activity_date', header: 'Date', width: 120, sortable: true, render: (value) => new Date(value).toLocaleDateString() },
    { key: 'description', header: 'Description', width: 300, sortable: false },
    {
      key: 'amount',
      header: 'Amount',
      width: 120,
      sortable: true,
      render: (value, item) =>
        item.amount ? `KES ${item.amount.toLocaleString()}` : '-',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-4 text-sm text-gray-500">
        Track donations, mentorship, volunteering, and event participation activities
      </div>
      <Card title="Alumni Engagement">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-700">{engagementMockData.length}</div>
            <div className="text-xs text-purple-600">Total Activities</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-700">
              {engagementMockData.filter(e => e.activity_type === 'Donation').length}
            </div>
            <div className="text-xs text-green-600">Donations</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-700">{totalDonations > 0 ? `KES ${(totalDonations / 1000).toFixed(0)}K` : 'KES 0'}</div>
            <div className="text-xs text-blue-600">Total Donation Amount</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-amber-700">{new Set(engagementMockData.map(e => e.alumni_name)).size}</div>
            <div className="text-xs text-amber-600">Active Alumni</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            label="Search engagements"
            placeholder="Search by name, activity, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            placeholder="Filter by Activity Type"
            value={activityTypeFilter}
            onChange={(value) => setActivityTypeFilter(value as string)}
            options={[
              { label: 'All Types', value: '' },
              ...activityTypes.map(at => ({ label: at, value: at })),
            ]}
          />
        </div>

        <DataGrid
          data={filteredEngagements}
          columns={columns}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <GiftIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <p className="text-gray-500">No engagement activities found matching your filters.</p>
            </div>
          }
        />
      </Card>
    </div>
  );
};

const AlumniEventsContent: React.FC = () => {
  const { t } = useTranslation('administration');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const eventTypes = useMemo(() => {
    return Array.from(new Set(eventsMockData.map(e => e.event_type))).sort();
  }, []);

  const filteredEvents = useMemo(() => {
    let results = eventsMockData;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(e =>
        (e.event_name?.toLowerCase() ?? '').includes(q) ||
        (e.location?.toLowerCase() ?? '').includes(q) ||
        (e.description?.toLowerCase() ?? '').includes(q)
      );
    }
    if (statusFilter) {
      results = results.filter(e => e.status === statusFilter);
    }
    if (typeFilter) {
      results = results.filter(e => e.event_type === typeFilter);
    }
    return results;
  }, [searchQuery, statusFilter, typeFilter]);

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, string> = {
      Upcoming: 'info',
      Completed: 'success',
      Cancelled: 'danger',
    };
    return <Badge variant={(variantMap[status] as any) || 'secondary'}>{status}</Badge>;
  };

  const columns: DataGridColumn<AlumniEvent>[] = [
    { key: 'event_name', header: 'Event Name', width: 220, sortable: true, filterable: true },
    { key: 'event_date', header: 'Date', width: 120, sortable: true, render: (value) => new Date(value).toLocaleDateString() },
    { key: 'location', header: 'Location', width: 200, sortable: true, filterable: true },
    { key: 'event_type', header: 'Type', width: 120, sortable: true, filterable: true },
    { key: 'expected_attendees', header: 'Expected', width: 100, sortable: true, render: (value) => `${value}` },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      sortable: true,
      filterable: true,
      render: (value, item) => getStatusBadge(item.status),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-4 text-sm text-gray-500">
        Plan and manage reunions, fundraisers, networking events, and workshops
      </div>
      <Card title="Alumni Events">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-700">{eventsMockData.length}</div>
            <div className="text-xs text-blue-600">Total Events</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-indigo-700">{eventsMockData.filter(e => e.status === 'Upcoming').length}</div>
            <div className="text-xs text-indigo-600">Upcoming</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-700">{eventsMockData.filter(e => e.status === 'Completed').length}</div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-700">{eventsMockData.filter(e => e.status === 'Cancelled').length}</div>
            <div className="text-xs text-red-600">Cancelled</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            label="Search events"
            placeholder="Search by event name, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            placeholder="Filter by Status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as string)}
            options={[
              { label: 'All Statuses', value: '' },
              { label: 'Upcoming', value: 'Upcoming' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Cancelled', value: 'Cancelled' },
            ]}
          />
          <Select
            placeholder="Filter by Type"
            value={typeFilter}
            onChange={(value) => setTypeFilter(value as string)}
            options={[
              { label: 'All Types', value: '' },
              ...eventTypes.map(et => ({ label: et, value: et })),
            ]}
          />
        </div>

        <DataGrid
          data={filteredEvents}
          columns={columns}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <CalendarDaysIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <p className="text-gray-500">No events found matching your filters.</p>
            </div>
          }
        />
      </Card>
    </div>
  );
};

const tabConfig = [
  { id: 'directory', label: 'Directory', icon: <UserGroupIcon className="w-4 h-4" />, component: AlumniDirectoryContent },
  { id: 'engagement', label: 'Engagement', icon: <GiftIcon className="w-4 h-4" />, component: AlumniEngagementContent },
  { id: 'events', label: 'Events', icon: <CalendarDaysIcon className="w-4 h-4" />, component: AlumniEventsContent },
];

const AlumniManagementPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'directory');

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'directory') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: tabId }, { replace: true });
    }
  }, [setSearchParams]);

  const tabs: Tab[] = tabConfig.map(t => ({ id: t.id, label: t.label, icon: t.icon }));
  const activeComponent = tabConfig.find(t => t.id === activeTab)?.component || tabConfig[0].component;

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title="Alumni Management"
        subtitle="Manage alumni records, track engagement, and coordinate events"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="indigo"
      />
      <div className="mt-4">
        {React.createElement(activeComponent)}
      </div>
    </div>
  );
};

export default AlumniManagementPage;

export const AlumniManagementContent = AlumniManagementPage;
