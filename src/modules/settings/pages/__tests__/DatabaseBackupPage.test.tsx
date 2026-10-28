// ABOUTME: Tests the backup Download action: it writes the stored payload as a file with the
// ABOUTME: backup's name, and refuses a record with no payload instead of pretending to download.
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
  records: [
    {
      id: 'backup-1',
      filename: 'schoolpilot_manual_20261028.json',
      size: '1.2 KB',
      created_at: '2026-10-28T10:00:00.000Z',
      type: 'Manual' as const,
      status: 'Completed' as const,
      description: 'Manual backup',
      payload_json: '{"collections":{}}' as string | null,
    },
  ],
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: mocks.showSuccess,
    showWarning: mocks.showWarning,
    showError: mocks.showError,
    showInfo: mocks.showInfo,
  }),
}));

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    backupData: vi.fn(),
    restoreData: vi.fn(),
    refreshData: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDatabaseCollection', () => ({
  useDatabaseCollection: () => ({
    data: mocks.records,
    loading: false,
    insert: mocks.insert,
    remove: mocks.remove,
  }),
}));

import DatabaseBackupPage from '../DatabaseBackupPage';

describe('DatabaseBackupPage download', () => {
  const createObjectURL = vi.fn((blob: Blob | MediaSource) =>
    blob instanceof Blob ? 'blob:backup' : 'blob:not-a-blob'
  );
  const revokeObjectURL = vi.fn();
  let clicked: HTMLAnchorElement | null = null;

  beforeEach(() => {
    mocks.showSuccess.mockReset();
    mocks.showWarning.mockReset();
    mocks.records[0].payload_json = '{"collections":{}}';
    clicked = null;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- the spy captures the anchor
      clicked = this;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads the stored payload under the backup file name', () => {
    render(<DatabaseBackupPage />);

    fireEvent.click(screen.getByRole('button', { name: /Download/ }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('application/json');
    expect(clicked?.download).toBe('schoolpilot_manual_20261028.json');
    expect(clicked?.href).toBe('blob:backup');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup');
    expect(mocks.showSuccess).toHaveBeenCalledWith(
      'Downloaded schoolpilot_manual_20261028.json.'
    );
  });

  it('refuses a record with no payload rather than downloading an empty file', () => {
    mocks.records[0].payload_json = null;
    render(<DatabaseBackupPage />);

    fireEvent.click(screen.getByRole('button', { name: /Download/ }));

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(mocks.showWarning).toHaveBeenCalledWith(
      'Backup schoolpilot_manual_20261028.json has no stored data to download.'
    );
  });
});
