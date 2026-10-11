// ABOUTME: Student Promotion (SO-16): move a class stream's learners to the next class as preview -> confirm -> commit, with undo
// ABOUTME: Rendered at /administration/students/promotion and as the "Promotion" tab of Student Bulk Operations

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useAppData } from '@/hooks/useAppData';
import { logger } from '@/utils/logging';
import {
  useStudentPromotion,
  previewPromotion,
  type PromotionPreviewRow,
  type PromotionRun,
  type PromotionStudentLike,
} from '../hooks/useStudentPromotion';
import { AcademicCapIcon, ArrowUpIcon, ArrowPathIcon, CheckCircleIcon } from '@/components/ui/icons';

interface NamedRecord {
  id: string | number;
  name?: string | null;
  class_name?: string | null;
  class_id?: string | number | null;
}

const selectClassName =
  'w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

const today = () => new Date().toISOString().split('T')[0];

export const StudentPromotionContent: React.FC = () => {
  const { t } = useTranslation('administration');
  const toast = useToast();
  const confirm = useConfirm();
  const appData = useAppData();
  const { ready, commit, undo } = useStudentPromotion();

  const students = useMemo(() => (appData.students || []) as PromotionStudentLike[], [appData.students]);
  const classes = useMemo(() => (appData.classes || []) as NamedRecord[], [appData.classes]);
  const classStreams = useMemo(() => (appData.classStreams || []) as NamedRecord[], [appData.classStreams]);
  const academicYears = useMemo(() => (appData.academicYears || []) as NamedRecord[], [appData.academicYears]);

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [promotionDate, setPromotionDate] = useState(today());
  const [preview, setPreview] = useState<PromotionPreviewRow[] | null>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastRun, setLastRun] = useState<PromotionRun | null>(null);

  const effectiveYearId = academicYearId || (academicYears[0] ? String(academicYears[0].id) : '');

  const streamLabel = useCallback(
    (id: string | null) => {
      if (!id) return t('promotion.unassigned', 'Not assigned');
      const stream = classStreams.find(s => String(s.id) === id);
      if (!stream) return id;
      const cls = classes.find(c => String(c.id) === String(stream.class_id ?? ''));
      const className = cls?.name || stream.class_name || '';
      return className ? `${className} · ${stream.name ?? ''}` : String(stream.name ?? id);
    },
    [classStreams, classes, t]
  );

  const sortedStreams = useMemo(
    () => [...classStreams].sort((a, b) => streamLabel(String(a.id)).localeCompare(streamLabel(String(b.id)))),
    [classStreams, streamLabel]
  );

  const resetPreview = () => {
    setPreview(null);
    setExcluded([]);
  };

  const handlePreview = () => {
    if (!sourceId || !targetId) {
      toast.showWarning(t('promotion.chooseClasses', 'Choose the current class and the class to promote to.'));
      return;
    }
    setPreview(previewPromotion(students, sourceId, targetId));
    setExcluded([]);
  };

  const selectedRows = useMemo(
    () => (preview || []).filter(r => r.eligible && !excluded.includes(r.studentId)),
    [preview, excluded]
  );

  const handleCommit = async () => {
    if (selectedRows.length === 0) return;
    const ok = await confirm({
      title: t('promotion.confirmTitle', 'Confirm promotion'),
      message: t('promotion.confirmMessage', {
        defaultValue: 'Move {{count}} learners from {{from}} to {{to}}? You can undo this afterwards.',
        count: selectedRows.length,
        from: streamLabel(sourceId),
        to: streamLabel(targetId),
      }),
      confirmLabel: t('promotion.commit', 'Promote'),
      variant: 'warning',
    });
    if (!ok) return;

    setBusy(true);
    try {
      const run = await commit(selectedRows, { academicYearId: effectiveYearId, promotionDate });
      setLastRun(run);
      resetPreview();
      if (run.failures.length > 0) {
        toast.showWarning(t('promotion.partial', {
          defaultValue: '{{done}} learners promoted, {{failed}} could not be promoted.',
          done: run.entries.length,
          failed: run.failures.length,
        }));
      } else {
        toast.showSuccess(t('promotion.done', { defaultValue: '{{count}} learners promoted.', count: run.entries.length }));
      }
    } catch (error) {
      logger.error('[StudentPromotion] Commit failed:', error);
      toast.showError(t('promotion.failed', 'Promotion failed.'));
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!lastRun) return;
    setBusy(true);
    try {
      const result = await undo(lastRun);
      setLastRun(null);
      if (result.failures.length > 0) {
        toast.showWarning(t('promotion.undoPartial', {
          defaultValue: '{{done}} learners restored, {{failed}} were moved since and were left as they are.',
          done: result.restored,
          failed: result.failures.length,
        }));
      } else {
        toast.showSuccess(t('promotion.undone', { defaultValue: '{{count}} learners returned to their previous class.', count: result.restored }));
      }
    } catch (error) {
      logger.error('[StudentPromotion] Undo failed:', error);
      toast.showError(t('promotion.undoFailed', 'Undo failed.'));
    } finally {
      setBusy(false);
    }
  };

  if (appData.loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[200px]">
        <Spinner />
      </div>
    );
  }

  return (
    <Card>
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-surface-foreground flex items-center gap-2">
          <AcademicCapIcon className="w-5 h-5" />
          {t('promotion.title', 'Promote a class')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="promotion-source" className="block text-sm font-medium text-surface-foreground mb-1">
              {t('promotion.source', 'Current class')}
            </label>
            <select id="promotion-source" className={selectClassName} value={sourceId}
              onChange={e => { setSourceId(e.target.value); resetPreview(); }}>
              <option value="">{t('promotion.selectClass', '-- Select a class --')}</option>
              {sortedStreams.map(s => (
                <option key={String(s.id)} value={String(s.id)}>{streamLabel(String(s.id))}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="promotion-target" className="block text-sm font-medium text-surface-foreground mb-1">
              {t('promotion.target', 'Promote to')}
            </label>
            <select id="promotion-target" className={selectClassName} value={targetId}
              onChange={e => { setTargetId(e.target.value); resetPreview(); }}>
              <option value="">{t('promotion.selectClass', '-- Select a class --')}</option>
              {sortedStreams.filter(s => String(s.id) !== sourceId).map(s => (
                <option key={String(s.id)} value={String(s.id)}>{streamLabel(String(s.id))}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="promotion-year" className="block text-sm font-medium text-surface-foreground mb-1">
              {t('promotion.academicYear', 'Academic year')}
            </label>
            <select id="promotion-year" className={selectClassName} value={effectiveYearId}
              onChange={e => setAcademicYearId(e.target.value)}>
              {academicYears.map(y => (
                <option key={String(y.id)} value={String(y.id)}>{y.name || String(y.id)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="promotion-date" className="block text-sm font-medium text-surface-foreground mb-1">
              {t('promotion.date', 'Promotion date')}
            </label>
            <Input id="promotion-date" type="date" value={promotionDate} onChange={e => setPromotionDate(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handlePreview} disabled={!sourceId || !targetId}>
            {t('promotion.preview', 'Preview')}
          </Button>
        </div>

        {preview && (
          <div className="space-y-3">
            {preview.length === 0 ? (
              <p className="text-surface-muted-fg italic">{t('promotion.empty', 'No learners are in this class.')}</p>
            ) : (
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-surface-border">
                  <thead className="bg-surface-muted sticky top-0">
                    <tr className="text-left text-xs font-medium text-surface-muted-fg uppercase">
                      <th className="px-4 py-2"><span className="sr-only">{t('promotion.include', 'Include')}</span></th>
                      <th className="px-4 py-2">{t('promotion.learner', 'Learner')}</th>
                      <th className="px-4 py-2">{t('promotion.from', 'From')}</th>
                      <th className="px-4 py-2">{t('promotion.to', 'To')}</th>
                      <th className="px-4 py-2">{t('promotion.note', 'Note')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-card divide-y divide-surface-border text-sm text-surface-foreground">
                    {preview.map(row => (
                      <tr key={row.studentId}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            aria-label={row.studentName}
                            disabled={!row.eligible}
                            checked={row.eligible && !excluded.includes(row.studentId)}
                            onChange={() => setExcluded(prev => prev.includes(row.studentId)
                              ? prev.filter(id => id !== row.studentId)
                              : [...prev, row.studentId])}
                          />
                        </td>
                        <td className="px-4 py-2">{row.admissionNo ? `${row.admissionNo} · ` : ''}{row.studentName}</td>
                        <td className="px-4 py-2">{streamLabel(row.fromClassStreamId)}</td>
                        <td className="px-4 py-2">{streamLabel(row.toClassStreamId)}</td>
                        <td className="px-4 py-2 text-surface-muted-fg">{row.reason || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                onClick={handleCommit}
                disabled={!ready || busy || selectedRows.length === 0}
                isLoading={busy}
                leftIcon={<ArrowUpIcon className="w-4 h-4" />}
              >
                {t('promotion.commitCount', { defaultValue: 'Promote {{count}} learners', count: selectedRows.length })}
              </Button>
            </div>
          </div>
        )}

        {lastRun && lastRun.entries.length > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-surface-muted" role="status">
            <span className="flex items-center gap-2 text-sm text-surface-foreground">
              <CheckCircleIcon className="w-5 h-5" />
              {t('promotion.committed', {
                defaultValue: '{{count}} learners moved to {{to}}.',
                count: lastRun.entries.length,
                to: streamLabel(lastRun.entries[0].newClassStreamId),
              })}
            </span>
            <Button variant="outline" onClick={handleUndo} disabled={busy} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
              {t('promotion.undo', 'Undo')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

const StudentPromotionPage: React.FC = () => (
  <div className="p-6">
    <StudentPromotionContent />
  </div>
);

export default StudentPromotionPage;
