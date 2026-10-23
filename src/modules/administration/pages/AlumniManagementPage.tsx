// ABOUTME: Alumni management page with directory, engagement, and events tabs
// ABOUTME: Provides data grids, filtering, and search for alumni engagement activities and events

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeaderWithTabs, Tab } from '@/components/ui/PageHeaderWithTabs';
import { UserGroupIcon, GiftIcon, CalendarDaysIcon } from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { AlumniDirectoryContent } from './AlumniDirectoryPage';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { AlumniEngagement, AlumniEvent } from '../data/types';

const AlumniEngagementContent: React.FC = () => {

  const engagementsCollection = useDatabaseCollection<AlumniEngagement>('alumni_engagements');
  const [searchQuery, setSearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('');

  const activityTypes = useMemo(() => {
    return Array.from(new Set(engagementsCollection.data.map(e => e.activity_type))).sort();
  }, [engagementsCollection.data]);

  const filteredEngagements = useMemo(() => {
    let results = engagementsCollection.data;
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
  }, [engagementsCollection.data, searchQuery, activityTypeFilter]);

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
      <Card
        title="Alumni Engagement"
        info="Track donations, mentorship, volunteering, and event participation activities"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-700">{engagementsCollection.data.length}</div>
            <div className="text-xs text-purple-600">Total Activities</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-700">
              {engagementsCollection.data.filter(e => e.activity_type === 'Donation').length}
            </div>
            <div className="text-xs text-green-600">Donations</div>
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-primary-700">{totalDonations > 0 ? `KES ${(totalDonations / 1000).toFixed(0)}K` : 'KES 0'}</div>
            <div className="text-xs text-primary-600">Total Donation Amount</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-amber-700">{new Set(engagementsCollection.data.map(e => e.alumni_name)).size}</div>
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
              <p className="text-surface-muted-fg">No engagement activities found matching your filters.</p>
            </div>
          }
        />
      </Card>
    </div>
  );
};

const AlumniEventsContent: React.FC = () => {

  const eventsCollection = useDatabaseCollection<AlumniEvent>('alumni_events');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const eventTypes = useMemo(() => {
    return Array.from(new Set(eventsCollection.data.map(e => e.event_type))).sort();
  }, [eventsCollection.data]);

  const filteredEvents = useMemo(() => {
    let results = eventsCollection.data;
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
  }, [eventsCollection.data, searchQuery, statusFilter, typeFilter]);

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
      <Card
        title="Alumni Events"
        info="Plan and manage reunions, fundraisers, networking events, and workshops"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-primary-700">{eventsCollection.data.length}</div>
            <div className="text-xs text-primary-600">Total Events</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-indigo-700">{eventsCollection.data.filter(e => e.status === 'Upcoming').length}</div>
            <div className="text-xs text-indigo-600">Upcoming</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-700">{eventsCollection.data.filter(e => e.status === 'Completed').length}</div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-700">{eventsCollection.data.filter(e => e.status === 'Cancelled').length}</div>
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
              <CalendarDaysIcon className="w-12 h-12 text-primary-400 mx-auto mb-4" />
              <p className="text-surface-muted-fg">No events found matching your filters.</p>
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
        info="Manage alumni records, track engagement, and coordinate events"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="indigo"
      >
        {React.createElement(activeComponent)}
      </PageHeaderWithTabs>
    </div>
  );
};

export default AlumniManagementPage;

export const AlumniManagementContent = AlumniManagementPage;
