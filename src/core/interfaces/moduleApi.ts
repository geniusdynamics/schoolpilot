import type { DatabaseService } from '@/services/database/databaseService';

/**
 * Module Data API Interface
 * Defines how modules expose their data access methods.
 * Each module should implement this interface for its data entities.
 */
export interface ModuleDataApi {
  /**
   * Get all entities of a specific type
   */
  getEntities<T>(entityName: string): Promise<T[]>;

  /**
   * Get a single entity by ID
   */
  getEntityById<T>(entityName: string, id: string | number): Promise<T | null>;

  /**
   * Create a new entity
   */
  createEntity<T>(entityName: string, data: Partial<T>): Promise<T>;

  /**
   * Update an existing entity
   */
  updateEntity<T>(entityName: string, id: string | number, data: Partial<T>): Promise<T>;

  /**
   * Delete an entity
   */
  deleteEntity(entityName: string, id: string | number): Promise<boolean>;

  /**
   * Query entities with filters
   */
  queryEntities<T>(entityName: string, filters: Record<string, any>): Promise<T[]>;

  /**
   * Get entity count
   */
  getEntityCount(entityName: string): Promise<number>;

  /**
   * Subscribe to entity changes
   */
  subscribeToEntityChanges<T>(
    entityName: string,
    callback: (entities: T[]) => void
  ): () => void;
}

/**
 * Base implementation of ModuleDataApi using DatabaseService
 */
export class BaseModuleDataApi implements ModuleDataApi {
  protected db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  async getEntities<T>(entityName: string): Promise<T[]> {
    const collection = await this.db.getCollection(entityName);
    return collection?.find().toArray() || [];
  }

  async getEntityById<T>(entityName: string, id: string | number): Promise<T | null> {
    const collection = await this.db.getCollection(entityName);
    return collection?.findOne({ id }) || null;
  }

  async createEntity<T>(entityName: string, data: Partial<T>): Promise<T> {
    const collection = await this.db.getCollection(entityName);
    const entityWithId = { ...data, id: this.db.generateId() };
    const result = await collection.insert(entityWithId);
    return result?.doc || entityWithId as T;
  }

  async updateEntity<T>(entityName: string, id: string | number, data: Partial<T>): Promise<T> {
    const collection = await this.db.getCollection(entityName);
    const result = await collection.update(id, data);
    return result?.doc || data as T;
  }

  async deleteEntity(entityName: string, id: string | number): Promise<boolean> {
    const collection = await this.db.getCollection(entityName);
    await collection.remove(id);
    return true;
  }

  async queryEntities<T>(entityName: string, filters: Record<string, any>): Promise<T[]> {
    const collection = await this.db.getCollection(entityName);
    return collection?.find(filters).toArray() || [];
  }

  async getEntityCount(entityName: string): Promise<number> {
    const collection = await this.db.getCollection(entityName);
    return collection?.count() || 0;
  }

  subscribeToEntityChanges<T>(
    entityName: string,
    callback: (entities: T[]) => void
  ): () => void {
    // Subscription implementation would go here
    // For now, return a no-op unsubscribe function
    return () => {};
  }
}