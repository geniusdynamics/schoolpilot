// ABOUTME: Generates comprehensive payroll and salary management data including salary structures, allowances, deductions, and payment history
// ABOUTME: Creates realistic payroll data with tax calculations, benefits management, and employment records

import { BaseGenerator } from './BaseGenerator';
import { DataGenerationConfig } from '../types';

export class PayrollGenerator extends BaseGenerator {
  private salaryGrades: any[] = [];
  private allowanceTypes: any[] = [];
  private deductionTypes: any[] = [];
  private staffMembers: any[] = [];

  constructor(config: DataGenerationConfig) {
    super(config);
  }

  async generateData(count: number): Promise<any[]> {
    await this.initialize();
    
    const results: any[] = [];
    
    // Generate salary grades
    const salaryGradeData = await this.generateSalaryGrades(15);
    results.push(...salaryGradeData);
    
    // Generate allowance types
    const allowanceTypeData = await this.generateAllowanceTypes(20);
    results.push(...allowanceTypeData);
    
    // Generate deduction types
    const deductionTypeData = await this.generateDeductionTypes(15);
    results.push(...deductionTypeData);
    
    // Generate staff salary structures
    const salaryStructureData = await this.generateStaffSalaryStructures(100);
    results.push(...salaryStructureData);
    
    // Generate payroll periods
    const payrollPeriodData = await this.generatePayrollPeriods(24);
    results.push(...payrollPeriodData);
    
    // Generate payroll records
    const payrollRecordData = await this.generatePayrollRecords(500);
    results.push(...payrollRecordData);
    
    // Generate staff allowances
    const staffAllowanceData = await this.generateStaffAllowances(300);
    results.push(...staffAllowanceData);
    
    // Generate staff deductions
    const staffDeductionData = await this.generateStaffDeductions(250);
    results.push(...staffDeductionData);
    
    // Generate loan records
    const loanData = await this.generateStaffLoans(80);
    results.push(...loanData);
    
    // Generate overtime records
    const overtimeData = await this.generateOvertimeRecords(150);
    results.push(...overtimeData);
    
    return results;
  }

  private async generateSalaryGrades(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const gradeData = [
      { code: 'TSC-A1', title: 'Principal', minSalary: 120000, maxSalary: 150000 },
      { code: 'TSC-A2', title: 'Deputy Principal', minSalary: 100000, maxSalary: 130000 },
      { code: 'TSC-B1', title: 'Senior Teacher', minSalary: 80000, maxSalary: 110000 },
      { code: 'TSC-B2', title: 'Teacher I', minSalary: 65000, maxSalary: 85000 },
      { code: 'TSC-B3', title: 'Teacher II', minSalary: 50000, maxSalary: 70000 },
      { code: 'TSC-B4', title: 'Teacher III', minSalary: 35000, maxSalary: 55000 },
      { code: 'ADM-A1', title: 'Bursar', minSalary: 90000, maxSalary: 120000 },
      { code: 'ADM-A2', title: 'Accountant', minSalary: 70000, maxSalary: 95000 },
      { code: 'ADM-B1', title: 'Secretary', minSalary: 45000, maxSalary: 65000 },
      { code: 'ADM-B2', title: 'Clerk', minSalary: 30000, maxSalary: 50000 },
      { code: 'SUP-A1', title: 'Head of Maintenance', minSalary: 60000, maxSalary: 80000 },
      { code: 'SUP-B1', title: 'Cook', minSalary: 25000, maxSalary: 40000 },
      { code: 'SUP-B2', title: 'Cleaner', minSalary: 20000, maxSalary: 30000 },
      { code: 'SUP-B3', title: 'Security Guard', minSalary: 22000, maxSalary: 35000 },
      { code: 'SUP-B4', title: 'Gardener', minSalary: 18000, maxSalary: 28000 }
    ];
    
    console.log(`Generating salary grades...`);
    
    for (let i = 0; i < gradeData.length; i++) {
      const grade = gradeData[i];
      
      const salaryGrade = {
        id: this.generateId('salarygrade', i),
        grade_code: grade.code,
        grade_title: grade.title,
        job_group: grade.code.split('-')[0],
        grade_level: grade.code.split('-')[1],
        minimum_salary: grade.minSalary,
        maximum_salary: grade.maxSalary,
        midpoint_salary: Math.round((grade.minSalary + grade.maxSalary) / 2),
        currency: 'KES',
        effective_date: this.formatDate(this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())),
        review_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))),
        annual_increment: this.randomInt(3, 8), // percentage
        overtime_rate: this.generateOvertimeRate(grade.maxSalary),
        description: this.generateGradeDescription(grade.title),
        requirements: this.generateGradeRequirements(grade.title),
        benefits_eligible: this.generateBenefitsEligibility(grade.code),
        leave_days_annual: this.generateAnnualLeaveDays(grade.code),
        probation_period_months: this.generateProbationPeriod(grade.code),
        notice_period_days: this.generateNoticePeriod(grade.code),
        is_active: true,
        created_by: `staff_${this.randomInt(1, 5)}`,
        approved_by: `staff_${this.randomInt(1, 3)}`,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.salaryGrades.push(salaryGrade);
      
      results.push({
        table: 'salary_grades',
        data: salaryGrade
      });
    }
    
    console.log(`Generated ${gradeData.length} salary grades`);
    
    return results;
  }

  private generateOvertimeRate(maxSalary: number): number {
    // Calculate hourly rate and add 50% for overtime
    const hourlyRate = maxSalary / (22 * 8); // 22 working days, 8 hours per day
    return Math.round(hourlyRate * 1.5);
  }

  private generateGradeDescription(title: string): string {
    const descriptions: { [key: string]: string } = {
      'Principal': 'Chief executive officer responsible for overall school management and leadership',
      'Deputy Principal': 'Assists principal in school administration and academic oversight',
      'Senior Teacher': 'Experienced educator with additional administrative responsibilities',
      'Teacher I': 'Qualified teacher with advanced experience and subject specialization',
      'Teacher II': 'Experienced teacher with proven classroom management skills',
      'Teacher III': 'Entry-level qualified teacher beginning professional career',
      'Bursar': 'Financial manager responsible for school accounts and budget management',
      'Accountant': 'Professional accountant handling financial records and reporting',
      'Secretary': 'Administrative support providing clerical and organizational services',
      'Clerk': 'General administrative assistant supporting various departments'
    };
    
    return descriptions[title] || `Professional ${title.toLowerCase()} position with defined responsibilities`;
  }

  private generateGradeRequirements(title: string): string {
    const requirements: { [key: string]: string } = {
      'Principal': 'Masters degree in Education, 10+ years teaching experience, leadership training',
      'Deputy Principal': 'Bachelors degree in Education, 8+ years teaching experience, management skills',
      'Senior Teacher': 'Bachelors degree in Education, 5+ years teaching experience',
      'Teacher I': 'Bachelors degree in Education, 3+ years teaching experience',
      'Teacher II': 'Bachelors degree in Education, 1+ years teaching experience',
      'Teacher III': 'Bachelors degree in Education, TSC registration',
      'Bursar': 'Bachelors degree in Accounting/Finance, CPA qualification preferred',
      'Accountant': 'Bachelors degree in Accounting, professional certification',
      'Secretary': 'Diploma in Secretarial Studies, computer literacy',
      'Clerk': 'Certificate in Office Administration, basic computer skills'
    };
    
    return requirements[title] || `Relevant qualifications and experience for ${title.toLowerCase()} role`;
  }

  private generateBenefitsEligibility(gradeCode: string): string {
    const jobGroup = gradeCode.split('-')[0];
    
    if (jobGroup === 'TSC') {
      return 'Medical cover, housing allowance, transport allowance, professional development';
    } else if (jobGroup === 'ADM') {
      return 'Medical cover, transport allowance, professional development';
    } else {
      return 'Basic medical cover, uniform allowance';
    }
  }

  private generateAnnualLeaveDays(gradeCode: string): number {
    const jobGroup = gradeCode.split('-')[0];
    
    if (jobGroup === 'TSC') {
      return 45; // Teachers get more leave days
    } else if (jobGroup === 'ADM') {
      return 30;
    } else {
      return 21;
    }
  }

  private generateProbationPeriod(gradeCode: string): number {
    const level = gradeCode.split('-')[1];
    
    if (level.includes('A')) {
      return 6; // Senior positions
    } else {
      return 3; // Junior positions
    }
  }

  private generateNoticePeriod(gradeCode: string): number {
    const level = gradeCode.split('-')[1];
    
    if (level.includes('A1')) {
      return 90; // Senior management
    } else if (level.includes('A')) {
      return 60; // Management
    } else {
      return 30; // General staff
    }
  }

  private async generateAllowanceTypes(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const allowanceData = [
      { name: 'House Allowance', description: 'Monthly housing allowance', taxable: true, percentage: false, amount: 15000 },
      { name: 'Transport Allowance', description: 'Monthly transport allowance', taxable: true, percentage: false, amount: 8000 },
      { name: 'Medical Allowance', description: 'Monthly medical allowance', taxable: false, percentage: false, amount: 5000 },
      { name: 'Lunch Allowance', description: 'Daily lunch allowance', taxable: true, percentage: false, amount: 300 },
      { name: 'Communication Allowance', description: 'Monthly communication allowance', taxable: true, percentage: false, amount: 2000 },
      { name: 'Responsibility Allowance', description: 'Additional responsibility allowance', taxable: true, percentage: true, amount: 10 },
      { name: 'Hardship Allowance', description: 'Hardship area allowance', taxable: true, percentage: true, amount: 15 },
      { name: 'Acting Allowance', description: 'Acting in higher position allowance', taxable: true, percentage: true, amount: 20 },
      { name: 'Overtime Allowance', description: 'Overtime work compensation', taxable: true, percentage: false, amount: 500 },
      { name: 'Night Shift Allowance', description: 'Night duty allowance', taxable: true, percentage: false, amount: 1000 },
      { name: 'Weekend Allowance', description: 'Weekend work allowance', taxable: true, percentage: false, amount: 800 },
      { name: 'Exam Supervision', description: 'Examination supervision allowance', taxable: true, percentage: false, amount: 200 },
      { name: 'Sports Coaching', description: 'Sports coaching allowance', taxable: true, percentage: false, amount: 3000 },
      { name: 'Club Patronage', description: 'Club patron allowance', taxable: true, percentage: false, amount: 2000 },
      { name: 'Professional Development', description: 'Training and development allowance', taxable: false, percentage: false, amount: 10000 },
      { name: 'Uniform Allowance', description: 'Annual uniform allowance', taxable: false, percentage: false, amount: 5000 },
      { name: 'Leave Travel', description: 'Annual leave travel allowance', taxable: true, percentage: false, amount: 20000 },
      { name: 'Performance Bonus', description: 'Annual performance bonus', taxable: true, percentage: true, amount: 25 },
      { name: 'Long Service Award', description: 'Long service recognition award', taxable: false, percentage: false, amount: 50000 },
      { name: 'Risk Allowance', description: 'High-risk work allowance', taxable: true, percentage: false, amount: 5000 }
    ];
    
    console.log(`Generating allowance types...`);
    
    for (let i = 0; i < allowanceData.length; i++) {
      const allowance = allowanceData[i];
      
      const allowanceType = {
        id: this.generateId('allowancetype', i),
        name: allowance.name,
        description: allowance.description,
        code: this.generateAllowanceCode(allowance.name),
        is_taxable: allowance.taxable,
        is_percentage_based: allowance.percentage,
        default_amount: allowance.amount,
        minimum_amount: allowance.percentage ? 0 : Math.round(allowance.amount * 0.5),
        maximum_amount: allowance.percentage ? 50 : Math.round(allowance.amount * 2),
        frequency: this.generateAllowanceFrequency(allowance.name),
        eligibility_criteria: this.generateEligibilityCriteria(allowance.name),
        requires_approval: this.requiresApproval(allowance.name),
        approval_level: this.getApprovalLevel(allowance.name),
        account_code: this.generateAccountCode('allowance', i),
        is_statutory: this.isStatutoryAllowance(allowance.name),
        effective_date: this.formatDate(this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())),
        review_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))),
        is_active: this.randomBoolean(0.9),
        created_by: `staff_${this.randomInt(1, 5)}`,
        approved_by: `staff_${this.randomInt(1, 3)}`,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.allowanceTypes.push(allowanceType);
      
      results.push({
        table: 'allowance_types',
        data: allowanceType
      });
    }
    
    console.log(`Generated ${allowanceData.length} allowance types`);
    
    return results;
  }

  private generateAllowanceCode(name: string): string {
    return name.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 6) + this.randomInt(10, 99);
  }

  private generateAllowanceFrequency(name: string): string {
    const monthlyAllowances = ['House Allowance', 'Transport Allowance', 'Medical Allowance', 'Communication Allowance'];
    const dailyAllowances = ['Lunch Allowance', 'Overtime Allowance'];
    const annualAllowances = ['Uniform Allowance', 'Leave Travel', 'Performance Bonus', 'Long Service Award'];
    
    if (monthlyAllowances.includes(name)) return 'Monthly';
    if (dailyAllowances.includes(name)) return 'Daily';
    if (annualAllowances.includes(name)) return 'Annual';
    
    return 'As Required';
  }

  private generateEligibilityCriteria(name: string): string {
    const criteria: { [key: string]: string } = {
      'House Allowance': 'All permanent staff',
      'Transport Allowance': 'Staff living more than 5km from school',
      'Medical Allowance': 'All staff and dependents',
      'Responsibility Allowance': 'Staff with additional responsibilities',
      'Acting Allowance': 'Staff acting in higher positions',
      'Performance Bonus': 'Staff meeting performance targets',
      'Long Service Award': 'Staff with 10+ years service'
    };
    
    return criteria[name] || 'As per HR policy';
  }

  private requiresApproval(name: string): boolean {
    const approvalRequired = ['Performance Bonus', 'Long Service Award', 'Acting Allowance', 'Responsibility Allowance'];
    return approvalRequired.includes(name);
  }

  private getApprovalLevel(name: string): string {
    const highLevel = ['Performance Bonus', 'Long Service Award'];
    const mediumLevel = ['Acting Allowance', 'Responsibility Allowance'];
    
    if (highLevel.includes(name)) return 'Principal';
    if (mediumLevel.includes(name)) return 'Deputy Principal';
    
    return 'HOD';
  }

  private generateAccountCode(type: string, index: number): string {
    const prefix = type === 'allowance' ? '5200' : '5300';
    return `${prefix}${String(index + 1).padStart(3, '0')}`;
  }

  private isStatutoryAllowance(name: string): boolean {
    const statutory = ['House Allowance', 'Medical Allowance'];
    return statutory.includes(name);
  }

  private async generateDeductionTypes(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const deductionData = [
      { name: 'PAYE Tax', description: 'Pay As You Earn income tax', mandatory: true, percentage: true, rate: 30 },
      { name: 'NHIF', description: 'National Hospital Insurance Fund', mandatory: true, percentage: false, amount: 1700 },
      { name: 'NSSF', description: 'National Social Security Fund', mandatory: true, percentage: true, rate: 6 },
      { name: 'Pension Contribution', description: 'Staff pension scheme contribution', mandatory: false, percentage: true, rate: 5 },
      { name: 'Staff Loan', description: 'Staff loan repayment', mandatory: false, percentage: false, amount: 5000 },
      { name: 'Salary Advance', description: 'Salary advance repayment', mandatory: false, percentage: false, amount: 10000 },
      { name: 'Medical Insurance', description: 'Private medical insurance premium', mandatory: false, percentage: false, amount: 3000 },
      { name: 'Life Insurance', description: 'Life insurance premium', mandatory: false, percentage: false, amount: 1500 },
      { name: 'Union Dues', description: 'Trade union membership dues', mandatory: false, percentage: false, amount: 500 },
      { name: 'Cooperative Shares', description: 'Staff cooperative society shares', mandatory: false, percentage: false, amount: 2000 },
      { name: 'Welfare Fund', description: 'Staff welfare fund contribution', mandatory: false, percentage: false, amount: 1000 },
      { name: 'Disciplinary Fine', description: 'Disciplinary action fine', mandatory: false, percentage: false, amount: 2000 },
      { name: 'Uniform Deduction', description: 'Uniform cost deduction', mandatory: false, percentage: false, amount: 3000 },
      { name: 'Damage Compensation', description: 'Property damage compensation', mandatory: false, percentage: false, amount: 5000 },
      { name: 'Professional Fees', description: 'Professional body membership fees', mandatory: false, percentage: false, amount: 2500 }
    ];
    
    console.log(`Generating deduction types...`);
    
    for (let i = 0; i < deductionData.length; i++) {
      const deduction = deductionData[i];
      
      const deductionType = {
        id: this.generateId('deductiontype', i),
        name: deduction.name,
        description: deduction.description,
        code: this.generateDeductionCode(deduction.name),
        is_mandatory: deduction.mandatory,
        is_percentage_based: deduction.percentage,
        default_rate: deduction.percentage ? deduction.rate : null,
        default_amount: !deduction.percentage ? deduction.amount : null,
        minimum_amount: 0,
        maximum_amount: deduction.percentage ? 50 : 50000,
        frequency: this.generateDeductionFrequency(deduction.name),
        calculation_method: this.generateCalculationMethod(deduction.name),
        applies_to_gross: this.appliesToGross(deduction.name),
        tax_relief_eligible: this.isTaxReliefEligible(deduction.name),
        account_code: this.generateAccountCode('deduction', i),
        statutory_authority: this.getStatutoryAuthority(deduction.name),
        effective_date: this.formatDate(this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())),
        review_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))),
        is_active: this.randomBoolean(0.95),
        created_by: `staff_${this.randomInt(1, 5)}`,
        approved_by: `staff_${this.randomInt(1, 3)}`,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.deductionTypes.push(deductionType);
      
      results.push({
        table: 'deduction_types',
        data: deductionType
      });
    }
    
    console.log(`Generated ${deductionData.length} deduction types`);
    
    return results;
  }

  private generateDeductionCode(name: string): string {
    return name.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 6) + this.randomInt(10, 99);
  }

  private generateDeductionFrequency(name: string): string {
    const monthlyDeductions = ['PAYE Tax', 'NHIF', 'NSSF', 'Pension Contribution', 'Medical Insurance'];
    const asRequiredDeductions = ['Disciplinary Fine', 'Damage Compensation'];
    
    if (monthlyDeductions.includes(name)) return 'Monthly';
    if (asRequiredDeductions.includes(name)) return 'As Required';
    
    return 'Monthly';
  }

  private generateCalculationMethod(name: string): string {
    const methods: { [key: string]: string } = {
      'PAYE Tax': 'Progressive tax rates based on income bands',
      'NHIF': 'Fixed amount based on salary range',
      'NSSF': 'Percentage of pensionable pay up to ceiling',
      'Pension Contribution': 'Percentage of basic salary',
      'Staff Loan': 'Fixed monthly installment'
    };
    
    return methods[name] || 'Fixed amount or percentage as configured';
  }

  private appliesToGross(name: string): boolean {
    const grossDeductions = ['PAYE Tax', 'NHIF', 'NSSF'];
    return grossDeductions.includes(name);
  }

  private isTaxReliefEligible(name: string): boolean {
    const taxReliefEligible = ['Pension Contribution', 'Medical Insurance', 'Life Insurance'];
    return taxReliefEligible.includes(name);
  }

  private getStatutoryAuthority(name: string): string | null {
    const authorities: { [key: string]: string } = {
      'PAYE Tax': 'Kenya Revenue Authority (KRA)',
      'NHIF': 'National Hospital Insurance Fund',
      'NSSF': 'National Social Security Fund'
    };
    
    return authorities[name] || null;
  }

  private async generateStaffSalaryStructures(count: number): Promise<any[]> {
    const results: any[] = [];
    
    console.log(`Generating ${count} staff salary structures...`);
    
    for (let i = 0; i < count; i++) {
      const staffId = `staff_${i + 1}`;
      const salaryGrade = this.randomChoice(this.salaryGrades);
      
      const basicSalary = this.randomInt(salaryGrade.minimum_salary, salaryGrade.maximum_salary);
      
      const salaryStructure = {
        id: this.generateId('salarystructure', i),
        staff_id: staffId,
        salary_grade_id: salaryGrade.id,
        basic_salary: basicSalary,
        gross_salary: this.calculateGrossSalary(basicSalary),
        pensionable_salary: this.calculatePensionableSalary(basicSalary),
        taxable_income: 0, // Will be calculated
        net_salary: 0, // Will be calculated
        effective_date: this.formatDate(this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())),
        review_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))),
        increment_due_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))),
        last_increment_date: this.formatDate(this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())),
        increment_percentage: this.randomInt(3, 8),
        currency: 'KES',
        payment_method: this.randomChoice(['Bank Transfer', 'Cheque', 'Cash']),
        bank_account: this.generateBankAccount(),
        bank_name: this.generateBankName(),
        bank_branch: this.generateBankBranch(),
        tax_certificate: this.generateTaxCertificate(),
        employment_terms: this.randomChoice(['Permanent', 'Contract', 'Temporary', 'Probation']),
        probation_end_date: this.generateProbationEndDate(),
        contract_end_date: this.generateContractEndDate(),
        status: this.randomChoice(['Active', 'Suspended', 'On Leave', 'Terminated']),
        created_by: `staff_${this.randomInt(1, 5)}`,
        approved_by: `staff_${this.randomInt(1, 3)}`,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.staffMembers.push(salaryStructure);
      
      results.push({
        table: 'staff_salary_structures',
        data: salaryStructure
      });
      
      this.logProgress(i + 1, count, 'staff salary structure');
    }
    
    return results;
  }

  private calculateGrossSalary(basicSalary: number): number {
    // Add typical allowances to basic salary
    const houseAllowance = Math.min(basicSalary * 0.15, 15000);
    const transportAllowance = 8000;
    const medicalAllowance = 5000;
    
    return basicSalary + houseAllowance + transportAllowance + medicalAllowance;
  }

  private calculatePensionableSalary(basicSalary: number): number {
    // Pensionable salary is usually basic + house allowance
    const houseAllowance = Math.min(basicSalary * 0.15, 15000);
    return basicSalary + houseAllowance;
  }

  private generateBankAccount(): string {
    return this.randomInt(1000000000, 9999999999).toString();
  }

  private generateBankName(): string {
    const banks = [
      'Kenya Commercial Bank', 'Equity Bank', 'Cooperative Bank', 'Standard Chartered',
      'Barclays Bank', 'NCBA Bank', 'Absa Bank', 'Diamond Trust Bank',
      'I&M Bank', 'Family Bank', 'NIC Bank', 'Prime Bank'
    ];
    return this.randomChoice(banks);
  }

  private generateBankBranch(): string {
    const branches = [
      'Main Branch', 'CBD Branch', 'Westlands Branch', 'Karen Branch',
      'Eastleigh Branch', 'Thika Road Branch', 'Mombasa Road Branch',
      'Ngong Road Branch', 'Kiambu Branch', 'Nakuru Branch'
    ];
    return this.randomChoice(branches);
  }

  private generateTaxCertificate(): string {
    return `TAX${this.randomInt(100000, 999999)}`;
  }

  private generateProbationEndDate(): string | null {
    return this.randomBoolean(0.3) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 180 * 24 * 60 * 60 * 1000))) : null;
  }

  private generateContractEndDate(): string | null {
    return this.randomBoolean(0.4) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))) : null;
  }

  private async generatePayrollPeriods(count: number): Promise<any[]> {
    const results: any[] = [];
    
    console.log(`Generating ${count} payroll periods...`);
    
    for (let i = 0; i < count; i++) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - (count - i));
      startDate.setDate(1);
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      
      const payrollPeriod = {
        id: this.generateId('payrollperiod', i),
        period_name: `${this.getMonthName(startDate.getMonth())} ${startDate.getFullYear()}`,
        start_date: this.formatDate(startDate),
        end_date: this.formatDate(endDate),
        pay_date: this.formatDate(this.generatePayDate(endDate)),
        period_type: 'Monthly',
        working_days: this.calculateWorkingDays(startDate, endDate),
        total_staff: this.randomInt(80, 120),
        total_gross_pay: this.randomInt(5000000, 8000000),
        total_deductions: this.randomInt(1500000, 2500000),
        total_net_pay: 0, // Will be calculated
        total_allowances: this.randomInt(800000, 1200000),
        total_overtime: this.randomInt(100000, 300000),
        status: this.randomChoice(['Draft', 'Processing', 'Approved', 'Paid', 'Closed']),
        processed_by: `staff_${this.randomInt(1, 5)}`,
        approved_by: `staff_${this.randomInt(1, 3)}`,
        processed_date: this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())),
        approval_date: this.formatDate(this.randomDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), new Date())),
        notes: this.generatePayrollPeriodNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      // Calculate total net pay
      payrollPeriod.total_net_pay = payrollPeriod.total_gross_pay - payrollPeriod.total_deductions;
      
      results.push({
        table: 'payroll_periods',
        data: payrollPeriod
      });
      
      this.logProgress(i + 1, count, 'payroll period');
    }
    
    return results;
  }

  private getMonthName(monthIndex: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
  }

  private generatePayDate(endDate: Date): Date {
    const payDate = new Date(endDate);
    payDate.setDate(payDate.getDate() + this.randomInt(1, 5)); // Pay 1-5 days after period end
    return payDate;
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let workingDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  }

  private generatePayrollPeriodNotes(): string | null {
    const notes = [
      'Regular monthly payroll processing',
      'Includes annual bonus payments',
      'Salary increments applied',
      'New staff additions processed',
      'Overtime payments included'
    ];
    
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }

  private async generatePayrollRecords(count: number): Promise<any[]> {
    const results: any[] = [];
    
    console.log(`Generating ${count} payroll records...`);
    
    for (let i = 0; i < count; i++) {
      const staffMember = this.randomChoice(this.staffMembers);
      const payrollPeriodId = `payrollperiod_${this.randomInt(1, 24)}`;
      
      const basicSalary = staffMember.basic_salary;
      const grossSalary = staffMember.gross_salary;
      const totalDeductions = this.calculateTotalDeductions(grossSalary);
      const netSalary = grossSalary - totalDeductions;
      
      const payrollRecord = {
        id: this.generateId('payrollrecord', i),
        staff_id: staffMember.staff_id,
        payroll_period_id: payrollPeriodId,
        basic_salary: basicSalary,
        gross_salary: grossSalary,
        total_allowances: this.calculateTotalAllowances(basicSalary),
        total_deductions: totalDeductions,
        total_overtime: this.randomInt(0, 10000),
        taxable_income: this.calculateTaxableIncome(grossSalary),
        tax_amount: this.calculateTaxAmount(grossSalary),
        net_salary: netSalary,
        days_worked: this.randomInt(20, 22),
        days_absent: this.randomInt(0, 2),
        overtime_hours: this.randomInt(0, 20),
        overtime_rate: this.randomInt(300, 800),
        leave_days_taken: this.randomInt(0, 3),
        leave_days_balance: this.randomInt(15, 45),
        payment_method: staffMember.payment_method,
        payment_reference: this.generatePaymentReference(),
        payment_date: this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())),
        payment_status: this.randomChoice(['Pending', 'Paid', 'Failed', 'Cancelled']),
        bank_charges: this.randomInt(0, 100),
        processed_by: `staff_${this.randomInt(1, 5)}`,
        approved_by: `staff_${this.randomInt(1, 3)}`,
        notes: this.generatePayrollRecordNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'payroll_records',
        data: payrollRecord
      });
      
      this.logProgress(i + 1, count, 'payroll record');
    }
    
    return results;
  }

  private calculateTotalAllowances(basicSalary: number): number {
    const houseAllowance = Math.min(basicSalary * 0.15, 15000);
    const transportAllowance = 8000;
    const medicalAllowance = 5000;
    const lunchAllowance = 300 * 22; // 22 working days
    
    return houseAllowance + transportAllowance + medicalAllowance + lunchAllowance;
  }

  private calculateTotalDeductions(grossSalary: number): number {
    const paye = this.calculateTaxAmount(grossSalary);
    const nhif = this.calculateNHIF(grossSalary);
    const nssf = Math.min(grossSalary * 0.06, 1080); // 6% up to ceiling
    const pension = grossSalary * 0.05; // 5% pension contribution
    
    return paye + nhif + nssf + pension;
  }

  private calculateTaxableIncome(grossSalary: number): number {
    const nhif = this.calculateNHIF(grossSalary);
    const nssf = Math.min(grossSalary * 0.06, 1080);
    const pension = grossSalary * 0.05;
    const personalRelief = 2400; // Monthly personal relief
    
    return Math.max(0, grossSalary - nhif - nssf - pension - personalRelief);
  }

  private calculateTaxAmount(grossSalary: number): number {
    const taxableIncome = this.calculateTaxableIncome(grossSalary);
    
    // Simplified PAYE calculation (Kenya tax bands)
    if (taxableIncome <= 24000) return taxableIncome * 0.1;
    if (taxableIncome <= 32333) return 2400 + (taxableIncome - 24000) * 0.25;
    return 4483 + (taxableIncome - 32333) * 0.3;
  }

  private calculateNHIF(grossSalary: number): number {
    // Simplified NHIF calculation
    if (grossSalary <= 5999) return 150;
    if (grossSalary <= 7999) return 300;
    if (grossSalary <= 11999) return 400;
    if (grossSalary <= 14999) return 500;
    if (grossSalary <= 19999) return 600;
    if (grossSalary <= 24999) return 750;
    if (grossSalary <= 29999) return 850;
    if (grossSalary <= 34999) return 900;
    if (grossSalary <= 39999) return 950;
    if (grossSalary <= 44999) return 1000;
    if (grossSalary <= 49999) return 1100;
    if (grossSalary <= 59999) return 1200;
    if (grossSalary <= 69999) return 1300;
    if (grossSalary <= 79999) return 1400;
    if (grossSalary <= 89999) return 1500;
    if (grossSalary <= 99999) return 1600;
    return 1700;
  }

  private generatePaymentReference(): string {
    return `PAY${this.randomInt(100000, 999999)}`;
  }

  private generatePayrollRecordNotes(): string | null {
    const notes = [
      'Regular monthly payment',
      'Includes overtime payment',
      'Salary increment applied',
      'Bonus payment included',
      'Loan deduction applied'
    ];
    
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }

  private async generateStaffAllowances(count: number): Promise<any[]> {
    const results: any[] = [];
    
    console.log(`Generating ${count} staff allowances...`);
    
    for (let i = 0; i < count; i++) {
      const staffMember = this.randomChoice(this.staffMembers);
      const allowanceType = this.randomChoice(this.allowanceTypes);
      
      const amount = allowanceType.is_percentage_based 
        ? (staffMember.basic_salary * allowanceType.default_amount / 100)
        : allowanceType.default_amount;
      
      const staffAllowance = {
        id: this.generateId('staffallowance', i),
        staff_id: staffMember.staff_id,
        allowance_type_id: allowanceType.id,
        amount: amount,
        effective_date: this.formatDate(this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())),
        end_date: this.generateAllowanceEndDate(),
        frequency: allowanceType.frequency,
        is_active: this.randomBoolean(0.9),
        requires_approval: allowanceType.requires_approval,
        approval_status: this.generateApprovalStatus(allowanceType.requires_approval),
        approved_by: allowanceType.requires_approval ? `staff_${this.randomInt(1, 5)}` : null,
        approval_date: allowanceType.requires_approval ? this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())) : null,
        reason: this.generateAllowanceReason(allowanceType.name),
        supporting_documents: this.generateSupportingDocuments(),
        payment_status: this.randomChoice(['Pending', 'Approved', 'Paid', 'Cancelled']),
        last_payment_date: this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())),
        next_payment_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))),
        total_paid: this.randomInt(0, amount * 12),
        created_by: `staff_${this.randomInt(1, 5)}`,
        notes: this.generateStaffAllowanceNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'staff_allowances',
        data: staffAllowance
      });
      
      this.logProgress(i + 1, count, 'staff allowance');
    }
    
    return results;
  }

  private generateAllowanceEndDate(): string | null {
    return this.randomBoolean(0.3) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))) : null;
  }

  private generateApprovalStatus(requiresApproval: boolean): string {
    if (!requiresApproval) return 'Auto-Approved';
    
    return this.randomChoice(['Pending', 'Approved', 'Rejected', 'Under Review']);
  }

  private generateAllowanceReason(allowanceName: string): string {
    const reasons: { [key: string]: string } = {
      'House Allowance': 'Standard housing allowance as per policy',
      'Transport Allowance': 'Daily commuting to work',
      'Acting Allowance': 'Acting in higher position during leave',
      'Responsibility Allowance': 'Additional duties assigned',
      'Performance Bonus': 'Excellent performance rating'
    };
    
    return reasons[allowanceName] || 'As per employment terms';
  }

  private generateSupportingDocuments(): string | null {
    const documents = [
      'Appointment letter',
      'Performance appraisal',
      'Medical certificate',
      'Training certificate',
      'Approval memo'
    ];
    
    return this.randomBoolean(0.4) ? this.randomChoice(documents) : null;
  }

  private generateStaffAllowanceNotes(): string | null {
    const notes = [
      'Regular allowance payment',
      'Temporary allowance for special assignment',
      'Annual allowance as per contract',
      'Performance-based allowance',
      'Allowance pending documentation'
    ];
    
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }

  private async generateStaffDeductions(count: number): Promise<any[]> {
    const results: any[] = [];
    
    console.log(`Generating ${count} staff deductions...`);
    
    for (let i = 0; i < count; i++) {
      const staffMember = this.randomChoice(this.staffMembers);
      const deductionType = this.randomChoice(this.deductionTypes);
      
      const amount = deductionType.is_percentage_based 
        ? (staffMember.basic_salary * deductionType.default_rate / 100)
        : deductionType.default_amount;
      
      const staffDeduction = {
        id: this.generateId('staffdeduction', i),
        staff_id: staffMember.staff_id,
        deduction_type_id: deductionType.id,
        amount: amount,
        effective_date: this.formatDate(this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())),
        end_date: this.generateDeductionEndDate(deductionType.name),
        frequency: deductionType.frequency,
        is_active: this.randomBoolean(0.9),
        is_mandatory: deductionType.is_mandatory,
        reason: this.generateDeductionReason(deductionType.name),
        reference_number: this.generateDeductionReference(),
        payment_status: this.randomChoice(['Active', 'Completed', 'Suspended', 'Cancelled']),
        total_deducted: this.randomInt(0, amount * 12),
        balance_remaining: this.generateBalanceRemaining(deductionType.name, amount),
        authorized_by: `staff_${this.randomInt(1, 5)}`,
        authorization_date: this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())),
        last_deduction_date: this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())),
        next_deduction_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))),
        created_by: `staff_${this.randomInt(1, 5)}`,
        notes: this.generateStaffDeductionNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'staff_deductions',
        data: staffDeduction
      });
      
      this.logProgress(i + 1, count, 'staff deduction');
    }
    
    return results;
  }

  private generateDeductionEndDate(deductionName: string): string | null {
    const temporaryDeductions = ['Staff Loan', 'Salary Advance', 'Disciplinary Fine', 'Damage Compensation'];
    
    if (temporaryDeductions.includes(deductionName)) {
      return this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)));
    }
    
    return null; // Ongoing deductions
  }

  private generateDeductionReason(deductionName: string): string {
    const reasons: { [key: string]: string } = {
      'PAYE Tax': 'Statutory income tax deduction',
      'NHIF': 'National health insurance contribution',
      'NSSF': 'Social security fund contribution',
      'Staff Loan': 'Personal loan repayment',
      'Salary Advance': 'Advance salary repayment',
      'Disciplinary Fine': 'Disciplinary action penalty'
    };
    
    return reasons[deductionName] || 'As per employment terms';
  }

  private generateDeductionReference(): string {
    return `DED${this.randomInt(100000, 999999)}`;
  }

  private generateBalanceRemaining(deductionName: string, amount: number): number {
    const temporaryDeductions = ['Staff Loan', 'Salary Advance', 'Disciplinary Fine'];
    
    if (temporaryDeductions.includes(deductionName)) {
      return this.randomInt(0, amount * 10); // Some balance remaining
    }
    
    return 0; // Ongoing deductions have no balance
  }

  private generateStaffDeductionNotes(): string | null {
    const notes = [
      'Regular statutory deduction',
      'Voluntary deduction as requested',
      'Temporary deduction for specific period',
      'Court-ordered deduction',
      'Loan repayment schedule'
    ];
    
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }

  private async generateStaffLoans(count: number): Promise<any[]> {
    const results: any[] = [];
    
    console.log(`Generating ${count} staff loans...`);
    
    for (let i = 0; i < count; i++) {
      const staffMember = this.randomChoice(this.staffMembers);
      const loanAmount = this.randomInt(50000, 500000);
      const interestRate = this.randomInt(8, 15);
      const loanTerm = this.randomInt(12, 60); // months
      
      const monthlyPayment = this.calculateLoanPayment(loanAmount, interestRate, loanTerm);
      
      const staffLoan = {
        id: this.generateId('staffloan', i),
        staff_id: staffMember.staff_id,
        loan_type: this.generateLoanType(),
        loan_amount: loanAmount,
        interest_rate: interestRate,
        loan_term_months: loanTerm,
        monthly_payment: monthlyPayment,
        total_interest: this.calculateTotalInterest(loanAmount, interestRate, loanTerm),
        total_repayment: loanAmount + this.calculateTotalInterest(loanAmount, interestRate, loanTerm),
        application_date: this.formatDate(this.randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date())),
        approval_date: this.formatDate(this.randomDate(new Date(Date.now() - 150 * 24 * 60 * 60 * 1000), new Date())),
        disbursement_date: this.formatDate(this.randomDate(new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), new Date())),
        first_payment_date: this.formatDate(this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date())),
        maturity_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + loanTerm * 30 * 24 * 60 * 60 * 1000))),
        purpose: this.generateLoanPurpose(),
        guarantor_1: `staff_${this.randomInt(1, 100)}`,
        guarantor_2: `staff_${this.randomInt(1, 100)}`,
        collateral: this.generateCollateral(),
        status: this.randomChoice(['Applied', 'Approved', 'Disbursed', 'Active', 'Completed', 'Defaulted']),
        balance_outstanding: this.generateOutstandingBalance(loanAmount, monthlyPayment),
        payments_made: this.randomInt(0, loanTerm),
        payments_remaining: 0, // Will be calculated
        last_payment_date: this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())),
        next_payment_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))),
        default_amount: this.randomInt(0, monthlyPayment * 2),
        penalty_charges: this.randomInt(0, 5000),
        approved_by: `staff_${this.randomInt(1, 5)}`,
        processed_by: `staff_${this.randomInt(1, 8)}`,
        notes: this.generateLoanNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      // Calculate payments remaining
      staffLoan.payments_remaining = staffLoan.loan_term_months - staffLoan.payments_made;
      
      results.push({
        table: 'staff_loans',
        data: staffLoan
      });
      
      this.logProgress(i + 1, count, 'staff loan');
    }
    
    return results;
  }

  private generateLoanType(): string {
    const types = [
      'Personal Loan', 'Emergency Loan', 'Salary Advance', 'Development Loan',
      'Education Loan', 'Medical Loan', 'Housing Loan', 'Vehicle Loan'
    ];
    return this.randomChoice(types);
  }

  private calculateLoanPayment(principal: number, annualRate: number, months: number): number {
    const monthlyRate = annualRate / 100 / 12;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                   (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(payment);
  }

  private calculateTotalInterest(principal: number, annualRate: number, months: number): number {
    const monthlyPayment = this.calculateLoanPayment(principal, annualRate, months);
    return (monthlyPayment * months) - principal;
  }

  private generateLoanPurpose(): string {
    const purposes = [
      'Home improvement', 'Medical expenses', 'Education fees', 'Emergency expenses',
      'Vehicle purchase', 'Business investment', 'Debt consolidation', 'Personal development'
    ];
    return this.randomChoice(purposes);
  }

  private generateCollateral(): string | null {
    const collaterals = [
      'Salary guarantee', 'Vehicle logbook', 'Property title deed', 'Fixed deposit certificate',
      'Insurance policy', 'Guarantor security', 'Equipment ownership'
    ];
    
    return this.randomBoolean(0.6) ? this.randomChoice(collaterals) : null;
  }

  private generateOutstandingBalance(loanAmount: number, monthlyPayment: number): number {
    const paymentsMade = this.randomInt(0, 24);
    const principalPaid = paymentsMade * (monthlyPayment * 0.7); // Assuming 70% goes to principal
    return Math.max(0, loanAmount - principalPaid);
  }

  private generateLoanNotes(): string | null {
    const notes = [
      'Regular loan repayment',
      'Emergency loan approved',
      'Guarantors verified',
      'Collateral documentation complete',
      'Payment schedule adjusted'
    ];
    
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }

  private async generateOvertimeRecords(count: number): Promise<any[]> {
    const results: any[] = [];
    
    console.log(`Generating ${count} overtime records...`);
    
    for (let i = 0; i < count; i++) {
      const staffMember = this.randomChoice(this.staffMembers);
      const overtimeDate = this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date());
      const hoursWorked = this.randomInt(1, 8);
      const hourlyRate = this.randomInt(300, 800);
      
      const overtimeRecord = {
        id: this.generateId('overtime', i),
        staff_id: staffMember.staff_id,
        overtime_date: this.formatDate(overtimeDate),
        start_time: this.generateOvertimeStartTime(),
        end_time: this.generateOvertimeEndTime(),
        hours_worked: hoursWorked,
        hourly_rate: hourlyRate,
        total_amount: hoursWorked * hourlyRate,
        overtime_type: this.generateOvertimeType(),
        reason: this.generateOvertimeReason(),
        department: this.generateDepartment(),
        supervisor_id: `staff_${this.randomInt(1, 20)}`,
        approved_by: `staff_${this.randomInt(1, 10)}`,
        approval_date: this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())),
        approval_status: this.randomChoice(['Pending', 'Approved', 'Rejected', 'Paid']),
        payment_status: this.randomChoice(['Pending', 'Processed', 'Paid']),
        payment_date: this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())),
        payment_reference: this.generatePaymentReference(),
        is_holiday_overtime: this.randomBoolean(0.2),
        is_weekend_overtime: this.randomBoolean(0.3),
        multiplier_rate: this.generateOvertimeMultiplier(),
        break_time_minutes: this.randomInt(0, 60),
        actual_work_hours: hoursWorked - (this.randomInt(0, 60) / 60),
        notes: this.generateOvertimeNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'overtime_records',
        data: overtimeRecord
      });
      
      this.logProgress(i + 1, count, 'overtime record');
    }
    
    return results;
  }

  private generateOvertimeStartTime(): string {
    const hour = this.randomInt(17, 22); // 5 PM to 10 PM
    const minute = this.randomInt(0, 59);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  private generateOvertimeEndTime(): string {
    const hour = this.randomInt(19, 23); // 7 PM to 11 PM
    const minute = this.randomInt(0, 59);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  private generateOvertimeType(): string {
    const types = [
      'Regular Overtime', 'Weekend Work', 'Holiday Work', 'Emergency Work',
      'Event Coverage', 'Exam Supervision', 'Maintenance Work', 'Security Duty'
    ];
    return this.randomChoice(types);
  }

  private generateOvertimeReason(): string {
    const reasons = [
      'Staff shortage coverage', 'Emergency maintenance', 'Special event',
      'Exam supervision required', 'Security coverage needed',
      'Project deadline', 'Equipment repair', 'Student activity supervision'
    ];
    return this.randomChoice(reasons);
  }

  private generateDepartment(): string {
    const departments = [
      'Administration', 'Teaching', 'Maintenance', 'Security',
      'Kitchen', 'Library', 'Laboratory', 'Sports'
    ];
    return this.randomChoice(departments);
  }

  private generateOvertimeMultiplier(): number {
    // Standard overtime rates
    return this.randomChoice([1.5, 2.0, 2.5]); // 1.5x, 2x, 2.5x normal rate
  }

  private generateOvertimeNotes(): string | null {
    const notes = [
      'Approved overtime for essential work',
      'Emergency overtime due to staff absence',
      'Special event overtime coverage',
      'Maintenance overtime during school hours',
      'Security overtime for night duty'
    ];
    
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }

  private async initialize(): Promise<void> {
    // Initialize any required data
    console.log('Initializing PayrollGenerator...');
  }

  private logProgress(current: number, total: number, type: string): void {
    if (current % 50 === 0 || current === total) {
      console.log(`Generated ${current}/${total} ${type}s`);
    }
  }
}