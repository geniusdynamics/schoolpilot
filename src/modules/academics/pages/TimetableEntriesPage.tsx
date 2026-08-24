import React, { useState, useMemo } from 'react';

import { DayOfWeek, TimetableEntry, TimetablePeriodDef, Subject } from '@/core/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Select from '@/components/ui/Select';

import { useAppData } from '@/hooks/useAppData'; // Updated
import { useTranslation } from 'react-i18next';
import Spinner from '@/components/ui/Spinner';
import type { Staff } from '@/core/types';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';

type TimetableEntryFormData = Omit<Partial<TimetableEntry>, 'id' | 'class_stream_id' | 'class_stream_name' | 'period_name' | 'subject_name' | 'teacher_name' | 'day_of_week'> & {
    day_of_week?: DayOfWeek;
};

export const TimetableEntriesContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const { 
    timetableEntries, 
    classStreams,
    timetablePeriodDefs,
    subjects,
    staff,
    teacherSubjectAssignments, // Added
    classSubjectAllocations, // Added
    loading, 
    getTimetableEntries,
    addTimetableEntry, 
    updateTimetableEntry, 
    deleteTimetableEntry 
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [selectedClassStreamId, setSelectedClassStreamId] = useState<number | undefined>((classStreams && classStreams.length > 0) ? classStreams[0].id : undefined);
  
  const initialFormData: TimetableEntryFormData = { 
    day_of_week: undefined, 
    period_id: undefined,
    subject_id: undefined,
    teacher_id: undefined,
  };
  const [formData, setFormData] = useState<TimetableEntryFormData>(initialFormData);

  const openModal = (entry?: TimetableEntry, day?: DayOfWeek, periodId?: number) => {
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
    let processedValue: string | number | undefined = value;
    if (name === 'period_id' || name === 'subject_id') {
        processedValue = value ? parseInt(value) : undefined;
    } else if (name === 'teacher_id' && value === '') {
        processedValue = undefined;
    }
    
    const newState = { ...formData, [name]: processedValue };
    // If subject changes, reset teacher if the current teacher isn't assigned to the new subject
    if (name === 'subject_id') {
        newState.teacher_id = undefined; 
    }
    setFormData(newState);
  };
  
  const availableTeachers = useMemo(() => {
    if (!formData.subject_id || !selectedClassStreamId) {
      return (staff || []).filter(s => s.is_active && (s.department_name === 'Academics' || s.designation_title?.includes('Teacher') || s.designation_title?.includes('Principal')));
    }

    // Find relevant ClassSubjectAllocations for the current stream and selected subject
    const relevantAllocations = (classSubjectAllocations || []).filter(
        csa => csa.class_stream_id === selectedClassStreamId && csa.subject_id === Number(formData.subject_id)
    );

    if (relevantAllocations.length === 0) return []; 

    const teacherIds = (teacherSubjectAssignments || [])
        .filter(tsa => relevantAllocations.some(ra => ra.id === tsa.allocation_id))
        .map(tsa => tsa.teacher_id);
    
    const uniqueTeacherIds = [...new Set(teacherIds)];

    return (staff || []).filter(s => s.is_active && uniqueTeacherIds.includes(s.id));
  }, [formData.subject_id, selectedClassStreamId, staff, classSubjectAllocations, teacherSubjectAssignments]);

  const handleSubmit = async () => {
    if (!selectedClassStreamId || !formData.day_of_week || !formData.period_id || !formData.subject_id || !formData.teacher_id) {
      alert(t('validation.classStreamDayPeriodSubjectAndTeacherAreRequired'));
      return;
    }

    const payload: Omit<TimetableEntry, 'id'| 'class_stream_name' | 'period_name' | 'subject_name' | 'teacher_name'> = { 
        class_stream_id: Number(selectedClassStreamId), 
        day_of_week: formData.day_of_week!,
        period_id: Number(formData.period_id!),
        subject_id: Number(formData.subject_id!),
        teacher_id: formData.teacher_id!,
    };

    if (editingEntry) {
      await updateTimetableEntry({ ...editingEntry, ...payload });
    } else {
      await addTimetableEntry(payload);
    }
    closeModal();
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

  const entriesForSelectedStream = useMemo(() => {
    if (!selectedClassStreamId) return [];
    return getTimetableEntries(selectedClassStreamId);
  }, [selectedClassStreamId, getTimetableEntries, timetableEntries]); 

  const findEntry = (day: DayOfWeek, periodId: number): TimetableEntry | undefined => {
    return entriesForSelectedStream.find(e => e.day_of_week === day && e.period_id === periodId);
  };
  
  const getSubjectColor = (subjectId: number): string => {
    const colors = ['bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100', 'bg-pink-100', 'bg-indigo-100', 'bg-teal-100'];
    return colors[subjectId % colors.length];
  };

  if (loading.timetableEntries || loading.classStreams || loading.timetablePeriodDefs || loading.subjects || loading.staff || loading.teacherSubjectAssignments || loading.classSubjectAllocations) {
      return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card title="Class Timetable Management" actions={
        <>
          {/* <Button variant="secondary" leftIcon={<PrinterIcon className="w-5 h-5" />}>Print Timetable</Button> */}
        </>
      }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-md bg-gray-50">
          <Select
            label="Select Class Stream"
            value={selectedClassStreamId != null ? String(selectedClassStreamId) : ''}
            onChange={(e) => setSelectedClassStreamId(e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">-- Select Class Stream --</option>
            {(classStreams || []).map(cs => (
              <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>
            ))}
          </Select>
        </div>

        {!selectedClassStreamId && <p className="text-center text-gray-500 py-4">Please select a class stream to view or manage its timetable.</p>}
        
        {selectedClassStreamId && (
          <div className="table-responsive">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-xs font-medium text-gray-600">Time / Day</th>
                  {daysOfWeekOrder.map(day => (
                    <th key={day} className="border border-gray-300 p-2 text-xs font-medium text-gray-600 capitalize">{day.toLowerCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sortedPeriods || []).map(period => (
                  <tr key={period.id}>
                    <td className="border border-gray-300 p-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      {period.period_name}<br/>({period.start_time.slice(0,5)} - {period.end_time.slice(0,5)})
                    </td>
                    {daysOfWeekOrder.map(day => {
                      const entry = findEntry(day, period.id);
                      return (
                        <td key={`${day}-${period.id}`} className={`border border-gray-300 p-1.5 text-xs relative group h-24 ${entry ? getSubjectColor(entry.subject_id) : 'hover:bg-gray-50'}`}>
                          {entry ? (
                            <div className="flex flex-col justify-between h-full">
                              <div>
                                <p className="font-semibold text-gray-800">{entry.subject_name}</p>
                                <p className="text-gray-600 text-[10px]">{entry.teacher_name}</p>
                              </div>
                              <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                <Button size="sm" variant="ghost" className="p-0.5" onClick={() => openModal(entry, day, period.id)}><EditIcon className="w-3 h-3"/></Button>
                                <Button size="sm" variant="ghost" className="p-0.5 text-red-500" onClick={() => handleDelete(entry.id)}><DeleteIcon className="w-3 h-3"/></Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 p-0.5" onClick={() => openModal(undefined, day, period.id)}>
                                <PlusIcon className="w-4 h-4 text-gray-400"/>
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
            <Button type="submit" disabled={loading.timetableEntries}>
              {loading.timetableEntries ? <Spinner size="sm"/> : (editingEntry ? 'Save Changes' : 'Add Slot')}
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
              value={formData.period_id != null ? String(formData.period_id) : ''}
              onChange={(e) => handleInputChange('period_id', e.target.value)}
              required
              disabled={!!editingEntry}
            >
              <option value="">Select Period</option>
              {(sortedPeriods || []).map((p: TimetablePeriodDef) => (
                <option key={p.id} value={p.id}>{p.period_name} ({p.start_time.slice(0,5)}-{p.end_time.slice(0,5)})</option>
              ))}
            </Select>
          </FormField>
          <FormField>
            <Select
              name="subject_id"
              label="Subject"
              value={formData.subject_id != null ? String(formData.subject_id) : ''}
              onChange={(e) => handleInputChange('subject_id', e.target.value)}
              required
            >
              <option value="">Select Subject</option>
              {(subjects || []).map((subject: Subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
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
              {(availableTeachers || []).map((t: Staff) => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
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
