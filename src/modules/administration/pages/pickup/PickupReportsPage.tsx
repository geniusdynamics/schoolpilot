import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ChartBarIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  TicketIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
} from '@/components/ui/icons';
import { usePickupData } from '../../data/pickup/usePickupData';
import { PickupCodeStatus } from '../../data/pickup/types';
import { useToast } from '@/hooks/useToast';

interface ReportData {
  dateFrom: string;
  dateTo: string;
}

interface DailyActivity {
  date: string;
  pickupCount: number;
  uniqueStudents: number;
  uniquePersons: number;
}

interface PersonActivity {
  personName: string;
  relationship: string;
  pickupCount: number;
  lastPickup: string;
}

interface FlaggedIncident {
  id: string;
  date: string;
  studentName: string;
  personName: string;
  notes: string;
  verifiedBy: string;
}

interface CodeUsage {
  code: string;
  studentName: string;
  status: string;
  generatedAt: string;
  usedAt?: string | null;
}

const PickupReportsPage: React.FC = () => {

  const { pickupCodes, pickupLogs, getTodaysPickupLogs } = usePickupData();
  const { showToast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [reportData, setReportData] = useState<ReportData>({
    dateFrom: thirtyDaysAgo,
    dateTo: today,
  });
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleDateChange = (key: keyof ReportData, value: string) => {
    setReportData(prev => ({ ...prev, [key]: value }));
    setReportGenerated(false);
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    const todayLogs = getTodaysPickupLogs();
    const activeCodes = pickupCodes.filter(c => c.status === PickupCodeStatus.ACTIVE).length;
    const totalCodes = pickupCodes.length;
    const totalPickups = pickupLogs.length;
    const flaggedCount = pickupLogs.filter(l =>
      l.notes?.toLowerCase().includes('flag') ||
      l.notes?.toLowerCase().includes('issue') ||
      l.notes?.toLowerCase().includes('unauthorized')
    ).length;

    return {
      totalPickups,
      activeCodes,
      totalCodes,
      flaggedCount,
      todayPickups: todayLogs.length,
    };
  }, [pickupLogs, pickupCodes, getTodaysPickupLogs]);

  // Daily activity report
  const dailyActivity: DailyActivity[] = useMemo(() => {
    const dateMap = new Map<string, { count: number; students: Set<string>; persons: Set<string> }>();

    pickupLogs.forEach(log => {
      const date = log.pickupDate;
      if (date >= reportData.dateFrom && date <= reportData.dateTo) {
        if (!dateMap.has(date)) {
          dateMap.set(date, { count: 0, students: new Set(), persons: new Set() });
        }
        const entry = dateMap.get(date)!;
        entry.count++;
        entry.students.add(log.studentId);
        entry.persons.add(log.authorizedPersonId);
      }
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        pickupCount: data.count,
        uniqueStudents: data.students.size,
        uniquePersons: data.persons.size,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [pickupLogs, reportData]);

  // Most active persons report
  const mostActivePersons: PersonActivity[] = useMemo(() => {
    const personMap = new Map<string, { count: number; relationship: string; lastPickup: string }>();

    pickupLogs.forEach(log => {
      if (log.pickupDate >= reportData.dateFrom && log.pickupDate <= reportData.dateTo) {
        if (!personMap.has(log.authorizedPersonId)) {
          personMap.set(log.authorizedPersonId, {
            count: 0,
            relationship: log.relationship,
            lastPickup: log.pickupTime,
          });
        }
        const entry = personMap.get(log.authorizedPersonId)!;
        entry.count++;
        if (new Date(log.pickupTime) > new Date(entry.lastPickup)) {
          entry.lastPickup = log.pickupTime;
        }
      }
    });

    return Array.from(personMap.entries())
      .map(([id, data]) => ({
        personName: pickupLogs.find(l => l.authorizedPersonId === id)?.authorizedPersonName || 'Unknown',
        relationship: data.relationship,
        pickupCount: data.count,
        lastPickup: data.lastPickup,
      }))
      .sort((a, b) => b.pickupCount - a.pickupCount)
      .slice(0, 20);
  }, [pickupLogs, reportData]);

  // Flagged incidents report
  const flaggedIncidents: FlaggedIncident[] = useMemo(() => {
    return pickupLogs
      .filter(log =>
        log.notes?.toLowerCase().includes('flag') ||
        log.notes?.toLowerCase().includes('issue') ||
        log.notes?.toLowerCase().includes('unauthorized')
      )
      .filter(log => log.pickupDate >= reportData.dateFrom && log.pickupDate <= reportData.dateTo)
      .map(log => ({
        id: log.id,
        date: log.pickupDate,
        studentName: log.studentName || 'N/A',
        personName: log.authorizedPersonName,
        notes: log.notes || 'No notes',
        verifiedBy: log.verifiedByName || 'N/A',
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [pickupLogs, reportData]);

  // Code usage summary
  const codeUsageSummary: CodeUsage[] = useMemo(() => {
    return pickupCodes
      .map(code => ({
        code: code.code,
        studentName: code.studentName || 'N/A',
        status: String(code.status),
        generatedAt: code.generatedAt,
        usedAt: code.usedAt,
      }))
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, 50);
  }, [pickupCodes]);

  const handleGenerateReport = () => {
    setGenerating(true);
    // Simulate report generation
    setTimeout(() => {
      setReportGenerated(true);
      setGenerating(false);
      showToast({
        variant: 'success',
        message: 'Report generated successfully.',
        title: 'Report Ready',
      });
    }, 500);
  };

  // Column definitions
  const dailyColumns: DataGridColumn<DailyActivity>[] = [
    { key: 'date', header: 'Date', sortable: true, render: (v) => new Date(v).toLocaleDateString() },
    { key: 'pickupCount', header: 'Pickups', sortable: true },
    { key: 'uniqueStudents', header: 'Students', sortable: true },
    { key: 'uniquePersons', header: 'Persons', sortable: true },
  ];

  const personColumns: DataGridColumn<PersonActivity>[] = [
    { key: 'personName', header: 'Person', sortable: true },
    { key: 'relationship', header: 'Relationship', sortable: true },
    { key: 'pickupCount', header: 'Pickup Count', sortable: true },
    { key: 'lastPickup', header: 'Last Pickup', sortable: true, render: (v) => new Date(v).toLocaleString() },
  ];

  const flaggedColumns: DataGridColumn<FlaggedIncident>[] = [
    { key: 'date', header: 'Date', sortable: true, render: (v) => new Date(v).toLocaleDateString() },
    { key: 'studentName', header: 'Student', sortable: true },
    { key: 'personName', header: 'Person', sortable: true },
    { key: 'notes', header: 'Notes', render: (v) => <span className="text-red-600">{v}</span> },
    { key: 'verifiedBy', header: 'Verified By', sortable: true },
  ];

  const codeUsageColumns: DataGridColumn<CodeUsage>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (v) => <span className="font-mono text-sm font-semibold">{v}</span>,
    },
    { key: 'studentName', header: 'Student', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (v: string) => {
        const colors: Record<string, string> = {
          ACTIVE: 'bg-emerald-100 text-emerald-800',
          EXPIRED: 'bg-surface-accent text-surface-foreground',
          USED: 'bg-primary-100 text-primary-800',
          REVOKED: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[v] || 'bg-surface-accent'}`}>
            {v}
          </span>
        );
      },
    },
    { key: 'generatedAt', header: 'Generated', sortable: true, render: (v) => new Date(v).toLocaleString() },
    { key: 'usedAt', header: 'Used At', sortable: true, render: (v) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <div className="space-y-6">
      {/* Report Configuration Card */}
      <Card
        title="Pickup Reports"
        
        actions={
          <Button
            variant="primary"
            onClick={handleGenerateReport}
            loading={generating}
            leftIcon={<DocumentTextIcon className="w-5 h-5" />}
          >
            Generate Report
          </Button>
        }
      >
        <div className="p-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-surface-foreground mb-1">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Date From
              </label>
              <Input label="Input"
                type="date"
                value={reportData.dateFrom}
                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-foreground mb-1">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Date To
              </label>
              <Input label="Input"
                type="date"
                value={reportData.dateTo}
                onChange={(e) => handleDateChange('dateTo', e.target.value)}
              />
            </div>
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  setReportData({ dateFrom: thirtyDaysAgo, dateTo: today });
                  setReportGenerated(false);
                }}
              >
                Last 30 Days
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-surface-foreground mb-4">Summary Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <TicketIcon className="w-6 h-6 text-primary-700 mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary-700">{summaryStats.activeCodes}</p>
              <p className="text-xs text-primary-600">Active Codes</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <ChartBarIcon className="w-6 h-6 text-emerald-700 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-700">{summaryStats.totalPickups}</p>
              <p className="text-xs text-emerald-600">Total Pickups</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <UsersIcon className="w-6 h-6 text-amber-700 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-700">{summaryStats.todayPickups}</p>
              <p className="text-xs text-amber-600">Today</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <TicketIcon className="w-6 h-6 text-purple-700 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-700">{summaryStats.totalCodes}</p>
              <p className="text-xs text-purple-600">Total Codes</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-700 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-700">{summaryStats.flaggedCount}</p>
              <p className="text-xs text-red-600">Flagged</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Results */}
      {reportGenerated && (
        <div className="space-y-6">
          {/* Daily Activity */}
          <Card title="Pickup Activity by Day">
            <DataGrid
              columns={dailyColumns}
              data={dailyActivity}
              sortable
              filterable={false}
              emptyState={
                <div className="text-center py-8 text-surface-muted-fg">
                  No pickup activity in the selected date range.
                </div>
              }
            />
          </Card>

          {/* Most Active Persons */}
          <Card title="Most Active Pickup Persons">
            <DataGrid
              columns={personColumns}
              data={mostActivePersons}
              sortable
              filterable={false}
              emptyState={
                <div className="text-center py-8 text-surface-muted-fg">
                  No pickup person data in the selected date range.
                </div>
              }
            />
          </Card>

          {/* Flagged Incidents */}
          <Card
            title="Flagged Incidents"
            actions={
              flaggedIncidents.length > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                  {flaggedIncidents.length} incident{flaggedIncidents.length !== 1 ? 's' : ''}
                </span>
              )
            }
          >
            <DataGrid
              columns={flaggedColumns}
              data={flaggedIncidents}
              sortable
              filterable={false}
              className={flaggedIncidents.length > 0 ? '' : ''}
              emptyState={
                <div className="text-center py-8 text-surface-muted-fg">
                  <CheckCircleIcon className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  No flagged incidents in the selected date range.
                </div>
              }
            />
          </Card>

          {/* Code Usage Summary */}
          <Card title="Code Usage Summary">
            <DataGrid
              columns={codeUsageColumns}
              data={codeUsageSummary}
              sortable
              filterable={false}
              emptyState={
                <div className="text-center py-8 text-surface-muted-fg">
                  No pickup codes have been generated yet.
                </div>
              }
            />
          </Card>
        </div>
      )}

      {/* Placeholder when report not generated */}
      {!reportGenerated && !generating && (
        <Card>
          <div className="text-center py-16">
            <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-surface-foreground">
              Report generation coming soon
            </h3>
            <p className="mt-2 text-sm text-surface-muted-fg max-w-sm mx-auto">
              Select your date range and click &quot;Generate Report&quot; to view detailed pickup statistics and activity reports.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PickupReportsPage;
