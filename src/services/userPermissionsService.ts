// ABOUTME: User permissions service for managing users, user types, and permissions
// ABOUTME: Works with both demo mode (mock data) and production mode (RxDB)

import { useAppData } from '../contexts/AppDataContext';
import { rxdbService } from './rxdbService';

// Types for User Permissions System
export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'admin';
  resource: string;
  createdAt?: Date;
  updatedAt?: Date;
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

// Service Result Types
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

export interface ServiceResultList<T> {
  success: boolean;
  data: T[];
  message: string;
  errors?: string[];
}

class UserPermissionsService {
  private isDemoMode: boolean = true; // Default to demo mode

  constructor() {
    // Check if RxDB is available to determine mode
    this.isDemoMode = !rxdbService.isInitialized();
  }

  // ===== USER MANAGEMENT =====

  async getUsers(): Promise<ServiceResultList<User>> {
    if (this.isDemoMode) {
      return this.getMockUsers();
    } else {
      return this.getRxDBUsers();
    }
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<User>> {
    if (this.isDemoMode) {
      return this.createMockUser(userData);
    } else {
      return this.createRxDBUser(userData);
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<ServiceResult<User>> {
    if (this.isDemoMode) {
      return this.updateMockUser(id, userData);
    } else {
      return this.updateRxDBUser(id, userData);
    }
  }

  async deleteUser(id: string): Promise<ServiceResult<void>> {
    if (this.isDemoMode) {
      return this.deleteMockUser(id);
    } else {
      return this.deleteRxDBUser(id);
    }
  }

  // ===== USER TYPE MANAGEMENT =====

  async getUserTypes(): Promise<ServiceResultList<UserType>> {
    if (this.isDemoMode) {
      return this.getMockUserTypes();
    } else {
      return this.getRxDBUserTypes();
    }
  }

  async createUserType(userTypeData: Omit<UserType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<UserType>> {
    if (this.isDemoMode) {
      return this.createMockUserType(userTypeData);
    } else {
      return this.createRxDBUserType(userTypeData);
    }
  }

  async updateUserType(id: string, userTypeData: Partial<UserType>): Promise<ServiceResult<UserType>> {
    if (this.isDemoMode) {
      return this.updateMockUserType(id, userTypeData);
    } else {
      return this.updateRxDBUserType(id, userTypeData);
    }
  }

  async deleteUserType(id: string): Promise<ServiceResult<void>> {
    if (this.isDemoMode) {
      return this.deleteMockUserType(id);
    } else {
      return this.deleteRxDBUserType(id);
    }
  }

  // ===== PERMISSION MANAGEMENT =====

  async getPermissions(): Promise<ServiceResultList<Permission>> {
    if (this.isDemoMode) {
      return this.getMockPermissions();
    } else {
      return this.getRxDBPermissions();
    }
  }

  async createPermission(permissionData: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Permission>> {
    if (this.isDemoMode) {
      return this.createMockPermission(permissionData);
    } else {
      return this.createRxDBPermission(permissionData);
    }
  }

  async updatePermission(id: string, permissionData: Partial<Permission>): Promise<ServiceResult<Permission>> {
    if (this.isDemoMode) {
      return this.updateMockPermission(id, permissionData);
    } else {
      return this.updateRxDBPermission(id, permissionData);
    }
  }

  async deletePermission(id: string): Promise<ServiceResult<void>> {
    if (this.isDemoMode) {
      return this.deleteMockPermission(id);
    } else {
      return this.deleteRxDBPermission(id);
    }
  }

  // ===== MOCK DATA METHODS =====

  private async getMockUsers(): Promise<ServiceResultList<User>> {
    const mockUsers: User[] = [
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
    ];

    return {
      success: true,
      data: mockUsers,
      message: 'Users retrieved successfully'
    };
  }

  private async createMockUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<User>> {
    const newUser: User = {
      id: Date.now().toString(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      success: true,
      data: newUser,
      message: 'User created successfully'
    };
  }

  private async updateMockUser(id: string, userData: Partial<User>): Promise<ServiceResult<User>> {
    const mockUsers = (await this.getMockUsers()).data;
    const userIndex = mockUsers.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return {
        success: false,
        message: 'User not found',
        errors: ['User with specified ID does not exist']
      };
    }

    const updatedUser = {
      ...mockUsers[userIndex],
      ...userData,
      updatedAt: new Date()
    };

    return {
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    };
  }

  private async deleteMockUser(id: string): Promise<ServiceResult<void>> {
    const mockUsers = (await this.getMockUsers()).data;
    const userExists = mockUsers.some(u => u.id === id);
    
    if (!userExists) {
      return {
        success: false,
        message: 'User not found',
        errors: ['User with specified ID does not exist']
      };
    }

    return {
      success: true,
      message: 'User deleted successfully'
    };
  }

  private async getMockUserTypes(): Promise<ServiceResultList<UserType>> {
    const mockUserTypes: UserType[] = [
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
    ];

    return {
      success: true,
      data: mockUserTypes,
      message: 'User types retrieved successfully'
    };
  }

  private async createMockUserType(userTypeData: Omit<UserType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<UserType>> {
    const newUserType: UserType = {
      id: userTypeData.name.toLowerCase().replace(/\s+/g, '_'),
      ...userTypeData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      success: true,
      data: newUserType,
      message: 'User type created successfully'
    };
  }

  private async updateMockUserType(id: string, userTypeData: Partial<UserType>): Promise<ServiceResult<UserType>> {
    const mockUserTypes = (await this.getMockUserTypes()).data;
    const userTypeIndex = mockUserTypes.findIndex(t => t.id === id);
    
    if (userTypeIndex === -1) {
      return {
        success: false,
        message: 'User type not found',
        errors: ['User type with specified ID does not exist']
      };
    }

    const updatedUserType = {
      ...mockUserTypes[userTypeIndex],
      ...userTypeData,
      updatedAt: new Date()
    };

    return {
      success: true,
      data: updatedUserType,
      message: 'User type updated successfully'
    };
  }

  private async deleteMockUserType(id: string): Promise<ServiceResult<void>> {
    const mockUserTypes = (await this.getMockUserTypes()).data;
    const userType = mockUserTypes.find(t => t.id === id);
    
    if (!userType) {
      return {
        success: false,
        message: 'User type not found',
        errors: ['User type with specified ID does not exist']
      };
    }

    if (userType.isDefault) {
      return {
        success: false,
        message: 'Cannot delete default user type',
        errors: ['Default user types cannot be deleted']
      };
    }

    return {
      success: true,
      message: 'User type deleted successfully'
    };
  }

  private async getMockPermissions(): Promise<ServiceResultList<Permission>> {
    const mockPermissions: Permission[] = [
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
    ];

    return {
      success: true,
      data: mockPermissions,
      message: 'Permissions retrieved successfully'
    };
  }

  private async createMockPermission(permissionData: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Permission>> {
    const newPermission: Permission = {
      id: `${permissionData.module}.${permissionData.action}`,
      ...permissionData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      success: true,
      data: newPermission,
      message: 'Permission created successfully'
    };
  }

  private async updateMockPermission(id: string, permissionData: Partial<Permission>): Promise<ServiceResult<Permission>> {
    const mockPermissions = (await this.getMockPermissions()).data;
    const permissionIndex = mockPermissions.findIndex(p => p.id === id);
    
    if (permissionIndex === -1) {
      return {
        success: false,
        message: 'Permission not found',
        errors: ['Permission with specified ID does not exist']
      };
    }

    const updatedPermission = {
      ...mockPermissions[permissionIndex],
      ...permissionData,
      updatedAt: new Date()
    };

    return {
      success: true,
      data: updatedPermission,
      message: 'Permission updated successfully'
    };
  }

  private async deleteMockPermission(id: string): Promise<ServiceResult<void>> {
    if (id === '*') {
      return {
        success: false,
        message: 'Cannot delete admin permission',
        errors: ['Admin permission cannot be deleted']
      };
    }

    const mockPermissions = (await this.getMockPermissions()).data;
    const permissionExists = mockPermissions.some(p => p.id === id);
    
    if (!permissionExists) {
      return {
        success: false,
        message: 'Permission not found',
        errors: ['Permission with specified ID does not exist']
      };
    }

    return {
      success: true,
      message: 'Permission deleted successfully'
    };
  }

  // ===== RXDB METHODS =====

  private async getRxDBUsers(): Promise<ServiceResultList<User>> {
    try {
      const usersCollection = await rxdbService.getCollection('users');
      const users = await usersCollection.find().exec();
      
      return {
        success: true,
        data: users.map(user => user.toJSON() as User),
        message: 'Users retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: 'Failed to retrieve users',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async createRxDBUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<User>> {
    try {
      const usersCollection = await rxdbService.getCollection('users');
      const newUser = await usersCollection.insert({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        success: true,
        data: newUser.toJSON() as User,
        message: 'User created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create user',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async updateRxDBUser(id: string, userData: Partial<User>): Promise<ServiceResult<User>> {
    try {
      const usersCollection = await rxdbService.getCollection('users');
      const user = await usersCollection.findOne(id).exec();
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          errors: ['User with specified ID does not exist']
        };
      }

      await user.patch({
        ...userData,
        updatedAt: new Date()
      });

      return {
        success: true,
        data: user.toJSON() as User,
        message: 'User updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update user',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async deleteRxDBUser(id: string): Promise<ServiceResult<void>> {
    try {
      const usersCollection = await rxdbService.getCollection('users');
      const user = await usersCollection.findOne(id).exec();
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          errors: ['User with specified ID does not exist']
        };
      }

      await user.remove();

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete user',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async getRxDBUserTypes(): Promise<ServiceResultList<UserType>> {
    try {
      const userTypesCollection = await rxdbService.getCollection('userTypes');
      const userTypes = await userTypesCollection.find().exec();
      
      return {
        success: true,
        data: userTypes.map(userType => userType.toJSON() as UserType),
        message: 'User types retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: 'Failed to retrieve user types',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async createRxDBUserType(userTypeData: Omit<UserType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<UserType>> {
    try {
      const userTypesCollection = await rxdbService.getCollection('userTypes');
      const newUserType = await userTypesCollection.insert({
        ...userTypeData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        success: true,
        data: newUserType.toJSON() as UserType,
        message: 'User type created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create user type',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async updateRxDBUserType(id: string, userTypeData: Partial<UserType>): Promise<ServiceResult<UserType>> {
    try {
      const userTypesCollection = await rxdbService.getCollection('userTypes');
      const userType = await userTypesCollection.findOne(id).exec();
      
      if (!userType) {
        return {
          success: false,
          message: 'User type not found',
          errors: ['User type with specified ID does not exist']
        };
      }

      await userType.patch({
        ...userTypeData,
        updatedAt: new Date()
      });

      return {
        success: true,
        data: userType.toJSON() as UserType,
        message: 'User type updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update user type',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async deleteRxDBUserType(id: string): Promise<ServiceResult<void>> {
    try {
      const userTypesCollection = await rxdbService.getCollection('userTypes');
      const userType = await userTypesCollection.findOne(id).exec();
      
      if (!userType) {
        return {
          success: false,
          message: 'User type not found',
          errors: ['User type with specified ID does not exist']
        };
      }

      if (userType.isDefault) {
        return {
          success: false,
          message: 'Cannot delete default user type',
          errors: ['Default user types cannot be deleted']
        };
      }

      await userType.remove();

      return {
        success: true,
        message: 'User type deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete user type',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async getRxDBPermissions(): Promise<ServiceResultList<Permission>> {
    try {
      const permissionsCollection = await rxdbService.getCollection('permissions');
      const permissions = await permissionsCollection.find().exec();
      
      return {
        success: true,
        data: permissions.map(permission => permission.toJSON() as Permission),
        message: 'Permissions retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: 'Failed to retrieve permissions',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async createRxDBPermission(permissionData: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Permission>> {
    try {
      const permissionsCollection = await rxdbService.getCollection('permissions');
      const newPermission = await permissionsCollection.insert({
        ...permissionData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        success: true,
        data: newPermission.toJSON() as Permission,
        message: 'Permission created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create permission',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async updateRxDBPermission(id: string, permissionData: Partial<Permission>): Promise<ServiceResult<Permission>> {
    try {
      const permissionsCollection = await rxdbService.getCollection('permissions');
      const permission = await permissionsCollection.findOne(id).exec();
      
      if (!permission) {
        return {
          success: false,
          message: 'Permission not found',
          errors: ['Permission with specified ID does not exist']
        };
      }

      await permission.patch({
        ...permissionData,
        updatedAt: new Date()
      });

      return {
        success: true,
        data: permission.toJSON() as Permission,
        message: 'Permission updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update permission',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async deleteRxDBPermission(id: string): Promise<ServiceResult<void>> {
    try {
      if (id === '*') {
        return {
          success: false,
          message: 'Cannot delete admin permission',
          errors: ['Admin permission cannot be deleted']
        };
      }

      const permissionsCollection = await rxdbService.getCollection('permissions');
      const permission = await permissionsCollection.findOne(id).exec();
      
      if (!permission) {
        return {
          success: false,
          message: 'Permission not found',
          errors: ['Permission with specified ID does not exist']
        };
      }

      await permission.remove();

      return {
        success: true,
        message: 'Permission deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete permission',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // ===== UTILITY METHODS =====

  async checkUserPermission(userId: string, permissionId: string): Promise<boolean> {
    try {
      const users = await this.getUsers();
      const user = users.data.find(u => u.id === userId);
      
      if (!user || !user.isActive) {
        return false;
      }

      const userTypes = await this.getUserTypes();
      const userType = userTypes.data.find(t => t.id === user.userTypeId);
      
      if (!userType) {
        return false;
      }

      // Check if user has admin permission
      if (userType.permissions.includes('*') || user.customPermissions.includes('*')) {
        return true;
      }

      // Check user type permissions
      if (userType.permissions.includes(permissionId)) {
        return true;
      }

      // Check custom permissions
      if (user.customPermissions.includes(permissionId)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const users = await this.getUsers();
      const user = users.data.find(u => u.id === userId);
      
      if (!user || !user.isActive) {
        return [];
      }

      const userTypes = await this.getUserTypes();
      const userType = userTypes.data.find(t => t.id === user.userTypeId);
      
      if (!userType) {
        return [];
      }

      const permissions = new Set<string>();

      // Add user type permissions
      userType.permissions.forEach(permission => permissions.add(permission));

      // Add custom permissions
      user.customPermissions.forEach(permission => permissions.add(permission));

      return Array.from(permissions);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const userPermissionsService = new UserPermissionsService();

// Export React hooks for easy use in components
export const useUserPermissions = () => {
  const { isRxDBModeActive } = useAppData();
  
  return {
    getUsers: userPermissionsService.getUsers.bind(userPermissionsService),
    createUser: userPermissionsService.createUser.bind(userPermissionsService),
    updateUser: userPermissionsService.updateUser.bind(userPermissionsService),
    deleteUser: userPermissionsService.deleteUser.bind(userPermissionsService),
    getUserTypes: userPermissionsService.getUserTypes.bind(userPermissionsService),
    createUserType: userPermissionsService.createUserType.bind(userPermissionsService),
    updateUserType: userPermissionsService.updateUserType.bind(userPermissionsService),
    deleteUserType: userPermissionsService.deleteUserType.bind(userPermissionsService),
    getPermissions: userPermissionsService.getPermissions.bind(userPermissionsService),
    createPermission: userPermissionsService.createPermission.bind(userPermissionsService),
    updatePermission: userPermissionsService.updatePermission.bind(userPermissionsService),
    deletePermission: userPermissionsService.deletePermission.bind(userPermissionsService),
    checkUserPermission: userPermissionsService.checkUserPermission.bind(userPermissionsService),
    getUserPermissions: userPermissionsService.getUserPermissions.bind(userPermissionsService),
    isDemoMode: !isRxDBModeActive
  };
};