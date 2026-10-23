// ABOUTME: Class timetable page — a day × period grid per class stream; each slot holds a subject and teacher.
// ABOUTME: CRUD goes through the academics module context with string ids and update(id, patch).

import React, { useState, useMemo } from 'react';

import { DayOfWeek } from '@/core/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Select from '@/components/ui/Select';

import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logging';
import { useAcademicDataContext } from '../data/AcademicDataContext';
import { useAdministrationDataContext } from '@/modules/administration/data/AdministrationDataContext';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type Id = string | number;

interface TimetableEntryFormData {
  day_of_week?: DayOfWeek;
  period_id?: string;
  subject_id?: string;
  teacher_id?: string;
}

interface Named { id: Id; name?: string | null; title?: string | null }
interface StreamRecord extends Named { class_id?: Id | null; class_name?: string | null }
interface PeriodDef { id: Id; period_name?: string; start_time: string; end_time: string }
interface StaffRecord {
  id: Id;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  designation_id?: Id | null;
  designation_title?: string | null;
  department_id?: Id | null;
  department_name?: string | null;
}
interface StoredEntry {
  id: Id;
  class_stream_id?: Id | null;
  day_of_week: DayOfWeek;
  period_id?: Id | null;
  subject_id?: Id | null;
  teacher_id?: Id | null;
  subject_name?: string | null;
  teacher_name?: string | null;
}
interface StoredAllocation { id: Id; class_stream_id?: Id | null; subject_id?: Id | null }
interface StoredAssignment { id: Id; allocation_id?: Id | null; teacher_id?: Id | null }

/** A timetable slot as shown in the grid, with subject and teacher names resolved. */
interface EntryRow {
  id: string;
  class_stream_id: string;
  day_of_week: DayOfWeek;
  period_id: string;
  subject_id: string;
  teacher_id: string;
  subject_name: string;
  teacher_name: string;
}

const idOf = (value: Id | null | undefined): string => (value == null ? '' : String(value));
const fullName = (person?: { first_name?: string; last_name?: string }) =>
  person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() : '';

export const TimetableEntriesContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const academic = useAcademicDataContext();
  const admin = useAdministrationDataContext();
  const { addTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = academic;
  const [isSaving, setIsSaving] = useState(false);

  const classStreams = admin.classStreams as unknown as StreamRecord[];
  const classes = admin.classes as unknown as Named[];
  const staff = admin.staff as StaffRecord[];
  const designations = admin.designations as unknown as Named[];
  const departments = admin.departments as unknown as Named[];
  const subjects = academic.subjects as Named[];
  const timetablePeriodDefs = academic.timetablePeriodDefs as unknown as PeriodDef[];
  const classSubjectAllocations = academic.classSubjectAllocations as unknown as StoredAllocation[];
  const teacherSubjectAssignments = academic.teacherSubjectAssignments as StoredAssignment[];

  const streamLabel = (stream: StreamRecord) => {
    const className = classes.find(c => idOf(c.id) === idOf(stream.class_id))?.name ?? stream.class_name;
    return className ? `${className} - ${stream.name ?? ''}` : (stream.name ?? '');
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryRow | null>(null);
  const [selectedClassStreamId, setSelectedClassStreamId] = useState<string | undefined>(classStreams.length > 0 ? idOf(classStreams[0].id) : undefined);

  const initialFormData: TimetableEntryFormData = { 
    day_of_week: undefined, 
    period_id: undefined,
    subject_id: undefined,
    teacher_id: undefined,
  };
  const [formData, setFormData] = useState<TimetableEntryFormData>(initialFormData);

  const openModal = (entry?: EntryRow, day?: DayOfWeek, periodId?: string) => {
    setEditingEntry(entry || null);
    setFormData(entry ? 
      { 
        day_of_week: entry.day_of_week, 
        period_id: entry.period_id,
        subject_id: entry.subject_id,
        teacher_id: entry.teacher_id,
      } : 
      {...initialFormData, day_of_week: day, period_id: periodId }
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (name: keyof TimetableEntryFormData, value: string) => {
    const newState = { ...formData, [name]: value || undefined };
    // If subject changes, reset teacher if the current teacher isn't assigned to the new subject
    if (name === 'subject_id') {
        newState.teacher_id = undefined; 
    }
    setFormData(newState);
  };
  
  const availableTeachers = useMemo(() => {
    const active = staff.filter(s => s.is_active !== false);
    if (!formData.subject_id || !selectedClassStreamId) {
      return active.filter(s => {
        const designation = designations.find(d => idOf(d.id) === idOf(s.designation_id))?.title ?? s.designation_title ?? '';
        const department = departments.find(d => idOf(d.id) === idOf(s.department_id))?.name ?? s.department_name ?? '';
        return department === 'Academics' || /teacher|principal/i.test(designation);
      });
    }

    // Find relevant ClassSubjectAllocations for the current stream and selected subject
    const relevantAllocationIds = new Set(classSubjectAllocations
      .filter(csa => idOf(csa.class_stream_id) === selectedClassStreamId && idOf(csa.subject_id) === formData.subject_id)
      .map(csa => idOf(csa.id)));

    if (relevantAllocationIds.size === 0) return [];

    const teacherIds = new Set(teacherSubjectAssignments
        .filter(tsa => relevantAllocationIds.has(idOf(tsa.allocation_id)))
        .map(tsa => idOf(tsa.teacher_id)));

    return active.filter(s => teacherIds.has(idOf(s.id)));
  }, [formData.subject_id, selectedClassStreamId, staff, designations, departments, classSubjectAllocations, teacherSubjectAssignments]);

  const toast = useToast();
  const handleSubmit = async () => {
    if (!selectedClassStreamId || !formData.day_of_week || !formData.period_id || !formData.subject_id || !formData.teacher_id) {
      toast.showWarning(t('validation.classStreamDayPeriodSubjectAndTeacherAreRequired'));
      return;
    }

    const payload = {
        class_stream_id: selectedClassStreamId,
        day_of_week: formData.day_of_week,
        period_id: formData.period_id,
        subject_id: formData.subject_id,
        teacher_id: formData.teacher_id,
    };

    setIsSaving(true);
    try {
      if (editingEntry) {
        await updateTimetableEntry(editingEntry.id, payload as never);
      } else {
        await addTimetableEntry(payload as never);
      }
      closeModal();
    } catch (error) {
      logger.error('Failed to save timetable slot:', error);
      toast.showError('Failed to save timetable slot.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this timetable slot?' }))) {
      await deleteTimetableEntry(id);
    }
  };

  const daysOfWeekOrder: DayOfWeek[] = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY];
  const sortedPeriods = useMemo(() => 
    [...(timetablePeriodDefs || [])].sort((a,b) => a.start_time.localeCompare(b.start_time)), 
  [timetablePeriodDefs]);

  const entriesForSelectedStream = useMemo<EntryRow[]>(() => {
    if (!selectedClassStreamId) return [];
    return (academic.timetableEntries as unknown as StoredEntry[])
      .filter(entry => idOf(entry.class_stream_id) === selectedClassStreamId)
      .map(entry => ({
        id: idOf(entry.id),
        class_stream_id: idOf(entry.class_stream_id),
        day_of_week: entry.day_of_week,
        period_id: idOf(entry.period_id),
        subject_id: idOf(entry.subject_id),
        teacher_id: idOf(entry.teacher_id),
        subject_name: subjects.find(s => idOf(s.id) === idOf(entry.subject_id))?.name ?? entry.subject_name ?? '',
        teacher_name: fullName(staff.find(s => idOf(s.id) === idOf(entry.teacher_id))) || entry.teacher_name || '',
      }));
  }, [selectedClassStreamId, academic.timetableEntries, subjects, staff]);

  const findEntry = (day: DayOfWeek, periodId: string): EntryRow | undefined => {
    return entriesForSelectedStream.find(e => e.day_of_week === day && e.period_id === periodId);
  };

  const getSubjectColor = (subjectId: string): string => {
    const colors = ['bg-primary-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100', 'bg-pink-100', 'bg-indigo-100', 'bg-teal-100'];
    const hash = Array.from(subjectId).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-3">
      <Card title="Class Timetable Management" actions={
        <>
          {/* <Button variant="secondary" leftIcon={<PrinterIcon className="w-5 h-5" />}>Print Timetable</Button> */}
        </>
      }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-md bg-surface-muted">
          <Select
            label="Select Class Stream"
            value={selectedClassStreamId != null ? String(selectedClassStreamId) : ''}
            onChange={(e) => setSelectedClassStreamId(e.target.value || undefined)}
          >
            <option value="">-- Select Class Stream --</option>
            {classStreams.map(cs => (
              <option key={cs.id} value={idOf(cs.id)}>{streamLabel(cs)}</option>
            ))}
          </Select>
        </div>

        {!selectedClassStreamId && <p className="text-center text-surface-muted-fg py-4">Please select a class stream to view or manage its timetable.</p>}
        
        {selectedClassStreamId && (
          <div className="table-responsive">
            <table className="min-w-full border-collapse border border-surface-border">
              <thead>
                <tr className="bg-surface-accent">
                  <th className="border border-surface-border p-2 text-xs font-medium text-surface-muted-fg">Time / Day</th>
                  {daysOfWeekOrder.map(day => (
                    <th key={day} className="border border-surface-border p-2 text-xs font-medium text-surface-muted-fg capitalize">{day.toLowerCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sortedPeriods || []).map(period => (
                  <tr key={period.id}>
                    <td className="border border-surface-border p-2 text-xs font-semibold text-surface-foreground whitespace-nowrap">
                      {period.period_name}<br/>({period.start_time.slice(0,5)} - {period.end_time.slice(0,5)})
                    </td>
                    {daysOfWeekOrder.map(day => {
                      const entry = findEntry(day, idOf(period.id));
                      return (
                        <td key={`${day}-${period.id}`} className={`border border-surface-border p-1.5 text-xs relative group h-24 ${entry ? getSubjectColor(entry.subject_id) : 'hover:bg-surface-muted'}`}>
                          {entry ? (
                            <div className="flex flex-col justify-between h-full">
                              <div>
                                <p className="font-semibold text-surface-foreground">{entry.subject_name}</p>
                                <p className="text-surface-muted-fg text-[10px]">{entry.teacher_name}</p>
                              </div>
                              <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                <Button size="sm" variant="ghost" className="p-0.5" onClick={() => openModal(entry, day, idOf(period.id))}><EditIcon className="w-3 h-3"/></Button>
                                <Button size="sm" variant="ghost" className="p-0.5 text-red-500" onClick={() => handleDelete(entry.id)}><DeleteIcon className="w-3 h-3"/></Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 p-0.5" onClick={() => openModal(undefined, day, idOf(period.id))}>
                                <PlusIcon className="w-4 h-4 text-surface-muted-fg"/>
                              </Button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DialogForm
        open={isModalOpen}
        onClose={closeModal}
        title={editingEntry ? 'Edit Timetable Slot' : 'Add Timetable Slot'}
        size="lg"
        onSubmit={handleSubmit}
        actions={
          <FormActions>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} loading={isSaving}>
              {editingEntry ? 'Save Changes' : 'Add Slot'}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <FormField>
            <Select
              name="day_of_week"
              label="Day of Week"
              value={formData.day_of_week || ''}
              onChange={(e) => handleInputChange('day_of_week', e.target.value)}
              required
              disabled={!!editingEntry}
            >
              <option value="">Select Day</option>
              {daysOfWeekOrder.map(day => (<option key={day} value={day}>{day}</option>))}
            </Select>
          </FormField>
          <FormField>
            <Select
              name="period_id"
              label="Period"
              value={formData.period_id ?? ''}
              onChange={(e) => handleInputChange('period_id', e.target.value)}
              required
              disabled={!!editingEntry}
            >
              <option value="">Select Period</option>
              {sortedPeriods.map(p => (
                <option key={p.id} value={idOf(p.id)}>{p.period_name} ({p.start_time.slice(0,5)}-{p.end_time.slice(0,5)})</option>
              ))}
            </Select>
          </FormField>
          <FormField>
            <Select
              name="subject_id"
              label="Subject"
              value={formData.subject_id ?? ''}
              onChange={(e) => handleInputChange('subject_id', e.target.value)}
              required
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={idOf(subject.id)}>{subject.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField>
            <Select
              name="teacher_id"
              label="Teacher"
              value={formData.teacher_id || ''}
              onChange={(e) => handleInputChange('teacher_id', e.target.value)}
              required
            >
              <option value="">Select Teacher</option>
              {availableTeachers.map(teacher => (
                <option key={teacher.id} value={idOf(teacher.id)}>{fullName(teacher)}</option>
              ))}
            </Select>
          </FormField>
        </FormSection>
      </DialogForm>
    </div>
  );
};

const TimetableEntriesPage: React.FC = () => {
  return <TimetableEntriesContent />;
};

export default TimetableEntriesPage;
