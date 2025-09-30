import fs from 'fs';

const filePath = 'd:\\DevCenter\\abuilds\\EduGen\\old_system\\schoolpilot3\\src\\modules\\settings\\pages\\UnifiedSettingsPage.tsx';
const backupPath = filePath + '.backup2';

// Read the file
const content = fs.readFileSync(filePath, 'utf8');

// Create backup
fs.writeFileSync(backupPath, content);

// Split the content to find the main component
const lines = content.split('\n');

// Find the first export statement
const exportLineIndex = lines.findIndex(line => line.trim() === 'export default UnifiedSettingsPage;');

// Find duplicate component definitions
const duplicateComponentIndex = lines.findIndex((line, index) => 
  index > exportLineIndex && line.includes('const UnifiedSettingsPage: React.FC = () => {')
);

if (exportLineIndex !== -1 && duplicateComponentIndex !== -1) {
  // Take only the first part up to the export statement
  let fixedContent = lines.slice(0, exportLineIndex + 1).join('\n');
  
  // Add the missing closing tags and modal components
  fixedContent += `
      {/* User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={closeUserModal}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <div className="space-y-4">
          <Input
            label="Username"
            name="username"
            value={userFormData.username || ''}
            onChange={handleUserInputChange}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={userFormData.email || ''}
            onChange={handleUserInputChange}
            required
          />
          {!editingUser && (
            <Input
              label="Password"
              name="password"
              type="password"
              value={userFormData.password || ''}
              onChange={handleUserInputChange}
              required
            />
          )}
          <Select
            label="User Type"
            name="userType"
            value={userFormData.userType}
            onChange={handleUserInputChange}
            options={USER_TYPES.map(type => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1) }))}
            required
          />
          <Select
            label="Role"
            name="role_id"
            value={userFormData.role_id?.toString() || ''}
            onChange={handleUserInputChange}
            options={[
              { value: '', label: 'No Role' },
              ...(roles || []).map(role => ({ value: role.id.toString(), label: role.name }))
            ]}
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={userFormData.isActive}
              onChange={handleUserInputChange}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active User
            </label>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={closeUserModal}>
              Cancel
            </Button>
            <Button onClick={handleUserSubmit}>
              {editingUser ? 'Update' : 'Create'} User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={closeRoleModal}
        title={editingRole ? 'Edit Role' : 'Add New Role'}
      >
        <div className="space-y-4">
          <Input
            label="Role Name"
            name="name"
            value={roleFormData.name || ''}
            onChange={handleRoleInputChange}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={roleFormData.description || ''}
              onChange={handleRoleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Role description..."
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={closeRoleModal}>
              Cancel
            </Button>
            <Button onClick={handleRoleSubmit}>
              {editingRole ? 'Update' : 'Create'} Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Workflow Modal */}
      <Modal
        isOpen={isWorkflowModalOpen}
        onClose={closeWorkflowModal}
        title={editingWorkflow ? 'Edit Workflow' : 'Add New Workflow'}
      >
        <div className="space-y-4">
          <Input
            label="Workflow Name"
            name="name"
            value={workflowFormData.name || ''}
            onChange={handleWorkflowInputChange}
            required
          />
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={closeWorkflowModal}>
              Cancel
            </Button>
            <Button onClick={handleWorkflowSubmit}>
              {editingWorkflow ? 'Update' : 'Create'} Workflow
            </Button>
          </div>
        </div>
      </Modal>

      {/* Workflow State Modal */}
      <Modal
        isOpen={isStateModalOpen}
        onClose={closeStateModal}
        title={editingState ? 'Edit Workflow State' : 'Add New Workflow State'}
      >
        <div className="space-y-4">
          <Input
            label="State Name"
            name="name"
            value={stateFormData.name || ''}
            onChange={handleStateInputChange}
            required
          />
          <Input
            label="Sequence Order"
            name="sequence_order"
            type="number"
            value={stateFormData.sequence_order?.toString() || ''}
            onChange={handleStateInputChange}
            required
            min="1"
          />
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={closeStateModal}>
              Cancel
            </Button>
            <Button onClick={handleStateSubmit}>
              {editingState ? 'Update' : 'Create'} State
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Form data types
type UserFormData = {
  username?: string;
  email?: string;
  password?: string;
  userType: string;
  isActive: boolean;
  role_id?: number;
};

type RoleFormData = {
  name?: string;
  description?: string;
};

type WorkflowFormData = {
  name?: string;
};

type WorkflowStateFormData = {
  name?: string;
  sequence_order?: number;
};

const USER_TYPES = ['admin', 'teacher', 'student', 'parent', 'staff'];

export default UnifiedSettingsPage;
`;

  // Write the fixed content
  fs.writeFileSync(filePath, fixedContent);
  console.log('Comprehensive fix applied to UnifiedSettingsPage.tsx');
  console.log('Backup created at:', backupPath);
} else {
  console.log('Could not identify duplicate components - manual fix needed');
}