import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { ChatBubbleLeftRightIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { SMSReport, SMSStatus } from '../data/types';

export const SMSReportsContent: React.FC = () => {

  const smsReportsCollection = useDatabaseCollection<SMSReport>('sms_reports');

  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Live SMS delivery reports from the database
  const smsReports: SMSReport[] = useMemo(() => {
    let filtered = smsReportsCollection.data;

    if (selectedStatus) {
      filtered = filtered.filter(r => r.status === selectedStatus);
    }

    if (selectedType) {
      filtered = filtered.filter(r => r.recipient_type === selectedType);
    }

    if (searchTerm) {
      filtered = filtered.filter(r =>
        (r.recipient_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (r.recipient?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        r.phone.includes(searchTerm)
      );
    }

    if (dateFrom) {
      filtered = filtered.filter(r => r.sent_date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter(r => r.sent_date <= dateTo);
    }

    return filtered;
  }, [smsReportsCollection.data, selectedStatus, selectedType, searchTerm, dateFrom, dateTo]);

  const getStatusBadge = (status: SMSStatus) => {
    const styles = {
      'Sent': 'bg-primary-100 text-primary-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Failed': 'bg-red-100 text-red-800',
      'Pending': 'bg-yellow-100 text-yellow-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const columns: DataGridColumn<SMSReport>[] = [
    {
      key: 'recipient_name',
      header: 'Recipient',
      sortable: true,
      filterable: true
    },
    {
      key: 'recipient_type',
      header: 'Type',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'template',
      header: 'Template',
      sortable: true,
      render: (value) => value
    },
    {
      key: 'message',
      header: 'Message',
      sortable: false,
      render: (value) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      )
    },
    {
      key: 'sent_date',
      header: 'Sent Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'sent_time',
      header: 'Sent Time',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'delivery_date',
      header: 'Delivered',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'sender',
      header: 'Sender',
      sortable: true,
      render: (value) => value
    }
  ];

  const recipientTypes = ['Student', 'Staff', 'Parent'];
  const statuses: SMSStatus[] = ['Sent', 'Delivered', 'Failed', 'Pending'];

  const totals = useMemo(() => {
    return {
      total: smsReports.length,
      sent: smsReports.filter(r => r.status === 'Sent').length,
      delivered: smsReports.filter(r => r.status === 'Delivered').length,
      failed: smsReports.filter(r => r.status === 'Failed').length,
      pending: smsReports.filter(r => r.status === 'Pending').length
    };
  }, [smsReports]);

  if (smsReportsCollection.loading && smsReports.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading SMS reports...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-surface-foreground">SMS Reports</h1>
        <Button variant="secondary">
          Export Report
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-primary-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-primary-800">SMS Delivery and Status Reports</h3>
              <p className="text-sm text-primary-700 mt-1">
                Track SMS delivery status, view delivery reports, and monitor failed messages. 
                Filter by recipient type, status, date range, or search by recipient.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total SMS</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ClockIcon className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium">Sent</span>
            </div>
            <p className="text-2xl font-bold text-primary-600 mt-2">
              {totals.sent}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Delivered</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.delivered}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <XCircleIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Failed</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {totals.failed}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {totals.pending}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatus(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Recipient Type</label>
            <select
              value={selectedType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            >
              <option value="">All Types</option>
              {recipientTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Recipient, phone..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={smsReports}
          columns={columns}
        />
      </Card>
    </div>
  );
};

const SMSReportsPage: React.FC = () => (
  <div className="space-y-6">
    <SMSReportsContent />
  </div>
);

export default SMSReportsPage;
