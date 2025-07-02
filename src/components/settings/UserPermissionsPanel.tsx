// ABOUTME: User permissions management panel for settings page
// ABOUTME: Allows defining user types, individual permissions, and role-based access control

import React, { useState, useEffect } from 'react';
import { 
  CheckIcon, 
  XIcon, 
  PlusIcon,
  DeleteIcon,
  EyeIcon,
  EyeSlashIcon,
  UsersIcon,
  ShieldCheckIcon
} from '../ui/icons';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Table from '../ui/Table';

// Types for User Permissions System
export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'admin';
  resource: string;
}

export interface UserType {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Permission IDs
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  userTypeId: string;
  customPermissions: string[]; // Additional permission IDs
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserPermissionsPanelProps {
  className?: string;
}

const UserPermissionsPanel: React.FC<UserPermissionsPanelProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'types' | 'permissions'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingType, setEditingType] = useState<UserType | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    fullName: '',
    userTypeId: '',
    customPermissions: [] as string[],
    isActive: true
  });

  const [typeForm, setTypeForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    isDefault: false
  });

  const [permissionForm, setPermissionForm] = useState({
    name: '',
    description: '',
    module: '',
    action: 'read' as Permission['action'],
    resource: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load mock data for demo mode
    setUsers([
      {
        id: '1',
        username: 'admin',
        email: 'admin@school.com',
        fullName: 'System Administrator',
        userTypeId: 'admin',
        customPermissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        username: 'teacher1',
        email: 'teacher1@school.com',
        fullName: 'John Smith',
        userTypeId: 'teacher',
        customPermissions: ['academics.read', 'academics.update'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        username: 'finance1',
        email: 'finance1@school.com',
        fullName: 'Jane Doe',
        userTypeId: 'finance',
        customPermissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    setUserTypes([
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: ['*'],
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'teacher',
        name: 'Teacher',
        description: 'Academic module access',
        permissions: ['academics.read', 'academics.update', 'students.read'],
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'finance',
        name: 'Finance Officer',
        description: 'Financial module access',
        permissions: ['finance.read', 'finance.update', 'finance.create'],
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'student',
        name: 'Student',
        description: 'Limited student access',
        permissions: ['academics.read', 'finance.read'],
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    setPermissions([
      { id: 'academics.read', name: 'View Academics', description: 'View academic information', module: 'academics', action: 'read', resource: 'academics' },
      { id: 'academics.create', name: 'Create Academic Records', description: 'Create new academic records', module: 'academics', action: 'create', resource: 'academics' },
      { id: 'academics.update', name: 'Update Academic Records', description: 'Modify academic records', module: 'academics', action: 'update', resource: 'academics' },
      { id: 'academics.delete', name: 'Delete Academic Records', description: 'Remove academic records', module: 'academics', action: 'delete', resource: 'academics' },
      { id: 'finance.read', name: 'View Finance', description: 'View financial information', module: 'finance', action: 'read', resource: 'finance' },
      { id: 'finance.create', name: 'Create Financial Records', description: 'Create new financial records', module: 'finance', action: 'create', resource: 'finance' },
      { id: 'finance.update', name: 'Update Financial Records', description: 'Modify financial records', module: 'finance', action: 'update', resource: 'finance' },
      { id: 'students.read', name: 'View Students', description: 'View student information', module: 'administration', action: 'read', resource: 'students' },
      { id: 'students.update', name: 'Update Students', description: 'Modify student records', module: 'administration', action: 'update', resource: 'students' },
      { id: '*', name: 'All Permissions', description: 'Full system access', module: 'all', action: 'admin', resource: 'all' }
    ]);
  };

  const handleSaveUser = () => {
    if (editingUser) {
      // Update existing user
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...userForm, updatedAt: new Date() } : u));
    } else {
      // Create new user
      const newUser: User = {
        id: Date.now().toString(),
        ...userForm,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setUsers([...users, newUser]);
    }
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({ username: '', email: '', fullName: '', userTypeId: '', customPermissions: [], isActive: true });
    setMessage({ type: 'success', text: `User ${editingUser ? 'updated' : 'created'} successfully` });
  };

  const handleSaveType = () => {
    if (editingType) {
      // Update existing type
      setUserTypes(types => types.map(t => t.id === editingType.id ? { ...t, ...typeForm, updatedAt: new Date() } : t));
    } else {
      // Create new type
      const newType: UserType = {
        id: typeForm.name.toLowerCase().replace(/\s+/g, '_'),
        ...typeForm,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setUserTypes([...userTypes, newType]);
    }
    setShowTypeModal(false);
    setEditingType(null);
    setTypeForm({ name: '', description: '', permissions: [], isDefault: false });
    setMessage({ type: 'success', text: `User type ${editingType ? 'updated' : 'created'} successfully` });
  };

  const handleSavePermission = () => {
    if (editingPermission) {
      // Update existing permission
      setPermissions(perms => perms.map(p => p.id === editingPermission.id ? { ...p, ...permissionForm } : p));
    } else {
      // Create new permission
      const newPermission: Permission = {
        id: `${permissionForm.module}.${permissionForm.action}`,
        ...permissionForm
      };
      setPermissions([...permissions, newPermission]);
    }
    setShowPermissionModal(false);
    setEditingPermission(null);
    setPermissionForm({ name: '', description: '', module: '', action: 'read', resource: '' });
    setMessage({ type: 'success', text: `Permission ${editingPermission ? 'updated' : 'created'} successfully` });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      userTypeId: user.userTypeId,
      customPermissions: user.customPermissions,
      isActive: user.isActive
    });
    setShowUserModal(true);
  };

  const handleEditType = (type: UserType) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      description: type.description,
      permissions: type.permissions,
      isDefault: type.isDefault
    });
    setShowTypeModal(true);
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setPermissionForm({
      name: permission.name,
      description: permission.description,
      module: permission.module,
      action: permission.action,
      resource: permission.resource
    });
    setShowPermissionModal(true);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
    setMessage({ type: 'success', text: 'User deleted successfully' });
  };

  const handleDeleteType = (typeId: string) => {
    if (userTypes.find(t => t.id === typeId)?.isDefault) {
      setMessage({ type: 'error', text: 'Cannot delete default user type' });
      return;
    }
    setUserTypes(types => types.filter(t => t.id !== typeId));
    setMessage({ type: 'success', text: 'User type deleted successfully' });
  };

  const handleDeletePermission = (permissionId: string) => {
    if (permissionId === '*') {
      setMessage({ type: 'error', text: 'Cannot delete admin permission' });
      return;
    }
    setPermissions(perms => perms.filter(p => p.id !== permissionId));
    setMessage({ type: 'success', text: 'Permission deleted successfully' });
  };

  const getUserTypeName = (typeId: string) => {
    return userTypes.find(t => t.id === typeId)?.name || typeId;
  };

  const getPermissionNames = (permissionIds: string[]) => {
    return permissionIds.map(id => permissions.find(p => p.id === id)?.name || id).join(', ');
  };

  const userColumns = [
    { header: 'Username', accessor: 'username' },
    { header: 'Full Name', accessor: 'fullName' },
    { header: 'Email', accessor: 'email' },
    { 
      header: 'User Type', 
      accessor: 'userTypeId',
      render: (user: User) => getUserTypeName(user.userTypeId)
    },
    { 
      header: 'Custom Permissions', 
      accessor: 'customPermissions',
      render: (user: User) => getPermissionNames(user.customPermissions)
    },
    { 
      header: 'Status', 
      accessor: 'isActive',
      render: (user: User) => user.isActive ? 'Active' : 'Inactive'
    },
    { 
      header: 'Actions', 
      accessor: 'id',
      render: (user: User) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleEditUser(user)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteUser(user.id)}>Delete</Button>
        </div>
      )
    }
  ];

  const typeColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Description', accessor: 'description' },
    { 
      header: 'Permissions', 
      accessor: 'permissions',
      render: (type: UserType) => getPermissionNames(type.permissions)
    },
    { 
      header: 'Default', 
      accessor: 'isDefault',
      render: (type: UserType) => type.isDefault ? 'Yes' : 'No'
    },
    { 
      header: 'Actions', 
      accessor: 'id',
      render: (type: UserType) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleEditType(type)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteType(type.id)}>Delete</Button>
        </div>
      )
    }
  ];

  const permissionColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Description', accessor: 'description' },
    { header: 'Module', accessor: 'module' },
    { header: 'Action', accessor: 'action' },
    { header: 'Resource', accessor: 'resource' },
    { 
      header: 'Actions', 
      accessor: 'id',
      render: (permission: Permission) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleEditPermission(permission)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeletePermission(permission.id)}>Delete</Button>
        </div>
      )
    }
  ];

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">User Permissions Management</h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage users, user types, and permissions for role-based access control.
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`px-6 py-3 border-b ${
          message.type === 'success' ? 'bg-green-50 border-green-200' :
          message.type === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className={`flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'text-green-800' :
            message.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'users', label: 'Users', icon: UsersIcon },
            { id: 'types', label: 'User Types', icon: ShieldCheckIcon },
            { id: 'permissions', label: 'Permissions', icon: EyeIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium">System Users</h4>
              <Button onClick={() => setShowUserModal(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
            <Table data={users} columns={userColumns} />
          </div>
        )}

        {/* User Types Tab */}
        {activeTab === 'types' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium">User Types</h4>
              <Button onClick={() => setShowTypeModal(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add User Type
              </Button>
            </div>
            <Table data={userTypes} columns={typeColumns} />
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium">Permissions</h4>
              <Button onClick={() => setShowPermissionModal(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Permission
              </Button>
            </div>
            <Table data={permissions} columns={permissionColumns} />
          </div>
        )}
      </div>

      {/* User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
          setUserForm({ username: '', email: '', fullName: '', userTypeId: '', customPermissions: [], isActive: true });
        }}
        title={editingUser ? 'Edit User' : 'Add User'}
      >
        <div className="space-y-4">
          <Input
            label="Username"
            value={userForm.username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserForm({ ...userForm, username: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={userForm.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserForm({ ...userForm, email: e.target.value })}
            required
          />
          <Input
            label="Full Name"
            value={userForm.fullName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserForm({ ...userForm, fullName: e.target.value })}
            required
          />
          <Select
            label="User Type"
            value={userForm.userTypeId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUserForm({ ...userForm, userTypeId: e.target.value })}
            required
          >
            <option value="">Select User Type</option>
            {userTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </Select>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={userForm.isActive}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserForm({ ...userForm, isActive: e.target.checked })}
            />
            <label htmlFor="isActive">Active</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancel</Button>
          <Button onClick={handleSaveUser}>Save</Button>
        </div>
      </Modal>

      {/* User Type Modal */}
      <Modal
        isOpen={showTypeModal}
        onClose={() => {
          setShowTypeModal(false);
          setEditingType(null);
          setTypeForm({ name: '', description: '', permissions: [], isDefault: false });
        }}
        title={editingType ? 'Edit User Type' : 'Add User Type'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={typeForm.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypeForm({ ...typeForm, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={typeForm.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypeForm({ ...typeForm, description: e.target.value })}
            required
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Permissions</label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2">
              {permissions.map(permission => (
                <div key={permission.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id={permission.id}
                    checked={typeForm.permissions.includes(permission.id)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      if (e.target.checked) {
                        setTypeForm({ ...typeForm, permissions: [...typeForm.permissions, permission.id] });
                      } else {
                        setTypeForm({ ...typeForm, permissions: typeForm.permissions.filter(p => p !== permission.id) });
                      }
                    }}
                  />
                  <label htmlFor={permission.id} className="text-sm">{permission.name}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={typeForm.isDefault}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypeForm({ ...typeForm, isDefault: e.target.checked })}
            />
            <label htmlFor="isDefault">Default User Type</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowTypeModal(false)}>Cancel</Button>
          <Button onClick={handleSaveType}>Save</Button>
        </div>
      </Modal>

      {/* Permission Modal */}
      <Modal
        isOpen={showPermissionModal}
        onClose={() => {
          setShowPermissionModal(false);
          setEditingPermission(null);
          setPermissionForm({ name: '', description: '', module: '', action: 'read', resource: '' });
        }}
        title={editingPermission ? 'Edit Permission' : 'Add Permission'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={permissionForm.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPermissionForm({ ...permissionForm, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={permissionForm.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPermissionForm({ ...permissionForm, description: e.target.value })}
            required
          />
          <Select
            label="Module"
            value={permissionForm.module}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPermissionForm({ ...permissionForm, module: e.target.value })}
            required
          >
            <option value="">Select Module</option>
            <option value="academics">Academics</option>
            <option value="administration">Administration</option>
            <option value="finance">Finance</option>
            <option value="hr">HR</option>
            <option value="inventory">Inventory</option>
            <option value="library">Library</option>
            <option value="nutrition">Nutrition</option>
            <option value="reports">Reports</option>
            <option value="settings">Settings</option>
          </Select>
          <Select
            label="Action"
            value={permissionForm.action}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPermissionForm({ ...permissionForm, action: e.target.value as Permission['action'] })}
            required
          >
            <option value="read">Read</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="admin">Admin</option>
          </Select>
          <Input
            label="Resource"
            value={permissionForm.resource}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPermissionForm({ ...permissionForm, resource: e.target.value })}
            required
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowPermissionModal(false)}>Cancel</Button>
          <Button onClick={handleSavePermission}>Save</Button>
        </div>
      </Modal>
    </div>
  );
};

export default UserPermissionsPanel;