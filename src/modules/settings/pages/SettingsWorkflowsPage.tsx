import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import { ArrowsRightLeftIcon, PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Workflow, WorkflowState } from '@/types';
import { useRBAC } from '@/hooks/useRBAC';
import { useAuth } from '@/contexts/AuthContext';

type WorkflowFormData = Omit<Partial<Workflow>, 'id' | 'created_at' | 'updated_at' | 'states'>;
type WorkflowStateFormData = Omit<Partial<WorkflowState>, 'id' | 'workflow_id'>;

const SettingsWorkflowsPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const { workflows, loading } = useAppData();
  const { user } = useAuth();
  const { hasPermission } = useRBAC(user?.id, user?.role);
  
  // Permission checks
  const canViewWorkflows = hasPermission('settings.workflows.view');
  const canCreateWorkflows = hasPermission('settings.workflows.create');
  const canUpdateWorkflows = hasPermission('settings.workflows.update');
  const canDeleteWorkflows = hasPermission('settings.workflows.delete');
  const canManageWorkflowStates = hasPermission('settings.workflows.manage_states');
  
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const initialWorkflowFormData: WorkflowFormData = { name: '' };
  const [workflowFormData, setWorkflowFormData] = useState<WorkflowFormData>(initialWorkflowFormData);

  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [currentWorkflowForStates, setCurrentWorkflowForStates] = useState<Workflow | null>(null);
  const [editingState, setEditingState] = useState<WorkflowState | null>(null);
  const initialStateFormData: WorkflowStateFormData = { name: '', sequence_order: 0 };
  const [stateFormData, setStateFormData] = useState<WorkflowStateFormData>(initialStateFormData);

  // Show access denied if user doesn't have view permission
  if (!canViewWorkflows) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to view workflow settings.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Workflow Modal
  const openWorkflowModal = (workflow?: Workflow) => {
    setEditingWorkflow(workflow || null);
    setWorkflowFormData(workflow ? { name: workflow.name } : initialWorkflowFormData);
    setIsWorkflowModalOpen(true);
  };
  const closeWorkflowModal = () => {
    setIsWorkflowModalOpen(false);
    setEditingWorkflow(null);
    setWorkflowFormData(initialWorkflowFormData);
  };

  // State Modal
  const openStateModal = (workflow: Workflow, state?: WorkflowState) => {
    setCurrentWorkflowForStates(workflow);
    setEditingState(state || null);
    setStateFormData(state ? { name: state.name, sequence_order: state.sequence_order } : {...initialStateFormData, sequence_order: (workflow.states?.length || 0) + 1});
    setIsStateModalOpen(true);
  };
  const closeStateModal = () => {
    setIsStateModalOpen(false);
    setEditingState(null);
    // Keep currentWorkflowForStates if user might add another state to the same workflow
    setStateFormData(initialStateFormData);
  };

  const handleWorkflowInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkflowFormData({ ...workflowFormData, [e.target.name]: e.target.value });
  };
  const handleStateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setStateFormData({ ...stateFormData, [name]: type === 'number' ? parseInt(value) || 0 : value });
  };

  const handleWorkflowSubmit = async () => {
    if (!workflowFormData.name) {
      alert("Workflow name is required."); return;
    }
    if (editingWorkflow) {
      // TODO: Implement updateWorkflow when available
      alert("Update workflow functionality not yet implemented");
    } else {
      // TODO: Implement addWorkflow when available
      alert("Add workflow functionality not yet implemented");
    }
    closeWorkflowModal();
  };

  const handleStateSubmit = async () => {
    if (!currentWorkflowForStates || !stateFormData.name || stateFormData.sequence_order === undefined) {
      alert("State name and sequence order are required."); return;
    }
    // TODO: Implement workflow state management when available
    alert("Workflow state management not yet implemented");
    closeStateModal();
  };

  const handleDeleteWorkflow = async (id: number) => {
    if (window.confirm("Delete this workflow and all its states?")) {
      // TODO: Implement deleteWorkflow when available
      alert("Delete workflow functionality not yet implemented");
      if(currentWorkflowForStates?.id === id) setCurrentWorkflowForStates(null);
    }
  };
  
  const handleDeleteState = async (stateId: number) => {
    if (!currentWorkflowForStates) return;
    if (window.confirm(t('workflows.deleteStateConfirm'))) {
      // TODO: Implement deleteWorkflowState when available
      alert("Delete workflow state functionality not yet implemented");
    }
  };

  const workflowColumns = [
    { header: t('tableHeaders.id'), accessor: 'id' as keyof Workflow },
    { header: t('tableHeaders.workflowName'), accessor: 'name' as keyof Workflow },
    { header: t('tableHeaders.states'), accessor: ((item: Workflow) => item.states?.length || 0) as (item:Workflow)=>React.ReactNode},
    {
      header: t('tableHeaders.actions'), accessor: 'id' as keyof Workflow,
      render: (item: Workflow) => (
        <div className="space-x-1">
          {canUpdateWorkflows && (
            <Button size="sm" variant="ghost" onClick={() => openWorkflowModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>{t('common:edit')}</Button>
          )}
          {canDeleteWorkflows && (
            <Button size="sm" variant="danger" onClick={() => handleDeleteWorkflow(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>{t('common:delete')}</Button>
          )}
          {canManageWorkflowStates && (
            <Button size="sm" variant="secondary" onClick={() => { setCurrentWorkflowForStates(item); setIsStateModalOpen(false);}} leftIcon={<ListBulletIcon className="w-4 h-4" />}>{t('workflows.statesFor', { workflowName: '' }).replace(': ','')}</Button>
          )}
        </div>
      ),
    },
  ];

  const stateColumns = [
    { header: t('tableHeaders.id'), accessor: 'id' as keyof WorkflowState },
    { header: t('tableHeaders.stateName'), accessor: 'name' as keyof WorkflowState },
    { header: t('tableHeaders.order'), accessor: 'sequence_order' as keyof WorkflowState },
    {
      header: t('tableHeaders.actions'), accessor: 'id' as keyof WorkflowState,
      render: (item: WorkflowState) => (
        <div className="space-x-1">
          {canManageWorkflowStates && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openStateModal(currentWorkflowForStates!, item)} leftIcon={<EditIcon className="w-4 h-4" />}>{t('common:edit')}</Button>
              <Button size="sm" variant="danger" onClick={() => handleDeleteState(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>{t('common:delete')}</Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title={t('workflows.title')} actions={
        canCreateWorkflows ? (
          <Button onClick={() => openWorkflowModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>{t('workflows.addButton')}</Button>
        ) : null
      }>
        <p className="text-sm text-gray-600 mb-4">{t('workflows.description')}</p>
        {loading.workflows && !currentWorkflowForStates ? <Spinner /> : <Table columns={workflowColumns} data={workflows} />}
      </Card>

      {currentWorkflowForStates && (
        <Card title={t('workflows.statesFor', { workflowName: currentWorkflowForStates.name })} actions={
          canManageWorkflowStates ? (
            <Button onClick={() => openStateModal(currentWorkflowForStates)} leftIcon={<PlusIcon className="w-5 h-5" />}>{t('workflows.addStateButton')}</Button>
          ) : null
        }>
          <Table columns={stateColumns} data={currentWorkflowForStates.states || []} emptyStateMessage={t('workflows.noStatesMessage')}/>
        </Card>
      )}

      {canCreateWorkflows && (
        <Modal isOpen={isWorkflowModalOpen} onClose={closeWorkflowModal} title={editingWorkflow ? t('workflows.modalEditTitle') : t('workflows.modalAddTitle')}
          footer={<><Button variant="secondary" onClick={closeWorkflowModal}>{t('common:cancel')}</Button><Button onClick={handleWorkflowSubmit} disabled={loading.workflows}>{loading.workflows ? <Spinner size="sm"/> : t('common:save')}</Button></>}
        >
          <Input name="name" label={t('workflows.nameLabel')} value={workflowFormData.name || ''} onChange={handleWorkflowInputChange} required />
        </Modal>
      )}

      {canManageWorkflowStates && (
        <Modal isOpen={isStateModalOpen} onClose={closeStateModal} title={editingState ? t('workflows.stateModalEditTitle') : t('workflows.stateModalAddTitle', { workflowName: currentWorkflowForStates?.name || '' })}
          footer={<><Button variant="secondary" onClick={closeStateModal}>{t('common:cancel')}</Button><Button onClick={handleStateSubmit} disabled={loading.workflows}>{loading.workflows ? <Spinner size="sm"/> : t('common:save')}</Button></>}
        >
          <Input name="name" label={t('workflows.stateNameLabel')} value={stateFormData.name || ''} onChange={handleStateInputChange} required />
          <Input name="sequence_order" label={t('workflows.sequenceOrderLabel')} type="number" value={stateFormData.sequence_order?.toString() || ''} onChange={handleStateInputChange} required />
        </Modal>
      )}
    </div>
  );
};

export default SettingsWorkflowsPage;
