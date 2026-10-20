import { logger } from '@/utils/logging';

// ABOUTME: This file generates comprehensive inventory management data including items, stock, suppliers, and procurement
// ABOUTME: Handles inventory tracking, stock movements, and supplier management for school resources

import { BaseGenerator } from './BaseGenerator';

export class InventoryGenerator extends BaseGenerator {
  async generateData(): Promise<any[]> {
    await this.initialize();
    
    const results = [];
    
    // Generate inventory categories
    const categories = await this.generateInventoryCategories(20);
    results.push(...categories);
    
    // Generate suppliers
    const suppliers = await this.generateSuppliers(50);
    results.push(...suppliers);
    
    // Generate inventory items
    const items = await this.generateInventoryItems(300);
    results.push(...items);
    
    // Generate stock movements
    const stockMovements = await this.generateStockMovements(500);
    results.push(...stockMovements);
    
    // Generate purchase orders
    const purchaseOrders = await this.generatePurchaseOrders(100);
    results.push(...purchaseOrders);
    
    // Generate purchase order items
    const purchaseOrderItems = await this.generatePurchaseOrderItems(250);
    results.push(...purchaseOrderItems);
    
    // Generate stock adjustments
    const stockAdjustments = await this.generateStockAdjustments(150);
    results.push(...stockAdjustments);
    
    // Generate inventory audits
    const inventoryAudits = await this.generateInventoryAudits(30);
    results.push(...inventoryAudits);
    
    // Generate requisitions
    const requisitions = await this.generateRequisitions(200);
    results.push(...requisitions);
    
    // Generate requisition items
    const requisitionItems = await this.generateRequisitionItems(400);
    results.push(...requisitionItems);
    
    return results;
  }
  
  private async generateInventoryCategories(count: number): Promise<any[]> {
    const categories = [];
    
    for (let i = 1; i <= count; i++) {
      const category = {
        id: `inventory_category_${i}`,
        category_name: this.generateCategoryName(),
        category_code: `CAT${i.toString().padStart(3, '0')}`,
        description: this.generateCategoryDescription(),
        parent_category_id: this.randomBoolean(0.3) ? `inventory_category_${this.randomInt(1, Math.max(1, i-1))}` : null,
        is_active: this.randomBoolean(0.95),
        requires_approval: this.randomBoolean(0.4),
        minimum_stock_level: this.randomInt(5, 50),
        maximum_stock_level: this.randomInt(100, 500),
        reorder_point: this.randomInt(10, 100),
        storage_location: this.generateStorageLocation(),
        responsible_staff: `staff_${this.randomInt(1, 100)}`,
        budget_allocation: this.randomFloat(10000, 500000, 2),
        depreciation_rate: this.randomFloat(5, 25, 2),
        tax_category: this.generateTaxCategory(),
        created_by: `staff_${this.randomInt(1, 100)}`,
        created_at: this.generateTimestamp(this.randomInt(30, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      categories.push(category);
      this.logProgress(i, count, 'inventory category');
    }
    
    return categories;
  }
  
  private async generateSuppliers(count: number): Promise<any[]> {
    const suppliers = [];
    
    for (let i = 1; i <= count; i++) {
      const supplier = {
        id: `supplier_${i}`,
        supplier_name: this.generateSupplierName(),
        supplier_code: `SUP${i.toString().padStart(4, '0')}`,
        business_type: this.generateBusinessType(),
        registration_number: this.generateRegistrationNumber(),
        tax_pin: this.generateTaxPIN(),
        contact_person: (() => {
          const name = this.generateName();
          return `${name.first} ${name.last}`;
        })(),
        email: (() => {
          const name = this.generateName();
          return this.generateEmail(name.first, name.last);
        })(),
        phone: this.generatePhoneNumber(),
        alternative_phone: this.randomBoolean(0.6) ? this.generatePhoneNumber() : null,
        physical_address: this.generateAddress(),
        postal_address: this.generateAddress(),
        city: this.generateCity(),
        country: 'Kenya',
        website: this.randomBoolean(0.4) ? this.generateWebsite() : null,
        bank_name: this.generateBankName(),
        bank_account: this.generateBankAccount(),
        bank_branch: this.generateBankBranch(),
        payment_terms: this.generatePaymentTerms(),
        credit_limit: this.randomFloat(50000, 2000000, 2),
        credit_period: this.randomInt(7, 90),
        supplier_rating: this.randomFloat(1, 5, 1),
        is_active: this.randomBoolean(0.9),
        is_approved: this.randomBoolean(0.85),
        approval_date: this.randomBoolean(0.85) ? this.generateTimestamp(this.randomInt(30, 180)) : null,
        approved_by: this.randomBoolean(0.85) ? `staff_${this.randomInt(1, 20)}` : null,
        categories_supplied: this.generateCategoriesSupplied(),
        delivery_time: this.randomInt(1, 14),
        minimum_order_value: this.randomFloat(1000, 50000, 2),
        discount_percentage: this.randomFloat(0, 15, 2),
        last_order_date: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 90)) : null,
        total_orders: this.randomInt(0, 100),
        total_value: this.randomFloat(0, 5000000, 2),
        performance_score: this.randomFloat(60, 100, 1),
        notes: this.generateSupplierNotes(),
        created_by: `staff_${this.randomInt(1, 100)}`,
        created_at: this.generateTimestamp(this.randomInt(30, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      suppliers.push(supplier);
      this.logProgress(i, count, 'supplier');
    }
    
    return suppliers;
  }
  
  private async generateInventoryItems(count: number): Promise<any[]> {
    const items = [];
    
    for (let i = 1; i <= count; i++) {
      const item = {
        id: `inventory_item_${i}`,
        item_name: this.generateItemName(),
        item_code: `ITM${i.toString().padStart(4, '0')}`,
        barcode: this.generateBarcode(),
        category_id: `inventory_category_${this.randomInt(1, 20)}`,
        description: this.generateItemDescription(),
        unit_of_measure: this.generateUnitOfMeasure(),
        unit_cost: this.randomFloat(10, 5000, 2),
        selling_price: this.randomFloat(15, 7500, 2),
        current_stock: this.randomInt(0, 1000),
        minimum_stock: this.randomInt(5, 50),
        maximum_stock: this.randomInt(100, 500),
        reorder_level: this.randomInt(10, 100),
        reorder_quantity: this.randomInt(50, 200),
        location: this.generateItemLocation(),
        shelf_number: this.generateShelfNumber(),
        bin_number: this.generateBinNumber(),
        supplier_id: `supplier_${this.randomInt(1, 50)}`,
        alternative_suppliers: this.generateAlternativeSuppliers(),
        brand: this.generateBrand(),
        model: this.generateModel(),
        serial_number: this.randomBoolean(0.3) ? this.generateSerialNumber() : null,
        warranty_period: this.randomInt(0, 36),
        expiry_date: this.randomBoolean(0.2) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))) : null,
        batch_number: this.randomBoolean(0.4) ? this.generateBatchNumber() : null,
        is_active: this.randomBoolean(0.95),
        is_consumable: this.randomBoolean(0.6),
        is_asset: this.randomBoolean(0.3),
        depreciation_rate: this.randomFloat(0, 25, 2),
        tax_rate: this.randomFloat(0, 16, 2),
        last_purchase_date: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 90)) : null,
        last_purchase_price: this.randomBoolean(0.8) ? this.randomFloat(10, 5000, 2) : null,
        last_issue_date: this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        total_issued: this.randomInt(0, 500),
        total_received: this.randomInt(0, 1000),
        average_monthly_usage: this.randomFloat(0, 100, 2),
        lead_time: this.randomInt(1, 30),
        storage_requirements: this.generateStorageRequirements(),
        handling_instructions: this.generateHandlingInstructions(),
        safety_notes: this.generateSafetyNotes(),
        created_by: `staff_${this.randomInt(1, 100)}`,
        created_at: this.generateTimestamp(this.randomInt(30, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      items.push(item);
      this.logProgress(i, count, 'inventory item');
    }
    
    return items;
  }
  
  private async generateStockMovements(count: number): Promise<any[]> {
    const movements = [];
    
    for (let i = 1; i <= count; i++) {
      const movement = {
        id: `stock_movement_${i}`,
        item_id: `inventory_item_${this.randomInt(1, 300)}`,
        movement_type: this.generateMovementType(),
        reference_type: this.generateReferenceType(),
        reference_id: this.generateReferenceId(),
        quantity: this.randomInt(1, 100),
        unit_cost: this.randomFloat(10, 5000, 2),
        total_cost: this.randomFloat(100, 50000, 2),
        previous_stock: this.randomInt(0, 1000),
        new_stock: this.randomInt(0, 1000),
        location_from: this.randomBoolean(0.6) ? this.generateItemLocation() : null,
        location_to: this.randomBoolean(0.6) ? this.generateItemLocation() : null,
        reason: this.generateMovementReason(),
        notes: this.generateMovementNotes(),
        batch_number: this.randomBoolean(0.4) ? this.generateBatchNumber() : null,
        expiry_date: this.randomBoolean(0.2) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))) : null,
        supplier_id: this.randomBoolean(0.4) ? `supplier_${this.randomInt(1, 50)}` : null,
        department_id: this.randomBoolean(0.6) ? `department_${this.randomInt(1, 20)}` : null,
        requested_by: this.randomBoolean(0.7) ? `staff_${this.randomInt(1, 100)}` : null,
        approved_by: this.randomBoolean(0.8) ? `staff_${this.randomInt(1, 50)}` : null,
        issued_by: `staff_${this.randomInt(1, 100)}`,
        received_by: this.randomBoolean(0.6) ? `staff_${this.randomInt(1, 100)}` : null,
        movement_date: this.generateTimestamp(this.randomInt(0, 90)),
        created_by: `staff_${this.randomInt(1, 100)}`,
        created_at: this.generateTimestamp(this.randomInt(0, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      movements.push(movement);
      this.logProgress(i, count, 'stock movement');
    }
    
    return movements;
  }
  
  private async generatePurchaseOrders(count: number): Promise<any[]> {
    const orders = [];
    
    for (let i = 1; i <= count; i++) {
      const order = {
        id: `purchase_order_${i}`,
        po_number: `PO${new Date().getFullYear()}${i.toString().padStart(4, '0')}`,
        supplier_id: `supplier_${this.randomInt(1, 50)}`,
        order_date: this.generateTimestamp(this.randomInt(0, 90)),
        expected_delivery_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))),
        actual_delivery_date: this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 60)) : null,
        status: this.generatePOStatus(),
        priority: this.generatePriority(),
        department_id: `department_${this.randomInt(1, 20)}`,
        requested_by: `staff_${this.randomInt(1, 100)}`,
        approved_by: this.randomBoolean(0.8) ? `staff_${this.randomInt(1, 20)}` : null,
        approval_date: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        subtotal: this.randomFloat(5000, 500000, 2),
        tax_amount: this.randomFloat(800, 80000, 2),
        discount_amount: this.randomFloat(0, 25000, 2),
        total_amount: this.randomFloat(5800, 580000, 2),
        currency: 'KES',
        payment_terms: this.generatePaymentTerms(),
        delivery_terms: this.generateDeliveryTerms(),
        delivery_address: this.generateAddress(),
        special_instructions: this.generateSpecialInstructions(),
        terms_and_conditions: this.generateTermsAndConditions(),
        invoice_received: this.randomBoolean(0.6),
        invoice_number: this.randomBoolean(0.6) ? this.generateInvoiceNumber() : null,
        invoice_date: this.randomBoolean(0.6) ? this.generateTimestamp(this.randomInt(0, 60)) : null,
        payment_status: this.generatePaymentStatus(),
        payment_date: this.randomBoolean(0.5) ? this.generateTimestamp(this.randomInt(0, 90)) : null,
        payment_reference: this.randomBoolean(0.5) ? this.generatePaymentReference() : null,
        notes: this.generatePONotes(),
        created_by: `staff_${this.randomInt(1, 100)}`,
        created_at: this.generateTimestamp(this.randomInt(0, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      orders.push(order);
      this.logProgress(i, count, 'purchase order');
    }
    
    return orders;
  }
  
  private async generatePurchaseOrderItems(count: number): Promise<any[]> {
    const items = [];
    
    for (let i = 1; i <= count; i++) {
      const item = {
        id: `po_item_${i}`,
        purchase_order_id: `purchase_order_${this.randomInt(1, 100)}`,
        item_id: `inventory_item_${this.randomInt(1, 300)}`,
        quantity_ordered: this.randomInt(1, 100),
        quantity_received: this.randomInt(0, 100),
        quantity_pending: this.randomInt(0, 50),
        unit_price: this.randomFloat(10, 5000, 2),
        total_price: this.randomFloat(100, 50000, 2),
        discount_percentage: this.randomFloat(0, 15, 2),
        discount_amount: this.randomFloat(0, 7500, 2),
        tax_rate: this.randomFloat(0, 16, 2),
        tax_amount: this.randomFloat(0, 8000, 2),
        line_total: this.randomFloat(100, 58000, 2),
        specification: this.generateItemSpecification(),
        brand_preference: this.generateBrand(),
        delivery_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))),
        received_date: this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 60)) : null,
        quality_check_status: this.generateQualityCheckStatus(),
        quality_notes: this.generateQualityNotes(),
        warranty_period: this.randomInt(0, 36),
        batch_number: this.randomBoolean(0.4) ? this.generateBatchNumber() : null,
        expiry_date: this.randomBoolean(0.2) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))) : null,
        storage_location: this.generateItemLocation(),
        notes: this.generatePOItemNotes(),
        created_at: this.generateTimestamp(this.randomInt(0, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      items.push(item);
      this.logProgress(i, count, 'purchase order item');
    }
    
    return items;
  }
  
  private async generateStockAdjustments(count: number): Promise<any[]> {
    const adjustments = [];
    
    for (let i = 1; i <= count; i++) {
      const adjustment = {
        id: `stock_adjustment_${i}`,
        adjustment_number: `ADJ${new Date().getFullYear()}${i.toString().padStart(4, '0')}`,
        item_id: `inventory_item_${this.randomInt(1, 300)}`,
        adjustment_type: this.generateAdjustmentType(),
        reason: this.generateAdjustmentReason(),
        previous_quantity: this.randomInt(0, 1000),
        adjusted_quantity: this.randomInt(-100, 100),
        new_quantity: this.randomInt(0, 1000),
        unit_cost: this.randomFloat(10, 5000, 2),
        total_value_impact: this.randomFloat(-50000, 50000, 2),
        location: this.generateItemLocation(),
        batch_number: this.randomBoolean(0.4) ? this.generateBatchNumber() : null,
        expiry_date: this.randomBoolean(0.2) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))) : null,
        reference_document: this.generateReferenceDocument(),
        approval_required: this.randomBoolean(0.7),
        approved_by: this.randomBoolean(0.7) ? `staff_${this.randomInt(1, 20)}` : null,
        approval_date: this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        adjustment_date: this.generateTimestamp(this.randomInt(0, 60)),
        notes: this.generateAdjustmentNotes(),
        created_by: `staff_${this.randomInt(1, 100)}`,
        created_at: this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      adjustments.push(adjustment);
      this.logProgress(i, count, 'stock adjustment');
    }
    
    return adjustments;
  }
  
  private async generateInventoryAudits(count: number): Promise<any[]> {
    const audits = [];
    
    for (let i = 1; i <= count; i++) {
      const audit = {
        id: `inventory_audit_${i}`,
        audit_number: `AUD${new Date().getFullYear()}${i.toString().padStart(3, '0')}`,
        audit_type: this.generateAuditType(),
        audit_scope: this.generateAuditScope(),
        start_date: this.generateTimestamp(this.randomInt(30, 90)),
        end_date: this.generateTimestamp(this.randomInt(0, 30)),
        status: this.generateAuditStatus(),
        auditor_id: `staff_${this.randomInt(1, 20)}`,
        audit_team: this.generateAuditTeam(),
        location: this.generateAuditLocation(),
        categories_audited: this.generateCategoriesAudited(),
        total_items_audited: this.randomInt(50, 300),
        discrepancies_found: this.randomInt(0, 50),
        value_discrepancy: this.randomFloat(-50000, 50000, 2),
        accuracy_percentage: this.randomFloat(85, 100, 2),
        findings: this.generateAuditFindings(),
        recommendations: this.generateAuditRecommendations(),
        corrective_actions: this.generateCorrectiveActions(),
        follow_up_required: this.randomBoolean(0.4),
        follow_up_date: this.randomBoolean(0.4) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        report_generated: this.randomBoolean(0.9),
        report_date: this.randomBoolean(0.9) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        approved_by: this.randomBoolean(0.8) ? `staff_${this.randomInt(1, 10)}` : null,
        approval_date: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        notes: this.generateAuditNotes(),
        created_by: `staff_${this.randomInt(1, 100)}`,
        created_at: this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      audits.push(audit);
      this.logProgress(i, count, 'inventory audit');
    }
    
    return audits;
  }
  
  private async generateRequisitions(count: number): Promise<any[]> {
    const requisitions = [];
    
    for (let i = 1; i <= count; i++) {
      const requisition = {
        id: `requisition_${i}`,
        requisition_number: `REQ${new Date().getFullYear()}${i.toString().padStart(4, '0')}`,
        department_id: `department_${this.randomInt(1, 20)}`,
        requested_by: `staff_${this.randomInt(1, 100)}`,
        request_date: this.generateTimestamp(this.randomInt(0, 30)),
        required_date: this.generateTimestamp(this.randomInt(0, 60)),
        priority: this.generatePriority(),
        status: this.generateRequisitionStatus(),
        purpose: this.generateRequisitionPurpose(),
        justification: this.generateJustification(),
        budget_code: this.generateBudgetCode(),
        estimated_cost: this.randomFloat(1000, 100000, 2),
        approved_amount: this.randomBoolean(0.7) ? this.randomFloat(1000, 100000, 2) : null,
        reviewed_by: this.randomBoolean(0.8) ? `staff_${this.randomInt(1, 50)}` : null,
        review_date: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        review_notes: this.generateReviewNotes(),
        approved_by: this.randomBoolean(0.7) ? `staff_${this.randomInt(1, 20)}` : null,
        approval_date: this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        approval_notes: this.generateApprovalNotes(),
        procurement_method: this.generateProcurementMethod(),
        supplier_preference: this.randomBoolean(0.3) ? `supplier_${this.randomInt(1, 50)}` : null,
        delivery_location: this.generateDeliveryLocation(),
        special_requirements: this.generateSpecialRequirements(),
        total_items: this.randomInt(1, 20),
        fulfilled_items: this.randomInt(0, 20),
        pending_items: this.randomInt(0, 10),
        completion_percentage: this.randomFloat(0, 100, 1),
        notes: this.generateRequisitionNotes(),
        created_by: `staff_${this.randomInt(1, 100)}`,
        created_at: this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      requisitions.push(requisition);
      this.logProgress(i, count, 'requisition');
    }
    
    return requisitions;
  }
  
  private async generateRequisitionItems(count: number): Promise<any[]> {
    const items = [];
    
    for (let i = 1; i <= count; i++) {
      const item = {
        id: `requisition_item_${i}`,
        requisition_id: `requisition_${this.randomInt(1, 200)}`,
        item_id: this.randomBoolean(0.8) ? `inventory_item_${this.randomInt(1, 300)}` : null,
        item_description: this.generateItemDescription(),
        specification: this.generateItemSpecification(),
        quantity_requested: this.randomInt(1, 100),
        quantity_approved: this.randomBoolean(0.7) ? this.randomInt(1, 100) : null,
        quantity_issued: this.randomInt(0, 100),
        unit_of_measure: this.generateUnitOfMeasure(),
        estimated_unit_cost: this.randomFloat(10, 5000, 2),
        estimated_total_cost: this.randomFloat(100, 50000, 2),
        actual_unit_cost: this.randomBoolean(0.6) ? this.randomFloat(10, 5000, 2) : null,
        actual_total_cost: this.randomBoolean(0.6) ? this.randomFloat(100, 50000, 2) : null,
        brand_preference: this.generateBrand(),
        supplier_preference: this.randomBoolean(0.3) ? `supplier_${this.randomInt(1, 50)}` : null,
        urgency_level: this.generateUrgencyLevel(),
        purpose: this.generateItemPurpose(),
        alternative_items: this.generateAlternativeItems(),
        technical_specifications: this.generateTechnicalSpecifications(),
        quality_requirements: this.generateQualityRequirements(),
        delivery_requirements: this.generateDeliveryRequirements(),
        status: this.generateRequisitionItemStatus(),
        approved_by: this.randomBoolean(0.7) ? `staff_${this.randomInt(1, 20)}` : null,
        approval_date: this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        issued_by: this.randomBoolean(0.6) ? `staff_${this.randomInt(1, 100)}` : null,
        issue_date: this.randomBoolean(0.6) ? this.generateTimestamp(this.randomInt(0, 60)) : null,
        received_by: this.randomBoolean(0.6) ? `staff_${this.randomInt(1, 100)}` : null,
        receive_date: this.randomBoolean(0.6) ? this.generateTimestamp(this.randomInt(0, 60)) : null,
        notes: this.generateRequisitionItemNotes(),
        created_at: this.generateTimestamp(this.randomInt(0, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      items.push(item);
      this.logProgress(i, count, 'requisition item');
    }
    
    return items;
  }
  
  // Helper methods for generating specific inventory-related data
  
  private generateCity(): string {
    const cities = [
      'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika',
      'Meru', 'Nyeri', 'Machakos', 'Kitale', 'Garissa', 'Kakamega'
    ];
    return this.randomChoice(cities);
  }
  
  private generateWebsite(): string {
    const domains = ['com', 'co.ke', 'org', 'net'];
    const names = ['supplies', 'trading', 'solutions', 'services', 'group'];
    const companyName = this.randomChoice(names);
    const domain = this.randomChoice(domains);
    return `www.${companyName}.${domain}`;
  }
  
  private generateBankName(): string {
    const banks = [
      'Kenya Commercial Bank', 'Equity Bank', 'Cooperative Bank',
      'Standard Chartered', 'Barclays Bank', 'NCBA Bank',
      'Absa Bank', 'Diamond Trust Bank', 'I&M Bank'
    ];
    return this.randomChoice(banks);
  }
  
  private generateBankAccount(): string {
    return this.randomInt(1000000000, 9999999999).toString();
  }
  
  private generateBankBranch(): string {
    const branches = [
      'Main Branch', 'CBD Branch', 'Westlands Branch', 'Karen Branch',
      'Thika Road Branch', 'Mombasa Road Branch', 'Industrial Area Branch'
    ];
    return this.randomChoice(branches);
  }
  
  private generatePaymentTerms(): string {
    const terms = [
      'Net 30', 'Net 15', 'Net 7', 'Cash on Delivery',
      'Advance Payment', '2/10 Net 30', 'Net 60'
    ];
    return this.randomChoice(terms);
  }
  
  private generateCategoriesSupplied(): string[] {
    const categories = [
      'Office Supplies', 'Cleaning Supplies', 'Teaching Materials',
      'Laboratory Equipment', 'Sports Equipment', 'Kitchen Supplies',
      'Maintenance Tools', 'IT Equipment', 'Furniture'
    ];
    const numCategories = this.randomInt(1, 4);
    return this.randomChoices(categories, numCategories);
  }
  
  private generateSupplierNotes(): string | null {
    const notes = [
      'Reliable supplier with good track record',
      'Competitive pricing and quality products',
      'Fast delivery and excellent customer service',
      'Preferred supplier for this category',
      'New supplier under evaluation'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }
  
  private generateCategoryName(): string {
    const categories = [
      'Office Supplies', 'Cleaning Supplies', 'Teaching Materials', 'Laboratory Equipment',
      'Sports Equipment', 'Kitchen Supplies', 'Maintenance Tools', 'Computer Equipment',
      'Furniture', 'Stationery', 'Books & Publications', 'Medical Supplies',
      'Safety Equipment', 'Electrical Supplies', 'Plumbing Supplies', 'Garden Tools',
      'Audio Visual Equipment', 'Science Apparatus', 'Art Supplies', 'Musical Instruments'
    ];
    return this.randomChoice(categories);
  }
  
  private generateCategoryDescription(): string {
    const descriptions = [
      'Essential office supplies for daily operations',
      'Cleaning and maintenance supplies for facility upkeep',
      'Educational materials and teaching aids',
      'Laboratory equipment for science education',
      'Sports and physical education equipment',
      'Kitchen and catering supplies for meal preparation'
    ];
    return this.randomChoice(descriptions);
  }
  
  private generateStorageLocation(): string {
    const locations = [
      'Main Store', 'Science Store', 'Sports Store', 'Kitchen Store',
      'Office Store', 'Maintenance Store', 'Library Store', 'Medical Store',
      'IT Store', 'Art Store', 'Music Store', 'General Store'
    ];
    return this.randomChoice(locations);
  }
  
  private generateTaxCategory(): string {
    return this.randomChoice(['Exempt', 'Standard Rate', 'Zero Rate', 'Special Rate']);
  }
  
  private generateSupplierName(): string {
    const names = [
      'Nakumatt Supplies Ltd', 'Tuskys Wholesale', 'Uchumi Supermarkets',
      'Naivas Stores', 'Carrefour Kenya', 'Chandarana Foodplus',
      'Office World Ltd', 'Stationery Supplies Co', 'Tech Solutions Kenya',
      'Educational Resources Ltd', 'Science Equipment Co', 'Sports Gear Kenya',
      'Furniture Palace', 'Kitchen Essentials', 'Cleaning Solutions Ltd',
      'Safety First Kenya', 'Green Garden Supplies', 'Audio Visual Systems',
      'Medical Supplies Kenya', 'Book Distributors Ltd'
    ];
    return this.randomChoice(names);
  }
  
  private generateBusinessType(): string {
    return this.randomChoice([
      'Limited Company', 'Partnership', 'Sole Proprietorship',
      'Cooperative', 'NGO', 'Government Agency'
    ]);
  }
  
  private generateRegistrationNumber(): string {
    return `C.${this.randomInt(100000, 999999)}/2023`;
  }
  
  private generateTaxPIN(): string {
    return `P${this.randomInt(100000000, 999999999)}${String.fromCharCode(65 + this.randomInt(0, 26))}`;
  }
  
  private generateItemName(): string {
    const adjectives = [
      'Premium', 'Standard', 'Heavy Duty', 'Eco-Friendly', 'Digital',
      'Portable', 'Professional', 'Educational', 'Industrial', 'Compact'
    ];
    const items = [
      'Notebook', 'Pen', 'Pencil', 'Marker', 'Stapler', 'Calculator',
      'Folder', 'Binder', 'Paper', 'Clipboard', 'Ruler', 'Eraser'
    ];
    return `${this.randomChoice(adjectives)} ${this.randomChoice(items)}`;
  }
  
  private generateBarcode(): string {
    return this.randomInt(1000000000000, 9999999999999).toString();
  }
  
  private generateItemDescription(): string {
    const descriptions = [
      'High quality office supply for daily use',
      'Durable educational material for classroom activities',
      'Professional grade equipment for administrative tasks',
      'Essential supply for teaching and learning',
      'Multi-purpose tool for various applications'
    ];
    return this.randomChoice(descriptions);
  }
  
  private generateUnitOfMeasure(): string {
    const units = ['Piece', 'Box', 'Pack', 'Set', 'Dozen', 'Ream', 'Bottle', 'Kg', 'Meter', 'Liter'];
    return this.randomChoice(units);
  }
  
  private generateItemLocation(): string {
    const locations = [
      'Main Store', 'Store Room A', 'Store Room B', 'Cold Storage',
      'Secure Storage', 'Chemical Store', 'Equipment Room', 'Library Store'
    ];
    return this.randomChoice(locations);
  }
  
  private generateShelfNumber(): string {
    return `S${this.randomInt(1, 20)}`;
  }
  
  private generateBinNumber(): string {
    return `B${this.randomInt(1, 100)}`;
  }
  
  private generateAlternativeSuppliers(): string[] | null {
    const suppliers = ['supplier_1', 'supplier_2', 'supplier_3', 'supplier_4', 'supplier_5'];
    const numSuppliers = this.randomInt(0, 3);
    return numSuppliers > 0 ? this.randomChoices(suppliers, numSuppliers) : null;
  }
  
  private generateBrand(): string {
    const brands = [
      'EduSupply', 'OfficeMax', 'SchoolPro', 'QualityPlus', 'PremiumBrand',
      'StandardCorp', 'ReliableCo', 'TopChoice', 'BestValue', 'ProGrade'
    ];
    return this.randomChoice(brands);
  }
  
  private generateModel(): string {
    return `Model-${this.randomInt(100, 999)}`;
  }
  
  private generateSerialNumber(): string {
    return `SN${this.randomInt(100000, 999999)}`;
  }
  
  private generateBatchNumber(): string {
    return `BATCH${this.randomInt(1000, 9999)}`;
  }
  
  private generateStorageRequirements(): string | null {
    const requirements = [
      'Store in dry place',
      'Keep away from direct sunlight',
      'Temperature controlled storage',
      'Secure storage required',
      'No special requirements'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(requirements) : null;
  }
  
  private generateHandlingInstructions(): string | null {
    const instructions = [
      'Handle with care',
      'Use protective equipment',
      'Follow safety protocols',
      'Trained personnel only',
      'Standard handling procedures'
    ];
    return this.randomBoolean(0.3) ? this.randomChoice(instructions) : null;
  }
  
  private generateSafetyNotes(): string | null {
    const notes = [
      'Non-toxic and safe for educational use',
      'Follow manufacturer safety guidelines',
      'Keep away from children',
      'Use in well-ventilated area',
      'No special safety requirements'
    ];
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }
  
  private generateMovementType(): string {
    const types = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'RETURN'];
    return this.randomChoice(types);
  }
  
  private generateMovementReason(): string {
    const reasons = [
      'Purchase Order Receipt',
      'Issue to Department',
      'Stock Transfer',
      'Inventory Adjustment',
      'Return from Department',
      'Damaged Goods',
      'Expired Items',
      'Lost Items'
    ];
    return this.randomChoice(reasons);
  }
  
  private generatePOStatus(): string {
    const statuses = ['DRAFT', 'PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED'];
    return this.randomChoice(statuses);
  }
  
  private generatePOItemStatus(): string {
    const statuses = ['PENDING', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];
    return this.randomChoice(statuses);
  }
  
  private generateItemSpecification(): string | null {
    const specs = [
      'Standard office grade',
      'Heavy duty construction',
      'Eco-friendly materials',
      'Professional quality',
      'Educational standard'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(specs) : null;
  }
  
  private generateQualityCheckStatus(): string {
    const statuses = ['PASSED', 'FAILED', 'PENDING', 'NOT_REQUIRED'];
    return this.randomChoice(statuses);
  }
  
  private generateQualityNotes(): string | null {
    const notes = [
      'Quality meets specifications',
      'Minor defects noted',
      'Excellent condition',
      'Requires further inspection',
      'Standard quality'
    ];
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }
  
  private generatePOItemNotes(): string | null {
    const notes = [
      'Standard delivery',
      'Urgent requirement',
      'Bulk order discount applied',
      'Special handling required',
      'Regular supply item'
    ];
    return this.randomBoolean(0.2) ? this.randomChoice(notes) : null;
  }
  
  private generateAdjustmentType(): string {
    const types = ['INCREASE', 'DECREASE', 'CORRECTION', 'WRITE_OFF'];
    return this.randomChoice(types);
  }
  
  private generateAdjustmentReason(): string {
    const reasons = [
      'Physical count variance',
      'Damaged goods',
      'Expired items',
      'Lost items',
      'System error correction',
      'Theft/Pilferage',
      'Transfer not recorded'
    ];
    return this.randomChoice(reasons);
  }
  
  private generateReferenceDocument(): string | null {
    const docs = [
      'MEMO/2024/001',
      'ADJ/2024/002',
      'INV/2024/003',
      'REQ/2024/004',
      'PO/2024/005'
    ];
    return this.randomBoolean(0.6) ? this.randomChoice(docs) : null;
  }
  
  private generateAdjustmentNotes(): string | null {
    const notes = [
      'Approved by store manager',
      'Physical verification completed',
      'Documentation attached',
      'Regular adjustment',
      'Emergency adjustment'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }
  
  private generateAuditType(): string {
    return this.randomChoice([
      'Annual Audit', 'Quarterly Audit', 'Spot Check',
      'Cycle Count', 'Special Audit', 'Compliance Audit'
    ]);
  }
  
  private generateAuditScope(): string {
    return this.randomChoice([
      'Full Inventory', 'High Value Items', 'Fast Moving Items',
      'Specific Category', 'Location Based', 'Random Sample'
    ]);
  }
  
  private generateAuditStatus(): string {
    return this.randomChoice([
      'Planned', 'In Progress', 'Completed', 'Report Pending',
      'Under Review', 'Closed'
    ]);
  }
  
  private generateAuditTeam(): string[] {
    const team = [];
    const size = this.randomInt(2, 5);
    
    for (let i = 0; i < size; i++) {
      team.push(`staff_${this.randomInt(1, 100)}`);
    }
    
    return team;
  }
  
  private generateAuditLocation(): string {
    const locations = [
      'Main Store', 'All Locations', 'Science Store',
      'Sports Store', 'Kitchen Store', 'Office Store'
    ];
    return this.randomChoice(locations);
  }
  
  private generateCategoriesAudited(): string[] {
    const categories = [
      'Office Supplies', 'Teaching Materials', 'Laboratory Equipment',
      'Sports Equipment', 'Kitchen Supplies', 'Computer Equipment'
    ];
    const numCategories = this.randomInt(1, 4);
    return this.randomChoices(categories, numCategories);
  }
  
  private generateAuditFindings(): string {
    const findings = [
      'Minor discrepancies in stock records',
      'Some items not properly labeled',
      'Storage conditions need improvement',
      'Documentation gaps identified',
      'Overall inventory management satisfactory'
    ];
    return this.randomChoice(findings);
  }
  
  private generateAuditRecommendations(): string {
    const recommendations = [
      'Implement regular cycle counting',
      'Improve storage organization',
      'Update inventory management procedures',
      'Provide staff training on procedures',
      'Install better security measures'
    ];
    return this.randomChoice(recommendations);
  }
  
  private generateCorrectiveActions(): string {
    const actions = [
      'Stock records updated to match physical count',
      'Improved labeling system implemented',
      'Staff training conducted',
      'Storage procedures revised',
      'Security measures enhanced'
    ];
    return this.randomChoice(actions);
  }
  
  private generateAuditNotes(): string | null {
    const notes = [
      'Audit completed within scheduled timeframe',
      'Good cooperation from all departments',
      'Some challenges with access to certain areas',
      'Overall inventory control is satisfactory',
      'Recommendations to be implemented by next quarter'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }
  
  private generateRequisitionStatus(): string {
    return this.randomChoice([
      'Draft', 'Submitted', 'Under Review', 'Approved',
      'Partially Fulfilled', 'Fully Fulfilled', 'Rejected', 'Cancelled'
    ]);
  }
  
  private generateRequisitionPurpose(): string {
    const purposes = [
      'Regular departmental supplies',
      'Special project requirements',
      'Emergency replacement',
      'New program setup',
      'Maintenance and repairs',
      'Event preparation'
    ];
    return this.randomChoice(purposes);
  }
  
  private generateJustification(): string {
    const justifications = [
      'Essential for daily operations',
      'Required for upcoming project',
      'Replacement for damaged items',
      'Increased student enrollment',
      'New curriculum requirements',
      'Safety and compliance needs'
    ];
    return this.randomChoice(justifications);
  }
  
  private generateBudgetCode(): string {
    return `BUD${this.randomInt(1000, 9999)}`;
  }
  
  private generateReviewNotes(): string | null {
    const notes = [
      'Requisition reviewed and approved',
      'Some items need further justification',
      'Budget allocation confirmed',
      'Alternative suppliers suggested',
      'Quantity reduced due to budget constraints'
    ];
    return this.randomBoolean(0.6) ? this.randomChoice(notes) : null;
  }
  
  private generateApprovalNotes(): string | null {
    const notes = [
      'Approved as requested',
      'Approved with modifications',
      'Urgent approval granted',
      'Conditional approval pending budget',
      'Approved for immediate procurement'
    ];
    return this.randomBoolean(0.5) ? this.randomChoice(notes) : null;
  }
  
  private generateProcurementMethod(): string {
    return this.randomChoice([
      'Direct Purchase', 'Quotation', 'Tender',
      'Framework Agreement', 'Emergency Purchase'
    ]);
  }
  
  private generateDeliveryLocation(): string {
    const locations = [
      'Main Store', 'Department Office', 'Science Laboratory',
      'Sports Department', 'Kitchen', 'Maintenance Workshop',
      'Library', 'Computer Lab', 'Art Room'
    ];
    return this.randomChoice(locations);
  }
  
  private generateSpecialRequirements(): string | null {
    const requirements = [
      'Urgent delivery required',
      'Quality certification needed',
      'Installation service required',
      'Training on equipment use',
      'Warranty coverage essential'
    ];
    return this.randomBoolean(0.3) ? this.randomChoice(requirements) : null;
  }
  
  private generateRequisitionNotes(): string | null {
    const notes = [
      'Regular monthly requisition',
      'Urgent requirement for project',
      'Replacement for worn out items',
      'New equipment for expanded program',
      'Seasonal requirement'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }
  
  private generateUrgencyLevel(): string {
    return this.randomChoice(['Low', 'Normal', 'High', 'Critical']);
  }
  
  private generateItemPurpose(): string {
    const purposes = [
      'Teaching and learning',
      'Administrative work',
      'Maintenance and repairs',
      'Student activities',
      'Special events',
      'Safety and security'
    ];
    return this.randomChoice(purposes);
  }
  
  private generateAlternativeItems(): string[] | null {
    const alternatives = [
      'Generic brand equivalent',
      'Different model same function',
      'Alternative supplier option',
      'Refurbished equipment',
      'Rental option available'
    ];
    const numAlternatives = this.randomInt(0, 3);
    return numAlternatives > 0 ? this.randomChoices(alternatives, numAlternatives) : null;
  }
  
  private generateTechnicalSpecifications(): string | null {
    const specs = [
      'As per manufacturer specifications',
      'Educational grade quality required',
      'Compatible with existing equipment',
      'Energy efficient model preferred',
      'Latest technology standards'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(specs) : null;
  }
  
  private generateQualityRequirements(): string | null {
    const requirements = [
      'ISO certified products only',
      'Educational standard quality',
      'Minimum 2 year warranty',
      'Local support availability',
      'Proven track record required'
    ];
    return this.randomBoolean(0.3) ? this.randomChoice(requirements) : null;
  }
  
  private generateDeliveryRequirements(): string | null {
    const requirements = [
      'Deliver during school hours',
      'Installation service included',
      'Packaging for safe transport',
      'Direct delivery to department',
      'Advance notice required'
    ];
    return this.randomBoolean(0.3) ? this.randomChoice(requirements) : null;
  }
  
  private generateRequisitionItemStatus(): string {
    return this.randomChoice([
      'Pending', 'Approved', 'Ordered', 'Partially Received',
      'Fully Received', 'Rejected', 'Cancelled'
    ]);
  }
  
  private generateRequisitionItemNotes(): string | null {
    const notes = [
      'Item approved as requested',
      'Alternative item suggested',
      'Quantity modified due to budget',
      'Urgent delivery arranged',
      'Quality inspection required'
    ];
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }
  
  private async initialize(): Promise<void> {
    logger.info('Initializing InventoryGenerator...');
  }
  
  private logProgress(current: number, total: number, type: string): void {
    if (current % 25 === 0 || current === total) {
      logger.info(`Generated ${current}/${total} ${type}s`);
    }
  }
}