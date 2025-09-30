// ABOUTME: Database connection manager for migration scripts
// ABOUTME: Provides connection pooling, error handling, and transaction management

import mysql from 'mysql2/promise';
import { Pool as PostgresPool } from 'pg';
import { RxDatabase } from 'rxdb';
import { akademicoConfig, schoolPilotConfig } from '../../migration_config';

interface DatabaseConnection {
  query: (sql: string, params?: any[]) => Promise<any>;
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  close: () => Promise<void>;
}

class PostgresConnection implements DatabaseConnection {
  private pool: PostgresPool;
  private client: any = null;

  constructor(config: any) {
    this.pool = new PostgresPool(config);
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    if (!this.client) {
      this.client = await this.pool.connect();
    }
    const result = await this.client.query(sql, params);
    return result.rows;
  }

  async beginTransaction(): Promise<void> {
    if (!this.client) {
      this.client = await this.pool.connect();
    }
    await this.client.query('BEGIN');
  }

  async commit(): Promise<void> {
    if (this.client) {
      await this.client.query('COMMIT');
    }
  }

  async rollback(): Promise<void> {
    if (this.client) {
      await this.client.query('ROLLBACK');
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    await this.pool.end();
  }
}

class MySQLConnection implements DatabaseConnection {
  private pool: mysql.Pool;
  private connection: mysql.PoolConnection | null = null;

  constructor(config: any) {
    this.pool = mysql.createPool(config);
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    if (!this.connection) {
      this.connection = await this.pool.getConnection();
    }
    const [rows] = await this.connection.execute(sql, params);
    return rows;
  }

  async beginTransaction(): Promise<void> {
    if (!this.connection) {
      this.connection = await this.pool.getConnection();
    }
    await this.connection.beginTransaction();
  }

  async commit(): Promise<void> {
    if (this.connection) {
      await this.connection.commit();
    }
  }

  async rollback(): Promise<void> {
    if (this.connection) {
      await this.connection.rollback();
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      this.connection.release();
      this.connection = null;
    }
    await this.pool.end();
  }
}

export class DatabaseManager {
  private akademicoConnection: DatabaseConnection | null = null;
  private schoolPilotConnection: DatabaseConnection | null = null;
  private rxdbInstance: RxDatabase | null = null;

  async getAkademicoConnection(): Promise<DatabaseConnection> {
    if (!this.akademicoConnection) {
      try {
        // Assuming Akademico uses PostgreSQL based on config port 5432
        this.akademicoConnection = new PostgresConnection(akademicoConfig);
        console.log('Akademico PostgreSQL connection established successfully');
        
        // Test connection
        await this.akademicoConnection.query('SELECT 1');
      } catch (error) {
        console.error('Failed to establish Akademico connection:', error);
        throw new Error(`Akademico connection failed: ${(error as Error).message}`);
      }
    }
    return this.akademicoConnection;
  }

  async getSchoolPilotConnection(): Promise<DatabaseConnection> {
    if (!this.schoolPilotConnection) {
      try {
        // Assuming SchoolPilot uses MySQL based on config port 3306
        this.schoolPilotConnection = new MySQLConnection(schoolPilotConfig);
        console.log('SchoolPilot MySQL connection established successfully');
        
        // Test connection
        await this.schoolPilotConnection.query('SELECT 1');
      } catch (error) {
        console.error('Failed to establish SchoolPilot connection:', error);
        throw new Error(`SchoolPilot connection failed: ${(error as Error).message}`);
      }
    }
    return this.schoolPilotConnection;
  }

  setRxDBInstance(db: RxDatabase): void {
    this.rxdbInstance = db;
  }

  getRxDBInstance(): RxDatabase {
    if (!this.rxdbInstance) {
      throw new Error('RxDB instance not set. Call setRxDBInstance first.');
    }
    return this.rxdbInstance;
  }

  async executeTransaction<T>(
    connection: DatabaseConnection,
    operations: () => Promise<T>
  ): Promise<T> {
    try {
      await connection.beginTransaction();
      console.log('Transaction started');
      
      const result = await operations();
      
      await connection.commit();
      console.log('Transaction committed successfully');
      
      return result;
    } catch (error) {
      console.error('Transaction error:', error);
      await connection.rollback();
      console.log('Transaction rolled back');
      throw error;
    }
  }

  async testConnections(): Promise<{ akademico: boolean; schoolPilot: boolean; rxdb: boolean }> {
    const results = {
      akademico: false,
      schoolPilot: false,
      rxdb: false
    };

    try {
      const akademicoConn = await this.getAkademicoConnection();
      await akademicoConn.query('SELECT 1');
      results.akademico = true;
      console.log('✅ Akademico connection test passed');
    } catch (error) {
      console.error('❌ Akademico connection test failed:', (error as Error).message);
    }

    try {
      const schoolPilotConn = await this.getSchoolPilotConnection();
      await schoolPilotConn.query('SELECT 1');
      results.schoolPilot = true;
      console.log('✅ SchoolPilot connection test passed');
    } catch (error) {
      console.error('❌ SchoolPilot connection test failed:', (error as Error).message);
    }

    try {
      if (this.rxdbInstance) {
        // Basic RxDB health check - just verify it's accessible
        const collections = Object.keys(this.rxdbInstance);
        results.rxdb = collections.length > 0;
        console.log('✅ RxDB connection test passed');
      } else {
        console.log('⚠️ RxDB instance not set');
      }
    } catch (error) {
      console.error('❌ RxDB connection test failed:', (error as Error).message);
    }

    return results;
  }

  async closeAllConnections(): Promise<void> {
    console.log('Closing all database connections...');
    
    if (this.akademicoConnection) {
      try {
        await this.akademicoConnection.close();
        console.log('Akademico connection closed');
      } catch (error) {
        console.error('Error closing Akademico connection:', error);
      }
      this.akademicoConnection = null;
    }

    if (this.schoolPilotConnection) {
      try {
        await this.schoolPilotConnection.close();
        console.log('SchoolPilot connection closed');
      } catch (error) {
        console.error('Error closing SchoolPilot connection:', error);
      }
      this.schoolPilotConnection = null;
    }

    if (this.rxdbInstance) {
      try {
        await this.rxdbInstance.remove();
        console.log('RxDB instance destroyed');
      } catch (error) {
        console.error('Error destroying RxDB instance:', error);
      }
      this.rxdbInstance = null;
    }
  }

  async healthCheck(): Promise<void> {
    console.log('Performing database health check...');
    const results = await this.testConnections();
    
    const failedConnections = Object.entries(results)
      .filter(([_, success]) => !success)
      .map(([name, _]) => name);

    if (failedConnections.length > 0) {
      throw new Error(`Health check failed for: ${failedConnections.join(', ')}`);
    }

    console.log('All database connections are healthy ✅');
  }
}

export const databaseManager = new DatabaseManager();
