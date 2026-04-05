import React, { useState, useMemo, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import { UserGroupIcon, PlusIcon, EditIcon, DeleteIcon, ExclamationTriangleIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import { User, Role } from '@/types';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import { FormSection, FormField, FormActions } from '@/components/ui/forms';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { RbacRole } from '@/core/types';
import { useTranslation } from 'react-i18next';
import { databaseService } from '@/services/database/databaseService';
import { hashPassword, checkPasswordComplexity } from '@/utils/passwordHash';
import { useToast } from '@/hooks/useToast';

type UserFormData = Omit<Partial<User>, 'id' | 'created_at' | 'updated_at' | 'last_login_at' | 'hashed_password' | 'display_name' | 'role' | 'userType' | 'isActive'> & {
    password?: string;
    userType: string;
    isActive: boolean;
};
type RoleFormData = Omit<Partial<Role>, 'id' | 'created_at' | 'updated_at'>;

// Add a string array of user types for the dropdown
const USER_TYPES = ['Staff', 'Student', 'Parent', 'Supplier'];

const SettingsUsersPage: React.FC = () => {
  const context = useAppData();
  const {
    users,
    roles, // legacy roles for UI
    loading,
    addRole,
    updateRole,
    deleteRole,
    refreshCollection
  } = context;
  const rbacRoles: RbacRole[] = (context as any).rbacRoles || [];
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const initialUserFormData: UserFormData = { username: '', email: '', userType: '', isActive: true, role_id: undefined };
  const [userFormData, setUserFormData] = useState<UserFormData>(initialUserFormData);
  const [userFormErrors, setUserFormErrors] = useState<Record<string, string>>({});
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const initialRoleFormData: RoleFormData = { name: '', description: '' };
  const [roleFormData, setRoleFormData] = useState<RoleFormData>(initialRoleFormData);

  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isDeleteRoleModalOpen, setIsDeleteRoleModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);


  // User Modal
  const openUserModal = (user?: User) => {
    setEditingUser(user || null);
    setUserFormData(user ? 
      { username: user.username, email: user.email, userType: user.userType, isActive: user.isActive, role_id: user.role_id } : 
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
    // Clear error for this field when user starts typing
    if (userFormErrors[name]) {
      setUserFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate user form
  const validateUserForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!userFormData.username?.trim()) {
      errors.username = t('Username is required');
    } else if (userFormData.username.length < 3) {
      errors.username = t('Username must be at least 3 characters');
    }

    if (!userFormData.email?.trim()) {
      errors.email = t('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email)) {
      errors.email = t('Please enter a valid email address');
    }

    if (!userFormData.userType) {
      errors.userType = t('User Type is required');
    }

    // Password validation for new users
    if (!editingUser) {
      if (!userFormData.password) {
        errors.password = t('Password is required for new users');
      } else {
        const complexity = checkPasswordComplexity(userFormData.password);
        if (!complexity.valid) {
          errors.password = complexity.errors.join(', ');
        }
      }
    }

    // Password validation for existing users (only if provided)
    if (editingUser && userFormData.password) {
      const complexity = checkPasswordComplexity(userFormData.password);
      if (!complexity.valid) {
        errors.password = complexity.errors.join(', ');
      }
    }

    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUserSubmit = async () => {
    if (!validateUserForm()) {
      return;
    }

    setIsSubmittingUser(true);

    try {
      const usersCollection = databaseService.getCollection<User>('users');
      if (!usersCollection) {
        throw new Error('Users collection not available');
      }

      const now = new Date().toISOString();

      if (editingUser) {
        // Update existing user
        const updateData: Partial<User> = {
          username: userFormData.username!,
          email: userFormData.email!,
          userType: userFormData.userType,
          isActive: userFormData.isActive,
          role_id: userFormData.role_id ? Number(userFormData.role_id) : undefined,
        };

        // Only hash and update password if provided
        if (userFormData.password) {
          const hashedPassword = await hashPassword(userFormData.password);
          (updateData as any).hashed_password = `${hashedPassword.hash}:${hashedPassword.salt}:${hashedPassword.iterations}`;
        }

        await usersCollection.update(editingUser.id, updateData);
        showSuccess(t('User updated successfully'));
      } else {
        // Create new user
        const hashedPassword = await hashPassword(userFormData.password!);

        const newUser: Omit<User, 'id'> = {
          username: userFormData.username!,
          email: userFormData.email!,
          userType: userFormData.userType,
          isActive: userFormData.isActive,
          role_id: userFormData.role_id ? Number(userFormData.role_id) : undefined,
          hashed_password: `${hashedPassword.hash}:${hashedPassword.salt}:${hashedPassword.iterations}`,
        };

        await usersCollection.insert(newUser);
        showSuccess(t('User created successfully'));
      }

      // Refresh users collection
      await refreshCollection('users');
      closeUserModal();
    } catch (error) {
      console.error('Error saving user:', error);
      showError(error instanceof Error ? error.message : t('Failed to save user'));
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [roleFormErrors, setRoleFormErrors] = useState<Record<string, string>>({});

  // Validate role form
  const validateRoleForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!roleFormData.name?.trim()) {
      errors.name = t('Role name is required');
    } else if (roleFormData.name.length < 2) {
      errors.name = t('Role name must be at least 2 characters');
    }

    setRoleFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRoleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRoleFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (roleFormErrors[name]) {
      setRoleFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleSubmit = async () => {
    if (!validateRoleForm()) {
      return;
    }

    setIsSubmittingRole(true);

    try {
      const payload = {
        name: roleFormData.name!,
        description: roleFormData.description || undefined,
      };

      if (editingRole) {
        await updateRole(editingRole.id, payload);
        showSuccess(t('Role updated successfully'));
      } else {
        await addRole(payload);
        showSuccess(t('Role created successfully'));
      }

      closeRoleModal();
    } catch (error) {
      console.error('Error saving role:', error);
      showError(error instanceof Error ? error.message : t('Failed to save role'));
    } finally {
      setIsSubmittingRole(false);
    }
  };


  // Open delete confirmation modal for user
  const openDeleteUserModal = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Close delete confirmation modal
  const closeDeleteUserModal = () => {
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  // Handle actual user deletion
  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);

    try {
      const usersCollection = databaseService.getCollection<User>('users');
      if (!usersCollection) {
        throw new Error('Users collection not available');
      }

      await usersCollection.remove(userToDelete.id);
      showSuccess(t('User deleted successfully'));

      // Refresh users collection
      await refreshCollection('users');
      closeDeleteUserModal();
    } catch (error) {
      console.error('Error deleting user:', error);
      showError(error instanceof Error ? error.message : t('Failed to delete user'));
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Open delete confirmation modal for role
  const openDeleteRoleModal = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteRoleModalOpen(true);
  };

  // Close delete confirmation modal for role
  const closeDeleteRoleModal = () => {
    setIsDeleteRoleModalOpen(false);
    setRoleToDelete(null);
  };

  const handleDeleteRoleConfirm = async () => {
    if (!roleToDelete) return;

    setIsDeletingRole(true);

    try {
      await deleteRole(roleToDelete.id);
      showSuccess(t('Role deleted successfully'));
      closeDeleteRoleModal();
    } catch (error) {
      console.error('Error deleting role:', error);
      showError(error instanceof Error ? error.message : t('Failed to delete role'));
    } finally {
      setIsDeletingRole(false);
    }
  };

  const userColumns = [
    { header: 'Username', key: 'username' as keyof User },
    { header: 'Email', key: 'email' as keyof User },
    { header: 'User Type', key: 'userType' as keyof User},
    { header: 'Role', key: 'role' as keyof User },
    { header: 'Status', key: 'isActive' as keyof User },
    {
      header: 'Actions',
      key: 'id' as keyof User,
      render: (_value: any, item: User) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openUserModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => openDeleteUserModal(item)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    }
  ];
  const roleColumns = [
    { header: 'ID', key: 'id' as keyof Role },
    { header: 'Role Name', key: 'name' as keyof Role },
    { header: 'Description', key: 'description' as keyof Role },
    {
      header: 'Actions',
      key: 'id' as keyof Role,
      render: (_value: any, item: Role) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openRoleModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => openDeleteRoleModal(item)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
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
      <DialogForm
        isOpen={isUserModalOpen}
        onClose={closeUserModal}
        title={editingUser ? 'Edit User' : 'Add New User'}
        size="lg"
      >
        <FormSection title="User Information" columns={2}>
          <FormField label="Username" required>
            <Input
              name="username"
              value={userFormData.username || ''}
              onChange={handleUserInputChange}
              required
              error={userFormErrors.username}
            />
          </FormField>
          <FormField label="Email" required>
            <Input
              name="email"
              type="email"
              value={userFormData.email || ''}
              onChange={handleUserInputChange}
              required
              error={userFormErrors.email}
            />
          </FormField>
        </FormSection>
        <FormSection title="Security">
          {!editingUser && (
            <FormField label="Password" required error={userFormErrors.password}>
              <Input
                name="password"
                type="password"
                value={userFormData.password || ''}
                onChange={handleUserInputChange}
                required
                error={userFormErrors.password}
                helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
              />
            </FormField>
          )}
          {editingUser && (
            <FormField label="New Password (leave blank to keep current)" error={userFormErrors.password}>
              <Input
                name="password"
                type="password"
                value={userFormData.password || ''}
                onChange={handleUserInputChange}
                error={userFormErrors.password}
                helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
              />
            </FormField>
          )}
        </FormSection>
        <FormSection title="User Details" columns={2}>
          <FormField label="User Type" required error={userFormErrors.userType}>
            <Select
              name="userType"
              value={userFormData.userType}
              onChange={handleUserInputChange}
              required
              error={userFormErrors.userType}
            >
              <option value="">Select User Type</option>
              {USER_TYPES.map(type => (<option key={type} value={type}>{type}</option>))}
            </Select>
          </FormField>
          <FormField label="Role">
            <Select name="role_id" value={userFormData.role_id || ''} onChange={handleUserInputChange}>
              <option value="">Select Role</option>
              {roles.map((role: Role) => (<option key={role.id} value={role.id}>{role.name}</option>))}
            </Select>
          </FormField>
        </FormSection>
        <FormSection>
          <FormField>
            <label className="flex items-center gap-2">
              <input id="isActive_user" name="isActive" type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                checked={userFormData.isActive} onChange={handleUserInputChange} />
              <span className="text-sm text-gray-900">Is Active User</span>
            </label>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeUserModal}>Cancel</Button>
          <Button onClick={handleUserSubmit} disabled={isSubmittingUser || loading.users}>
            {isSubmittingUser ? <Spinner size="sm"/> : (editingUser ? 'Save Changes' : 'Add User')}
          </Button>
        </FormActions>
      </DialogForm>

      {/* Role Modal */}
      <DialogForm
        isOpen={isRoleModalOpen}
        onClose={closeRoleModal}
        title={editingRole ? 'Edit Role' : 'Add New Role'}
        size="md"
      >
        <FormSection title="Role Information">
          <FormField label="Role Name" required error={roleFormErrors.name}>
            <Input
              name="name"
              value={roleFormData.name || ''}
              onChange={handleRoleInputChange}
              required
              error={roleFormErrors.name}
            />
          </FormField>
          <FormField label="Description (Optional)">
            <Input
              name="description"
              value={roleFormData.description || ''}
              onChange={handleRoleInputChange}
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeRoleModal}>Cancel</Button>
          <Button onClick={handleRoleSubmit} disabled={isSubmittingRole || loading.roles}>
            {isSubmittingRole ? <Spinner size="sm"/> : (editingRole ? 'Save Changes' : 'Add Role')}
          </Button>
        </FormActions>
      </DialogForm>

      {/* Delete User Confirmation Modal */}
      <DialogForm
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteUserModal}
        title="Confirm Delete User"
        size="sm"
      >
        <FormSection>
          <div className="text-center py-4">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete the user <strong>{userToDelete?.username}</strong>?
            </p>
            <p className="text-sm text-gray-500">
              This action cannot be undone. The user will be permanently removed from the system.
            </p>
          </div>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeDeleteUserModal} disabled={isDeletingUser}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteUserConfirm} disabled={isDeletingUser}>
            {isDeletingUser ? <Spinner size="sm"/> : 'Delete User'}
          </Button>
        </FormActions>
      </DialogForm>

      {/* Delete Role Confirmation Modal */}
      <DialogForm
        isOpen={isDeleteRoleModalOpen}
        onClose={closeDeleteRoleModal}
        title="Confirm Delete Role"
        size="sm"
      >
        <FormSection>
          <div className="text-center py-4">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete the role <strong>{roleToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-gray-500">
              Users with this role will have it unassigned. This action cannot be undone.
            </p>
          </div>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeDeleteRoleModal} disabled={isDeletingRole}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteRoleConfirm} disabled={isDeletingRole}>
            {isDeletingRole ? <Spinner size="sm"/> : 'Delete Role'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default SettingsUsersPage;
