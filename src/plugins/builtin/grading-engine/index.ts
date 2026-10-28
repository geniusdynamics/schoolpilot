import { logger } from '@/utils/logging';

/**
 * Results Engine Plugin
 *
 * Builtin engine that turns assessment scores into grades, ranks and pass or fail outcomes.
 * It prefers the shared Go WebAssembly grader and falls back to the JavaScript implementation
 * when the module is not loaded.
 */

import type { PluginManifest, PluginModule, PluginContext } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface GradingConfig {
  strategy: 'percentage' | 'gpa' | 'letter' | 'cbc' | 'passfail';
  weights?: Record<string, number>;
  passingGrade?: number;
  scale?: Record<string, { min: number; max: number; label: string }>;
}

export interface StudentGrade {
  studentId: string;
  studentName: string;
  scores: Record<string, number>;
  totalScore?: number;
  finalGrade?: string;
  gradePoints?: number;
  passed?: boolean;
}

export interface GradingResult {
  studentId: string;
  totalScore: number;
  finalGrade: string;
  gradePoints: number;
  passed: boolean;
  rank?: number;
  percentile?: number;
}

export interface GradingEngineAPI {
  calculateGrades: (students: StudentGrade[], config: GradingConfig) => Promise<GradingResult[]>;
  getStrategies: () => string[];
  validateConfig: (config: GradingConfig) => { valid: boolean; errors: string[] };
  previewGrade: (score: number, total: number, config: GradingConfig) => string;
}

// ============================================================================
// Manifest
// ============================================================================

export const manifest: PluginManifest = {
  id: 'poc-grading-engine',
  name: 'Results Engine',
  version: '1.0.0',
  sdkVersion: '^1.0.0',
  type: 'engine',
  category: 'builtin',
  entry: './index.ts',
  description: 'Results engine: turns assessment scores into grades, ranks and pass or fail outcomes',
  author: 'SchoolPilot3 Team',
  license: 'MIT',
  permissions: ['settings:access', 'code:execute'],
  
  engine: {
    wasmFile: '/wasm/grading.wasm',
    exports: ['spGradingCalculate', 'spGradingStrategies', 'spGradingValidate'],
    fallbackBehavior: 'fallback',
  },
  
  hooks: [
    'grading.beforeCalculate',
    'grading.afterCalculate',
    'grading.validateConfig',
  ],
  
  settings: [
    {
      key: 'useWasm',
      label: 'Use WASM Engine',
      type: 'boolean',
      defaultValue: true,
      description: 'Use WASM-based calculation (faster) or JavaScript fallback',
    },
    {
      key: 'defaultStrategy',
      label: 'Default Grading Strategy',
      type: 'select',
      defaultValue: 'percentage',
      options: [
        { label: 'Percentage', value: 'percentage' },
        { label: 'GPA (4.0 Scale)', value: 'gpa' },
        { label: 'Letter Grade', value: 'letter' },
        { label: 'CBC (Competency)', value: 'cbc' },
        { label: 'Pass/Fail', value: 'passfail' },
      ],
    },
    {
      key: 'passingGrade',
      label: 'Passing Grade (%)',
      type: 'number',
      defaultValue: 50,
      validation: { min: 0, max: 100 },
    },
    {
      key: 'enableRanking',
      label: 'Enable Student Ranking',
      type: 'boolean',
      defaultValue: true,
      description: 'Calculate and display student ranks',
    },
  ],
  
  routes: [
    {
      path: '/plugins/grading-engine',
      component: 'GradingEnginePage',
      title: 'Results Engine',
      icon: 'CalculatorIcon',
    },
  ],

  menuItems: [
    {
      id: 'grading-engine',
      label: 'Results Engine',
      icon: 'CalculatorIcon',
      route: '/plugins/grading-engine',
      order: 100,
    },
  ],
};

// ============================================================================
// Grading Engine Implementation
// ============================================================================

// Declare WASM exports
declare global {
  function spGradingCalculate(students: string, config: string): string;
  function spGradingStrategies(): string;
  function spGradingValidate(config: string): string;
}

class GradingEngine implements GradingEngineAPI {
  private wasmReady = false;
  private useWasm: boolean;
  
  constructor(useWasm: boolean = true) {
    this.useWasm = useWasm;
  }
  
  async initialize(): Promise<void> {
    if (!this.useWasm) return;
    
    try {
      // Check if WASM functions are available
      if (typeof spGradingCalculate === 'function') {
        this.wasmReady = true;
        logger.info('[GradingEngine] WASM engine loaded');
      }
    } catch {
      logger.warn('[GradingEngine] WASM not available, using JavaScript fallback');
      this.wasmReady = false;
    }
  }
  
  async calculateGrades(
    students: StudentGrade[],
    config: GradingConfig
  ): Promise<GradingResult[]> {
    // Before hook
    const beforeResults = students.map(s => s);
    
    let results: GradingResult[];
    
    if (this.wasmReady && this.useWasm) {
      results = await this.calculateWithWasm(beforeResults, config);
    } else {
      results = await this.calculateWithJS(beforeResults, config);
    }
    
    // Calculate rankings if enabled
    if (config.weights?.['enableRanking']) {
      results = this.calculateRankings(results);
    }
    
    return results;
  }
  
  private async calculateWithWasm(
    students: StudentGrade[],
    config: GradingConfig
  ): Promise<GradingResult[]> {
    try {
      const result = spGradingCalculate(
        JSON.stringify(students),
        JSON.stringify(config)
      );
      return JSON.parse(result);
    } catch (error) {
      logger.error('[GradingEngine] WASM calculation failed, falling back:', error);
      return this.calculateWithJS(students, config);
    }
  }
  
  private async calculateWithJS(
    students: StudentGrade[],
    config: GradingConfig
  ): Promise<GradingResult[]> {
    // JavaScript fallback implementation
    return students.map(student => {
      const scores = Object.values(student.scores);
      const total = scores.reduce((sum, score) => sum + score, 0);
      const maxPossible = Object.keys(student.scores).length * 100;
      const percentage = (total / maxPossible) * 100;
      
      const finalGrade = this.calculateGrade(percentage, config);
      const gradePoints = this.calculateGradePoints(percentage, config);
      const passed = percentage >= (config.passingGrade || 50);
      
      return {
        studentId: student.studentId,
        totalScore: percentage,
        finalGrade,
        gradePoints,
        passed,
      };
    });
  }
  
  private calculateGrade(percentage: number, config: GradingConfig): string {
    const strategy = config.strategy || 'percentage';
    
    switch (strategy) {
      case 'letter':
        return this.percentageToLetter(percentage, config.scale);
      case 'gpa':
        return this.percentageToGPA(percentage).toFixed(2);
      case 'cbc':
        return this.percentageToCBC(percentage);
      case 'passfail':
        return percentage >= (config.passingGrade || 50) ? 'P' : 'F';
      default:
        return percentage.toFixed(1) + '%';
    }
  }
  
  private percentageToLetter(percentage: number, scale?: Record<string, { min: number; max: number; label: string }>): string {
    if (scale) {
      for (const [, range] of Object.entries(scale)) {
        if (percentage >= range.min && percentage <= range.max) {
          return range.label;
        }
      }
    }
    
    // Default scale
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    if (percentage >= 45) return 'D+';
    if (percentage >= 40) return 'D';
    return 'F';
  }
  
  private percentageToGPA(percentage: number): number {
    if (percentage >= 90) return 4.0;
    if (percentage >= 85) return 3.7;
    if (percentage >= 80) return 3.3;
    if (percentage >= 75) return 3.0;
    if (percentage >= 70) return 2.7;
    if (percentage >= 65) return 2.3;
    if (percentage >= 60) return 2.0;
    if (percentage >= 55) return 1.7;
    if (percentage >= 50) return 1.0;
    return 0.0;
  }
  
  private percentageToCBC(percentage: number): string {
    // Competency-Based Curriculum levels
    if (percentage >= 80) return 'EE'; // Exceeding Expectation
    if (percentage >= 60) return 'ME'; // Meeting Expectation
    if (percentage >= 40) return 'AE'; // Approaching Expectation
    return 'BE'; // Below Expectation
  }
  
  private calculateGradePoints(percentage: number, config: GradingConfig): number {
    if (config.strategy === 'gpa') {
      return this.percentageToGPA(percentage);
    }
    return percentage / 25; // Simple 4-point scale
  }
  
  private calculateRankings(results: GradingResult[]): GradingResult[] {
    const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);
    
    sorted.forEach((result, index) => {
      result.rank = index + 1;
      result.percentile = Math.round(((sorted.length - index) / sorted.length) * 100);
    });
    
    // Map back to original order
    const rankMap = new Map(sorted.map(r => [r.studentId, r]));
    return results.map(r => rankMap.get(r.studentId) || r);
  }
  
  getStrategies(): string[] {
    if (this.wasmReady && typeof spGradingStrategies === 'function') {
      return JSON.parse(spGradingStrategies());
    }
    return ['percentage', 'gpa', 'letter', 'cbc', 'passfail'];
  }
  
  validateConfig(config: GradingConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.strategy) {
      errors.push('Strategy is required');
    }
    
    if (!this.getStrategies().includes(config.strategy)) {
      errors.push(`Invalid strategy: ${config.strategy}`);
    }
    
    if (config.passingGrade !== undefined && (config.passingGrade < 0 || config.passingGrade > 100)) {
      errors.push('Passing grade must be between 0 and 100');
    }
    
    if (config.weights) {
      const totalWeight = Object.values(config.weights).reduce((sum, w) => sum + w, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        errors.push('Weights must sum to 100%');
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  previewGrade(score: number, total: number, config: GradingConfig): string {
    const percentage = (score / total) * 100;
    return this.calculateGrade(percentage, config);
  }
}

// ============================================================================
// Plugin Module
// ============================================================================

let gradingEngine: GradingEngine | null = null;

const module: PluginModule = {
  async activate(context: PluginContext) {
    logger.info('[GradingEngine Plugin] Activating...');
    
    const useWasm = context.api.getSetting('useWasm') ?? true;
    gradingEngine = new GradingEngine(useWasm);
    await gradingEngine.initialize();
    
    // Register hooks
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context.api.addHook('grading.beforeCalculate', (students: StudentGrade[], _config: GradingConfig) => {
      // Pre-process students if needed
      logger.info(`[GradingEngine] Processing ${students.length} students`);
      return students;
    }, 10);
    
    context.api.addHook('grading.afterCalculate', (results: GradingResult[]) => {
      // Post-process results if needed
      logger.info(`[GradingEngine] Calculated ${results.length} results`);
      return results;
    }, 10);
    
    logger.info('[GradingEngine Plugin] Activated successfully');
  },
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deactivate(_context: PluginContext) {
    logger.info('[GradingEngine Plugin] Deactivated');
    gradingEngine = null;
  },
  
  api: {
    getEngine: () => gradingEngine,
    calculateGrades: async (students: StudentGrade[], config: GradingConfig) => {
      if (!gradingEngine) throw new Error('Engine not initialized');
      return gradingEngine.calculateGrades(students, config);
    },
    getStrategies: () => gradingEngine?.getStrategies() || [],
    validateConfig: (config: GradingConfig) => gradingEngine?.validateConfig(config) || { valid: false, errors: ['Engine not initialized'] },
    previewGrade: (score: number, total: number, config: GradingConfig) => {
      if (!gradingEngine) throw new Error('Engine not initialized');
      return gradingEngine.previewGrade(score, total, config);
    },
  },
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  manifest,
  module,
};

export { GradingEngine };
