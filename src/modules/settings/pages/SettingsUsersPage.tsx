import React, { useCallback, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid } from '@/components/ui/data';
import { PlusIcon, EditIcon, DeleteIcon, ExclamationTriangleIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import { User, Role } from '@/types';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EntityForm from '@/components/ui/forms/EntityForm';
import DialogForm from '@/components/ui/forms/DialogForm';
import { FormSection, FormActions } from '@/components/ui/forms';
import { useTranslation } from 'react-i18next';
import { databaseService } from '@/services/database/databaseService';
import { hashPassword, checkPasswordComplexity } from '@/utils/passwordHash';
import { openCanonicalRepository } from '@/data/canonicalRepository';
import { ensureCanonicalUser } from '@/data/canonicalIdentity';
import { Repository, MAX_LIMIT } from '@/data/repository';
import { asId } from '@/domain/ids';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/utils/logging';
import { userRoleLabel, userStatusLabel } from '../data/userDisplay';

// The login row as written to the users collection: the schema's own `is_active` column beside the
// camelCase `isActive` the rest of the app still reads. Without `is_active` the sign-in finds the
// login not active.
type UserWrite = Partial<User> & { is_active?: boolean };

// Add a string array of user types for the dropdown
const USER_TYPES = ['Staff', 'Student', 'Parent', 'Supplier'];

export const SettingsUsersContent: React.FC = () => {
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
  const { t } = useTranslation();
  const { showError, showSuccess, showWarning } = useToast();

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userInitialValues, setUserInitialValues] = useState<Record<string, any>>({ username: '', email: '', userType: '', isActive: true, role_id: undefined, person_ref: '' });
  // The canonical learner and guardian rows a login can act as in the portal.
  const [personOptions, setPersonOptions] = useState<{ value: string; label: string }[]>([]);
  const [personLoading, setPersonLoading] = useState(false);

  /**
   * Loads the people a portal login can be linked to.
   *
   * A login's canonical `user` row carries a `person_ref`, and that reference is what the portal
   * reads the learner or the guardian from; a login with none has no portal data to show.
   */
  const loadLinkablePeople = useCallback(async () => {
    setPersonLoading(true);
    try {
      const repository = await openCanonicalRepository();
      if (!(repository instanceof Repository)) {
        setPersonOptions([]);
        return;
      }
      const [guardians, learners] = await Promise.all([
        repository.list('guardian', { limit: MAX_LIMIT }),
        repository.list('learner', { limit: MAX_LIMIT }),
      ]);
      setPersonOptions([
        ...guardians.items.map((guardian) => ({
          value: `guardian:${guardian.id}`,
          label: `Guardian: ${guardian.given_name} ${guardian.family_name}`,
        })),
        ...learners.items.map((learner) => ({
          value: `learner:${learner.id}`,
          label: `Learner: ${learner.given_name} ${learner.family_name} (${learner.admission_number})`,
        })),
      ]);
    } catch (error) {
      logger.error('Could not load the learners and guardians a login can be linked to:', error);
      setPersonOptions([]);
    } finally {
      setPersonLoading(false);
    }
  }, []);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

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
    setUserInitialValues(user ?
      { username: user.username, email: user.email, userType: user.userType, isActive: user.isActive, role_id: user.role_id, person_ref: '' } :
      { username: '', email: '', userType: '', isActive: true, role_id: undefined, person_ref: '' }
    );
    setIsUserModalOpen(true);
    void loadLinkablePeople();
  };
  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
    setUserInitialValues({ username: '', email: '', userType: '', isActive: true, role_id: undefined, person_ref: '' });
  };

  // Role Modal
  const openRoleModal = (role?: Role) => {
    setEditingRole(role || null);
    setIsRoleModalOpen(true);
  };
  const closeRoleModal = () => {
    setIsRoleModalOpen(false);
    setEditingRole(null);
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
      logger.error('Error deleting user:', error);
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
      logger.error('Error deleting role:', error);
      showError(error instanceof Error ? error.message : t('Failed to delete role'));
    } finally {
      setIsDeletingRole(false);
    }
  };

  const userColumns = [
    { header: 'Username', key: 'username' as keyof User },
    { header: 'Email', key: 'email' as keyof User },
    { header: 'User Type', key: 'userType' as keyof User},
    { header: 'Role', key: 'role' as keyof User, render: (_value: unknown, item: User) => userRoleLabel(item, roles || []) },
    {
      header: 'Status',
      key: 'isActive' as keyof User,
      render: (_value: unknown, item: User) => {
        const status = userStatusLabel(item);
        return <Badge variant={status === 'Active' ? 'success' : 'secondary'} size="sm">{status}</Badge>;
      },
    },
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
      // Not 'id': the grid keys its columns by this, and the ID column above already is.
      key: 'actions' as keyof Role,
      render: (_value: any, item: Role) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openRoleModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => openDeleteRoleModal(item)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    }
  ];

  // The form re-seeds its state whenever `initialData` changes identity, so the edit values are
  // memoised: a fresh object on every render would reset what the user is typing.
  const userFormInitialData = useMemo(
    () =>
      editingUser
        ? {
            username: editingUser.username,
            email: editingUser.email ?? '',
            userType: editingUser.userType ?? '',
            isActive: editingUser.isActive,
            role_id: editingUser.role_id,
            person_ref: '',
          }
        : userInitialValues,
    [editingUser, userInitialValues]
  );

  return (
    <div className="space-y-3">
      <Card title="User Accounts Management" info="Create, edit, and manage user accounts and their roles." actions={
        <Button onClick={() => openUserModal()} leftIcon={<PlusIcon className="w-5 h-5"/>}>Add User</Button>
      }>
         {loading.users ? (
          <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">Loading users...</span></div>
        ) : (
          <DataGrid columns={userColumns} data={users} loading={loading.users} />
        )}
      </Card>

      <Card title="Roles Management" actions={
        <Button onClick={() => openRoleModal()} leftIcon={<PlusIcon className="w-5 h-5"/>}>Add Role</Button>
      }>
         {loading.roles ? (
          <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">Loading roles...</span></div>
        ) : (
          <DataGrid columns={roleColumns} data={roles} loading={loading.roles} />
        )}
      </Card>

      {/* User Modal */}
      <EntityForm
        isOpen={isUserModalOpen}
        onClose={closeUserModal}
        title={editingUser ? 'Edit User' : 'Add New User'}
        initialData={userFormInitialData}
        submitLabel={editingUser ? 'Save Changes' : 'Add User'}
        cancelLabel="Cancel"
        onSubmit={async (values) => {
          const usersCollection = databaseService.getCollection<User>('users');
          if (!usersCollection) {
            throw new Error('Users collection not available');
          }

          const username = String(values.username ?? '').trim();
          let passwordHash: string | undefined;
          if (editingUser) {
            const updateData: UserWrite = {
              username,
              email: String(values.email ?? ''),
              userType: String(values.userType ?? ''),
              isActive: Boolean(values.isActive),
              is_active: Boolean(values.isActive),
              role_id: values.role_id || undefined,
            };
            if (values.password) {
              const hashedPassword = await hashPassword(String(values.password));
              passwordHash = hashedPassword.hash + ':' + hashedPassword.salt + ':' + hashedPassword.iterations;
              (updateData as any).hashed_password = passwordHash;
            }
            await usersCollection.update(editingUser.id, updateData);
          } else {
            const hashedPassword = await hashPassword(String(values.password ?? ''));
            passwordHash = hashedPassword.hash + ':' + hashedPassword.salt + ':' + hashedPassword.iterations;
            const newUser: Omit<User, 'id'> & { is_active: boolean } = {
              username,
              email: String(values.email ?? ''),
              userType: String(values.userType ?? ''),
              isActive: Boolean(values.isActive),
              is_active: Boolean(values.isActive),
              role_id: values.role_id || undefined,
              hashed_password: passwordHash,
            };
            await usersCollection.insert(newUser);
          }
          // The login is the platform's; the canonical model keeps its own `user` row, and a canonical
          // write that names an actor references that row. Without this the login has no canonical
          // identity at all, and nothing can link it to a staff record.
          // The person reference is what the portal reads a guardian or a learner from, so it is
          // written on the same canonical row the login resolves to.
          const person = String(values.person_ref ?? '');
          try {
            const canonical = await openCanonicalRepository();
            if (canonical instanceof Repository) {
              const canonicalUser = await ensureCanonicalUser(canonical, {
                username,
                passwordHash:
                  passwordHash ??
                  (typeof editingUser?.hashed_password === 'string' ? editingUser.hashed_password : ''),
              });
              if (canonicalUser && person.startsWith('guardian:')) {
                await canonical.update(
                  'user',
                  canonicalUser.id,
                  { person_ref: { type: 'guardian', id: asId<'guardian'>(person.slice('guardian:'.length)) } },
                  { expectedVersion: canonicalUser.rowVersion }
                );
              }
              if (canonicalUser && person.startsWith('learner:')) {
                await canonical.update(
                  'user',
                  canonicalUser.id,
                  { person_ref: { type: 'learner', id: asId<'learner'>(person.slice('learner:'.length)) } },
                  { expectedVersion: canonicalUser.rowVersion }
                );
              }
            }
          } catch (error) {
            // The login itself is written; a missing canonical identity is a gap the school can see,
            // so it is reported rather than swallowed.
            logger.error('Could not create the canonical identity for the login:', error);
            showWarning(
              t('The login was saved, but its canonical identity could not be created; staff records cannot be linked to it yet.')
            );
          }
          await refreshCollection('users');
        }}
        fields={[
          { name: 'username', label: 'Username', required: true, validate: (v) => { const s = String(v ?? '').trim(); if (!s) return t('Username is required'); if (s.length < 3) return t('Username must be at least 3 characters'); return null; } },
          { name: 'email', label: 'Email', required: true, validate: (v) => { const s = String(v ?? '').trim(); if (!s) return t('Email is required'); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return t('Please enter a valid email address'); return null; } },
          { name: 'password', label: editingUser ? 'New Password (leave blank to keep current)' : 'Password', type: 'password', helperText: 'Must be at least 8 characters with uppercase, lowercase, number, and special character', validate: (v) => { const pw = String(v ?? ''); if (!editingUser && !pw) return t('Password is required for new users'); if (pw) { const c = checkPasswordComplexity(pw); if (!c.valid) return c.errors.join(', '); } return null; } },
          { name: 'userType', label: 'User Type', type: 'select', required: true, placeholder: 'Select User Type', options: USER_TYPES.map(type => ({ value: type, label: type })), validate: (v) => !v ? t('User Type is required') : null },
          { name: 'role_id', label: 'Role', type: 'select', placeholder: 'Select Role', options: (roles || []).map((role: Role) => ({ value: role.id, label: role.name })) },
          { name: 'person_ref', label: 'Linked learner or guardian (portal access)', type: 'select', placeholder: personLoading ? 'Loading people…' : 'Not linked', helperText: 'A learner login sees only that learner; a guardian login sees the children linked to that guardian.', options: personOptions },
          { name: 'isActive', label: 'Is Active User', type: 'checkbox' },
        ]}
      />

      {/* Role Modal */}
      <EntityForm
        isOpen={isRoleModalOpen}
        onClose={closeRoleModal}
        title={editingRole ? 'Edit Role' : 'Add New Role'}
        initialData={editingRole ? { name: editingRole.name, description: editingRole.description } : { name: '', description: '' }}
        submitLabel={editingRole ? 'Save Changes' : 'Add Role'}
        cancelLabel="Cancel"
        onSubmit={async (values) => {
          const payload = {
            name: String(values.name ?? ''),
            description: values.description ? String(values.description) : undefined,
          };
          if (editingRole) {
            await updateRole(editingRole.id, payload);
          } else {
            await addRole(payload);
          }
        }}
        fields={[
          { name: 'name', label: 'Role Name', required: true, validate: (v) => { const s = String(v ?? '').trim(); if (!s) return t('Role name is required'); if (s.length < 2) return t('Role name must be at least 2 characters'); return null; } },
          { name: 'description', label: 'Description (Optional)', type: 'textarea' },
        ]}
      />

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
            <p className="text-surface-foreground mb-2">
              Are you sure you want to delete the user <strong>{userToDelete?.username}</strong>?
            </p>
            <p className="text-sm text-surface-muted-fg">
              This action cannot be undone. The user will be permanently removed from the system.
            </p>
          </div>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeDeleteUserModal} disabled={isDeletingUser}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteUserConfirm} loading={isDeletingUser}>
            {'Delete User'}
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
            <p className="text-surface-foreground mb-2">
              Are you sure you want to delete the role <strong>{roleToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-surface-muted-fg">
              Users with this role will have it unassigned. This action cannot be undone.
            </p>
          </div>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeDeleteRoleModal} disabled={isDeletingRole}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteRoleConfirm} loading={isDeletingRole}>
            {'Delete Role'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const SettingsUsersPage: React.FC = () => {
  return <SettingsUsersContent />;
};

export default SettingsUsersPage;
