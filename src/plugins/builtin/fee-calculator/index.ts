/**
 * Fee Calculator POC Plugin
 * 
 * Proof-of-concept plugin demonstrating Go WASM-based fee calculation.
 * This plugin showcases how shared Go engines can be used for financial calculations.
 */

import type { PluginManifest, PluginModule, PluginContext } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface FeeItem {
  id: string;
  name: string;
  type: 'tuition' | 'boarding' | 'transport' | 'meals' | 'books' | 'activities' | 'other';
  amount: number;
  currency: string;
  frequency: 'once' | 'termly' | 'annually' | 'monthly';
  discountable: boolean;
  taxExempt: boolean;
}

export interface FeeDiscount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  applicableTo: string[]; // Fee item IDs, or ['*'] for all
  conditions?: {
    minAmount?: number;
    maxAmount?: number;
    earlyPayment?: boolean;
    siblingCount?: number;
  };
}

export interface StudentFeeProfile {
  studentId: string;
  grade: string;
  boardingStatus: 'day' | 'boarding';
  transportRoute?: string;
  mealPlan?: 'basic' | 'standard' | 'premium';
  siblings: number;
  scholarshipPercentage?: number;
}

export interface FeeCalculationInput {
  profile: StudentFeeProfile;
  feeItems: FeeItem[];
  discounts: FeeDiscount[];
  academicYear: string;
  term?: string;
}

export interface FeeBreakdown {
  itemId: string;
  itemName: string;
  baseAmount: number;
  discounts: Array<{ name: string; amount: number }>;
  subtotal: number;
  tax: number;
  total: number;
}

export interface FeeCalculationResult {
  studentId: string;
  breakdown: FeeBreakdown[];
  subtotal: number;
  totalDiscounts: number;
  totalTax: number;
  grandTotal: number;
  dueDate?: string;
  paymentSchedule?: PaymentScheduleItem[];
}

export interface PaymentScheduleItem {
  dueDate: string;
  amount: number;
  description: string;
}

export interface FeeCalculatorAPI {
  calculateFees: (input: FeeCalculationInput) => Promise<FeeCalculationResult>;
  getFeeItems: () => FeeItem[];
  getApplicableDiscounts: (profile: StudentFeeProfile) => FeeDiscount[];
  previewTotal: (profile: StudentFeeProfile) => number;
  generatePaymentSchedule: (total: number, installments: number) => PaymentScheduleItem[];
}

// ============================================================================
// Manifest
// ============================================================================

export const manifest: PluginManifest = {
  id: 'poc-fee-calculator',
  name: 'Fee Calculator (POC)',
  version: '1.0.0',
  type: 'engine',
  category: 'builtin',
  entry: './index.ts',
  description: 'Proof-of-concept fee calculation engine with WASM support',
  author: 'SchoolPilot3 Team',
  license: 'MIT',
  
  engine: {
    wasmFile: '/wasm/fees.wasm',
    exports: ['spFeesCalculate', 'spFeesBreakdown', 'spFeesSchedule'],
    fallbackBehavior: 'fallback',
  },
  
  hooks: [
    'fees.beforeCalculate',
    'fees.afterCalculate',
    'fees.applyDiscounts',
    'fees.generateSchedule',
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
      key: 'currency',
      label: 'Default Currency',
      type: 'string',
      defaultValue: 'USD',
      description: 'Default currency for fee calculations',
    },
    {
      key: 'taxRate',
      label: 'Tax Rate (%)',
      type: 'number',
      defaultValue: 0,
      validation: { min: 0, max: 100 },
      description: 'Applicable tax rate for fees',
    },
    {
      key: 'paymentTerms',
      label: 'Payment Terms',
      type: 'select',
      defaultValue: 'termly',
      options: [
        { label: 'Full Year Upfront', value: 'annual' },
        { label: 'Termly (3 payments)', value: 'termly' },
        { label: 'Monthly', value: 'monthly' },
      ],
    },
    {
      key: 'earlyPaymentDiscount',
      label: 'Early Payment Discount (%)',
      type: 'number',
      defaultValue: 5,
      validation: { min: 0, max: 20 },
      description: 'Discount for early payment',
    },
    {
      key: 'siblingDiscount',
      label: 'Sibling Discount (%)',
      type: 'number',
      defaultValue: 10,
      validation: { min: 0, max: 50 },
      description: 'Discount for additional siblings',
    },
  ],
  
  routes: [
    {
      path: '/plugins/fee-calculator',
      component: 'FeeCalculatorPage',
      title: 'Fee Calculator',
      icon: 'CurrencyDollarIcon',
    },
  ],
  
  menuItems: [
    {
      id: 'fee-calculator',
      label: 'Fee Calculator',
      icon: 'CurrencyDollarIcon',
      route: '/plugins/fee-calculator',
      order: 101,
    },
  ],
};

// ============================================================================
// Fee Calculator Implementation
// ============================================================================

// Declare WASM exports
declare global {
  function spFeesCalculate(input: string): string;
  function spFeesBreakdown(input: string): string;
  function spFeesSchedule(total: string, installments: string): string;
}

class FeeCalculator implements FeeCalculatorAPI {
  private wasmReady = false;
  private useWasm: boolean;
  private settings: Record<string, any>;
  
  constructor(useWasm: boolean = true, settings: Record<string, any> = {}) {
    this.useWasm = useWasm;
    this.settings = settings;
  }
  
  async initialize(): Promise<void> {
    if (!this.useWasm) return;
    
    try {
      if (typeof spFeesCalculate === 'function') {
        this.wasmReady = true;
        console.log('[FeeCalculator] WASM engine loaded');
      }
    } catch (_error) {
      console.warn('[FeeCalculator] WASM not available, using JavaScript fallback');
      this.wasmReady = false;
    }
  }
  
  async calculateFees(input: FeeCalculationInput): Promise<FeeCalculationResult> {
    let result: FeeCalculationResult;
    
    if (this.wasmReady && this.useWasm) {
      result = await this.calculateWithWasm(input);
    } else {
      result = await this.calculateWithJS(input);
    }
    
    // Generate payment schedule
    const terms = this.settings.paymentTerms === 'annual' ? 1 
      : this.settings.paymentTerms === 'termly' ? 3 
      : 12;
    
    result.paymentSchedule = this.generatePaymentSchedule(result.grandTotal, terms);
    
    return result;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async calculateWithWasm(_input: FeeCalculationInput): Promise<FeeCalculationResult> {
    try {
      const result = spFeesCalculate(JSON.stringify(_input));
      return JSON.parse(result);
    } catch (error) {
      console.error('[FeeCalculator] WASM calculation failed, falling back:', error);
      return this.calculateWithJS(_input);
    }
  }
  
  private async calculateWithJS(input: FeeCalculationInput): Promise<FeeCalculationResult> {
    const breakdown: FeeBreakdown[] = [];
    let subtotal = 0;
    let totalDiscounts = 0;
    
    // Calculate each fee item
    for (const item of input.feeItems) {
      const itemDiscounts: Array<{ name: string; amount: number }> = [];
      let itemAmount = item.amount;
      
      // Apply discounts
      const applicableDiscounts = this.getApplicableDiscountsForItem(
        item, 
        input.discounts, 
        input.profile
      );
      
      for (const discount of applicableDiscounts) {
        const discountAmount = discount.type === 'percentage' 
          ? itemAmount * (discount.value / 100)
          : discount.value;
        
        itemDiscounts.push({
          name: discount.name,
          amount: discountAmount,
        });
        
        itemAmount -= discountAmount;
        totalDiscounts += discountAmount;
      }
      
      // Apply scholarship
      if (input.profile.scholarshipPercentage && item.discountable) {
        const scholarshipAmount = itemAmount * (input.profile.scholarshipPercentage / 100);
        itemDiscounts.push({
          name: 'Scholarship',
          amount: scholarshipAmount,
        });
        itemAmount -= scholarshipAmount;
        totalDiscounts += scholarshipAmount;
      }
      
      // Calculate tax
      const tax = item.taxExempt ? 0 : itemAmount * ((this.settings.taxRate || 0) / 100);
      
      const itemTotal = itemAmount + tax;
      
      breakdown.push({
        itemId: item.id,
        itemName: item.name,
        baseAmount: item.amount,
        discounts: itemDiscounts,
        subtotal: itemAmount,
        tax,
        total: itemTotal,
      });
      
      subtotal += item.amount;
    }
    
    const totalTax = breakdown.reduce((sum, item) => sum + item.tax, 0);
    const grandTotal = breakdown.reduce((sum, item) => sum + item.total, 0);
    
    return {
      studentId: input.profile.studentId,
      breakdown,
      subtotal,
      totalDiscounts,
      totalTax,
      grandTotal,
    };
  }
  
  private getApplicableDiscountsForItem(
    item: FeeItem,
    discounts: FeeDiscount[],
    profile: StudentFeeProfile
  ): FeeDiscount[] {
    const applicable: FeeDiscount[] = [];
    
    for (const discount of discounts) {
      // Check if discount applies to this item
      if (!discount.applicableTo.includes('*') && !discount.applicableTo.includes(item.id)) {
        continue;
      }
      
      // Check conditions
      if (discount.conditions) {
        if (discount.conditions.siblingCount && profile.siblings < discount.conditions.siblingCount) {
          continue;
        }
        // Add more condition checks as needed
      }
      
      applicable.push(discount);
    }
    
    // Add built-in discounts based on settings
    if (profile.siblings > 0 && this.settings.siblingDiscount > 0 && item.discountable) {
      applicable.push({
        id: 'builtin-sibling',
        name: `Sibling Discount (${profile.siblings} siblings)`,
        type: 'percentage',
        value: this.settings.siblingDiscount * profile.siblings,
        applicableTo: ['*'],
      });
    }
    
    return applicable;
  }
  
  getFeeItems(): FeeItem[] {
    // Default fee items - would be loaded from configuration
    return [
      { id: 'tuition', name: 'Tuition', type: 'tuition', amount: 5000, currency: 'USD', frequency: 'termly', discountable: true, taxExempt: true },
      { id: 'boarding', name: 'Boarding', type: 'boarding', amount: 3000, currency: 'USD', frequency: 'termly', discountable: true, taxExempt: true },
      { id: 'transport', name: 'Transport', type: 'transport', amount: 500, currency: 'USD', frequency: 'termly', discountable: false, taxExempt: true },
      { id: 'meals', name: 'Meal Plan', type: 'meals', amount: 800, currency: 'USD', frequency: 'termly', discountable: false, taxExempt: false },
      { id: 'books', name: 'Books & Materials', type: 'books', amount: 300, currency: 'USD', frequency: 'once', discountable: false, taxExempt: true },
      { id: 'activities', name: 'Activities Fee', type: 'activities', amount: 200, currency: 'USD', frequency: 'termly', discountable: true, taxExempt: true },
    ];
  }
  
  getApplicableDiscounts(profile: StudentFeeProfile): FeeDiscount[] {
    const discounts: FeeDiscount[] = [];
    
    if (profile.siblings > 0 && this.settings.siblingDiscount > 0) {
      discounts.push({
        id: 'sibling',
        name: 'Sibling Discount',
        type: 'percentage',
        value: this.settings.siblingDiscount * profile.siblings,
        applicableTo: ['*'],
      });
    }
    
    if (this.settings.earlyPaymentDiscount > 0) {
      discounts.push({
        id: 'early-payment',
        name: 'Early Payment Discount',
        type: 'percentage',
        value: this.settings.earlyPaymentDiscount,
        applicableTo: ['*'],
        conditions: { earlyPayment: true },
      });
    }
    
    return discounts;
  }
  
  previewTotal(profile: StudentFeeProfile): number {
    const feeItems = this.getFeeItems();
    let total = 0;
    
    for (const item of feeItems) {
      // Skip boarding for day students
      if (item.type === 'boarding' && profile.boardingStatus === 'day') {
        continue;
      }
      
      // Skip transport if no route
      if (item.type === 'transport' && !profile.transportRoute) {
        continue;
      }
      
      total += item.amount;
    }
    
    // Apply sibling discount estimate
    if (profile.siblings > 0 && this.settings.siblingDiscount > 0) {
      total *= (1 - (this.settings.siblingDiscount * profile.siblings) / 100);
    }
    
    return total;
  }
  
  generatePaymentSchedule(total: number, installments: number): PaymentScheduleItem[] {
    const schedule: PaymentScheduleItem[] = [];
    const amountPerInstallment = Math.ceil(total / installments * 100) / 100;
    let remaining = total;
    
    const today = new Date();
    
    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(today);
      
      if (this.settings.paymentTerms === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + i);
      } else if (this.settings.paymentTerms === 'termly') {
        // Terms are typically 4 months apart
        dueDate.setMonth(dueDate.getMonth() + (i * 4));
      }
      // Annual is just one payment
      
      const amount = i === installments - 1 ? remaining : amountPerInstallment;
      remaining -= amount;
      
      schedule.push({
        dueDate: dueDate.toISOString().split('T')[0],
        amount,
        description: `Installment ${i + 1} of ${installments}`,
      });
    }
    
    return schedule;
  }
}

// ============================================================================
// Plugin Module
// ============================================================================

let feeCalculator: FeeCalculator | null = null;

const module: PluginModule = {
  async activate(context: PluginContext) {
    console.log('[FeeCalculator Plugin] Activating...');
    
    const useWasm = context.api.getSetting('useWasm') ?? true;
    const settings = {
      currency: context.api.getSetting('currency') ?? 'USD',
      taxRate: context.api.getSetting('taxRate') ?? 0,
      paymentTerms: context.api.getSetting('paymentTerms') ?? 'termly',
      earlyPaymentDiscount: context.api.getSetting('earlyPaymentDiscount') ?? 5,
      siblingDiscount: context.api.getSetting('siblingDiscount') ?? 10,
    };
    
    feeCalculator = new FeeCalculator(useWasm, settings);
    await feeCalculator.initialize();
    
    // Register hooks
    context.api.addHook('fees.beforeCalculate', (input: FeeCalculationInput) => {
      console.log(`[FeeCalculator] Calculating fees for student ${input.profile.studentId}`);
      return input;
    }, 10);
    
    context.api.addHook('fees.afterCalculate', (result: FeeCalculationResult) => {
      console.log(`[FeeCalculator] Total fees: ${result.grandTotal}`);
      return result;
    }, 10);
    
    console.log('[FeeCalculator Plugin] Activated successfully');
  },
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deactivate(_context: PluginContext) {
    console.log('[FeeCalculator Plugin] Deactivated');
    feeCalculator = null;
  },
  
  api: {
    getCalculator: () => feeCalculator,
    calculateFees: async (input: FeeCalculationInput) => {
      if (!feeCalculator) throw new Error('Calculator not initialized');
      return feeCalculator.calculateFees(input);
    },
    getFeeItems: () => feeCalculator?.getFeeItems() || [],
    getApplicableDiscounts: (profile: StudentFeeProfile) => 
      feeCalculator?.getApplicableDiscounts(profile) || [],
    previewTotal: (profile: StudentFeeProfile) => {
      if (!feeCalculator) throw new Error('Calculator not initialized');
      return feeCalculator.previewTotal(profile);
    },
    generatePaymentSchedule: (total: number, installments: number) => 
      feeCalculator?.generatePaymentSchedule(total, installments) || [],
  },
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  manifest,
  module,
};

export { FeeCalculator };
