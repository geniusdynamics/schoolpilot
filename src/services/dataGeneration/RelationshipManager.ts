// ABOUTME: Manages data relationships and dependencies across storage types
// ABOUTME: Ensures referential integrity and proper data generation order

import { IStorageAdapter, RelationshipDefinition, ValidationResult } from './types';

export class RelationshipManager {
  private relationships: Map<string, RelationshipDefinition[]> = new Map();
  private generationOrder: string[] = [];
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter) {
    this.adapter = adapter;
    this.initializeRelationships();
  }

  private initializeRelationships(): void {
    // Define core relationships based on the technical architecture
    const relationships: Record<string, RelationshipDefinition[]> = {
      // Core Administration
      students: [
        { table: 'academic_years', column: 'academic_year_id', required: true },
        { table: 'dormitories', column: 'dormitory_id', required: false },
        { table: 'transport_routes', column: 'transport_route_id', required: false }
      ],
      staff: [
        { table: 'departments', column: 'department_id', required: true },
        { table: 'designations', column: 'designation_id', required: true }
      ],
      clubs_societies: [
        { table: 'staff', column: 'patron_id', required: true }
      ],
      dormitories: [
        { table: 'staff', column: 'matron_id', required: true }
      ],
      
      // Academic Module
      subject_papers: [
        { table: 'subjects', column: 'subject_id', required: true }
      ],
      exam_paper_settings: [
        { table: 'subject_papers', column: 'subject_paper_id', required: true },
        { table: 'grading_schemes', column: 'grading_scheme_id', required: true }
      ],
      class_subject_allocations: [
        { table: 'subjects', column: 'subject_id', required: true },
        { table: 'staff', column: 'teacher_id', required: true }
      ],
      
      // Finance Module
      chart_of_accounts: [
        { table: 'voteheads', column: 'votehead_id', required: false }
      ],
      fee_templates: [
        { table: 'fee_template_items', column: 'fee_template_item_id', required: true }
      ],
      student_wallet_transactions: [
        { table: 'students', column: 'student_id', required: true },
        { table: 'chart_of_accounts', column: 'account_id', required: true }
      ],
      expense_claims: [
        { table: 'staff', column: 'staff_id', required: true },
        { table: 'expense_categories', column: 'category_id', required: true }
      ],
      
      // Library Module
      books: [
        { table: 'book_categories', column: 'category_id', required: true },
        { table: 'book_types', column: 'type_id', required: true }
      ],
      book_loans: [
        { table: 'books', column: 'book_id', required: true },
        { table: 'students', column: 'student_id', required: true }
      ],
      
      // Nutrition Module
      student_meal_assignments: [
        { table: 'students', column: 'student_id', required: true },
        { table: 'meal_plans', column: 'meal_plan_id', required: true }
      ],
      
      // Inventory Module
      inventory_items: [
        { table: 'suppliers', column: 'supplier_id', required: false }
      ],
      purchase_orders: [
        { table: 'suppliers', column: 'supplier_id', required: true },
        { table: 'staff', column: 'requested_by', required: true }
      ],
      purchase_order_items: [
        { table: 'purchase_orders', column: 'purchase_order_id', required: true },
        { table: 'inventory_items', column: 'item_id', required: true }
      ]
    };

    // Store relationships
    for (const [table, deps] of Object.entries(relationships)) {
      this.relationships.set(table, deps);
    }

    // Calculate generation order
    this.calculateGenerationOrder();
  }

  private calculateGenerationOrder(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (table: string) => {
      if (visiting.has(table)) {
        throw new Error(`Circular dependency detected involving table: ${table}`);
      }
      if (visited.has(table)) {
        return;
      }

      visiting.add(table);
      
      const deps = this.relationships.get(table) || [];
      for (const dep of deps) {
        if (dep.required) {
          visit(dep.table);
        }
      }
      
      visiting.delete(table);
      visited.add(table);
      order.push(table);
    };

    // Visit all tables
    const allTables = new Set([
      ...this.relationships.keys(),
      ...Array.from(this.relationships.values()).flat().map(r => r.table)
    ]);

    for (const table of allTables) {
      visit(table);
    }

    this.generationOrder = order;
    console.log('Data generation order calculated:', this.generationOrder);
  }

  getGenerationOrder(): string[] {
    return [...this.generationOrder];
  }

  getTableDependencies(tableName: string): RelationshipDefinition[] {
    return this.relationships.get(tableName) || [];
  }

  async validateRelationships(tableName: string, data: any[]): Promise<ValidationResult> {
    const dependencies = this.getTableDependencies(tableName);
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const record of data) {
      for (const dep of dependencies) {
        const foreignKeyValue = record[dep.column];
        
        if (dep.required && (foreignKeyValue === null || foreignKeyValue === undefined)) {
          errors.push(`Missing required foreign key ${dep.column} in table ${tableName}`);
          continue;
        }

        if (foreignKeyValue !== null && foreignKeyValue !== undefined) {
          const exists = await this.checkForeignKeyExists(dep.table, foreignKeyValue);
          if (!exists) {
            if (dep.required) {
              errors.push(`Foreign key ${dep.column}=${foreignKeyValue} not found in table ${dep.table}`);
            } else {
              warnings.push(`Optional foreign key ${dep.column}=${foreignKeyValue} not found in table ${dep.table}`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async checkForeignKeyExists(tableName: string, keyValue: any): Promise<boolean> {
    try {
      const results = await this.adapter.query(
        `SELECT 1 FROM ${tableName} WHERE id = ? LIMIT 1`,
        [keyValue]
      );
      return results.length > 0;
    } catch (error) {
      console.warn(`Could not verify foreign key in table ${tableName}:`, error);
      return false;
    }
  }

  async generateDependentData(tableName: string, count: number): Promise<any[]> {
    const dependencies = this.getTableDependencies(tableName);
    const data: any[] = [];

    for (let i = 0; i < count; i++) {
      const record: any = {
        id: this.generateId(tableName, i)
      };

      // Populate foreign keys
      for (const dep of dependencies) {
        if (dep.required) {
          const foreignKey = await this.getRandomForeignKey(dep.table);
          if (foreignKey) {
            record[dep.column] = foreignKey;
          } else {
            throw new Error(`No data available in dependency table: ${dep.table}`);
          }
        } else {
          // Optional foreign key - 70% chance of being populated
          if (Math.random() < 0.7) {
            const foreignKey = await this.getRandomForeignKey(dep.table);
            if (foreignKey) {
              record[dep.column] = foreignKey;
            }
          }
        }
      }

      data.push(record);
    }

    return data;
  }

  private async getRandomForeignKey(tableName: string): Promise<string | null> {
    try {
      const results = await this.adapter.query(
        `SELECT id FROM ${tableName} ORDER BY RANDOM() LIMIT 1`
      );
      return results.length > 0 ? results[0].id : null;
    } catch (error) {
      console.warn(`Could not get random foreign key from table ${tableName}:`, error);
      return null;
    }
  }

  private generateId(tableName: string, index: number): string {
    const timestamp = Date.now();
    return `${tableName}_${timestamp}_${index.toString().padStart(6, '0')}`;
  }

  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    
    for (const [table, deps] of this.relationships) {
      graph[table] = deps.filter(d => d.required).map(d => d.table);
    }
    
    return graph;
  }

  validateGenerationOrder(): boolean {
    const graph = this.getDependencyGraph();
    const position = new Map<string, number>();
    
    this.generationOrder.forEach((table, index) => {
      position.set(table, index);
    });

    for (const [table, deps] of Object.entries(graph)) {
      const tablePos = position.get(table);
      if (tablePos === undefined) continue;
      
      for (const dep of deps) {
        const depPos = position.get(dep);
        if (depPos === undefined) continue;
        
        if (depPos >= tablePos) {
          console.error(`Dependency order violation: ${dep} should come before ${table}`);
          return false;
        }
      }
    }
    
    return true;
  }

  addRelationship(tableName: string, relationship: RelationshipDefinition): void {
    const existing = this.relationships.get(tableName) || [];
    existing.push(relationship);
    this.relationships.set(tableName, existing);
    
    // Recalculate generation order
    this.calculateGenerationOrder();
  }

  removeRelationship(tableName: string, columnName: string): void {
    const existing = this.relationships.get(tableName) || [];
    const filtered = existing.filter(r => r.column !== columnName);
    this.relationships.set(tableName, filtered);
    
    // Recalculate generation order
    this.calculateGenerationOrder();
  }
}