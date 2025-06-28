
import React, { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import { ClockIcon, ArrowPathIcon as ResetIcon, MagnifyingGlassIcon } from '../../components/ui/icons'; // Added ResetIcon
import { useAppData } from '../../contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';
import { AuditLog, AuditAction, User } from '../../types';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

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
    return auditLogs.filter(log => {
      const logDate = new Date(log.changed_at);
      const startDateMatch = !filters.startDate || logDate >= new Date(filters.startDate);
      const endDateMatch = !filters.endDate || logDate <= new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)); // Include whole end day
      const userMatch = !filters.userId || log.user_id === filters.userId;
      const actionMatch = !filters.actionType || log.action === filters.actionType;
      return startDateMatch && endDateMatch && userMatch && actionMatch;
    }).sort((a,b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  }, [auditLogs, filters]);

  const auditLogColumns = [
    { header: 'Timestamp', accessor: 'changed_at' as keyof AuditLog, render: (item: AuditLog) => new Date(item.changed_at).toLocaleString() },
    { header: 'User', accessor: 'user_name' as keyof AuditLog, render: (item: AuditLog) => item.user_name || item.user_id || 'System' },
    { header: 'Action', accessor: 'action' as keyof AuditLog },
    { header: 'Entity', accessor: 'table_name' as keyof AuditLog },
    { header: 'Record ID', accessor: 'record_pk' as keyof AuditLog },
    // Old/New data might be too complex for a simple table column, consider a detail view
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
                    {users.map((user: User) => (
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

        {isLoadingPage ? (
          <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">Loading audit logs...</span></div>
        ) : filteredAuditLogs.length > 0 ? (
          <Table columns={auditLogColumns} data={filteredAuditLogs} isLoading={loading.auditLogs} />
        ) : (
            <p className="text-center text-gray-500 py-4">No audit logs found matching your criteria.</p>
        )}
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
