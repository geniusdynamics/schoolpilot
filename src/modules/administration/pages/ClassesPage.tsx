// ABOUTME: This page component allows users to manage school classes and their streams.
// ABOUTME: It features tables for both classes and streams, with modals for CRUD operations.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdministration } from '../hooks/useAdministration';
import { usePageActions } from '@/hooks/usePageActions';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Spinner from '@/components/ui/Spinner';
import { PlusIcon, EditIcon, DeleteIcon } from 'lucide-react';
import { SchoolClass, ClassStream, Staff } from '@/types/database';
import { ActionDefinition } from '@/types/actions';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';

interface ClassFormData extends Partial<Omit<SchoolClass, 'id' | 'streams'>> {}
interface StreamFormData extends Partial<Omit<ClassStream, 'id' | 'class_id' | 'class_teacher_name' | 'class_name'>> {
  class_teacher_id?: string; 
}

const ClassesPage: React.FC = () => {
  const { t } = useTranslation(['administration', 'common']);
  const { 
    classes, 
    classStreams, 
    staff, 
    loading, 
    addClass, 
    updateClass, 
    deleteClass,
    addClassStream,
    updateClassStream,
    deleteClassStream,
  } = useAdministration(); 

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [editingStream, setEditingStream] = useState<ClassStream | null>(null);
  const [selectedClassForStream, setSelectedClassForStream] = useState<SchoolClass | null>(null);

  // Page actions - use usePageActions with proper dependency management
  const { registerActions, unregisterAction } = usePageActions();

  // Memoize action definitions to prevent infinite loops
  const baseActions = useMemo((): ActionDefinition[] => {
    const actions: ActionDefinition[] = [
      {
        id: 'add-class',
        label: t('classes.addClassButton'),
        icon: 'plus',
        onClick: () => openClassModal(),
        variant: 'primary'
      }
    ];
    
    // Add stream action if a class is selected
    if (selectedClassForStream) {
      actions.push({
        id: 'add-stream',
        label: t('classes.addStreamButton'),
        icon: 'plus',
        onClick: () => openStreamModal(null, selectedClassForStream),
        variant: 'secondary'
      });
    }
    
    return actions;
  }, [t, selectedClassForStream]);

  usePageActions(baseActions, { autoRegister: true });

  const [classFormData, setClassFormData] = useState<ClassFormData>({ name: '' });
  const [streamFormData, setStreamFormData] = useState<StreamFormData>({ name: '' });

  const resolvedClassStreams = useMemo(() => {
    if (!classStreams || !Array.isArray(classStreams)) return [];
    return classStreams.map(cs => {
        const teacher = staff?.find(s => s.id === cs.class_teacher_id);
        const schoolClass = classes?.find(c => c.id === cs.class_id);
        return {
            ...cs,
            class_teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'N/A',
            class_name: schoolClass?.name || 'N/A'
        };
    });
  }, [classStreams, staff, classes]);


  const openClassModal = (cls?: SchoolClass) => {
    setEditingClass(cls || null);
    setClassFormData(cls ? { name: cls.name } : { name: '' });
    setIsClassModalOpen(true);
  };
  const closeClassModal = () => {
    setIsClassModalOpen(false);
    setEditingClass(null);
    setClassFormData({ name: '' });
  };

  const openStreamModal = (stream?: ClassStream, parentClass?: SchoolClass) => {
    const currentParent = parentClass || selectedClassForStream;
    if (!currentParent) {
        alert(t('validation.selectClassFirst'));
        return;
    }
    setSelectedClassForStream(currentParent);
    setEditingStream(stream || null);
    setStreamFormData(stream ? { name: stream.name, class_teacher_id: stream.class_teacher_id } : { name: '' });
    setIsStreamModalOpen(true);
  };
  const closeStreamModal = () => {
    setIsStreamModalOpen(false);
    setEditingStream(null);
    setStreamFormData({ name: '' });
  };
  
  const handleClassSubmit = async () => {
    if (!classFormData.name) {
        alert(t('validation.classNameIsRequired'));
        return;
    }
    if (editingClass) {
        await updateClass({ ...editingClass, name: classFormData.name });
    } else {
        await addClass({ name: classFormData.name });
    }
    closeClassModal();
  };

  const handleStreamSubmit = async () => {
    if (!selectedClassForStream || !streamFormData.name) {
        alert(t('validation.streamNameIsRequiredAndAClassMustBeSelected'));
        return;
    }
    const payload = {
        name: streamFormData.name,
        class_teacher_id: streamFormData.class_teacher_id || undefined,
    };
    if (editingStream) {
        await updateClassStream({ ...editingStream, ...payload });
    } else {
        await addClassStream(selectedClassForStream.id, payload);
    }
    closeStreamModal();
  };

  const handleDeleteClass = async (classId: number) => {
    if (window.confirm("Are you sure you want to delete this class? All associated streams will also be deleted.")) {
        await deleteClass(classId);
    }
  };

  const handleDeleteStream = async (streamId: number) => {
    if (window.confirm("Are you sure you want to delete this stream?")) {
        await deleteClassStream(streamId);
    }
  };


  const classColumns: DataGridColumn<SchoolClass>[] = [
    { 
      key: 'id',
      header: t('tableHeaders.id'), 
      sortable: true,
      filterable: true,
      width: 80,
      render: (value, item) => item.id
    },
    { 
      key: 'name',
      header: t('tableHeaders.className'), 
      sortable: true,
      filterable: true,
      width: 200,
      render: (value, item) => item.name
    },
    { 
      key: 'streamCount',
      header: t('tableHeaders.streamCount'), 
      sortable: true,
      width: 120,
      render: (value, item) => item.streams?.length || resolvedClassStreams.filter(cs => cs.class_id === item.id).length
    },
    {
      key: 'actions',
      header: t('common:actions'),
      sortable: false,
      filterable: false,
      width: 300,
      sticky: 'right',
      render: (value, item) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openClassModal(item)} leftIcon={<EditIcon className="w-4 h-4"/>}>{t('common:edit')}</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteClass(item.id)} leftIcon={<DeleteIcon className="w-4 h-4"/>}>{t('common:delete')}</Button>
          <Button size="sm" onClick={() => { setSelectedClassForStream(item); setIsStreamModalOpen(false); }}>
            {t('classes.manageStreamsButton')}
          </Button>
        </div>
      ),
    },
  ];

  const streamColumns: DataGridColumn<ClassStream>[] = [
    { 
      key: 'id',
      header: t('tableHeaders.id'), 
      sortable: true,
      filterable: true,
      width: 80,
      render: (value, item) => item.id
    },
    { 
      key: 'name',
      header: t('tableHeaders.streamName'), 
      sortable: true,
      filterable: true,
      width: 200,
      render: (value, item) => item.name
    },
    { 
      key: 'class_teacher_name',
      header: t('tableHeaders.classTeacher'), 
      sortable: true,
      filterable: true,
      width: 200,
      render: (value, item) => item.class_teacher_name
    },
    {
      key: 'actions',
      header: t('common:actions'),
      sortable: false,
      filterable: false,
      width: 200,
      sticky: 'right',
      render: (value, item) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openStreamModal(item, selectedClassForStream || undefined)} leftIcon={<EditIcon className="w-4 h-4"/>}>{t('common:edit')}</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteStream(item.id)} leftIcon={<DeleteIcon className="w-4 h-4"/>}>{t('common:delete')}</Button>
        </div>
      ),
    },
  ];

  if (loading.classes || loading.classStreams || loading.staff) {
     return <div className="flex justify-center items-center h-full"> <Spinner size="lg" /> </div>;
  }

  const streamsForSelectedClass = selectedClassForStream 
    ? resolvedClassStreams.filter(cs => cs.class_id === selectedClassForStream.id) 
    : [];

  return (
    <div className="space-y-6">
      <Card title={t('classes.title')}>
        <DataGrid 
          columns={classColumns} 
          data={classes || []} 
          loading={loading.classes}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-8">
              <PlusIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No classes found. Create your first class to get started.</p>
            </div>
          }
        />
      </Card>

      {selectedClassForStream && (
        <Card title={t('classes.streamsTitle', {className: selectedClassForStream.name})}>
          <DataGrid 
            columns={streamColumns} 
            data={streamsForSelectedClass} 
            loading={loading.classStreams}
            sortable={true}
            filterable={true}
            emptyState={
              <div className="text-center py-8">
                <PlusIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{t('classes.noStreamsMessage')}</p>
              </div>
            }
          />
        </Card>
      )}

      {/* Class Modal */}
      <DialogForm
        isOpen={isClassModalOpen}
        onClose={closeClassModal}
        title={editingClass ? t('classes.modalEditTitle') : t('classes.modalAddTitle')}
        onSubmit={(e) => {
          e.preventDefault();
          handleClassSubmit();
        }}
      >
        <FormSection title="Class Information">
          <FormField label={t('classes.nameLabel')} required>
            <Input
              name="name"
              value={classFormData.name || ''}
              onChange={(e) => setClassFormData({...classFormData, name: e.target.value})}
              required
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeClassModal}>{t('common:cancel')}</Button>
          <Button type="submit" disabled={loading.classes}>
            {loading.classes ? <Spinner size="sm"/> : t('common:save')}
          </Button>
        </FormActions>
      </DialogForm>

      {/* Stream Modal */}
      <DialogForm
        isOpen={isStreamModalOpen}
        onClose={closeStreamModal}
        title={editingStream ? t('classes.modalEditStreamTitle') : t('classes.modalAddStreamTitle', { className: selectedClassForStream?.name || ''})}
        onSubmit={(e) => {
          e.preventDefault();
          handleStreamSubmit();
        }}
      >
        <FormSection title="Stream Information">
          <FormField label={t('classes.streamNameLabel')} required>
            <Input
              name="name"
              value={streamFormData.name || ''}
              onChange={(e) => setStreamFormData({...streamFormData, name: e.target.value})}
              required
            />
          </FormField>
          <FormField label={t('classes.teacherLabel')}>
            <Select name="class_teacher_id" value={streamFormData.class_teacher_id || ''} onChange={(e) => setStreamFormData({...streamFormData, class_teacher_id: e.target.value})}>
              <option value="">{t('classes.selectTeacherOption')}</option>
              {(staff || []).filter(s => s.is_active).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </Select>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeStreamModal}>{t('common:cancel')}</Button>
          <Button type="submit" disabled={loading.classStreams}>
            {loading.classStreams ? <Spinner size="sm"/> : t('common:save')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default ClassesPage;
