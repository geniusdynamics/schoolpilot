// ABOUTME: Audit Log Viewer Page - displays audit log entries
// ABOUTME: Provides filtering, search, and detailed view of audit entries

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import DialogForm from '@/components/ui/forms/DialogForm';
import { useToast } from '@/hooks/useToast';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { AuditAction, AuditLogEntry } from '../services/types';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  UserIcon,
  TableCellsIcon,
  ClipboardDocumentListIcon
} from '@/components/ui/icons';

const AuditLogViewerPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const { showToast } = useToast();
  
  const auditCollection = useDatabaseCollection<AuditLogEntry>('audit_logs');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Expanded row state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedLogEntry, setSelectedLogEntry] = useState<AuditLogEntry | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  // Get audit data
  const data = useMemo(() => {
    if (!auditCollection.data) return [];
    return auditCollection.data;
  }, [auditCollection.data]);
  
  // Get unique values for filters
  const uniqueTables = useMemo(() => {
    const tables = new Set<string>();
    data.forEach(entry => {
      if (entry.table_name) tables.add(entry.table_name);
    });
    return Array.from(tables).sort();
  }, [data]);
  
  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    data.forEach(entry => {
      if (entry.user_name) users.add(entry.user_name);
    });
    return Array.from(users).sort();
  }, [data]);
  
  const uniqueActions: AuditAction[] = ['INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE'];
  
  // Filtered data
  const filteredData = useMemo(() => {
    let result = data;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(entry => 
        entry.record_pk?.toLowerCase().includes(term) ||
        entry.user_name?.toLowerCase().includes(term) ||
        entry.table_name?.toLowerCase().includes(term)
      );
    }
    
    if (actionFilter !== 'all') {
      result = result.filter(entry => entry.action === actionFilter);
    }
    
    if (tableFilter !== 'all') {
      result = result.filter(entry => entry.table_name === tableFilter);
    }
    
    if (userFilter !== 'all') {
      result = result.filter(entry => entry.user_name === userFilter);
    }
    
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      result = result.filter(entry => {
        const entryDate = new Date(entry.changed_at);
        return entryDate >= fromDate;
      });
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(entry => {
        const entryDate = new Date(entry.changed_at);
        return entryDate <= toDate;
      });
    }
    
    return result;
  }, [data, searchTerm, actionFilter, tableFilter, userFilter, dateFrom, dateTo]);
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await auditCollection.refresh();
      showToast({
        variant: 'success',
        title: t('refresh'),
        message: t('refreshSuccess')
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: t('refresh'),
        message: t('refreshError')
      });
    }
  }, [auditCollection, showToast, t]);
  
  // Handle row click to show details
  const handleRowClick = useCallback((entry: AuditLogEntry) => {
    setSelectedLogEntry(entry);
    setShowDetailDialog(true);
  }, []);
  
  // Toggle row expansion
  const toggleRowExpansion = useCallback((entryId: string) => {
    setExpandedRowId(prev => prev === entryId ? null : entryId);
  }, []);
  
  // Format timestamp
  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }, []);
  
  // Column definitions
  const columns: DataGridColumn<AuditLogEntry>[] = useMemo(() => [
    { 
      key: 'changed_at', 
      header: t('timestamp'), 
      width: 180, 
      sortable: true,
      render: (value, entry) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleRowExpansion(entry.id);
          }}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
        >
          {expandedRowId === entry.id ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
          {formatTimestamp(entry.changed_at)}
        </button>
      )
    },
    { 
      key: 'action', 
      header: t('action'), 
      width: 100, 
      sortable: true,
      render: (value, entry) => {
        const actionColors: Record<string, string> = {
          'INSERT': 'bg-green-100 text-green-800',
          'UPDATE': 'bg-blue-100 text-blue-800',
          'DELETE': 'bg-red-100 text-red-800',
          'SOFT_DELETE': 'bg-yellow-100 text-yellow-800'
        };
        const colorClass = actionColors[entry.action] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
            {entry.action}
          </span>
        );
      }
    },
    { 
      key: 'table_name', 
      header: t('table'), 
      width: 150, 
      sortable: true,
      render: (value, entry) => (
        <span className="flex items-center gap-1">
          <TableCellsIcon className="w-4 h-4 text-gray-400" />
          {entry.table_name}
        </span>
      )
    },
    { 
      key: 'record_pk', 
      header: t('record'), 
      width: 120, 
      sortable: true
    },
    { 
      key: 'user_name', 
      header: t('user'), 
      width: 150, 
      sortable: true,
      render: (value, entry) => (
        <span className="flex items-center gap-1">
          <UserIcon className="w-4 h-4 text-gray-400" />
          {entry.user_name || t('system')}
        </span>
      )
    },
    { 
      key: 'details',
      header: '',
      width: 50,
      render: (value, entry) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(entry);
          }}
          title={t('viewDetails')}
        >
          <ClipboardDocumentListIcon className="w-4 h-4" />
        </Button>
      )
    }
  ], [t, formatTimestamp, toggleRowExpansion, handleRowClick]);
  
  // Render expanded row content
  const renderExpandedContent = useCallback((entry: AuditLogEntry) => {
    if (expandedRowId !== entry.id) return null;
    
    return (
      <tr key={`expanded-${entry.id}`}>
        <td colSpan={6} className="bg-gray-50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entry.old_data && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {t('previousValues')}
                </h4>
                <pre className="bg-white p-3 rounded border text-xs overflow-x-auto max-h-48">
                  {JSON.stringify(entry.old_data, null, 2)}
                </pre>
              </div>
            )}
            {entry.new_data && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {t('newValues')}
                </h4>
                <pre className="bg-white p-3 rounded border text-xs overflow-x-auto max-h-48">
                  {JSON.stringify(entry.new_data, null, 2)}
                </pre>
              </div>
            )}
            {!entry.old_data && !entry.new_data && (
              <div className="col-span-2 text-gray-500 italic">
                {t('noDataChanges')}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  }, [expandedRowId, t]);
  
  if (auditCollection.error) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-12">
            <p className="text-red-600">{t('errorLoading')}: {auditCollection.error.message}</p>
            <Button onClick={handleRefresh} className="mt-4">
              {t('retry')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-4">
      <Card>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6" />
            {t('auditLog')}
          </h1>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            
            <Select
              value={actionFilter}
              onChange={setActionFilter}
              className="w-36"
            >
              <option value="all">{t('allActions')}</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </Select>
            
            <Select
              value={tableFilter}
              onChange={setTableFilter}
              className="w-36"
            >
              <option value="all">{t('allTables')}</option>
              {uniqueTables.map(table => (
                <option key={table} value={table}>{table}</option>
              ))}
            </Select>
            
            <Select
              value={userFilter}
              onChange={setUserFilter}
              className="w-36"
            >
              <option value="all">{t('allUsers')}</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </Select>
            
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-32"
                placeholder={t('from')}
              />
              <span className="text-gray-400">-</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-32"
                placeholder={t('to')}
              />
            </div>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            >
              {t('refresh')}
            </Button>
          </div>
        </div>
        
        {auditCollection.loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            <DataGrid
              data={filteredData}
              columns={columns}
              onRowClick={handleRowClick}
              sortable={true}
              filterable={true}
              emptyState={{
                icon: <DocumentTextIcon className="w-12 h-12 text-gray-400" />,
                title: t('noLogsFound'),
                description: t('noLogsDescription')
              }}
            />
            
            {/* Expanded rows */}
            {filteredData.map(entry => renderExpandedContent(entry))}
          </>
        )}
        
        <div className="mt-4 text-sm text-gray-500 text-right">
          {t('showing')} {filteredData.length} {t('of')} {data.length} {t('entries')}
        </div>
      </Card>
      
      {/* Detail Dialog */}
      <DialogForm
        isOpen={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        title={t('auditEntryDetails')}
        size="lg"
        content={
          selectedLogEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    {t('timestamp')}
                  </label>
                  <p className="text-gray-900">{formatTimestamp(selectedLogEntry.changed_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    {t('action')}
                  </label>
                  <p className="text-gray-900">{selectedLogEntry.action}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    {t('table')}
                  </label>
                  <p className="text-gray-900">{selectedLogEntry.table_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    {t('record')}
                  </label>
                  <p className="text-gray-900">{selectedLogEntry.record_pk}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    {t('user')}
                  </label>
                  <p className="text-gray-900">{selectedLogEntry.user_name || t('system')}</p>
                </div>
                {selectedLogEntry.ip_address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      {t('ipAddress')}
                    </label>
                    <p className="text-gray-900">{selectedLogEntry.ip_address}</p>
                  </div>
                )}
              </div>
              
              {selectedLogEntry.old_data && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    {t('previousValues')}
                  </label>
                  <pre className="bg-gray-50 p-4 rounded border text-sm overflow-x-auto max-h-64">
                    {JSON.stringify(selectedLogEntry.old_data, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedLogEntry.new_data && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    {t('newValues')}
                  </label>
                  <pre className="bg-gray-50 p-4 rounded border text-sm overflow-x-auto max-h-64">
                    {JSON.stringify(selectedLogEntry.new_data, null, 2)}
                  </pre>
                </div>
              )}
              
              {!selectedLogEntry.old_data && !selectedLogEntry.new_data && (
                <p className="text-gray-500 italic">{t('noDataChanges')}</p>
              )}
            </div>
          )
        }
        footer={
          <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
            {t('close')}
          </Button>
        }
      />
    </div>
  );
};

export default AuditLogViewerPage;