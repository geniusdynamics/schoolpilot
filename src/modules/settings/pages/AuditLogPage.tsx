
import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { ClockIcon, ArrowPathIcon as ResetIcon, MagnifyingGlassIcon } from '@/components/ui/icons'; // Added ResetIcon
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '@/components/ui/Spinner';
import { AuditLog, AuditAction, User } from '@/types';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const AuditLogPage: React.FC = () => {
  const { auditLogs, users, loading } = useAppData();

  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    userId?: string;
    actionType?: AuditAction | '';
  }>({
    actionType: '',
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ actionType: '' });
  };

  const filteredAuditLogs = useMemo(() => {
    return (auditLogs || []).filter(log => {
      const logDate = new Date(log.changed_at);
      const startDateMatch = !filters.startDate || logDate >= new Date(filters.startDate);
      const endDateMatch = !filters.endDate || logDate <= new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)); // Include whole end day
      const userMatch = !filters.userId || log.user_id === filters.userId;
      const actionMatch = !filters.actionType || log.action === filters.actionType;
      return startDateMatch && endDateMatch && userMatch && actionMatch;
    }).sort((a,b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  }, [auditLogs, filters]);

  const auditLogColumns: DataGridColumn<AuditLog>[] = [
    {
      key: 'changed_at',
      header: 'Timestamp',
      sortable: true,
      width: 180,
      sticky: true,
      render: (value) => new Date(value).toLocaleString()
    },
    {
      key: 'user_name',
      header: 'User',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value, row) => value || row.user_id || 'System'
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value === 'CREATE' ? 'bg-green-100 text-green-800' :
          value === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
          value === 'DELETE' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'table_name',
      header: 'Entity',
      sortable: true,
      filterable: true,
      width: 150
    },
    {
      key: 'record_pk',
      header: 'Record ID',
      sortable: true,
      width: 100
    }
  ];
  
  const isLoadingPage = loading.auditLogs || loading.users || loading.all;

  return (
    <div className="space-y-6">
      <Card title="System Audit Log">
        <div className="text-center py-8 border-b mb-6">
          <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700">View System Audit Trails</h2>
          <p className="text-gray-500">
            Review logs of significant actions performed within the system for security and accountability.
          </p>
        </div>

        <Card title="Filter Audit Logs" className="mb-6 filter-section">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                <Input
                    label="Start Date"
                    type="date"
                    name="startDate"
                    value={filters.startDate || ''}
                    onChange={handleFilterChange}
                />
                <Input
                    label="End Date"
                    type="date"
                    name="endDate"
                    value={filters.endDate || ''}
                    onChange={handleFilterChange}
                />
                <Select
                    label="User"
                    name="userId"
                    value={filters.userId || ''}
                    onChange={handleFilterChange}
                >
                    <option value="">All Users</option>
                    {(users || []).map((user: User) => (
                        <option key={user.id} value={user.id}>{user.display_name || user.username}</option>
                    ))}
                    <option value="System">System Actions</option> 
                </Select>
                <Select
                    label="Action Type"
                    name="actionType"
                    value={filters.actionType || ''}
                    onChange={handleFilterChange}
                >
                    <option value="">All Actions</option>
                    {Object.values(AuditAction).map(action => (
                        <option key={action} value={action}>{action}</option>
                    ))}
                </Select>
            </div>
            <div className="p-4 text-right">
                <Button onClick={resetFilters} variant="secondary" leftIcon={<ResetIcon className="w-4 h-4"/>}>
                    Reset Filters
                </Button>
            </div>
        </Card>

        <DataGrid
          columns={auditLogColumns}
          data={filteredAuditLogs}
          loading={isLoadingPage}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {Object.values(filters).some(v => v) ? 
                  'No audit logs match your current filter criteria. Try adjusting your filters.' :
                  'System audit logs will appear here as actions are performed.'
                }
              </p>
              {Object.values(filters).some(v => v) && (
                <div className="mt-6">
                  <Button onClick={resetFilters} variant="secondary" leftIcon={<ResetIcon className="w-4 h-4" />}>
                    Reset Filters
                  </Button>
                </div>
              )}
            </div>
          }
          className="mt-4"
        />
         <div className="mt-6 text-center">
            <span className="inline-block bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full">
              Basic filtering implemented. Detailed view for logs coming soon.
            </span>
        </div>
      </Card>
    </div>
  );
};

export default AuditLogPage;
