// ABOUTME: This page component allows users to manage school classes and their streams.
// ABOUTME: It features tables for both classes and streams, with modals for CRUD operations.

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Class as SchoolClass, ClassStream, Staff } from '@/types'; 
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; 
import Spinner from '@/components/ui/Spinner';

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
  } = useAppData(); 


  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [editingStream, setEditingStream] = useState<ClassStream | null>(null);
  const [selectedClassForStream, setSelectedClassForStream] = useState<SchoolClass | null>(null);

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


  const classColumns = [
    { header: t('tableHeaders.id'), accessor: 'id' as keyof SchoolClass},
    { header: t('tableHeaders.className'), accessor: 'name' as keyof SchoolClass },
    { header: t('tableHeaders.streamCount'), accessor: ((item: SchoolClass) => item.streams?.length || resolvedClassStreams.filter(cs => cs.class_id === item.id).length) as (item: SchoolClass) => React.ReactNode },
    {
      header: t('common:actions'),
      accessor: 'id' as keyof SchoolClass,
      render: (item: SchoolClass) => (
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

  const streamColumns = [
    { header: t('tableHeaders.id'), accessor: 'id'as keyof ClassStream},
    { header: t('tableHeaders.streamName'), accessor: 'name'as keyof ClassStream},
    { header: t('tableHeaders.classTeacher'), accessor: 'class_teacher_name'as keyof ClassStream},
    {
      header: t('common:actions'),
      accessor: 'id'as keyof ClassStream,
      render: (item: ClassStream) => (
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
      <Card title={t('classes.title')} actions={
          <Button onClick={() => openClassModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>{t('classes.addClassButton')}</Button>
      }>
        <Table columns={classColumns} data={classes || []} isLoading={loading.classes} />
      </Card>

      {selectedClassForStream && (
        <Card title={t('classes.streamsTitle', {className: selectedClassForStream.name})} actions={
            <Button onClick={() => openStreamModal(undefined, selectedClassForStream)} leftIcon={<PlusIcon className="w-5 h-5" />}>{t('classes.addStreamButton')}</Button>
        }>
          <Table columns={streamColumns} data={streamsForSelectedClass} isLoading={loading.classStreams} emptyStateMessage={t('classes.noStreamsMessage')}/>
        </Card>
      )}

      {/* Class Modal */}
      <Modal isOpen={isClassModalOpen} onClose={closeClassModal} title={editingClass ? t('classes.modalEditTitle') : t('classes.modalAddTitle')}
        footer={<><Button variant="secondary" onClick={closeClassModal}>{t('common:cancel')}</Button><Button onClick={handleClassSubmit} disabled={loading.classes}>{loading.classes ? <Spinner size="sm"/> : t('common:save')}</Button></>}
      >
        <Input name="name" label={t('classes.nameLabel')} value={classFormData.name || ''} onChange={(e) => setClassFormData({...classFormData, name: e.target.value})} required />
      </Modal>

      {/* Stream Modal */}
      <Modal isOpen={isStreamModalOpen} onClose={closeStreamModal} title={editingStream ? t('classes.modalEditStreamTitle') : t('classes.modalAddStreamTitle', { className: selectedClassForStream?.name || ''})}
         footer={<><Button variant="secondary" onClick={closeStreamModal}>{t('common:cancel')}</Button><Button onClick={handleStreamSubmit} disabled={loading.classStreams}>{loading.classStreams ? <Spinner size="sm"/> : t('common:save')}</Button></>}
      >
        <Input name="name" label={t('classes.streamNameLabel')} value={streamFormData.name || ''} onChange={(e) => setStreamFormData({...streamFormData, name: e.target.value})} required />
        <Select name="class_teacher_id" label={t('classes.teacherLabel')} value={streamFormData.class_teacher_id || ''} onChange={(e) => setStreamFormData({...streamFormData, class_teacher_id: e.target.value})}>
            <option value="">{t('classes.selectTeacherOption')}</option>
            {(staff || []).filter(s => s.is_active).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
        </Select>
      </Modal>
    </div>
  );
};

export default ClassesPage;
