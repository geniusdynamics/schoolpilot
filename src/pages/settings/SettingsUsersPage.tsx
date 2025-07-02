import React, { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import { UserGroupIcon, PlusIcon, EditIcon, DeleteIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; 
import { User, Role } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import type { RbacRole } from '../../core/types';

type UserFormData = Omit<Partial<User>, 'id' | 'created_at' | 'updated_at' | 'last_login_at' | 'hashed_password' | 'display_name' | 'role' | 'user_type' | 'is_active'> & {
    password?: string;
    user_type: UserType;
    is_active: boolean;
};
type RoleFormData = Omit<Partial<Role>, 'id' | 'created_at' | 'updated_at'>;


const SettingsUsersPage: React.FC = () => {
  const context = useAppData();
  const { 
    users, 
    roles, // legacy roles for UI
    loading, 
    addRole,
    updateRole,
    deleteRole
  } = context; 
  const rbacRoles: RbacRole[] = (context as any).rbacRoles || [];

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const initialUserFormData: UserFormData = { username: '', email: '', user_type: UserType.STAFF, is_active: true, role_id: undefined };
  const [userFormData, setUserFormData] = useState<UserFormData>(initialUserFormData);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const initialRoleFormData: RoleFormData = { name: '', description: '' };
  const [roleFormData, setRoleFormData] = useState<RoleFormData>(initialRoleFormData);


  // User Modal
  const openUserModal = (user?: User) => {
    setEditingUser(user || null);
    setUserFormData(user ? 
      { username: user.username, email: user.email, user_type: user.user_type, is_active: user.is_active, role_id: user.role_id } : 
      initialUserFormData
    );
    setIsUserModalOpen(true);
  };
  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
    setUserFormData(initialUserFormData);
  };

  // Role Modal
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


  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (name === 'role_id' ? (value ? parseInt(value) : undefined) : value);
    setUserFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleRoleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRoleFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserSubmit = async () => {
    if (!userFormData.username || !userFormData.email || !userFormData.user_type) {
      alert("Username, Email, and User Type are required.");
      return;
    }
    if (!editingUser && !userFormData.password) {
        alert("Password is required for new users.");
        return;
    }
    
    const now = new Date().toISOString();
    const payload: Omit<User, 'id' | 'last_login_at' | 'hashed_password' | 'display_name' | 'role' | 'created_at' | 'updated_at'> & {created_at?:string, updated_at?:string} = {
        username: userFormData.username!,
        email: userFormData.email!,
        user_type: userFormData.user_type,
        is_active: userFormData.is_active,
        role_id: userFormData.role_id ? Number(userFormData.role_id) : undefined,
        password: userFormData.password, // Will be ignored if editingUser
    };

    if (editingUser) {
      // TODO: Implement updateRole
    } else {
      // TODO: Implement addRole
    }
    closeUserModal();
  };

  const handleRoleSubmit = async () => {
    if (!roleFormData.name) {
        alert("Role name is required.");
        return;
    }
    const payload = {
        name: roleFormData.name!,
        description: roleFormData.description || undefined,
    };
    if (editingRole) {
        // TODO: Implement updateRole
    } else {
        // TODO: Implement addRole
    }
    closeRoleModal();
  };


  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      // TODO: Implement deleteRole
    }
  };
  const handleDeleteRole = async (roleId: number) => {
    if (window.confirm('Are you sure you want to delete this role? Users with this role will have it unassigned.')) {
        // TODO: Implement deleteRole
    }
  };

  const userColumns = [
    { header: 'Username', accessor: 'username' as keyof User },
    { header: 'Email', accessor: 'email' as keyof User },
    { header: 'User Type', accessor: 'user_type' as keyof User},
    { header: 'Role', accessor: 'role' as keyof User }, 
    { header: 'Status', accessor: 'is_active' as keyof User },
    {
      header: 'Actions',
      accessor: 'id' as keyof User,
      render: (item: User) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openUserModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteUser(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    }
  ];
  const roleColumns = [
    { header: 'ID', accessor: 'id' as keyof Role },
    { header: 'Role Name', accessor: 'name' as keyof Role },
    { header: 'Description', accessor: 'description' as keyof Role },
    {
      header: 'Actions',
      accessor: 'id' as keyof Role,
      render: (item: Role) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openRoleModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteRole(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    }
  ];

  const isLoadingPage = loading.users || loading.roles;

  return (
    <div className="space-y-6">
      <Card title="User Accounts Management" actions={
        <Button onClick={() => openUserModal()} leftIcon={<PlusIcon className="w-5 h-5"/>}>Add User</Button>
      }>
        <div className="text-center py-4 border-b mb-4">
          <UserGroupIcon className="w-12 h-12 text-sky-500 mx-auto mb-2" />
          <h2 className="text-xl font-semibold text-gray-700">Manage System Users</h2>
          <p className="text-gray-500 text-sm">Create, edit, and manage user accounts and their roles.</p>
        </div>
         {loading.users ? (
          <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">Loading users...</span></div>
        ) : (
          <Table columns={userColumns} data={users} isLoading={loading.users} />
        )}
      </Card>

      <Card title="Roles Management" actions={
        <Button onClick={() => openRoleModal()} leftIcon={<PlusIcon className="w-5 h-5"/>}>Add Role</Button>
      }>
         {loading.roles ? (
          <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">Loading roles...</span></div>
        ) : (
          <Table columns={roleColumns} data={roles} isLoading={loading.roles} />
        )}
      </Card>

      {/* User Modal */}
      <Modal isOpen={isUserModalOpen} onClose={closeUserModal} title={editingUser ? 'Edit User' : 'Add New User'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeUserModal}>Cancel</Button>
            <Button onClick={handleUserSubmit} disabled={loading.users}>
              {loading.users ? <Spinner size="sm"/> : (editingUser ? 'Save Changes' : 'Add User')}
            </Button>
          </>
        }
      >
        <Input name="username" label="Username" value={userFormData.username || ''} onChange={handleUserInputChange} required />
        <Input name="email" label="Email" type="email" value={userFormData.email || ''} onChange={handleUserInputChange} required />
        {!editingUser && (
            <Input name="password" label="Password" type="password" value={userFormData.password || ''} onChange={handleUserInputChange} required />
        )}
        <Select name="user_type" label="User Type" value={userFormData.user_type} onChange={handleUserInputChange} required>
            {Object.values(UserType).map(type => (<option key={type} value={type}>{type}</option>))}
        </Select>
        <Select name="role_id" label="Role" value={userFormData.role_id || ''} onChange={handleUserInputChange}>
            <option value="">Select Role</option>
            {roles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}
        </Select>
        <div className="mt-4 flex items-center">
            <input id="is_active_user" name="is_active" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                checked={userFormData.is_active} onChange={handleUserInputChange} />
            <label htmlFor="is_active_user" className="ml-2 block text-sm text-gray-900">Is Active User</label>
        </div>
      </Modal>

      {/* Role Modal */}
      <Modal isOpen={isRoleModalOpen} onClose={closeRoleModal} title={editingRole ? 'Edit Role' : 'Add New Role'}
        footer={
          <>
            <Button variant="secondary" onClick={closeRoleModal}>Cancel</Button>
            <Button onClick={handleRoleSubmit} disabled={loading.roles}>
              {loading.roles ? <Spinner size="sm"/> : (editingRole ? 'Save Changes' : 'Add Role')}
            </Button>
          </>
        }
      >
        <Input name="name" label="Role Name" value={roleFormData.name || ''} onChange={handleRoleInputChange} required />
        <Input name="description" label="Description (Optional)" value={roleFormData.description || ''} onChange={handleRoleInputChange} />
      </Modal>
    </div>
  );
};

export default SettingsUsersPage;
