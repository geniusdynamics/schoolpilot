import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import {
  PlusIcon,
  EyeIcon,
  EditIcon,
  DeleteIcon,
  SearchIcon,
  FilterIcon,
  DocumentTextIcon,
} from '@/components/ui/icons';
import { useLessonPlansData, LessonNote } from '../../data/lessonplans/useLessonPlansData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

const LessonNotesPage: React.FC = () => {
  const { t } = useTranslation('lessonplans');
  const { lessonNotes, loading, createLessonNote, updateLessonNote, deleteLessonNote } = useLessonPlansData();
  const { showToast } = useToast();

  const [filters, setFilters] = useState({
    searchQuery: '',
    dateFrom: '',
    dateTo: '',
    subject: '',
    class: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<LessonNote | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<LessonNote | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    teacherId: '',
    teacherName: '',
    subjectId: '',
    subjectName: '',
    classStreamId: '',
    classStreamName: '',
    date: '',
    periodId: '',
    periodName: '',
    topic: '',
    subTopic: '',
    objectives: '',
    introduction: '',
    presentation: '',
    development: '',
    assessment: '',
    conclusion: '',
    reflection: '',
    challenges: '',
    studentsPresent: '',
    studentsAbsent: '',
  });

  const filteredNotes = useMemo(() => {
    return (lessonNotes || []).filter(note => {
      if (filters.searchQuery) {
        const search = filters.searchQuery.toLowerCase();
        const matchesSearch =
          (note.topic || '').toLowerCase().includes(search) ||
          (note.teacherName || '').toLowerCase().includes(search) ||
          (note.subjectName || '').toLowerCase().includes(search) ||
          (note.classStreamName || '').toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (filters.dateFrom && note.date < filters.dateFrom) return false;
      if (filters.dateTo && note.date > filters.dateTo) return false;
      if (filters.subject && note.subjectName !== filters.subject) return false;
      if (filters.class && note.classStreamName !== filters.class) return false;
      return true;
    });
  }, [lessonNotes, filters]);

  // Get unique subjects and classes for filters
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(lessonNotes.map(n => n.subjectName).filter(Boolean));
    return Array.from(subjects);
  }, [lessonNotes]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(lessonNotes.map(n => n.classStreamName).filter(Boolean));
    return Array.from(classes);
  }, [lessonNotes]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || '' }));
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      dateFrom: '',
      dateTo: '',
      subject: '',
      class: '',
    });
  };

  const resetForm = () => {
    setFormData({
      teacherId: '',
      teacherName: '',
      subjectId: '',
      subjectName: '',
      classStreamId: '',
      classStreamName: '',
      date: '',
      periodId: '',
      periodName: '',
      topic: '',
      subTopic: '',
      objectives: '',
      introduction: '',
      presentation: '',
      development: '',
      assessment: '',
      conclusion: '',
      reflection: '',
      challenges: '',
      studentsPresent: '',
      studentsAbsent: '',
    });
  };

  const handleCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const handleEdit = (note: LessonNote) => {
    setEditingNote(note);
    setFormData({
      teacherId: note.teacherId,
      teacherName: note.teacherName || '',
      subjectId: String(note.subjectId),
      subjectName: note.subjectName || '',
      classStreamId: String(note.classStreamId),
      classStreamName: note.classStreamName || '',
      date: note.date,
      periodId: String(note.periodId),
      periodName: note.periodName || '',
      topic: note.topic,
      subTopic: note.subTopic || '',
      objectives: note.objectives,
      introduction: note.introduction,
      presentation: note.presentation,
      development: note.development,
      assessment: note.assessment,
      conclusion: note.conclusion,
      reflection: note.reflection || '',
      challenges: note.challenges || '',
      studentsPresent: note.studentsPresent ? String(note.studentsPresent) : '',
      studentsAbsent: note.studentsAbsent ? String(note.studentsAbsent) : '',
    });
    setEditModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLessonNote({
        teacherId: formData.teacherId,
        teacherName: formData.teacherName,
        subjectId: formData.subjectId,
        subjectName: formData.subjectName,
        classStreamId: formData.classStreamId,
        classStreamName: formData.classStreamName,
        date: formData.date,
        periodId: formData.periodId,
        periodName: formData.periodName,
        topic: formData.topic,
        subTopic: formData.subTopic,
        objectives: formData.objectives,
        introduction: formData.introduction,
        presentation: formData.presentation,
        development: formData.development,
        assessment: formData.assessment,
        conclusion: formData.conclusion,
        reflection: formData.reflection,
        challenges: formData.challenges,
        studentsPresent: formData.studentsPresent,
        studentsAbsent: formData.studentsAbsent,
      });
      showToast({
        type: 'success',
        message: 'Lesson note created successfully.',
      });
      setCreateModalOpen(false);
      resetForm();
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to create lesson note.',
      });
    }
  };

  const handleUpdateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    try {
      await updateLessonNote(editingNote.id, {
        teacherId: formData.teacherId,
        teacherName: formData.teacherName,
        subjectId: formData.subjectId,
        subjectName: formData.subjectName,
        classStreamId: formData.classStreamId,
        classStreamName: formData.classStreamName,
        date: formData.date,
        periodId: formData.periodId,
        periodName: formData.periodName,
        topic: formData.topic,
        subTopic: formData.subTopic,
        objectives: formData.objectives,
        introduction: formData.introduction,
        presentation: formData.presentation,
        development: formData.development,
        assessment: formData.assessment,
        conclusion: formData.conclusion,
        reflection: formData.reflection,
        challenges: formData.challenges,
        studentsPresent: formData.studentsPresent,
        studentsAbsent: formData.studentsAbsent,
      });
      showToast({
        type: 'success',
        message: 'Lesson note updated successfully.',
      });
      setEditModalOpen(false);
      setEditingNote(null);
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to update lesson note.',
      });
    }
  };

  const handleDeleteClick = (note: LessonNote) => {
    setNoteToDelete(note);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (noteToDelete) {
      try {
        await deleteLessonNote(noteToDelete.id);
        showToast({
          type: 'success',
          message: 'Lesson note deleted successfully.',
        });
      } catch (error) {
        showToast({
          type: 'error',
          message: 'Failed to delete lesson note.',
        });
      }
    }
    setDeleteModalOpen(false);
    setNoteToDelete(null);
  };

  const handleView = (note: LessonNote) => {
    // Could navigate to a detail page or show a modal
    showToast({
      type: 'info',
      message: `Viewing note: ${note.topic}`,
    });
  };

  const columns: DataGridColumn<LessonNote>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      width: 120,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'periodName',
      header: 'Period',
      sortable: true,
      width: 100,
      render: (value) => value || `Period ${0}`,
    },
    {
      key: 'subjectName',
      header: 'Subject',
      sortable: true,
      width: 130,
      render: (value) => value || 'N/A',
    },
    {
      key: 'classStreamName',
      header: 'Class',
      sortable: true,
      width: 120,
      render: (value) => value || 'N/A',
    },
    {
      key: 'teacherName',
      header: 'Teacher',
      sortable: true,
      width: 140,
      render: (value) => value || 'N/A',
    },
    {
      key: 'topic',
      header: 'Topic',
      sortable: true,
      width: 250,
      render: (value) => <span className="text-sm font-medium">{value}</span>,
    },
    {
      key: 'objectives',
      header: 'Objectives',
      sortable: false,
      width: 250,
      render: (value) => (
        <span className="text-sm text-surface-muted-fg line-clamp-2">{value}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 180,
      sticky: 'right',
      render: (_, item) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleView(item)}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(item)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(item)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const renderFormFields = () => (
    <FormSection columns={2}>
      <FormField label="Teacher" required>
        <Input
          value={formData.teacherName}
          onChange={(e) => setFormData(prev => ({ ...prev, teacherName: e.target.value, teacherId: e.target.value }))}
          placeholder="Enter teacher name"
        />
      </FormField>
      <FormField label="Subject" required>
        <Input
          value={formData.subjectName}
          onChange={(e) => setFormData(prev => ({ ...prev, subjectName: e.target.value, subjectId: e.target.value }))}
          placeholder="Enter subject"
        />
      </FormField>
      <FormField label="Class" required>
        <Input
          value={formData.classStreamName}
          onChange={(e) => setFormData(prev => ({ ...prev, classStreamName: e.target.value, classStreamId: e.target.value }))}
          placeholder="Enter class"
        />
      </FormField>
      <FormField label="Date" required>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
        />
      </FormField>
      <FormField label="Period" required>
        <Input
          value={formData.periodName}
          onChange={(e) => setFormData(prev => ({ ...prev, periodName: e.target.value, periodId: e.target.value }))}
          placeholder="e.g., Period 1"
        />
      </FormField>
      <FormField label="Students Present">
        <Input
          type="number"
          value={formData.studentsPresent}
          onChange={(e) => setFormData(prev => ({ ...prev, studentsPresent: e.target.value }))}
          placeholder="0"
        />
      </FormField>
      <FormField label="Students Absent">
        <Input
          type="number"
          value={formData.studentsAbsent}
          onChange={(e) => setFormData(prev => ({ ...prev, studentsAbsent: e.target.value }))}
          placeholder="0"
        />
      </FormField>
      <div className="col-span-2">
        <FormField label="Topic" required>
          <Input
            value={formData.topic}
            onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
            placeholder="Enter lesson topic"
          />
        </FormField>
      </div>
      <div className="col-span-2">
        <FormField label="Sub-Topic">
          <Input
            value={formData.subTopic}
            onChange={(e) => setFormData(prev => ({ ...prev, subTopic: e.target.value }))}
            placeholder="Enter sub-topic (optional)"
          />
        </FormField>
      </div>
      <div className="col-span-2">
        <FormField label="Objectives" required>
          <Textarea
            value={formData.objectives}
            onChange={(e) => setFormData(prev => ({ ...prev, objectives: e.target.value }))}
            placeholder="Enter lesson objectives..."
            rows={3}
          />
        </FormField>
      </div>
      <div className="col-span-2">
        <FormField label="Introduction" required>
          <Textarea
            value={formData.introduction}
            onChange={(e) => setFormData(prev => ({ ...prev, introduction: e.target.value }))}
            placeholder="Describe how the lesson was introduced..."
            rows={3}
          />
        </FormField>
      </div>
      <div className="col-span-2">
        <FormField label="Presentation" required>
          <Textarea
            value={formData.presentation}
            onChange={(e) => setFormData(prev => ({ ...prev, presentation: e.target.value }))}
            placeholder="Describe the presentation of the lesson..."
            rows={3}
          />
        </FormField>
      </div>
      <div className="col-span-2">
        <FormField label="Development" required>
          <Textarea
            value={formData.development}
            onChange={(e) => setFormData(prev => ({ ...prev, development: e.target.value }))}
            placeholder="Describe the lesson development activities..."
            rows={3}
          />
        </FormField>
      </div>
      <div className="col-span-2">
        <FormField label="Assessment" required>
          <Textarea
            value={formData.assessment}
            onChange={(e) => setFormData(prev => ({ ...prev, assessment: e.target.value }))}
            placeholder="Describe how students were assessed..."
            rows={3}
          />
        </FormField>
      </div>
      <div className="col-span-2">
        <FormField label="Conclusion" required>
          <Textarea
            value={formData.conclusion}
            onChange={(e) => setFormData(prev => ({ ...prev, conclusion: e.target.value }))}
            placeholder="Describe how the lesson was concluded..."
            rows={2}
          />
        </FormField>
      </div>
      <div className="col-span-2">
        <FormField label="Reflection">
          <Textarea
            value={formData.reflection}
            onChange={(e) => setFormData(prev => ({ ...prev, reflection: e.target.value }))}
            placeholder="Your reflections on the lesson..."
            rows={3}
          />
        </FormField>
      </div>
      <div className="col-span-2">
        <FormField label="Challenges">
          <Textarea
            value={formData.challenges}
            onChange={(e) => setFormData(prev => ({ ...prev, challenges: e.target.value }))}
            placeholder="Any challenges faced during the lesson..."
            rows={2}
          />
        </FormField>
      </div>
    </FormSection>
  );

  return (
    <div className="space-y-6">
      <Card
        title={t('lessonNote.plural')}
        subtitle={t('lessonNote.description', 'Track daily lesson delivery and reflections')}
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<FilterIcon className="w-4 h-4" />}
            >
              Filters
            </Button>
            <Button
              onClick={handleCreate}
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              {t('lessonNote.actions.create')}
            </Button>
          </div>
        }
      >
        {/* Search and Filters */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-muted-fg" />
              <Input
                placeholder="Search by topic, teacher, or subject..."
                value={filters.searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="Date From">
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </FormField>
              <FormField label="Date To">
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </FormField>
              <Select
                label="Subject"
                value={filters.subject}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
              >
                <option value="">All Subjects</option>
                {uniqueSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </Select>
              <Select
                label="Class"
                value={filters.class}
                onChange={(e) => handleFilterChange('class', e.target.value)}
              >
                <option value="">All Classes</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </Select>
              <div className="flex items-end col-span-4">
                <Button variant="ghost" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Data Grid */}
        <DataGrid
          columns={columns}
          data={filteredNotes}
          sortable
          loading={loading}
          emptyState={
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-surface-muted-fg" />
              <h3 className="mt-2 text-sm font-medium text-surface-foreground">
                {t('common.noData')}
              </h3>
              <p className="mt-1 text-sm text-surface-muted-fg">
                Get started by creating a new lesson note.
              </p>
              <div className="mt-6">
                <Button onClick={handleCreate} leftIcon={<PlusIcon className="w-5 h-5" />}>
                  {t('lessonNote.actions.create')}
                </Button>
              </div>
            </div>
          }
        />
      </Card>

      {/* Create Dialog */}
      <DialogForm
        open={createModalOpen}
        onClose={() => { setCreateModalOpen(false); resetForm(); }}
        title={t('lessonNote.actions.create')}
        size="lg"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => { setCreateModalOpen(false); resetForm(); }}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSubmitForm}>
              {t('common.save')}
            </Button>
          </FormActions>
        }
      >
        {renderFormFields()}
      </DialogForm>

      {/* Edit Dialog */}
      <DialogForm
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingNote(null); }}
        title={t('lessonNote.actions.edit')}
        size="lg"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => { setEditModalOpen(false); setEditingNote(null); }}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleUpdateForm}>
              {t('common.save')}
            </Button>
          </FormActions>
        }
      >
        {renderFormFields()}
      </DialogForm>

      {/* Delete Confirmation Dialog */}
      <DialogForm
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Delete"
        size="sm"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('common.delete')}
            </Button>
          </FormActions>
        }
      >
        <p>
          Are you sure you want to delete the lesson note{' '}
          <strong>"{noteToDelete?.topic}"</strong>? This action cannot be undone.
        </p>
      </DialogForm>
    </div>
  );
};

export default LessonNotesPage;
