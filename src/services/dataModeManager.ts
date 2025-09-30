// ABOUTME: Service for managing data layer modes, switching between development, demo, and production configurations
// ABOUTME: Handles data seeding, clearing, and provider switching based on mode

import { getDatabaseProviderFactory, DatabaseProviderFactory } from './database/DatabaseProviderFactory';
import { getDataLayerConfig, DataLayerConfig } from '../config/dataLayerConfig';
import { IDatabaseProvider } from './database/IDatabaseProvider';
import { EventEmitter } from 'events';

export type DataMode = 'development' | 'demo' | 'production';

export interface ModeTransitionOptions {
  preserveData?: boolean;
  seedData?: boolean;
  clearData?: boolean;
  backupData?: boolean;
}

export interface DataModeManagerOptions {
  preserveData?: boolean;
  seedData?: boolean;
  clearData?: boolean;
  backupData?: boolean;
  requiresReload?: boolean;
}

export interface DataModeStatus {
  currentMode: DataMode;
  activeProvider: string;
  dataCount: number;
  lastSwitched: Date;
  isTransitioning: boolean;
}

export interface SeedDataConfig {
  students: any[];
  teachers: any[];
  classes: any[];
  subjects: any[];
  assignments: any[];
}

export class DataModeManager extends EventEmitter {
  private currentMode: DataMode = 'development';
  private isTransitioning: boolean = false;
  private dbFactory: DatabaseProviderFactory;
  private lastSwitched: Date = new Date();

  constructor() {
    super();
    this.dbFactory = getDatabaseProviderFactory();
    this.initializeMode();
  }

  private async initializeMode(): Promise<void> {
    try {
      // Detect current mode from environment or stored preference
      // Use the same key as unified config: 'app_data_mode'
      const storedMode = localStorage.getItem('app_data_mode') as DataMode;
      if (storedMode && ['development', 'demo', 'production'].includes(storedMode)) {
        this.currentMode = storedMode;
      } else {
        // Default based on environment
        this.currentMode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
      }

      // Initialize the database factory with the current mode configuration
      const config = getDataLayerConfig(this.currentMode);
      await this.dbFactory.switchProvider(config.provider, config.options);
      
      this.emit('modeInitialized', this.currentMode);
    } catch (error) {
      console.error('Failed to initialize data mode:', error);
      this.emit('error', error);
    }
  }

  async switchMode(newMode: DataMode, options: ModeTransitionOptions = {}): Promise<void> {
    if (this.isTransitioning) {
      throw new Error('Mode transition already in progress');
    }

    if (this.currentMode === newMode) {
      console.log(`Already in ${newMode} mode`);
      return;
    }

    this.isTransitioning = true;
    this.emit('transitionStarted', { from: this.currentMode, to: newMode });

    try {
      // Step 1: Backup current data if requested
      if (options.backupData) {
        await this.backupCurrentData();
      }

      // Step 2: Get new configuration
      const newConfig = getDataLayerConfig(newMode);
      
      // Step 3: Clear data if requested or switching to a different provider type
      const currentProvider = this.dbFactory.getActiveProvider();
      const needsDataClear = options.clearData || 
        (currentProvider && currentProvider.name !== newConfig.provider);
      
      if (needsDataClear && !options.preserveData) {
        await this.clearAllData();
      }

      // Step 4: Switch to new provider
      await this.dbFactory.switchProvider(newConfig.provider, newConfig.options);

      // Step 5: Seed data if requested (typically for demo mode)
      if (options.seedData || (newMode === 'demo' && options.seedData !== false)) {
        await this.seedDemoData();
      }

      // Step 6: Update current mode and persist preference
      this.currentMode = newMode;
      this.lastSwitched = new Date();
      // Use the same key as unified config: 'app_data_mode'
      localStorage.setItem('app_data_mode', newMode);
      localStorage.setItem('app_data_mode_timestamp', this.lastSwitched.toISOString());

      this.emit('modeChanged', { 
        mode: newMode, 
        provider: newConfig.provider,
        timestamp: this.lastSwitched
      });

    } catch (error) {
      console.error('Failed to switch mode:', error);
      this.emit('error', error);
      throw error;
    } finally {
      this.isTransitioning = false;
      this.emit('transitionCompleted', this.currentMode);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const provider = this.dbFactory.getActiveProvider();
      if (!provider) {
        throw new Error('No active database provider');
      }

      // Get all collections and clear them
      const collections = ['students', 'teachers', 'classes', 'subjects', 'assignments', 'grades', 'attendance'];
      
      for (const collectionName of collections) {
        try {
          const collection = await provider.getCollection(collectionName);
          if (collection && typeof collection.clear === 'function') {
            await collection.clear();
          }
        } catch (error) {
          console.warn(`Failed to clear collection ${collectionName}:`, error);
        }
      }

      this.emit('dataCleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  async seedDemoData(): Promise<void> {
    try {
      const provider = this.dbFactory.getActiveProvider();
      if (!provider) {
        throw new Error('No active database provider');
      }

      const seedData = this.generateSeedData();

      // Seed students
      const studentsCollection = await provider.getCollection('students');
      for (const student of seedData.students) {
        await studentsCollection.insert(student);
      }

      // Seed teachers
      const teachersCollection = await provider.getCollection('teachers');
      for (const teacher of seedData.teachers) {
        await teachersCollection.insert(teacher);
      }

      // Seed classes
      const classesCollection = await provider.getCollection('classes');
      for (const classData of seedData.classes) {
        await classesCollection.insert(classData);
      }

      // Seed subjects
      const subjectsCollection = await provider.getCollection('subjects');
      for (const subject of seedData.subjects) {
        await subjectsCollection.insert(subject);
      }

      // Seed assignments
      const assignmentsCollection = await provider.getCollection('assignments');
      for (const assignment of seedData.assignments) {
        await assignmentsCollection.insert(assignment);
      }

      this.emit('dataSeeded', seedData);
    } catch (error) {
      console.error('Failed to seed demo data:', error);
      throw error;
    }
  }

  private generateSeedData(): SeedDataConfig {
    return {
      students: [
        {
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@school.edu',
          grade: '10',
          dateOfBirth: '2008-05-15',
          enrollmentDate: '2023-09-01',
          status: 'active'
        },
        {
          id: 'student-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@school.edu',
          grade: '11',
          dateOfBirth: '2007-08-22',
          enrollmentDate: '2022-09-01',
          status: 'active'
        },
        {
          id: 'student-3',
          firstName: 'Mike',
          lastName: 'Johnson',
          email: 'mike.johnson@school.edu',
          grade: '9',
          dateOfBirth: '2009-03-10',
          enrollmentDate: '2024-09-01',
          status: 'active'
        }
      ],
      teachers: [
        {
          id: 'teacher-1',
          firstName: 'Sarah',
          lastName: 'Wilson',
          email: 'sarah.wilson@school.edu',
          department: 'Mathematics',
          hireDate: '2020-08-15',
          status: 'active'
        },
        {
          id: 'teacher-2',
          firstName: 'Robert',
          lastName: 'Brown',
          email: 'robert.brown@school.edu',
          department: 'Science',
          hireDate: '2019-01-10',
          status: 'active'
        }
      ],
      classes: [
        {
          id: 'class-1',
          name: 'Algebra II',
          teacherId: 'teacher-1',
          subject: 'Mathematics',
          grade: '10',
          schedule: 'MWF 9:00-10:00',
          room: 'Room 101',
          capacity: 25,
          enrolled: 3
        },
        {
          id: 'class-2',
          name: 'Biology',
          teacherId: 'teacher-2',
          subject: 'Science',
          grade: '9',
          schedule: 'TTh 10:00-11:30',
          room: 'Lab 201',
          capacity: 20,
          enrolled: 1
        }
      ],
      subjects: [
        {
          id: 'subject-1',
          name: 'Mathematics',
          description: 'Mathematical concepts and problem solving',
          department: 'STEM',
          credits: 4
        },
        {
          id: 'subject-2',
          name: 'Science',
          description: 'Natural sciences and scientific method',
          department: 'STEM',
          credits: 4
        }
      ],
      assignments: [
        {
          id: 'assignment-1',
          title: 'Quadratic Equations Worksheet',
          classId: 'class-1',
          teacherId: 'teacher-1',
          description: 'Practice solving quadratic equations',
          dueDate: '2024-02-15',
          points: 100,
          type: 'homework'
        },
        {
          id: 'assignment-2',
          title: 'Cell Structure Lab Report',
          classId: 'class-2',
          teacherId: 'teacher-2',
          description: 'Analyze and report on cell structure observations',
          dueDate: '2024-02-20',
          points: 150,
          type: 'lab'
        }
      ]
    };
  }

  private async backupCurrentData(): Promise<void> {
    try {
      const provider = this.dbFactory.getActiveProvider();
      if (!provider || typeof provider.backup !== 'function') {
        console.warn('Current provider does not support backup');
        return;
      }

      const backupName = `backup_${this.currentMode}_${Date.now()}`;
      await provider.backup(backupName);
      
      this.emit('dataBackedUp', { mode: this.currentMode, backupName });
    } catch (error) {
      console.error('Failed to backup data:', error);
      // Don't throw here, as backup failure shouldn't prevent mode switching
    }
  }

  async getStatus(): Promise<DataModeStatus> {
    const provider = this.dbFactory.getActiveProvider();
    let dataCount = 0;

    try {
      if (provider) {
        // Count total records across all collections
        const collections = ['students', 'teachers', 'classes', 'subjects', 'assignments'];
        for (const collectionName of collections) {
          try {
            const collection = await provider.getCollection(collectionName);
            if (collection && typeof collection.count === 'function') {
              dataCount += await collection.count();
            }
          } catch (error) {
            console.warn(`Failed to count collection ${collectionName}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get data count:', error);
    }

    return {
      currentMode: this.currentMode,
      activeProvider: provider?.name || 'none',
      dataCount,
      lastSwitched: this.lastSwitched,
      isTransitioning: this.isTransitioning
    };
  }

  getCurrentMode(): DataMode {
    return this.currentMode;
  }

  isInTransition(): boolean {
    return this.isTransitioning;
  }

  getAvailableModes(): DataMode[] {
    return ['development', 'demo', 'production'];
  }

  async resetToDefaults(): Promise<void> {
    await this.switchMode('development', {
      clearData: true,
      seedData: false,
      preserveData: false
    });
  }

  destroy(): void {
    this.removeAllListeners();
  }
}

// Singleton instance
let dataModeManagerInstance: DataModeManager | null = null;

export function getDataModeManager(): DataModeManager {
  if (!dataModeManagerInstance) {
    dataModeManagerInstance = new DataModeManager();
  }
  return dataModeManagerInstance;
}

export function resetDataModeManager(): void {
  if (dataModeManagerInstance) {
    dataModeManagerInstance.destroy();
    dataModeManagerInstance = null;
  }
}