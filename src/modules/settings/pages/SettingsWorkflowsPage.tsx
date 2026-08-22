import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import { ArrowsRightLeftIcon, PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import { FormSection, FormField, FormActions } from '@/components/ui/forms';
import Input from '@/components/ui/Input';
import { Workflow, WorkflowState } from '@/types';
import { useRBAC } from '@/hooks/useRBAC';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedDatabaseManager } from '@/services/database/UnifiedDatabaseManager';
import { useToastHelpers } from '@/hooks/useToast';
import { logger } from '@/utils/logging';

type WorkflowFormData = Omit<Partial<Workflow>, 'id' | 'created_at' | 'updated_at' | 'states'>;
type WorkflowStateFormData = Omit<Partial<WorkflowState>, 'id' | 'workflow_id'>;

interface ValidationErrors {
  name?: string;
  sequence_order?: string;
}

export const SettingsWorkflowsContent: React.FC = () => {
  const { t } = useTranslation('settings');
  const { workflows, loading: appDataLoading, refreshCollection } = useAppData();
  const { user } = useAuth();
  const { hasPermission } = useRBAC(user?.id, user?.role);
  const toast = useToastHelpers();
  const dbManager = UnifiedDatabaseManager.getInstance();
  
  // Permission checks
  const canViewWorkflows = hasPermission('settings.workflows.view');
  const canCreateWorkflows = hasPermission('settings.workflows.create');
  const canUpdateWorkflows = hasPermission('settings.workflows.update');
  const canDeleteWorkflows = hasPermission('settings.workflows.delete');
  const canManageWorkflowStates = hasPermission('settings.workflows.manage_states');
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingWorkflow, setIsDeletingWorkflow] = useState<number | null>(null);
  const [isDeletingState, setIsDeletingState] = useState<number | null>(null);
  
  // Workflow modal state
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [workflowFormData, setWorkflowFormData] = useState<WorkflowFormData>({ name: '' });
  const [workflowErrors, setWorkflowErrors] = useState<ValidationErrors>({});

  // State modal state
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [currentWorkflowForStates, setCurrentWorkflowForStates] = useState<Workflow | null>(null);
  const [editingState, setEditingState] = useState<WorkflowState | null>(null);
  const [stateFormData, setStateFormData] = useState<WorkflowStateFormData>({ name: '', sequence_order: 0 });
  const [stateErrors, setStateErrors] = useState<ValidationErrors>({});
  
  // Delete confirmation modal
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDeleting: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDeleting: false
  });

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

  // Validation functions
  const validateWorkflowForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!workflowFormData.name || workflowFormData.name.trim() === '') {
      errors.name = t('workflows.validation.nameRequired') || 'Workflow name is required';
    } else if (workflowFormData.name.length > 200) {
      errors.name = t('workflows.validation.nameTooLong') || 'Workflow name must be less than 200 characters';
    }
    
    setWorkflowErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!stateFormData.name || stateFormData.name.trim() === '') {
      errors.name = t('workflows.validation.stateNameRequired') || 'State name is required';
    } else if (stateFormData.name.length > 200) {
      errors.name = t('workflows.validation.stateNameTooLong') || 'State name must be less than 200 characters';
    }
    
    if (stateFormData.sequence_order === undefined || stateFormData.sequence_order === null) {
      errors.sequence_order = t('workflows.validation.sequenceOrderRequired') || 'Sequence order is required';
    } else if (stateFormData.sequence_order < 0) {
      errors.sequence_order = t('workflows.validation.sequenceOrderMin') || 'Sequence order must be 0 or greater';
    } else if (stateFormData.sequence_order > 9999) {
      errors.sequence_order = t('workflows.validation.sequenceOrderMax') || 'Sequence order must be 9999 or less';
    }
    
    setStateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Workflow Modal handlers
  const openWorkflowModal = useCallback((workflow?: Workflow) => {
    setEditingWorkflow(workflow || null);
    setWorkflowFormData(workflow ? { name: workflow.name } : { name: '' });
    setWorkflowErrors({});
    setIsWorkflowModalOpen(true);
  }, []);

  const closeWorkflowModal = useCallback(() => {
    setIsWorkflowModalOpen(false);
    setEditingWorkflow(null);
    setWorkflowFormData({ name: '' });
    setWorkflowErrors({});
  }, []);

  // State Modal handlers
  const openStateModal = useCallback((workflow: Workflow, state?: WorkflowState) => {
    setCurrentWorkflowForStates(workflow);
    setEditingState(state || null);
    const nextOrder = state ? state.sequence_order : (workflow.states?.length || 0) + 1;
    setStateFormData(state 
      ? { name: state.name, sequence_order: state.sequence_order } 
      : { name: '', sequence_order: nextOrder }
    );
    setStateErrors({});
    setIsStateModalOpen(true);
  }, []);

  const closeStateModal = useCallback(() => {
    setIsStateModalOpen(false);
    setEditingState(null);
    setStateFormData({ name: '', sequence_order: 0 });
    setStateErrors({});
  }, []);

  // Input change handlers
  const handleWorkflowInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setWorkflowFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (workflowErrors[name as keyof ValidationErrors]) {
      setWorkflowErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [workflowErrors]);

  const handleStateInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? parseInt(value) || 0 : value;
    setStateFormData(prev => ({ ...prev, [name]: parsedValue }));
    // Clear error when user starts typing
    if (stateErrors[name as keyof ValidationErrors]) {
      setStateErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [stateErrors]);

  // CRUD Operations
  const handleWorkflowSubmit = useCallback(async () => {
    if (!validateWorkflowForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const workflowsCollection = dbManager.getCollection<Workflow>('workflows');
      
      if (!workflowsCollection) {
        throw new Error('Workflows collection not available');
      }

      const timestamp = new Date().toISOString();
      
      if (editingWorkflow) {
        // Update existing workflow
        await workflowsCollection.update(editingWorkflow.id.toString(), {
          name: workflowFormData.name!.trim(),
          updated_at: timestamp
        });
        toast.showSuccess(t('workflows.updateSuccess') || 'Workflow updated successfully');
      } else {
        // Create new workflow
        const newWorkflowId = Date.now();
        await workflowsCollection.insert({
          id: newWorkflowId,
          name: workflowFormData.name!.trim(),
          created_at: timestamp,
          updated_at: timestamp,
          states: []
        });
        toast.showSuccess(t('workflows.createSuccess') || 'Workflow created successfully');
      }
      
      // Refresh the workflows collection
      await refreshCollection('workflows');
      closeWorkflowModal();
    } catch (error) {
      logger.error('Error saving workflow:', error);
      toast.showError(t('workflows.saveError') || 'Failed to save workflow. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [dbManager, editingWorkflow, workflowFormData, refreshCollection, closeWorkflowModal, toast, t]);

  const handleStateSubmit = useCallback(async () => {
    if (!currentWorkflowForStates || !validateStateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const statesCollection = dbManager.getCollection<WorkflowState>('workflow_states');
      const workflowsCollection = dbManager.getCollection<Workflow>('workflows');
      
      if (!statesCollection || !workflowsCollection) {
        throw new Error('Required collections not available');
      }

      const timestamp = new Date().toISOString();
      
      if (editingState) {
        // Update existing state
        await statesCollection.update(editingState.id.toString(), {
          name: stateFormData.name!.trim(),
          sequence_order: stateFormData.sequence_order!,
          updated_at: timestamp
        });
        toast.showSuccess(t('workflows.stateUpdateSuccess') || 'Workflow state updated successfully');
      } else {
        // Create new state
        const newStateId = Date.now();
        await statesCollection.insert({
          id: newStateId,
          workflow_id: currentWorkflowForStates.id,
          name: stateFormData.name!.trim(),
          sequence_order: stateFormData.sequence_order!,
          created_at: timestamp,
          updated_at: timestamp
        });
        toast.showSuccess(t('workflows.stateCreateSuccess') || 'Workflow state created successfully');
      }
      
      // Refresh the workflows collection to get updated states
      await refreshCollection('workflows');
      closeStateModal();
    } catch (error) {
      logger.error('Error saving workflow state:', error);
      toast.showError(t('workflows.stateSaveError') || 'Failed to save workflow state. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [dbManager, currentWorkflowForStates, editingState, stateFormData, refreshCollection, closeStateModal, toast, t]);

  const handleDeleteWorkflow = useCallback(async (id: number) => {
    setDeleteModalConfig({
      isOpen: true,
      title: t('workflows.deleteWorkflowTitle') || 'Delete Workflow',
      message: t('workflows.deleteWorkflowConfirm') || 'Delete this workflow and all its states? This action cannot be undone.',
      isDeleting: false,
      onConfirm: async () => {
        setDeleteModalConfig(prev => ({ ...prev, isDeleting: true }));
        setIsDeletingWorkflow(id);
        
        try {
          const workflowsCollection = dbManager.getCollection<Workflow>('workflows');
          const statesCollection = dbManager.getCollection<WorkflowState>('workflow_states');
          
          if (!workflowsCollection) {
            throw new Error('Workflows collection not available');
          }

          // First delete all associated states
          if (statesCollection) {
            const states = await statesCollection.find({ 
              selector: { workflow_id: id } 
            });
            
            for (const state of states) {
              await statesCollection.remove(state.id.toString());
            }
          }
          
          // Then delete the workflow
          await workflowsCollection.remove(id.toString());
          
          // Refresh data
          await refreshCollection('workflows');
          
          // If we're viewing states for this workflow, close that view
          if (currentWorkflowForStates?.id === id) {
            setCurrentWorkflowForStates(null);
          }
          
          toast.showSuccess(t('workflows.deleteSuccess') || 'Workflow deleted successfully');
        } catch (error) {
          logger.error('Error deleting workflow:', error);
          toast.showError(t('workflows.deleteError') || 'Failed to delete workflow. Please try again.');
        } finally {
          setIsDeletingWorkflow(null);
          setDeleteModalConfig(prev => ({ ...prev, isOpen: false, isDeleting: false }));
        }
      }
    });
  }, [dbManager, refreshCollection, currentWorkflowForStates, toast, t]);
  
  const handleDeleteState = useCallback(async (stateId: number) => {
    if (!currentWorkflowForStates) return;
    
    setDeleteModalConfig({
      isOpen: true,
      title: t('workflows.deleteStateTitle') || 'Delete Workflow State',
      message: t('workflows.deleteStateConfirm') || 'Are you sure you want to delete this workflow state? This action cannot be undone.',
      isDeleting: false,
      onConfirm: async () => {
        setDeleteModalConfig(prev => ({ ...prev, isDeleting: true }));
        setIsDeletingState(stateId);
        
        try {
          const statesCollection = dbManager.getCollection<WorkflowState>('workflow_states');
          
          if (!statesCollection) {
            throw new Error('Workflow states collection not available');
          }
          
          await statesCollection.remove(stateId.toString());
          
          // Refresh data
          await refreshCollection('workflows');
          
          toast.showSuccess(t('workflows.stateDeleteSuccess') || 'Workflow state deleted successfully');
        } catch (error) {
          logger.error('Error deleting workflow state:', error);
          toast.showError(t('workflows.stateDeleteError') || 'Failed to delete workflow state. Please try again.');
        } finally {
          setIsDeletingState(null);
          setDeleteModalConfig(prev => ({ ...prev, isOpen: false, isDeleting: false }));
        }
      }
    });
  }, [dbManager, currentWorkflowForStates, refreshCollection, toast, t]);

  const closeDeleteModal = useCallback(() => {
    if (!deleteModalConfig.isDeleting) {
      setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
    }
  }, [deleteModalConfig.isDeleting]);

  // Table columns
  const workflowColumns = [
    { header: t('tableHeaders.id'), key: 'id' as keyof Workflow },
    { header: t('tableHeaders.workflowName'), key: 'name' as keyof Workflow },
    { 
      header: t('tableHeaders.states'), 
      key: ((item: Workflow) => item.states?.length || 0) as (item: Workflow) => React.ReactNode 
    },
    {
      header: t('tableHeaders.actions'), 
      key: 'id' as keyof Workflow,
      render: (value: any, item: Workflow) => (
        <div className="space-x-1">
          {canUpdateWorkflows && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => openWorkflowModal(item)} 
              leftIcon={<EditIcon className="w-4 h-4" />}
              disabled={isDeletingWorkflow === item.id}
            >
              {t('common:edit')}
            </Button>
          )}
          {canDeleteWorkflows && (
            <Button 
              size="sm" 
              variant="danger" 
              onClick={() => handleDeleteWorkflow(item.id)} 
              leftIcon={isDeletingWorkflow === item.id ? <Spinner size="sm" /> : <DeleteIcon className="w-4 h-4" />}
              disabled={isDeletingWorkflow === item.id}
            >
              {t('common:delete')}
            </Button>
          )}
          {canManageWorkflowStates && (
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => setCurrentWorkflowForStates(item)} 
              leftIcon={<ListBulletIcon className="w-4 h-4" />}
            >
              {t('workflows.manageStates') || 'States'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const stateColumns = [
    { header: t('tableHeaders.id'), key: 'id' as keyof WorkflowState },
    { header: t('tableHeaders.stateName'), key: 'name' as keyof WorkflowState },
    { header: t('tableHeaders.order'), key: 'sequence_order' as keyof WorkflowState },
    {
      header: t('tableHeaders.actions'), 
      key: 'id' as keyof WorkflowState,
      render: (value: any, item: WorkflowState) => (
        <div className="space-x-1">
          {canManageWorkflowStates && (
            <>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => openStateModal(currentWorkflowForStates!, item)} 
                leftIcon={<EditIcon className="w-4 h-4" />}
                disabled={isDeletingState === item.id}
              >
                {t('common:edit')}
              </Button>
              <Button 
                size="sm" 
                variant="danger" 
                onClick={() => handleDeleteState(item.id)} 
                leftIcon={isDeletingState === item.id ? <Spinner size="sm" /> : <DeleteIcon className="w-4 h-4" />}
                disabled={isDeletingState === item.id}
              >
                {t('common:delete')}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Workflows Card */}
      <Card 
        title={t('workflows.title')} 
        actions={canCreateWorkflows ? (
          <Button 
            onClick={() => openWorkflowModal()} 
            leftIcon={<PlusIcon className="w-5 h-5" />}
            disabled={isSubmitting}
          >
            {t('workflows.addButton')}
          </Button>
        ) : null}
      >
        <p className="text-sm text-gray-600 mb-4">{t('workflows.description')}</p>
        {appDataLoading.workflows ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <Table 
            columns={workflowColumns} 
            data={(workflows || [])} 
            emptyStateMessage={t('workflows.noWorkflowsMessage') || 'No workflows found. Create one to get started.'}
          />
        )}
      </Card>

      {/* Workflow States Card */}
      {currentWorkflowForStates && (
        <Card 
          title={t('workflows.statesFor', { workflowName: currentWorkflowForStates.name })} 
          actions={canManageWorkflowStates ? (
            <Button 
              onClick={() => openStateModal(currentWorkflowForStates)} 
              leftIcon={<PlusIcon className="w-5 h-5" />}
              disabled={isSubmitting}
            >
              {t('workflows.addStateButton')}
            </Button>
          ) : null}
        >
          <div className="mb-4 flex justify-between items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentWorkflowForStates(null)}
              leftIcon={<ArrowsRightLeftIcon className="w-4 h-4" />}
            >
              {t('workflows.backToWorkflows') || 'Back to Workflows'}
            </Button>
          </div>
          <Table 
            columns={stateColumns} 
            data={(currentWorkflowForStates.states || [])} 
            emptyStateMessage={t('workflows.noStatesMessage') || 'No states defined for this workflow. Add one to get started.'}
          />
        </Card>
      )}

      {/* Workflow Modal */}
      {canCreateWorkflows && (
        <DialogForm
          isOpen={isWorkflowModalOpen}
          onClose={closeWorkflowModal}
          title={editingWorkflow ? t('workflows.modalEditTitle') : t('workflows.modalAddTitle')}
          size="md"
        >
          <FormSection title={t('workflows.nameLabel') || 'Workflow Name'}>
            <FormField label={t('workflows.nameLabel') || 'Name'} required>
              <Input
                name="name"
                value={workflowFormData.name || ''}
                onChange={handleWorkflowInputChange}
                required
                error={workflowErrors.name}
                disabled={isSubmitting}
                placeholder={t('workflows.namePlaceholder') || 'Enter workflow name'}
              />
            </FormField>
          </FormSection>
          <FormActions>
            <Button
              variant="secondary"
              onClick={closeWorkflowModal}
              disabled={isSubmitting}
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleWorkflowSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" /> : t('common:save')}
            </Button>
          </FormActions>
        </DialogForm>
      )}

      {/* State Modal */}
      {canManageWorkflowStates && (
        <DialogForm
          isOpen={isStateModalOpen}
          onClose={closeStateModal}
          title={editingState
            ? t('workflows.stateModalEditTitle')
            : t('workflows.stateModalAddTitle', { workflowName: currentWorkflowForStates?.name || '' })
          }
          size="md"
        >
          <FormSection title={t('workflows.stateInfoTitle') || 'State Information'}>
            <FormField label={t('workflows.stateNameLabel') || 'State Name'} required>
              <Input
                name="name"
                value={stateFormData.name || ''}
                onChange={handleStateInputChange}
                required
                error={stateErrors.name}
                disabled={isSubmitting}
                placeholder={t('workflows.stateNamePlaceholder') || 'Enter state name'}
              />
            </FormField>
            <FormField label={t('workflows.sequenceOrderLabel') || 'Sequence Order'} required>
              <Input
                name="sequence_order"
                type="number"
                value={stateFormData.sequence_order?.toString() || ''}
                onChange={handleStateInputChange}
                required
                error={stateErrors.sequence_order}
                disabled={isSubmitting}
                min={0}
                max={9999}
              />
            </FormField>
          </FormSection>
          <FormActions>
            <Button
              variant="secondary"
              onClick={closeStateModal}
              disabled={isSubmitting}
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleStateSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" /> : t('common:save')}
            </Button>
          </FormActions>
        </DialogForm>
      )}

      {/* Delete Confirmation Modal */}
      <DialogForm
        isOpen={deleteModalConfig.isOpen}
        onClose={closeDeleteModal}
        title={deleteModalConfig.title}
        size="sm"
      >
        <FormSection>
          <p className="text-gray-600">{deleteModalConfig.message}</p>
        </FormSection>
        <FormActions>
          <Button
            variant="secondary"
            onClick={closeDeleteModal}
            disabled={deleteModalConfig.isDeleting}
          >
            {t('common:cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={deleteModalConfig.onConfirm}
            disabled={deleteModalConfig.isDeleting}
          >
            {deleteModalConfig.isDeleting ? <Spinner size="sm" /> : t('common:delete')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const SettingsWorkflowsPage: React.FC = () => {
  return <SettingsWorkflowsContent />;
};

export default SettingsWorkflowsPage;
