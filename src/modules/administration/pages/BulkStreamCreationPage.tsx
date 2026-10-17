// ABOUTME: Bulk Stream Creation page: adds several streams to one real class, skipping names that already exist.
// ABOUTME: Also hosts the corrupt-stream repair panel (SO-06), which reassigns students before deleting bad streams.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { PlusIcon, XMarkIcon, CheckCircleIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/utils/logging';
import {
  applyCorruptStreamRepair,
  planCorruptStreamRepair,
  type StreamRecord,
  type StudentStreamRecord,
} from '@/domain/repair/repairCorruptStreams';

interface ClassOption {
  id: string;
  name?: string | null;
  class_name?: string | null;
}

const normaliseName = (name: string) => name.trim().toLowerCase();

const selectClassName =
  'w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

const BulkStreamCreationPage: React.FC = () => {
  const { t } = useTranslation(['administration', 'common']);
  const appData = useAppData();
  const { addClassStream, updateStudent, deleteClassStream } = appData;
  const classes = useMemo(() => (appData.classes || []) as ClassOption[], [appData.classes]);
  const classStreams = useMemo(() => (appData.classStreams || []) as StreamRecord[], [appData.classStreams]);
  const students = useMemo(() => (appData.students || []) as StudentStreamRecord[], [appData.students]);
  const toast = useToast();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [streamNames, setStreamNames] = useState<string[]>(['']);
  const [createdStreams, setCreatedStreams] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [reassignments, setReassignments] = useState<Record<string, string>>({});
  const [isRepairing, setIsRepairing] = useState(false);

  const realClasses = useMemo(() => classes.filter(c => c && c.id != null && String(c.id) !== ''), [classes]);
  const className = (c: ClassOption | undefined) => c?.name || c?.class_name || '';
  const selectedClass = realClasses.find(c => String(c.id) === selectedClassId);

  // Names to create: trimmed, unique (case-insensitive), and not already a stream of the selected class.
  const { namesToCreate, duplicateNames } = useMemo(() => {
    const existing = new Set(
      classStreams
        .filter(s => String(s.class_id ?? '') === selectedClassId && typeof s.name === 'string')
        .map(s => normaliseName(String(s.name))),
    );
    const seen = new Set<string>();
    const toCreate: string[] = [];
    const duplicates: string[] = [];
    for (const raw of streamNames) {
      const name = raw.trim();
      if (!name) continue;
      const key = normaliseName(name);
      if (existing.has(key) || seen.has(key)) {
        duplicates.push(name);
        continue;
      }
      seen.add(key);
      toCreate.push(name);
    }
    return { namesToCreate: toCreate, duplicateNames: duplicates };
  }, [classStreams, selectedClassId, streamNames]);

  const repairPlan = useMemo(() => planCorruptStreamRepair(classStreams, students), [classStreams, students]);
  const repairBlocked = repairPlan.corrupt.some(
    entry => entry.studentIds.length > 0 && !reassignments[String(entry.stream.id)],
  );

  const streamLabel = (stream: StreamRecord) => {
    const owner = realClasses.find(c => String(c.id) === String(stream.class_id));
    return `${className(owner)} - ${stream.name}`;
  };

  const handleAddStreamField = () => {
    setStreamNames(prev => [...prev, '']);
  };

  const handleRemoveStream = (index: number) => {
    setStreamNames(prev => prev.filter((_, i) => i !== index));
  };

  const handleStreamNameChange = (index: number, value: string) => {
    setStreamNames(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleCreateAll = async () => {
    if (!selectedClass || namesToCreate.length === 0) return;

    if (duplicateNames.length > 0) {
      toast.showWarning(
        t('administration:bulkStreams.duplicatesSkipped', {
          defaultValue: 'Skipped existing or repeated stream names: {{names}}',
          names: duplicateNames.join(', '),
        }),
      );
    }

    setIsCreating(true);
    const created: string[] = [];
    try {
      for (const name of namesToCreate) {
        await addClassStream({ class_id: String(selectedClass.id), name });
        created.push(name);
      }
      toast.showSuccess(
        t('administration:bulkStreams.createdToast', {
          defaultValue: 'Created {{count}} stream(s) for {{className}}',
          count: created.length,
          className: className(selectedClass),
        }),
      );
      setStreamNames(['']);
      setSelectedClassId('');
    } catch (error) {
      logger.error('Bulk stream creation failed:', error);
      toast.showError(t('administration:bulkStreams.createFailed', 'One or more streams could not be created.'));
    } finally {
      setCreatedStreams(created);
      setIsCreating(false);
    }
  };

  const handleRepair = async () => {
    setIsRepairing(true);
    try {
      const result = await applyCorruptStreamRepair(repairPlan, reassignments, {
        updateStudent: (studentId, patch) => updateStudent(studentId, patch),
        deleteStream: streamId => deleteClassStream(streamId),
      });
      setReassignments({});
      toast.showSuccess(
        t('administration:bulkStreams.repair.done', {
          defaultValue: 'Removed {{deleted}} corrupt stream(s); moved {{reassigned}} student(s)',
          deleted: result.deleted.length,
          reassigned: result.reassigned,
        }),
      );
    } catch (error) {
      logger.error('Corrupt stream repair failed:', error);
      toast.showError(t('administration:bulkStreams.repair.failed', 'Repair failed. No further streams were removed.'));
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="space-y-6">
      {repairPlan.corrupt.length > 0 && (
        <Card
          title={t('administration:bulkStreams.repair.title', 'Corrupt streams')}
          subtitle={t(
            'administration:bulkStreams.repair.subtitle',
            'These streams have no name or no class. Move their students to a valid stream, then remove them.',
          )}
        >
          <div data-testid="corrupt-stream-repair" className="space-y-4">
            {repairPlan.corrupt.map(entry => {
              const streamId = String(entry.stream.id);
              const selectId = `repair-target-${streamId}`;
              return (
                <div key={streamId} className="flex flex-col gap-2 border border-surface-border rounded-lg p-3">
                  <p className="text-sm text-surface-foreground">
                    {entry.stream.name
                      ? String(entry.stream.name)
                      : t('administration:bulkStreams.repair.unnamed', 'Unnamed stream')}{' '}
                    <span className="text-surface-muted-fg">
                      {t('administration:bulkStreams.repair.studentCount', {
                        defaultValue: '({{count}} student(s))',
                        count: entry.studentIds.length,
                      })}
                    </span>
                  </p>
                  {entry.studentIds.length > 0 && (
                    <div>
                      <label htmlFor={selectId} className="block text-sm font-medium text-surface-foreground mb-1">
                        {t('administration:bulkStreams.repair.moveTo', 'Move students to')}
                      </label>
                      <select
                        id={selectId}
                        className={selectClassName}
                        value={reassignments[streamId] || ''}
                        onChange={e => setReassignments(prev => ({ ...prev, [streamId]: e.target.value }))}
                      >
                        <option value="">{t('administration:bulkStreams.repair.chooseStream', '-- Choose a stream --')}</option>
                        {repairPlan.validTargets.map(stream => (
                          <option key={String(stream.id)} value={String(stream.id)}>
                            {streamLabel(stream)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex justify-end">
              <Button variant="danger" onClick={handleRepair} disabled={isRepairing || repairBlocked} loading={isRepairing}>
                {t('administration:bulkStreams.repair.action', 'Repair streams')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card
        title={t('administration:bulkStreams.title', 'Bulk Stream Creation')}
        subtitle={t('administration:bulkStreams.subtitle', 'Add multiple streams to a class at once')}
        actions={
          <Button onClick={handleAddStreamField} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('administration:bulkStreams.addField', 'Add Stream Field')}
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Class Selection: real classes only */}
          <div>
            <label htmlFor="bulk-stream-class" className="block text-sm font-medium text-surface-foreground mb-1">
              {t('administration:bulkStreams.selectClass', 'Select Class')}
            </label>
            <select
              id="bulk-stream-class"
              className={selectClassName}
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">{t('administration:bulkStreams.selectClassPlaceholder', '-- Select a class --')}</option>
              {realClasses.map(c => (
                <option key={String(c.id)} value={String(c.id)}>
                  {className(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Stream Name Inputs */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-surface-foreground">
              {t('administration:bulkStreams.streamNames', 'Stream Names')}
            </label>
            {streamNames.map((name, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={t('administration:bulkStreams.streamPlaceholder', {
                    defaultValue: 'Stream {{index}} name (e.g., East, West, North)',
                    index: index + 1,
                  })}
                  value={name}
                  onChange={(e) => handleStreamNameChange(index, e.target.value)}
                  className="flex-1"
                />
                {streamNames.length > 1 && (
                  <button
                    onClick={() => handleRemoveStream(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    aria-label={t('common:remove', 'Remove')}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-surface-muted border border-surface-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-surface-muted-fg">
                  {selectedClass
                    ? t('administration:bulkStreams.summary', {
                        defaultValue: 'Will create {{count}} stream(s) for "{{className}}"',
                        count: namesToCreate.length,
                        className: className(selectedClass),
                      })
                    : t('administration:bulkStreams.summaryEmpty', 'Select a class and enter stream names above')}
                </p>
                {duplicateNames.length > 0 && (
                  <p className="text-sm text-amber-700 mt-1">
                    {t('administration:bulkStreams.duplicatesHint', {
                      defaultValue: 'Already exists or repeated, will be skipped: {{names}}',
                      names: duplicateNames.join(', '),
                    })}
                  </p>
                )}
              </div>
              <Badge variant="info">
                {t('administration:bulkStreams.badge', { defaultValue: '{{count}} streams', count: namesToCreate.length })}
              </Badge>
            </div>
          </div>

          {/* Create Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleCreateAll}
              disabled={isCreating || !selectedClass || namesToCreate.length === 0}
              loading={isCreating}
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              {t('administration:bulkStreams.create', {
                defaultValue: 'Create {{count}} Stream(s)',
                count: namesToCreate.length,
              })}
            </Button>
          </div>
        </div>
      </Card>

      {/* Created rows */}
      {createdStreams.length > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-medium text-green-800">
                {t('administration:bulkStreams.createdTitle', 'Streams created')}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {createdStreams.map(name => (
                  <Badge key={name} variant="success">{name}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BulkStreamCreationPage;
export const BulkStreamCreationContent = BulkStreamCreationPage;
