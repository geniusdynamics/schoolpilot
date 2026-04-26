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
import { moduleRegistry } from '@/core/moduleRegistry';

// Types for User Permissions System
export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'admin';
  resource: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
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
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    fullName: '',
    customPermissions: [] as string[],
    isActive: true
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
    // Dynamically generate mock users and user types based on available modules
    setUsers([
      {
        id: '1',
        username: 'admin',
        email: 'admin@school.com',
        fullName: 'System Administrator',
        customPermissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Dynamically generate permissions for all modules
    const dynamicPermissions = moduleRegistry.getAllMetadata().flatMap(module => [
      { id: `${module.id}.read`, name: `View ${module.name}`, description: `View ${module.name} information`, module: module.id, action: 'read' as Permission['action'], resource: module.id },
      { id: `${module.id}.create`, name: `Create ${module.name} Records`, description: `Create new ${module.name} records`, module: module.id, action: 'create' as Permission['action'], resource: module.id },
      { id: `${module.id}.update`, name: `Update ${module.name} Records`, description: `Modify ${module.name} records`, module: module.id, action: 'update' as Permission['action'], resource: module.id },
      { id: `${module.id}.delete`, name: `Delete ${module.name} Records`, description: `Remove ${module.name} records`, module: module.id, action: 'delete' as Permission['action'], resource: module.id }
    ]);
    dynamicPermissions.push({ id: '*', name: 'All Permissions', description: 'Full system access', module: 'all', action: 'admin' as Permission['action'], resource: 'all' });
    setPermissions(dynamicPermissions);
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
    setUserForm({ username: '', email: '', fullName: '', customPermissions: [], isActive: true });
    setMessage({ type: 'success', text: `User ${editingUser ? 'updated' : 'created'} successfully` });
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
      customPermissions: user.customPermissions,
      isActive: user.isActive
    });
    setShowUserModal(true);
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

  const handleDeletePermission = (permissionId: string) => {
    if (permissionId === '*') {
      setMessage({ type: 'error', text: 'Cannot delete admin permission' });
      return;
    }
    setPermissions(perms => perms.filter(p => p.id !== permissionId));
    setMessage({ type: 'success', text: 'Permission deleted successfully' });
  };

  const getPermissionNames = (permissionIds: string[]) => {
    return permissionIds.map(id => permissions.find(p => p.id === id)?.name || id).join(', ');
  };

  const userColumns = [
    { header: 'Username', accessor: 'username' as keyof User },
    { header: 'Full Name', accessor: 'fullName' as keyof User },
    { header: 'Email', accessor: 'email' as keyof User },
    { header: 'Active', accessor: (user: User) => user.isActive ? 'Yes' : 'No' },
    { header: 'Actions', accessor: (user: User) => (
      <Button size="sm" onClick={() => handleEditUser(user)}>Edit</Button>
    ) }
  ];

  const permissionColumns = [
    { header: 'Name', accessor: 'name' as keyof Permission },
    { header: 'Description', accessor: 'description' as keyof Permission },
    { header: 'Module', accessor: 'module' as keyof Permission },
    { header: 'Action', accessor: 'action' as keyof Permission },
    { header: 'Resource', accessor: 'resource' as keyof Permission },
    { header: 'Actions', accessor: (permission: Permission) => (
      <Button size="sm" onClick={() => handleEditPermission(permission)}>Edit</Button>
    ) }
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
          setUserForm({ username: '', email: '', fullName: '', customPermissions: [], isActive: true });
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
            {moduleRegistry.getAllMetadata().map(module => (
              <option key={module.id} value={module.id}>{module.name}</option>
            ))}
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