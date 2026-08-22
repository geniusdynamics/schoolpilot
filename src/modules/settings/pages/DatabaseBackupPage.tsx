import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { ArrowDownTrayIcon, ArrowPathIcon, ClockIcon, TrashIcon } from '@/components/ui/icons';

interface BackupRecord {
  id: string;
  filename: string;
  size: string;
  created_at: string;
  type: 'Automatic' | 'Manual' | 'Scheduled';
  status: 'Completed' | 'Failed' | 'In Progress';
  description: string;
}

const sampleBackups: BackupRecord[] = [
  { id: 'bkp-001', filename: 'schoolpilot_full_20260601.sqlite', size: '156 MB', created_at: '2026-06-01 02:00:00', type: 'Scheduled', status: 'Completed', description: 'Daily automated backup' },
  { id: 'bkp-002', filename: 'schoolpilot_full_20260531.sqlite', size: '154 MB', created_at: '2026-05-31 02:00:00', type: 'Scheduled', status: 'Completed', description: 'Daily automated backup' },
  { id: 'bkp-003', filename: 'schoolpilot_pre_migration_20260530.sqlite', size: '152 MB', created_at: '2026-05-30 14:30:00', type: 'Manual', status: 'Completed', description: 'Pre-migration backup' },
  { id: 'bkp-004', filename: 'schoolpilot_full_20260530.sqlite', size: '152 MB', created_at: '2026-05-30 02:00:00', type: 'Scheduled', status: 'Completed', description: 'Daily automated backup' },
  { id: 'bkp-005', filename: 'schoolpilot_full_20260529.sqlite', size: '150 MB', created_at: '2026-05-29 02:00:00', type: 'Scheduled', status: 'Failed', description: 'Disk space insufficient' },
  { id: 'bkp-006', filename: 'schoolpilot_before_update_20260528.sqlite', size: '149 MB', created_at: '2026-05-28 10:00:00', type: 'Manual', status: 'Completed', description: 'Pre-update system backup' },
  { id: 'bkp-007', filename: 'schoolpilot_full_20260528.sqlite', size: '148 MB', created_at: '2026-05-28 02:00:00', type: 'Scheduled', status: 'Completed', description: 'Daily automated backup' },
];

const DatabaseBackupPage: React.FC = () => {

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [backups, setBackups] = useState<BackupRecord[]>(sampleBackups);

  const handleCreateBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      const newBackup: BackupRecord = {
        id: `bkp-${Date.now()}`,
        filename: `schoolpilot_manual_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.sqlite`,
        size: 'Calculating...',
        created_at: new Date().toLocaleString(),
        type: 'Manual',
        status: 'Completed',
        description: 'Manual backup initiated by user',
      };
      setBackups(prev => [newBackup, ...prev]);
      setIsBackingUp(false);
    }, 2000);
  };

  const columns: DataGridColumn<BackupRecord>[] = [
    { key: 'filename', header: 'Filename', width: 300, sortable: true, filterable: true },
    { key: 'size', header: 'Size', width: 100, sortable: true },
    { key: 'created_at', header: 'Created', width: 180, sortable: true, render: (value) => value },
    { key: 'type', header: 'Type', width: 110, sortable: true, filterable: true, render: (value, item) => (
      <Badge variant={item.type === 'Scheduled' ? 'info' : item.type === 'Manual' ? 'success' : 'warning'}>{item.type}</Badge>
    )},
    { key: 'status', header: 'Status', width: 110, sortable: true, filterable: true, render: (value, item) => (
      <Badge variant={item.status === 'Completed' ? 'success' : item.status === 'Failed' ? 'danger' : 'info'}>{item.status}</Badge>
    )},
    { key: 'description', header: 'Description', width: 250, sortable: false },
    { key: 'id', header: 'Actions', width: 120, sortable: false, render: (value, item) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" leftIcon={<DocumentArrowDownIcon className="w-4 h-4" />} onClick={() => alert(`Downloading: ${item.filename}`)}>Download</Button>
        <Button size="sm" variant="ghost" leftIcon={<TrashIcon className="w-4 h-4" />} onClick={() => setBackups(prev => prev.filter(b => b.id !== item.id))}>Delete</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArrowDownTrayIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Create Backup</h3>
              <p className="text-sm text-gray-500">Manual full database backup</p>
              <Button
                size="sm"
                className="mt-2"
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                leftIcon={isBackingUp ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
              >
                {isBackingUp ? 'Backing Up...' : 'Backup Now'}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <ArrowPathIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Restore Backup</h3>
              <p className="text-sm text-gray-500">Restore from a previous backup</p>
              <Button size="sm" className="mt-2" variant="secondary" onClick={() => setIsRestoreModalOpen(true)} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
                Restore
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Schedule</h3>
              <p className="text-sm text-gray-500">Configure auto-backup schedule</p>
              <div className="mt-2 text-xs text-gray-400">Daily at 02:00 AM</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Backup History */}
      <Card
        title="Backup History"
        description="View and manage database backups"
        actions={
          <div className="flex gap-2">
            <Badge variant="success">{backups.filter(b => b.status === 'Completed').length} Successful</Badge>
            <Badge variant="danger">{backups.filter(b => b.status === 'Failed').length} Failed</Badge>
          </div>
        }
      >
        <DataGrid
          data={backups}
          columns={columns}
          sortable={true}
          filterable={true}
          loading={false}
          emptyState={<div className="text-center py-8"><p className="text-gray-500">No backups found.</p></div>}
        />
      </Card>

      {/* Restore Modal */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title="Restore Database Backup"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRestoreModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { alert('Restore initiated. This will replace current data.'); setIsRestoreModalOpen(false); }}>Restore Selected Backup</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
            <strong>Warning:</strong> Restoring a backup will replace ALL current data with the backup contents.
            This action cannot be undone. We recommend creating a fresh backup before restoring.
          </div>
          <div className="text-sm text-gray-600">
            Select a backup to restore from the list above, or upload a backup file.
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <DocumentArrowDownIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Drag and drop a backup file here, or click to browse</p>
            <Button size="sm" variant="secondary" className="mt-2">Browse Files</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DatabaseBackupPage;

export const DatabaseBackupContent = DatabaseBackupPage;
