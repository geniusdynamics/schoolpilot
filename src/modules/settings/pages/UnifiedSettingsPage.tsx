// ABOUTME: Unified settings page that consolidates all application settings into a single tabbed interface
// ABOUTME: Provides system overview, user management, feature toggles, sync controls, and workflow configuration

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useRBAC } from '../../../hooks/useRBAC';
import { useAppData } from '../../../hooks/useAppData';
import { useUnifiedConfig } from '../../../hooks/useUnifiedConfig';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';
import DialogForm from '../../../components/ui/forms/DialogForm';
import { FormSection, FormField, FormActions } from '../../../components/ui/forms';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Spinner from '../../../components/ui/Spinner';
import { 
  CogIcon, 
  DatabaseIcon, 
  UserGroupIcon, 
  ArrowsRightLeftIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon,
  ListBulletIcon,
  ArrowLeftOnRectangleIcon
} from '../../../components/ui/icons';
import FeatureSettingsPage from './FeatureSettingsPage';
import { PageContainer } from '../../../components/layout/PageContainer';
import { User, Role, Workflow, WorkflowState } from '../../../types';
export const UnifiedSettingsContent: React.FC = () => {
  const navigate = useNavigate();
  const { config: unifiedConfig, isLoading: isConfigLoading } = useUnifiedConfig();
  const [activeTab, setActiveTab] = useState('system');

  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation('settings');
  const { user } = useAuth();
  const { hasPermission } = useRBAC(user?.id, user?.role);

  // Modal state management
  const { 
    schoolDetails, 
    users, 
    roles, 
    workflows, 
    loading, 
    isOnline, 
    appVersion,
    isDatabaseModeActive, 
    isUsingRxDBDummyData, 
    triggerSeedRxDB: triggerSeedDatabase, 
    triggerClearRxDB: triggerClearDatabase,
    initializationError
  } = useAppData();
  
  // User management state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const initialUserFormData: UserFormData = { userType: 'student', isActive: true };
  const [userFormData, setUserFormData] = useState<UserFormData>(initialUserFormData);
  
  // Role management state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const initialRoleFormData: RoleFormData = {};
  const [roleFormData, setRoleFormData] = useState<RoleFormData>(initialRoleFormData);
  
  // Workflow management state
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const initialWorkflowFormData: WorkflowFormData = {};
  const [workflowFormData, setWorkflowFormData] = useState<WorkflowFormData>(initialWorkflowFormData);
  
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [currentWorkflowForStates, setCurrentWorkflowForStates] = useState<Workflow | null>(null);
  const [editingState, setEditingState] = useState<WorkflowState | null>(null);
  const initialStateFormData: WorkflowStateFormData = { sequence_order: 0 };
  const [stateFormData, setStateFormData] = useState<WorkflowStateFormData>(initialStateFormData);

  // User management handlers
  const openUserModal = (user?: User) => {
    setEditingUser(user || null);
    setUserFormData(user ? {
      username: user.username,
      email: user.email,
      userType: user.userType,
      isActive: user.isActive,
      role_id: user.role_id
    } : initialUserFormData);
    setIsUserModalOpen(true);
  };
  
  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
    setUserFormData(initialUserFormData);
  };
  
  // Role management handlers
  const openRoleModal = (role?: Role) => {
    setEditingRole(role || null);
    setRoleFormData(role ? { name: role.name, description: role.description } : initialRoleFormData);
    setIsRoleModalOpen(true);
  };
  
  const closeRoleModal = () => {
    setIsRoleModalOpen(false);
    setEditingRole(null);
    setRoleFormData(initialRoleFormData);
  };
  
  // Workflow management handlers
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
  
  const openStateModal = (workflow: Workflow, state?: WorkflowState) => {
    setCurrentWorkflowForStates(workflow);
    setEditingState(state || null);
    setStateFormData(state ? { 
      name: state.name, 
      sequence_order: state.sequence_order 
    } : {
      ...initialStateFormData, 
      sequence_order: (workflow.states?.length || 0) + 1
    });
    setIsStateModalOpen(true);
  };
  
  const closeStateModal = () => {
    setIsStateModalOpen(false);
    setEditingState(null);
    setStateFormData(initialStateFormData);
  };
  
  // Form input handlers
  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                (name === 'role_id' ? (value ? parseInt(value) : undefined) : value);
    setUserFormData(prev => ({ ...prev, [name]: val }));
  };
  
  const handleRoleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRoleFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleWorkflowInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkflowFormData({ ...workflowFormData, [e.target.name]: e.target.value });
  };
  
  const handleStateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setStateFormData({ ...stateFormData, [name]: type === 'number' ? parseInt(value) || 0 : value });
  };
  
  // Submit handlers (with TODO placeholders)
  const handleUserSubmit = async () => {
    if (!userFormData.username || !userFormData.email || !userFormData.userType) {
      alert("Username, Email, and User Type are required.");
      return;
    }
    if (!editingUser && !userFormData.password) {
      alert("Password is required for new users.");
      return;
    }
    // TODO: Implement user management API calls
    alert(editingUser ? "Update user functionality not yet implemented" : "Add user functionality not yet implemented");
    closeUserModal();
  };
  
  const handleRoleSubmit = async () => {
    if (!roleFormData.name) {
      alert("Role name is required.");
      return;
    }
    // TODO: Implement role management API calls
    alert(editingRole ? "Update role functionality not yet implemented" : "Add role functionality not yet implemented");
    closeRoleModal();
  };
  
  const handleWorkflowSubmit = async () => {
    if (!workflowFormData.name) {
      alert("Workflow name is required.");
      return;
    }
    // TODO: Implement workflow management API calls
    alert(editingWorkflow ? "Update workflow functionality not yet implemented" : "Add workflow functionality not yet implemented");
    closeWorkflowModal();
  };
  
  const handleStateSubmit = async () => {
    if (!currentWorkflowForStates || !stateFormData.name || stateFormData.sequence_order === undefined) {
      alert("State name and sequence order are required.");
      return;
    }
    // TODO: Implement workflow state management API calls
    alert("Workflow state management not yet implemented");
    closeStateModal();
  };
  
  // Delete handlers
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      // TODO: Implement delete user API call
      alert("Delete user functionality not yet implemented");
    }
  };
  
  const handleDeleteRole = async (roleId: number) => {
    if (window.confirm('Are you sure you want to delete this role? Users with this role will have it unassigned.')) {
      // TODO: Implement delete role API call
      alert("Delete role functionality not yet implemented");
    }
  };
  
  const handleDeleteWorkflow = async (id: number) => {
    if (window.confirm("Delete this workflow and all its states?")) {
      // TODO: Implement delete workflow API call
      alert("Delete workflow functionality not yet implemented");
      if(currentWorkflowForStates?.id === id) setCurrentWorkflowForStates(null);
    }
  };
  
  const handleDeleteState = async (stateId: number) => {
    if (!currentWorkflowForStates) return;
    if (window.confirm('Delete this workflow state?')) {
      // TODO: Implement delete workflow state API call
      alert("Delete workflow state functionality not yet implemented");
    }
  };

  // Table column definitions
  const userColumns = [
    { header: 'Username', accessor: 'username' as keyof User },
    { header: 'Email', accessor: 'email' as keyof User },
    { header: 'Type', accessor: 'userType' as keyof User },
    { header: 'Status', accessor: 'isActive' as keyof User, render: (user: User) => user.isActive ? 'Active' : 'Inactive' },
    { header: 'Role', accessor: 'role_id' as keyof User, render: (user: User) => {
      const role = roles?.find(r => r.id === user.role_id);
      return role ? role.name : 'No Role';
    }},
    {
      header: 'Actions',
      accessor: ((user: User) => user.id) as any,
      render: (user: User) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openUserModal(user)}
            className="p-1"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteUser(user.id)}
            className="p-1 text-red-600 hover:text-red-700"
          >
            <DeleteIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const roleColumns = [
    { header: 'Role Name', accessor: 'name' as keyof Role },
    { header: 'Description', accessor: 'description' as keyof Role },
    {
      header: 'Actions',
      accessor: ((role: Role) => role.id) as any,
      render: (role: Role) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openRoleModal(role)}
            className="p-1"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteRole(role.id)}
            className="p-1 text-red-600 hover:text-red-700"
          >
            <DeleteIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const workflowColumns = [
    { header: 'Workflow Name', accessor: 'name' as keyof Workflow },
    {
      header: 'States',
      accessor: ((workflow: Workflow) => workflow.states?.length || 0) as any,
      render: (workflow: Workflow) => (
        <div className="flex items-center gap-2">
          <span>{workflow.states?.length || 0} states</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWorkflowForStates(workflow)}
            className="p-1"
          >
            <ListBulletIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: ((workflow: Workflow) => workflow.id) as any,
      render: (workflow: Workflow) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openWorkflowModal(workflow)}
            className="p-1"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteWorkflow(workflow.id)}
            className="p-1 text-red-600 hover:text-red-700"
          >
            <DeleteIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const stateColumns = [
    { header: 'State Name', accessor: 'name' as keyof WorkflowState },
    { header: 'Order', accessor: 'sequence_order' as keyof WorkflowState },
    {
      header: 'Actions',
      accessor: ((state: WorkflowState) => state.id) as any,
      render: (state: WorkflowState) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openStateModal(currentWorkflowForStates!, state)}
            className="p-1"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteState(state.id)}
            className="p-1 text-red-600 hover:text-red-700"
          >
            <DeleteIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  // Enhanced loading state with specific loading indicators
  const isInitialLoading = loading?.all || false;
  const isDataLoading = loading?.schoolDetails || loading?.users || loading?.roles || false;
  
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application data...</p>
          {initializationError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">Error: {initializationError.message}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'system', label: t('tabs.system'), icon: CogIcon },
    { id: 'users', label: t('tabs.users'), icon: UserGroupIcon },
    { id: 'features', label: t('tabs.features'), icon: CogIcon },
    { id: 'sync', label: t('tabs.sync'), icon: ArrowsRightLeftIcon },
    { id: 'workflows', label: t('tabs.workflows'), icon: DatabaseIcon }
  ];

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('description')}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="mr-2 h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">General App Settings</h3>
              <p className="text-gray-600 mb-4">Configure general application settings</p>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Unified Configuration Status:</p>
                  <p className="font-medium">{isConfigLoading ? 'Loading...' : 'Ready'}</p>
                </div>
              </div>
            </div>
          </Card>

          {schoolDetails && (
            <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
                School Profile Overview
                {loading?.schoolDetails && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </h3>
              <p className="text-gray-600 mb-4">Basic information about your school</p>
              {loading?.schoolDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading school details...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">School Name</p>
                      <p className="font-medium">{schoolDetails.name || 'Not set'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium">{schoolDetails.address || 'Not set'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{schoolDetails.phone || 'Not set'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{schoolDetails.email || 'Not set'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Website</p>
                      <p className="font-medium">{schoolDetails.website || 'Not set'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Principal</p>
                      <p className="font-medium">{schoolDetails.principal || 'Not set'}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                    Manage School Profile
                  </Button>
                </>
              )}
            </div>
          </Card>
          )}

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">User Management Overview</h3>
              <p className="text-gray-600 mb-4">Quick overview of user accounts</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-700">{users?.length || 0}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-700">
                    {users?.filter(u => u.isActive).length || 0}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">Inactive Users</p>
                  <p className="text-2xl font-bold text-red-700">
                    {users?.filter(u => !u.isActive).length || 0}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setActiveTab('users')}
              >
                <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Academic Calendar Setup</h3>
              <p className="text-gray-600 mb-4">Configure academic structures and periods</p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                  Configure Academic Structures
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                  Manage Academic Periods
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                  Set Academic Years
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                  Configure School Periods
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Roles &amp; Permissions Overview</h3>
              <p className="text-gray-600 mb-4">Quick access to user roles and workflow management</p>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('users')}
                >
                  <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                  Manage User Roles
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('workflows')}
                >
                  <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                  Configure Workflows
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">System Information</h3>
              <p className="text-gray-600 mb-4">Current system status and version information</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Application Version:</span>
                  <span className="font-medium">{appVersion}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Connection Status:</span>
                  <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Management */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    User Management
                    {loading?.users && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </h3>
                  <p className="text-gray-600">Manage user accounts and permissions</p>
                </div>
                <Button onClick={() => openUserModal()}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
              {loading?.users ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading users...</p>
                  </div>
                </div>
              ) : (
                <Table
                  data={users || []}
                  columns={userColumns}
                  emptyMessage="No users found"
                />
              )}
            </div>
          </Card>

          {/* Role Management */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    Role Management
                    {loading?.roles && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </h3>
                  <p className="text-gray-600">Define and manage user roles</p>
                </div>
                <Button onClick={() => openRoleModal()}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Role
                </Button>
              </div>
              {loading?.roles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading roles...</p>
                  </div>
                </div>
              ) : (
                <Table
                  data={roles || []}
                  columns={roleColumns}
                  emptyMessage="No roles found"
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <FeatureSettingsPage />
      )}

      {/* Sync Tab */}
      {activeTab === 'sync' && (
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Sync Controls</h3>
            <p className="text-gray-600">
              Sync management is centralized in Data Layer Settings together with mode,
              database, and backend configuration.
            </p>
            <Button onClick={() => navigate('/settings/data-layer')}>
              Open Data Layer Settings
            </Button>
          </div>
        </Card>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Workflow Management</h3>
                  <p className="text-gray-600">Configure approval workflows and states</p>
                </div>
                <Button onClick={() => openWorkflowModal()}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Workflow
                </Button>
              </div>
              <Table
                data={workflows || []}
                columns={workflowColumns}
                emptyMessage="No workflows found"
              />
            </div>
          </Card>

          {/* Workflow States */}
          {currentWorkflowForStates && (
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      States for "{currentWorkflowForStates.name}"
                    </h3>
                    <p className="text-gray-600">Manage workflow states and their order</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentWorkflowForStates(null)}
                    >
                      Close
                    </Button>
                    <Button onClick={() => openStateModal(currentWorkflowForStates)}>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add State
                    </Button>
                  </div>
                </div>
                <Table
                  data={currentWorkflowForStates.states || []}
                  columns={stateColumns}
                  emptyMessage="No states found for this workflow"
                />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* User Modal */}
      <DialogForm
        isOpen={isUserModalOpen}
        onClose={closeUserModal}
        title={editingUser ? 'Edit User' : 'Add User'}
        size="lg"
      >
        <FormSection title="User Information" columns={2}>
          <FormField label="Username" required>
            <Input
              name="username"
              value={userFormData.username || ''}
              onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
              placeholder="Enter username"
            />
          </FormField>
          <FormField label="Email" required>
            <Input
              name="email"
              type="email"
              value={userFormData.email || ''}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              placeholder="Enter email"
            />
          </FormField>
        </FormSection>
        <FormSection title="Security">
          <FormField label={editingUser ? "New Password (leave blank to keep current)" : "Password *"} required={!editingUser}>
            <Input
              name="password"
              type="password"
              value={userFormData.password || ''}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              placeholder={editingUser ? "Enter new password (optional)" : "Enter password"}
            />
          </FormField>
        </FormSection>
        <FormSection title="User Details" columns={2}>
          <FormField label="User Type" required>
            <Select
              name="userType"
              value={userFormData.userType}
              onChange={(e) => setUserFormData({ ...userFormData, userType: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
              <option value="parent">Parent</option>
            </Select>
          </FormField>
          <FormField label="Role" required>
            <Select
              name="role_id"
              value={userFormData.role_id || ''}
              onChange={(e) => setUserFormData({ ...userFormData, role_id: parseInt(e.target.value) })}
            >
              <option value="">Select Role</option>
              {roles?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </FormField>
        </FormSection>
        <FormSection>
          <FormField>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={userFormData.isActive}
                onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-900">Active</span>
            </label>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeUserModal}>
            Cancel
          </Button>
          <Button onClick={handleUserSubmit}>
            {editingUser ? 'Update User' : 'Create User'}
          </Button>
        </FormActions>
      </DialogForm>

      {/* Role Modal */}
      <DialogForm
        isOpen={isRoleModalOpen}
        onClose={closeRoleModal}
        title={editingRole ? 'Edit Role' : 'Add Role'}
        size="md"
      >
        <FormSection title="Role Information">
          <FormField label="Role Name" required>
            <Input
              name="name"
              value={roleFormData.name || ''}
              onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
              placeholder="Enter role name"
            />
          </FormField>
          <FormField label="Description">
            <Input
              name="description"
              value={roleFormData.description || ''}
              onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
              placeholder="Enter role description"
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeRoleModal}>
            Cancel
          </Button>
          <Button onClick={handleRoleSubmit}>
            {editingRole ? 'Update Role' : 'Create Role'}
          </Button>
        </FormActions>
      </DialogForm>

      {/* Workflow Modal */}
      <DialogForm
        isOpen={isWorkflowModalOpen}
        onClose={closeWorkflowModal}
        title={editingWorkflow ? 'Edit Workflow' : 'Add Workflow'}
        size="md"
      >
        <FormSection title="Workflow Information">
          <FormField label="Workflow Name" required>
            <Input
              name="name"
              value={workflowFormData.name || ''}
              onChange={(e) => setWorkflowFormData({ ...workflowFormData, name: e.target.value })}
              placeholder="Enter workflow name"
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeWorkflowModal}>
            Cancel
          </Button>
          <Button onClick={handleWorkflowSubmit}>
            {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
          </Button>
        </FormActions>
      </DialogForm>

      {/* State Modal */}
      <DialogForm
        isOpen={isStateModalOpen}
        onClose={closeStateModal}
        title={editingState ? 'Edit State' : 'Add State'}
        size="md"
      >
        <FormSection title="State Information">
          <FormField label="State Name" required>
            <Input
              name="name"
              value={stateFormData.name || ''}
              onChange={(e) => setStateFormData({ ...stateFormData, name: e.target.value })}
              placeholder="Enter state name"
            />
          </FormField>
          <FormField label="Sequence Order" required>
            <Input
              name="sequence_order"
              type="number"
              value={stateFormData.sequence_order || ''}
              onChange={(e) => setStateFormData({ ...stateFormData, sequence_order: parseInt(e.target.value) })}
              placeholder="Enter sequence order"
              min={1}
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeStateModal}>
            Cancel
          </Button>
          <Button onClick={handleStateSubmit}>
            {editingState ? 'Update State' : 'Create State'}
          </Button>
        </FormActions>
      </DialogForm>
    </PageContainer>
  );
};

// Form data types
type UserFormData = {
  username?: string;
  email?: string;
  password?: string;
  userType: string;
  isActive: boolean;
  role_id?: number | null;
};

type RoleFormData = {
  name?: string;
  description?: string | null;
};

type WorkflowFormData = {
  name?: string;
};

type WorkflowStateFormData = {
  name?: string;
  sequence_order?: number;
};

const UnifiedSettingsPage: React.FC = () => {
  return <UnifiedSettingsContent />;
};

export default UnifiedSettingsPage;