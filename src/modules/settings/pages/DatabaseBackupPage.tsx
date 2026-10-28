import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { useToast } from '@/hooks/useToast';
import { useAppData } from '@/hooks/useAppData';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { logger } from '@/utils/logging';
import { ArrowDownTrayIcon, ArrowPathIcon, ClockIcon, TrashIcon } from '@/components/ui/icons';

interface BackupRecord {
  id: string;
  filename: string;
  size: string;
  created_at: string;
  record_count?: number;
  type: 'Automatic' | 'Manual' | 'Scheduled';
  status: 'Completed' | 'Failed' | 'In Progress';
  description: string;
  payload_json?: string | null;
}

interface BackupPayload {
  metadata?: {
    totalRecords?: number;
    collectionsCount?: number;
    timestamp?: string;
    version?: string;
  };
  collections?: Record<string, unknown[]>;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DatabaseBackupPage: React.FC = () => {

  const toast = useToast();
  const { backupData, restoreData, refreshData } = useAppData();
  const backupsCollection = useDatabaseCollection<BackupRecord>('backup_records');

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState('');

  // Live backup records (newest first)
  const backups: BackupRecord[] = useMemo(() => {
    return [...backupsCollection.data].sort((a, b) =>
      (b.created_at ?? '').localeCompare(a.created_at ?? '')
    );
  }, [backupsCollection.data]);

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      // Snapshot every collection via the app-level backup pipeline
      const snapshot = await backupData();
      const payloadJson = JSON.stringify(snapshot ?? {});
      const meta = ((snapshot as BackupPayload | null)?.metadata) || {};
      await backupsCollection.insert({
        filename: `schoolpilot_manual_${new Date().toISOString().slice(0, 19).replace(/[:T-]/g, '')}.json`,
        size: formatSize(payloadJson.length),
        record_count: Number(meta.totalRecords ?? 0),
        type: 'Manual',
        status: 'Completed',
        description: 'Manual backup initiated by user',
        payload_json: payloadJson,
        created_at: new Date().toISOString()
      });
      toast.showSuccess('Backup created and stored successfully.');
    } catch (err) {
      logger.error('Failed to create backup:', err);
      toast.showError('Failed to create backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDeleteBackup = async (record: BackupRecord) => {
    try {
      await backupsCollection.remove(record.id);
      toast.showInfo(`Deleted backup: ${record.filename}`);
    } catch (err) {
      logger.error('Failed to delete backup:', err);
      toast.showError('Failed to delete backup.');
    }
  };

  const handleDownloadBackup = (record: BackupRecord) => {
    if (!record.payload_json) {
      toast.showWarning(`Backup ${record.filename} has no stored data to download.`);
      return;
    }
    const blob = new Blob([record.payload_json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = record.filename || `schoolpilot-backup-${record.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.showSuccess(`Downloaded ${record.filename}.`);
  };

  const handleRestoreBackup = async () => {
    const record = backups.find(b => b.id === selectedBackupId);
    if (!record?.payload_json) {
      toast.showWarning('Select a backup with stored data to restore.');
      return;
    }
    setIsRestoring(true);
    try {
      toast.showWarning('Restore initiated. This will replace current data.');
      const snapshot = JSON.parse(record.payload_json) as BackupPayload;
      await restoreData(snapshot);
      await refreshData();
      toast.showSuccess(`Restored from ${record.filename}.`);
      setIsRestoreModalOpen(false);
      setSelectedBackupId('');
    } catch (err) {
      logger.error('Failed to restore backup:', err);
      toast.showError('Failed to restore backup.');
    } finally {
      setIsRestoring(false);
    }
  };

  const completedCount = backups.filter(b => b.status === 'Completed').length;
  const failedCount = backups.filter(b => b.status === 'Failed').length;

  const columns: DataGridColumn<BackupRecord>[] = [
    { key: 'filename', header: 'Filename', width: 300, sortable: true, filterable: true },
    { key: 'size', header: 'Size', width: 100, sortable: true },
    { key: 'created_at', header: 'Created', width: 180, sortable: true, render: (value) => value ? new Date(value).toLocaleString() : '-' },
    { key: 'type', header: 'Type', width: 110, sortable: true, filterable: true, render: (_value, item) => (
      <Badge variant={item.type === 'Scheduled' ? 'info' : item.type === 'Manual' ? 'success' : 'warning'}>{item.type}</Badge>
    )},
    { key: 'status', header: 'Status', width: 110, sortable: true, filterable: true, render: (_value, item) => (
      <Badge variant={item.status === 'Completed' ? 'success' : item.status === 'Failed' ? 'danger' : 'info'}>{item.status}</Badge>
    )},
    { key: 'description', header: 'Description', width: 250, sortable: false },
    { key: 'id', header: 'Actions', width: 160, sortable: false, render: (_value, item) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />} onClick={() => handleDownloadBackup(item)}>Download</Button>
        <Button size="sm" variant="ghost" leftIcon={<TrashIcon className="w-4 h-4" />} onClick={() => void handleDeleteBackup(item)}>Delete</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-3 p-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <ArrowDownTrayIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-foreground">Create Backup</h3>
              <p className="text-sm text-surface-muted-fg">Manual full database backup</p>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => void handleCreateBackup()}
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
              <h3 className="font-semibold text-surface-foreground">Restore Backup</h3>
              <p className="text-sm text-surface-muted-fg">Restore from a previous backup</p>
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
              <h3 className="font-semibold text-surface-foreground">Schedule</h3>
              <p className="text-sm text-surface-muted-fg">Configure auto-backup schedule</p>
              <div className="mt-2 text-xs text-surface-muted-fg">Daily at 02:00 AM</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Backup History */}
      <Card
        title="Backup History"
        info="View and manage database backups"
        actions={
          <div className="flex gap-2">
            <Badge variant="success">{completedCount} Successful</Badge>
            <Badge variant="danger">{failedCount} Failed</Badge>
          </div>
        }
      >
        <DataGrid
          data={backups}
          columns={columns}
          sortable={true}
          filterable={true}
          loading={backupsCollection.loading}
          emptyState={<div className="text-center py-8"><p className="text-surface-muted-fg">No backups found.</p></div>}
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
            <Button variant="danger" onClick={() => void handleRestoreBackup()} disabled={isRestoring}>
              {isRestoring ? 'Restoring...' : 'Restore Selected Backup'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
            <strong>Warning:</strong> Restoring a backup will replace ALL current data with the backup contents.
            This action cannot be undone. We recommend creating a fresh backup before restoring.
          </div>
          <div className="text-sm text-surface-muted-fg">
            Select a backup to restore:
          </div>
          <select
            value={selectedBackupId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedBackupId(e.target.value)}
            className="w-full border border-surface-border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Select a backup...</option>
            {backups.filter(b => b.payload_json).map(backup => (
              <option key={backup.id} value={backup.id}>
                {backup.filename} ({backup.size}, {new Date(backup.created_at).toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
};

export default DatabaseBackupPage;

export const DatabaseBackupContent = DatabaseBackupPage;
