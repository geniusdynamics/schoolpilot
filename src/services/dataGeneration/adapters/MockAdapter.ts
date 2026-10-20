import { logger } from '@/utils/logging';

// ABOUTME: Mock adapter for in-memory data storage during development
// ABOUTME: Provides fast prototyping and testing capabilities

import { BaseStorageAdapter } from './BaseStorageAdapter';

export class MockAdapter extends BaseStorageAdapter {
  private tables: Map<string, any[]> = new Map();
  private schemas: Map<string, string> = new Map();

  async initialize(): Promise<void> {
    this.tables.clear();
    this.schemas.clear();
    this.initialized = true;
    logger.info('Mock adapter initialized successfully');
  }

  async createSchema(tableName: string, schema: string): Promise<void> {
    this.validateInitialization();
    
    // Store schema for reference
    this.schemas.set(tableName, schema);
    
    // Initialize empty table
    this.tables.set(tableName, []);
    
    logger.info(`Created mock table: ${tableName}`);
  }

  async insertBatch(tableName: string, data: any[] | any): Promise<void> {
    this.validateInitialization();
    
    // Callers may pass a single record object (generateModuleData does) —
    // normalize before the length guard, otherwise the insert is silently
    // skipped and generated data never reaches storage.
    const rows = Array.isArray(data) ? data : [data];
    if (!rows || !rows.length) return;

    let table = this.tables.get(tableName);
    if (!table) {
      table = [];
      this.tables.set(tableName, table);
    }

    // Add timestamps and ensure IDs
    const processedData = rows.map(record => ({
      ...record,
      id: record.id || this.generateId(),
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString()
    }));

    table.push(...processedData);

    logger.info(`Inserted ${processedData.length} records into mock table ${tableName}`);
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    this.validateInitialization();
    
    try {
      // Parse simple SQL queries for mock implementation
      const { tableName, operation, conditions, limit } = this.parseSql(sql, params);
      
      const table = this.tables.get(tableName);
      if (!table) {
        return [];
      }

      let results = [...table];

      // Apply conditions
      if (conditions.length > 0) {
        results = results.filter(record => {
          return conditions.every(condition => {
            const { field, operator, value } = condition;
            const recordValue = record[field];

            // SQL literals arrive as strings; coerce to the record value's type
            // so WHERE grade = 10 matches numeric columns and active = 1
            // matches boolean columns.
            let coerced = value;
            if (typeof recordValue === 'number' && value !== null && value !== '' && !isNaN(Number(value))) {
              coerced = Number(value);
            } else if (typeof recordValue === 'boolean') {
              coerced = value === 'true' || Number(value) === 1;
            }

            switch (operator) {
              case '=':
                return recordValue === coerced;
              case '!=':
              case '<>':
                return recordValue !== coerced;
              case '>':
                return recordValue > coerced;
              case '<':
                return recordValue < coerced;
              case '>=':
                return recordValue >= coerced;
              case '<=':
                return recordValue <= coerced;
              case 'LIKE':
                return String(recordValue).toLowerCase().includes(String(value).toLowerCase().replace('%', ''));
              case 'IN':
                return Array.isArray(value) ? value.includes(recordValue) : false;
              default:
                return true;
            }
          });
        });
      }

      // Apply limit
      if (limit > 0) {
        results = results.slice(0, limit);
      }

      return results;
    } catch (error) {
      logger.error('Mock query execution failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.tables.clear();
    this.schemas.clear();
    this.initialized = false;
    logger.info('Mock adapter cleaned up');
  }

  // Mock-specific methods
  getAllTables(): string[] {
    return Array.from(this.tables.keys());
  }

  getTableData(tableName: string): any[] {
    return this.tables.get(tableName) || [];
  }

  getTableSchema(tableName: string): string | undefined {
    return this.schemas.get(tableName);
  }

  clearTable(tableName: string): void {
    this.tables.set(tableName, []);
    logger.info(`Cleared mock table: ${tableName}`);
  }

  getTableStats(tableName?: string): Record<string, { count: number; schema: boolean }> | { tableName: string; rowCount: number; schema: boolean } {
    if (tableName) {
      const rows = this.tables.get(tableName) ?? [];
      return { tableName, rowCount: rows.length, schema: this.schemas.has(tableName) };
    }

    const stats: Record<string, { count: number; schema: boolean }> = {};

    for (const [tableName, data] of Array.from(this.tables.entries())) {
      stats[tableName] = {
        count: data.length,
        schema: this.schemas.has(tableName)
      };
    }
    
    return stats;
  }

  exportData(): Record<string, any[]> {
    const exported: Record<string, any[]> = {};
    for (const [tableName, data] of Array.from(this.tables.entries())) {
      exported[tableName] = JSON.parse(JSON.stringify(data));
    }
    return exported;
  }

  importData(data: Record<string, any[]>): void {
    for (const [tableName, tableData] of Object.entries(data)) {
      this.tables.set(tableName, [...tableData]);
    }
    logger.info(`Imported data for ${Object.keys(data).length} tables`);
  }

  private parseSql(sql: string, params: any[]): {
    tableName: string;
    operation: string;
    conditions: Array<{ field: string; operator: string; value: any }>;
    limit: number;
  } {
    const result = {
      tableName: '',
      operation: 'SELECT',
      conditions: [] as Array<{ field: string; operator: string; value: any }>,
      limit: 0
    };

    // Extract table name (handle both quoted and unquoted table names)
    const tableMatch = sql.match(/FROM\s+(?:"(\w+)"|'(\w+)'|(\w+))/i);
    if (tableMatch) {
      result.tableName = tableMatch[1] || tableMatch[2] || tableMatch[3];
    }

    // Extract operation
    const operationMatch = sql.match(/^(SELECT|INSERT|UPDATE|DELETE)/i);
    if (operationMatch) {
      result.operation = operationMatch[1].toUpperCase();
    }

    // Extract WHERE conditions
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const conditions = whereClause.split(/\s+AND\s+/i);
      
      let paramIndex = 0;
      for (const condition of conditions) {
        const conditionMatch = condition.match(/(\w+)\s*(=|!=|<>|>|<|>=|<=|LIKE|IN)\s*(\?|\w+)/i);
        if (conditionMatch) {
          const [, field, operator, valueToken] = conditionMatch;
          let value = valueToken;
          
          if (valueToken === '?' && paramIndex < params.length) {
            value = params[paramIndex++];
          }
          
          result.conditions.push({ field, operator, value });
        }
      }
    }

    // Extract LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      result.limit = parseInt(limitMatch[1]);
    }

    return result;
  }

  private generateId(): string {
    return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}