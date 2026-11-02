// ABOUTME: Settings → System → Backup: downloads the school's two SQLite databases as one archive
// ABOUTME: (encrypted by default in production) and restores one from a file into this browser.

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { ArrowDownTrayIcon, ArrowPathIcon, TrashIcon } from '@/components/ui/icons';
import {
  applyRestore,
  BackupArchiveError,
  BackupRestoreError,
  createBackup,
  isEncryptedBackup,
  MIN_PASSPHRASE_LENGTH,
  prepareRestore,
  runAsOnlyTab,
  type BackupManifest,
  type PreparedRestore,
} from '@/data/backup';
import {
  browserBackupEnvironment,
  currentDataMode,
  downloadBytes,
  reloadApp,
} from '@/data/backup/browserEnvironment';
import { opfsSafetyCopies, type SafetyCopy } from '@/data/backup/safetyStore';
import { rememberRestoreNotice } from '@/data/backup/restoreNotice';
import { showRestoreRecoveryScreen } from '@/components/RestoreRecoveryScreen';
import { useToast } from '@/hooks/useToast';
import { authService } from '@/services/auth/authService';
import { logger } from '@/utils/logging';

/** Where the page remembers the last download, so it can say how old the newest backup is. */
const LAST_DOWNLOAD_KEY = 'schoolpilot.backup.lastDownload';

interface LastDownload {
  readonly fileName: string;
  readonly at: string;
  readonly bytes: number;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function readLastDownload(): LastDownload | null {
  try {
    const stored = localStorage.getItem(LAST_DOWNLOAD_KEY);
    return stored ? (JSON.parse(stored) as LastDownload) : null;
  } catch {
    return null;
  }
}

/** The summary of an archive a person checks before replacing anything with it. */
const ManifestSummary: React.FC<{ manifest: BackupManifest }> = ({ manifest }) => {
  const { t } = useTranslation('settings');
  const canonical = manifest.files.find((file) => file.role === 'canonical');
  const legacy = manifest.files.find((file) => file.role === 'legacy');
  const rows: [string, React.ReactNode][] = [
    [t('browserBackup.summary.school'), manifest.institutionName ?? t('browserBackup.summary.unnamed')],
    [t('browserBackup.summary.created'), new Date(manifest.createdAt).toLocaleString()],
    [t('browserBackup.summary.appVersion'), manifest.appVersion],
    [t('browserBackup.summary.dataMode'), manifest.dataMode],
    [
      t('browserBackup.summary.encryption'),
      manifest.encryption === 'none' ? t('browserBackup.summary.notEncrypted') : manifest.encryption,
    ],
    [t('browserBackup.summary.learners'), String(canonical?.rowCounts.learner ?? 0)],
    [t('browserBackup.summary.users'), String(legacy?.rowCounts.users ?? 0)],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" data-testid="backup-summary">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-surface-muted-fg">{label}</dt>
          <dd className="text-surface-foreground">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
};

const DownloadSection: React.FC<{ onDownloaded: (download: LastDownload) => void }> = ({ onDownloaded }) => {
  const { t } = useTranslation('settings');
  const toast = useToast();
  const [encrypt, setEncrypt] = useState(() => currentDataMode() === 'production');
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const passphraseProblem = !encrypt
    ? null
    : passphrase.length < MIN_PASSPHRASE_LENGTH
      ? t('browserBackup.download.passphraseTooShort', { count: MIN_PASSPHRASE_LENGTH })
      : passphrase !== confirmation
        ? t('browserBackup.download.passphraseMismatch')
        : null;

  const handleDownload = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const environment = await browserBackupEnvironment();
      const backup = await createBackup(environment, encrypt ? { passphrase } : {});
      downloadBytes(backup.fileName, backup.bytes, encrypt ? 'application/octet-stream' : 'application/zip');
      const download = { fileName: backup.fileName, at: backup.manifest.createdAt, bytes: backup.bytes.byteLength };
      localStorage.setItem(LAST_DOWNLOAD_KEY, JSON.stringify(download));
      onDownloaded(download);
      setPassphrase('');
      setConfirmation('');
      toast.showSuccess(t('browserBackup.download.done', { fileName: backup.fileName }));
    } catch (error) {
      logger.error('Backup failed:', error);
      setFailure(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={t('browserBackup.download.title')} subtitle={t('browserBackup.download.subtitle')}>
      <div className="space-y-4">
        <Checkbox checked={encrypt} onChange={setEncrypt} data-testid="backup-encrypt">
          {t('browserBackup.download.encrypt')}
        </Checkbox>
        {encrypt ? (
          <>
            <Alert variant="warning" title={t('browserBackup.download.passphraseWarningTitle')}>
              {t('browserBackup.download.passphraseWarning')}
            </Alert>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="password"
                autoComplete="new-password"
                label={t('browserBackup.download.passphrase')}
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                data-testid="backup-passphrase"
              />
              <Input
                type="password"
                autoComplete="new-password"
                label={t('browserBackup.download.passphraseConfirm')}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                data-testid="backup-passphrase-confirm"
              />
            </div>
            {passphrase.length > 0 && passphraseProblem ? (
              <p className="text-sm text-red-600 dark:text-red-400">{passphraseProblem}</p>
            ) : null}
          </>
        ) : (
          <Alert variant="warning">{t('browserBackup.download.unencryptedWarning')}</Alert>
        )}
        {failure ? (
          <Alert variant="destructive" title={t('browserBackup.download.failed')}>
            {failure}
          </Alert>
        ) : null}
        <Button
          onClick={() => void handleDownload()}
          disabled={busy || passphraseProblem !== null}
          leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
        >
          {t('browserBackup.download.action')}
        </Button>
      </div>

      {/* Blocks the page while both databases are exported, so no write lands between the two. */}
      <Modal
        isOpen={busy}
        onClose={() => undefined}
        title={t('browserBackup.download.progressTitle')}
        size="sm"
        preventClose
        showCloseButton={false}
        closeOnBackdrop={false}
        closeOnEscape={false}
      >
        <p className="text-sm text-surface-muted-fg" role="status">
          {t('browserBackup.download.progress')}
        </p>
      </Modal>
    </Card>
  );
};

type RestoreStage = 'idle' | 'checking' | 'ready' | 'restoring' | 'restored' | 'blocked';

const RestoreSection: React.FC<{ onSafetyCopySaved: () => void }> = ({ onSafetyCopySaved }) => {
  const { t } = useTranslation('settings');
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [stage, setStage] = useState<RestoreStage>('idle');
  const [prepared, setPrepared] = useState<PreparedRestore | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);

  const encrypted = file !== null && isEncryptedBackup(file.bytes);

  const handleFile = async (chosen: File | undefined) => {
    setPrepared(null);
    setFailure(null);
    setStage('idle');
    setPassphrase('');
    setFile(chosen ? { name: chosen.name, bytes: new Uint8Array(await chosen.arrayBuffer()) } : null);
  };

  const handleCheck = async () => {
    if (!file) return;
    setStage('checking');
    setFailure(null);
    try {
      const environment = await browserBackupEnvironment();
      setPrepared(await prepareRestore(environment, file.bytes, encrypted ? passphrase : undefined));
      setStage('ready');
    } catch (error) {
      logger.error('Backup check failed:', error);
      setFailure(
        error instanceof BackupArchiveError && error.code === 'passphrase_required'
          ? t('browserBackup.restore.passphraseRequired')
          : errorText(error)
      );
      setStage('idle');
    }
  };

  const handleRestore = async () => {
    if (!prepared) return;
    setConfirmOpen(false);
    setStage('restoring');
    setFailure(null);
    try {
      const environment = await browserBackupEnvironment();
      await runAsOnlyTab(() => applyRestore(environment, prepared));
      onSafetyCopySaved();
      // The message belongs to the reloaded app: this page's session belongs to the data that was
      // just replaced, so it signs out and reloads at once rather than letting the old state write.
      rememberRestoreNotice({
        kind: 'restored',
        school: prepared.manifest.institutionName ?? null,
      });
      await authService.logout();
      reloadApp();
    } catch (error) {
      logger.error('Restore failed:', error);
      onSafetyCopySaved();
      if (error instanceof BackupRestoreError && !error.rolledBack) {
        // The previous data could not be put back: stop the app, offering the intact safety copy.
        setStage('blocked');
        showRestoreRecoveryScreen({
          reason: 'rollbackFailed',
          safetyCopy: error.safetyCopy,
          error: error.message,
        });
        return;
      }
      if (error instanceof BackupRestoreError) {
        // The previous data is back in place, but an import has locked writes in this tab: reload.
        rememberRestoreNotice({ kind: 'rolledBack', message: error.message });
        reloadApp();
        return;
      }
      // Nothing was replaced (the file was refused, or the copy could not be saved): stay here.
      setFailure(errorText(error));
      setStage('ready');
    }
  };

  return (
    <Card title={t('browserBackup.restore.title')} subtitle={t('browserBackup.restore.subtitle')}>
      <div className="space-y-4">
        <label className="block text-sm font-medium text-surface-foreground">
          {t('browserBackup.restore.file')}
          <input
            type="file"
            accept=".zip,.spbackup"
            className="mt-1 block w-full text-sm"
            data-testid="restore-file"
            disabled={stage === 'checking' || stage === 'restoring' || stage === 'restored' || stage === 'blocked'}
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </label>
        {encrypted ? (
          <Input
            type="password"
            autoComplete="off"
            label={t('browserBackup.restore.passphrase')}
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            data-testid="restore-passphrase"
          />
        ) : null}
        {file && stage !== 'ready' && stage !== 'restored' ? (
          <Button
            variant="secondary"
            onClick={() => void handleCheck()}
            disabled={stage === 'checking' || (encrypted && passphrase.length === 0)}
            leftIcon={<ArrowPathIcon className={`w-4 h-4 ${stage === 'checking' ? 'animate-spin' : ''}`} />}
          >
            {stage === 'checking' ? t('browserBackup.restore.checking') : t('browserBackup.restore.check')}
          </Button>
        ) : null}
        {failure ? (
          <Alert variant="destructive" title={t('browserBackup.restore.failed')}>
            <span data-testid="restore-error">{failure}</span>
          </Alert>
        ) : null}
        {prepared && stage !== 'restored' && stage !== 'blocked' ? (
          <div className="space-y-3">
            <Alert variant="success" title={t('browserBackup.restore.valid')}>
              <ManifestSummary manifest={prepared.manifest} />
            </Alert>
            <Button
              variant="danger"
              onClick={() => {
                setUnderstood(false);
                setConfirmOpen(true);
              }}
              disabled={stage === 'restoring'}
            >
              {stage === 'restoring' ? t('browserBackup.restore.restoring') : t('browserBackup.restore.action')}
            </Button>
          </div>
        ) : null}
        {stage === 'restored' ? (
          <Alert variant="success" title={t('browserBackup.restore.doneTitle')}>
            <span role="status">{t('browserBackup.restore.done')}</span>
          </Alert>
        ) : null}
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('browserBackup.restore.confirmTitle')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {t('browserBackup.restore.cancel')}
            </Button>
            <Button variant="danger" disabled={!understood} onClick={() => void handleRestore()}>
              {t('browserBackup.restore.confirmAction')}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p>
            {t('browserBackup.restore.confirmBody', {
              school: prepared?.manifest.institutionName ?? t('browserBackup.summary.unnamed'),
            })}
          </p>
          <p className="text-surface-muted-fg">{t('browserBackup.restore.confirmSafety')}</p>
          <Checkbox checked={understood} onChange={setUnderstood} data-testid="restore-understood">
            {t('browserBackup.restore.confirmCheckbox')}
          </Checkbox>
        </div>
      </Modal>
    </Card>
  );
};

const SafetyCopiesSection: React.FC<{ copies: SafetyCopy[]; onChanged: () => void }> = ({ copies, onChanged }) => {
  const { t } = useTranslation('settings');
  const toast = useToast();

  const handleDownload = async (copy: SafetyCopy) => {
    try {
      downloadBytes(copy.name, await opfsSafetyCopies.read(copy.name), 'application/zip');
    } catch (error) {
      toast.showError(errorText(error));
    }
  };

  const handleDelete = async (copy: SafetyCopy) => {
    try {
      await opfsSafetyCopies.remove(copy.name);
      onChanged();
    } catch (error) {
      toast.showError(errorText(error));
    }
  };

  return (
    <Card title={t('browserBackup.safety.title')} subtitle={t('browserBackup.safety.subtitle')}>
      {copies.length === 0 ? (
        <p className="text-sm text-surface-muted-fg">{t('browserBackup.safety.empty')}</p>
      ) : (
        <ul className="divide-y divide-surface-border">
          {copies.map((copy) => (
            <li key={copy.name} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                {copy.name}
                <span className="ml-2 text-surface-muted-fg">
                  {formatSize(copy.bytes)} · {new Date(copy.modified).toLocaleString()}
                </span>
              </span>
              <span className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                  onClick={() => void handleDownload(copy)}
                >
                  {t('browserBackup.safety.download')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<TrashIcon className="w-4 h-4" />}
                  onClick={() => void handleDelete(copy)}
                >
                  {t('browserBackup.safety.delete')}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

const DatabaseBackupPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const [lastDownload, setLastDownload] = useState<LastDownload | null>(readLastDownload);
  const [copies, setCopies] = useState<SafetyCopy[]>([]);

  const refreshCopies = useCallback(() => {
    opfsSafetyCopies
      .list()
      .then(setCopies)
      .catch((error: unknown) => logger.warn('Safety copies could not be listed:', error));
  }, []);

  useEffect(() => {
    refreshCopies();
  }, [refreshCopies]);

  return (
    <div className="space-y-3 p-6">
      <Alert variant="warning" title={t('browserBackup.intro.title')}>
        {t('browserBackup.intro.body')}
      </Alert>
      <div className="flex flex-wrap items-center gap-2 text-sm text-surface-muted-fg">
        {lastDownload ? (
          <>
            <Badge variant="success">{t('browserBackup.lastDownload.label')}</Badge>
            <span>
              {t('browserBackup.lastDownload.value', {
                fileName: lastDownload.fileName,
                date: new Date(lastDownload.at).toLocaleString(),
                size: formatSize(lastDownload.bytes),
              })}
            </span>
          </>
        ) : (
          <Badge variant="warning">{t('browserBackup.lastDownload.never')}</Badge>
        )}
      </div>
      <DownloadSection onDownloaded={setLastDownload} />
      <RestoreSection onSafetyCopySaved={refreshCopies} />
      <SafetyCopiesSection copies={copies} onChanged={refreshCopies} />
    </div>
  );
};

export default DatabaseBackupPage;

export const DatabaseBackupContent = DatabaseBackupPage;
