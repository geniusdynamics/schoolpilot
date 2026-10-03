// ABOUTME: Hub page for class and stream management
// ABOUTME: Consolidates class listing/stream management and bulk stream creation into a tabbed interface

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import { UserGroupIcon, DocumentAddIcon } from '@/components/ui/icons';
import { useAdministration } from '../hooks/useAdministration';
import { usePageActions } from '@/hooks/usePageActions';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Spinner from '@/components/ui/Spinner';
import {
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import { ActionDefinition } from '@/services/ui/types';
import EntityForm from '@/components/ui/forms/EntityForm';
import { BulkStreamCreationContent } from './BulkStreamCreationPage';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

// Local type definitions for SchoolClass and ClassStream
interface SchoolClass {
  id: string;
  name: string;
  section?: string;
  class_teacher_id?: string;
  class_teacher_name?: string;
  capacity?: number;
  room_number?: string;
  streams?: ClassStream[];
}

interface ClassStream {
  id: string;
  class_id: string;
  class_name?: string;
  name: string;
  class_teacher_id?: string;
  class_teacher_name?: string;
}

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export const ClassesContent: React.FC = () => {
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

  // Page actions hook (actions are registered by child hub components)

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
        onClick: () => openStreamModal(undefined, selectedClassForStream),
        variant: 'secondary'
      });
    }
    
    return actions;
  }, [t, selectedClassForStream]);

  usePageActions(baseActions, { autoRegister: true });

  const resolvedClassStreams = useMemo(() => {
    if (!classStreams || !Array.isArray(classStreams)) return [];
    return classStreams.map(cs => {
        const teacher = staff?.find(s => s.id === cs.class_teacher_id);
        const schoolClass = classes?.find(c => c.id === cs.class_id);
        return {
            ...cs,
            class_teacher_name: teacher ? [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || 'N/A' : 'N/A',
            class_name: schoolClass?.name || 'N/A'
        };
    });
  }, [classStreams, staff, classes]);

  const openClassModal = (cls?: SchoolClass) => {
    setEditingClass(cls || null);
    setIsClassModalOpen(true);
  };
  const closeClassModal = () => {
    setIsClassModalOpen(false);
    setEditingClass(null);
  };

  const openStreamModal = (stream?: ClassStream, parentClass?: SchoolClass) => {
    const currentParent = parentClass || selectedClassForStream;
    if (!currentParent) {
        toast.showError(t('validation.selectClassFirst'));
        return;
    }
    setSelectedClassForStream(currentParent);
    setEditingStream(stream || null);
    setIsStreamModalOpen(true);
  };
  const closeStreamModal = () => {
    setIsStreamModalOpen(false);
    setEditingStream(null);
  };

  const toast = useToast();

  const confirm = useConfirm();
  const handleDeleteClass = async (classId: string) => {
    if ((await confirm({ variant: 'danger', message: "Are you sure you want to delete this class? All associated streams will also be deleted." }))) {
        await deleteClass(classId);
    }
  };

  const handleDeleteStream = async (streamId: string) => {
    if ((await confirm({ variant: 'danger', message: "Are you sure you want to delete this stream?" }))) {
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
      render: (_value, item) => item.id
    },
    { 
      key: 'name',
      header: t('tableHeaders.className'), 
      sortable: true,
      filterable: true,
      width: 200,
      render: (_value, item) => item.name
    },
    { 
      key: 'streamCount',
      header: t('tableHeaders.streamCount'), 
      sortable: true,
      width: 120,
      render: (_value, item) => item.streams?.length || resolvedClassStreams.filter(cs => cs.class_id === item.id).length
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
          <Button size="sm" variant="ghost" onClick={() => openClassModal(item)} leftIcon={<PencilSquareIcon className="w-4 h-4"/>}>{t('common:edit')}</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteClass(item.id)} leftIcon={<TrashIcon className="w-4 h-4"/>}>{t('common:delete')}</Button>
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
      render: (_value, item) => item.id
    },
    { 
      key: 'name',
      header: t('tableHeaders.streamName'), 
      sortable: true,
      filterable: true,
      width: 200,
      render: (_value, item) => item.name
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
          <Button size="sm" variant="ghost" onClick={() => openStreamModal(item, selectedClassForStream || undefined)} leftIcon={<PencilSquareIcon className="w-4 h-4"/>}>{t('common:edit')}</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteStream(item.id)} leftIcon={<TrashIcon className="w-4 h-4"/>}>{t('common:delete')}</Button>
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
              <PlusIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
              <p className="text-surface-muted-fg">No classes found. Create your first class to get started.</p>
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
                <PlusIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
                <p className="text-surface-muted-fg">{t('classes.noStreamsMessage')}</p>
              </div>
            }
          />
        </Card>
      )}

      {/* Class Modal */}
      <EntityForm
        isOpen={isClassModalOpen}
        onClose={closeClassModal}
        title={editingClass ? t('classes.modalEditTitle') : t('classes.modalAddTitle')}
        initialData={editingClass ? { name: editingClass.name } : undefined}
        fields={[
          { name: 'name', label: t('classes.nameLabel'), required: true },
        ]}
        onSubmit={async (values) => {
          const payload = { name: String(values.name ?? '') };
          if (editingClass) {
            await updateClass(editingClass.id, payload);
          } else {
            await addClass(payload);
          }
        }}
      />

      {/* Stream Modal */}
      <EntityForm
        isOpen={isStreamModalOpen}
        onClose={closeStreamModal}
        title={editingStream ? t('classes.modalEditStreamTitle') : t('classes.modalAddStreamTitle', { className: selectedClassForStream?.name || '' })}
        initialData={editingStream
          ? { name: editingStream.name, class_teacher_id: editingStream.class_teacher_id }
          : undefined}
        fields={[
          { name: 'name', label: t('classes.streamNameLabel'), required: true },
          {
            name: 'class_teacher_id',
            label: t('classes.teacherLabel'),
            type: 'select',
            placeholder: t('classes.selectTeacherOption'),
            options: (staff || [])
              .filter(s => s.is_active)
              .map(s => ({ value: s.id, label: `${s.first_name} ${s.last_name}` })),
          },
        ]}
        onSubmit={async (values) => {
          if (!selectedClassForStream) {
            toast.showError(t('validation.selectClassFirst'));
            return;
          }
          const payload = {
            name: String(values.name ?? ''),
            class_teacher_id: values.class_teacher_id ? String(values.class_teacher_id) : undefined,
          };
          if (editingStream) {
            await updateClassStream(editingStream.id, payload);
          } else {
            await addClassStream({ ...payload, class_id: selectedClassForStream.id });
          }
        }}
      />
    </div>
  );
};

const ClassesPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'classes',
      label: t('classes.title', 'Classes'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <ClassesContent />,
    },
    {
      id: 'bulk-streams',
      label: t('bulkStreamCreation.title', 'Bulk Streams'),
      icon: <DocumentAddIcon className="w-4 h-4" />,
      component: <BulkStreamCreationContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'classes';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'classes') {
        navigate('/administration/classes', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('classManagement.title', 'Class Management')}
        subtitle={t(
          'classManagement.subtitle',
          'Manage classes, streams, and create bulk streams'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="indigo"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default ClassesPage;
