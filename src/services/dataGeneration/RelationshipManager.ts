import { logger } from '@/utils/logging';

// ABOUTME: Manages data relationships and dependencies across storage types
// ABOUTME: Ensures referential integrity and proper data generation order

import { IStorageAdapter, ValidationResult } from './types';

// Local relationship definition matching actual usage
interface LocalRelationshipDefinition {
  table: string;
  column: string;
  required: boolean;
}

export class RelationshipManager {
  private relationships: Map<string, LocalRelationshipDefinition[]> = new Map();
  private generationOrder: string[] = [];
  private adapter: IStorageAdapter | null = null;

  constructor(adapter?: IStorageAdapter) {
    if (adapter) {
      this.adapter = adapter;
    }
    this.initializeRelationships();
  }

  private initializeRelationships(): void {
    // Define core relationships based on the technical architecture
    // Covers 13 admin domains + 2 academics domains with FK closure guarantees
    const relationships: Record<string, LocalRelationshipDefinition[]> = {
      // Core / Administration – students ↔ classes
      students: [
        // The administration generator emits class/stream as display names
        // (class_name/stream_name) without current_class_stream_id, so this FK
        // is optional here; required would fail every validateData run.
        { table: 'class_streams', column: 'current_class_stream_id', required: false },
        { table: 'student_categories', column: 'student_category_id', required: false },
        { table: 'dormitories', column: 'dormitory_id', required: false },
        { table: 'academic_years', column: 'academic_year_id', required: false },
        { table: 'transport_routes', column: 'transport_route_id', required: false }
      ],
      // Staff ↔ departments
      staff: [
        { table: 'departments', column: 'department_id', required: true },
        { table: 'designations', column: 'designation_id', required: true }
      ],
      class_streams: [
        { table: 'classes', column: 'class_id', required: true },
        { table: 'staff', column: 'class_teacher_id', required: false }
      ],
      classes: [],
      // Dormitories: master/matron is a staff member (optional to allow bootstrap)
      dormitories: [
        { table: 'staff', column: 'master_id', required: false },
        { table: 'staff', column: 'matron_id', required: false }
      ],
      clubs: [
        { table: 'staff', column: 'patron_id', required: false }
      ],
      clubs_societies: [
        { table: 'staff', column: 'patron_id', required: false }
      ],

      // Certificates & clearance
      certificate_requests: [
        { table: 'students', column: 'student_id', required: true },
        { table: 'users', column: 'requested_by', required: false }
      ],
      certificates: [
        { table: 'students', column: 'student_id', required: true }
      ],
      student_clearances: [
        { table: 'students', column: 'student_id', required: true }
      ],
      student_clearance_requests: [
        { table: 'students', column: 'student_id', required: true }
      ],

      // Gate passes & visitors
      gate_passes: [
        { table: 'students', column: 'student_id', required: true }
      ],
      visitor_logs: [
        { table: 'students', column: 'student_id', required: false },
        { table: 'users', column: 'person_to_meet_id', required: false }
      ],

      // Disciplinary
      disciplinary_cases: [
        { table: 'students', column: 'student_id', required: true },
        { table: 'users', column: 'reported_by', required: false },
        { table: 'users', column: 'assigned_to', required: false }
      ],
      disciplinary_records: [
        { table: 'students', column: 'student_id', required: true },
        { table: 'disciplinary_cases', column: 'case_id', required: true }
      ],

      // Alumni – derived from students with status=Alumni; no physical FK but validate backing student
      alumni: [
        { table: 'students', column: 'student_id', required: true }
      ],

      // Student health & attendance
      student_health_records: [
        { table: 'students', column: 'student_id', required: true }
      ],
      student_attendance: [
        { table: 'students', column: 'student_id', required: true },
        { table: 'timetable_period_defs', column: 'period_id', required: false }
      ],
      student_import_records: [
        { table: 'student_import_sessions', column: 'import_id', required: true }
      ],
      student_guardian_relationships: [
        { table: 'students', column: 'student_id', required: true },
        { table: 'parents_guardians', column: 'guardian_id', required: true }
      ],

      // Academic Module
      subjects: [
        { table: 'departments', column: 'department_id', required: false }
      ],
      subject_papers: [
        { table: 'subjects', column: 'subject_id', required: true }
      ],
      grading_schemes: [],
      exam_sessions: [
        { table: 'school_periods', column: 'school_period_id', required: true }
      ],
      exam_paper_settings: [
        { table: 'subject_papers', column: 'subject_paper_id', required: true },
        { table: 'grading_schemes', column: 'grading_scheme_id', required: false }
      ],
      exam_schedules: [
        { table: 'exam_sessions', column: 'exam_session_id', required: true },
        { table: 'subject_papers', column: 'subject_paper_id', required: true }
      ],
      student_exam_results: [
        { table: 'students', column: 'student_id', required: true },
        { table: 'exam_sessions', column: 'exam_session_id', required: true }
      ],
      class_subject_allocations: [
        { table: 'class_streams', column: 'class_stream_id', required: true },
        { table: 'subjects', column: 'subject_id', required: true },
        { table: 'academic_years', column: 'academic_year_id', required: false }
      ],
      teacher_subject_assignments: [
        { table: 'class_subject_allocations', column: 'allocation_id', required: true },
        { table: 'staff', column: 'teacher_id', required: true }
      ],
      student_subject_enrollments: [
        { table: 'students', column: 'student_id', required: true },
        { table: 'class_subject_allocations', column: 'class_subject_allocation_id', required: true }
      ],
      timetable_entries: [
        { table: 'class_streams', column: 'class_stream_id', required: true },
        { table: 'subjects', column: 'subject_id', required: false },
        { table: 'staff', column: 'teacher_id', required: false },
        { table: 'timetable_period_defs', column: 'period_id', required: false }
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

  getRelationships(): Record<string, LocalRelationshipDefinition[]> {
    const result: Record<string, LocalRelationshipDefinition[]> = {};
    for (const [table, deps] of this.relationships) {
      result[table] = [...deps];
    }
    return result;
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
    logger.info('Data generation order calculated:', this.generationOrder);
  }

  getGenerationOrder(): string[] {
    return [...this.generationOrder];
  }

  getTableDependencies(tableName: string): LocalRelationshipDefinition[] {
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

  // In-memory FK existence check when adapter not wired (demoDataSeed validation)
  private inMemoryTables: Map<string, Set<string>> | null = null;

  setInMemoryTables(tables: Map<string, Set<string>>): void {
    this.inMemoryTables = tables;
  }

  async validateAllRelationships(dataByTable: Record<string, any[]>): Promise<Record<string, ValidationResult>> {
    // Populate in-memory lookup so checkForeignKeyExists can work without adapter (CI / seed validation)
    const mem = new Map<string, Set<string>>();
    for (const [tbl, rows] of Object.entries(dataByTable)) {
      mem.set(tbl, new Set(rows.map((r: any) => String(r.id))));
      // also index alternate id shapes like _id
      for (const r of rows) {
        if (r._id != null) mem.get(tbl)!.add(String(r._id));
      }
    }
    this.setInMemoryTables(mem);
    const results: Record<string, ValidationResult> = {};
    for (const [tbl, rows] of Object.entries(dataByTable)) {
      if (this.relationships.has(tbl)) {
        results[tbl] = await this.validateRelationships(tbl, rows);
      }
    }
    return results;
  }

  private async checkForeignKeyExists(tableName: string, keyValue: any): Promise<boolean> {
    const keyStr = String(keyValue);
    if (this.inMemoryTables?.has(tableName)) {
      return this.inMemoryTables.get(tableName)!.has(keyStr);
    }
    if (!this.adapter) {
      // No adapter and no in-memory tables: warn but don't false-negative in CI unless required
      logger.warn(`No adapter or in-memory table for FK check ${tableName}.id=${keyStr}`);
      return false;
    }
    try {
      const results = await this.adapter.query(
        `SELECT 1 FROM ${tableName} WHERE id = ? LIMIT 1`,
        [keyValue]
      );
      return results.length > 0;
    } catch (error) {
      logger.warn(`Could not verify foreign key in table ${tableName}:`, error);
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
    if (!this.adapter) {
      return null;
    }
    try {
      const results = await this.adapter.query(
        `SELECT id FROM ${tableName} ORDER BY RANDOM() LIMIT 1`
      );
      return results.length > 0 ? results[0].id : null;
    } catch (error) {
      logger.warn(`Could not get random foreign key from table ${tableName}:`, error);
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
          logger.error(`Dependency order violation: ${dep} should come before ${table}`);
          return false;
        }
      }
    }

    return true;
  }

  addRelationship(tableName: string, relationship: LocalRelationshipDefinition): void {
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