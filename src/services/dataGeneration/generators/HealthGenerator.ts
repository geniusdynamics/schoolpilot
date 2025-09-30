// ABOUTME: This file generates comprehensive health management data including medical records, screenings, and health inventory
// ABOUTME: Handles student health tracking, medical appointments, and health facility management

import { BaseGenerator } from './BaseGenerator';

export class HealthGenerator extends BaseGenerator {
  async generateData(): Promise<any[]> {
    await this.initialize();
    
    const results = [];
    
    // Generate medical conditions
    const medicalConditions = await this.generateMedicalConditions(50);
    results.push(...medicalConditions);
    
    // Generate health facilities
    const healthFacilities = await this.generateHealthFacilities(5);
    results.push(...healthFacilities);
    
    // Generate medical staff
    const medicalStaff = await this.generateMedicalStaff(10);
    results.push(...medicalStaff);
    
    // Generate student health records
    const healthRecords = await this.generateStudentHealthRecords(500);
    results.push(...healthRecords);
    
    // Generate health screenings
    const healthScreenings = await this.generateHealthScreenings(300);
    results.push(...healthScreenings);
    
    // Generate medical appointments
    const medicalAppointments = await this.generateMedicalAppointments(200);
    results.push(...medicalAppointments);
    
    // Generate vaccination records
    const vaccinationRecords = await this.generateVaccinationRecords(400);
    results.push(...vaccinationRecords);
    
    // Generate medical incidents
    const medicalIncidents = await this.generateMedicalIncidents(150);
    results.push(...medicalIncidents);
    
    // Generate health insurance records
    const insuranceRecords = await this.generateHealthInsuranceRecords(450);
    results.push(...insuranceRecords);
    
    // Generate medical inventory
    const medicalInventory = await this.generateMedicalInventory(100);
    results.push(...medicalInventory);
    
    return results;
  }
  
  private async generateMedicalConditions(count: number): Promise<any[]> {
    const conditions = [];
    
    for (let i = 1; i <= count; i++) {
      const condition = {
        id: `medical_condition_${i}`,
        condition_name: this.generateConditionName(),
        condition_code: `MED${i.toString().padStart(3, '0')}`,
        category: this.generateConditionCategory(),
        severity_level: this.generateSeverityLevel(),
        description: this.generateConditionDescription(),
        symptoms: this.generateSymptoms(),
        treatment_protocol: this.generateTreatmentProtocol(),
        medication_required: this.randomBoolean(0.6),
        follow_up_required: this.randomBoolean(0.4),
        chronic_condition: this.randomBoolean(0.3),
        contagious: this.randomBoolean(0.2),
        emergency_condition: this.randomBoolean(0.1),
        parent_notification_required: this.randomBoolean(0.7),
        activity_restrictions: this.generateActivityRestrictions(),
        dietary_restrictions: this.generateDietaryRestrictions(),
        special_care_instructions: this.generateSpecialCareInstructions(),
        is_active: this.randomBoolean(0.95),
        created_by: `staff_${this.randomInt(1, 10)}`,
        created_at: this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      conditions.push(condition);
      this.logProgress(i, count, 'medical condition');
    }
    
    return conditions;
  }
  
  private async generateHealthFacilities(count: number): Promise<any[]> {
    const facilities = [];
    
    for (let i = 1; i <= count; i++) {
      const facility = {
        id: `health_facility_${i}`,
        facility_name: this.generateFacilityName(),
        facility_type: this.generateFacilityType(),
        location: this.generateFacilityLocation(),
        capacity: this.randomInt(5, 50),
        operating_hours: this.generateOperatingHours(),
        contact_number: this.generatePhoneNumber(),
        emergency_contact: this.generatePhoneNumber(),
        head_of_facility: `staff_${this.randomInt(1, 10)}`,
        services_offered: this.generateServicesOffered(),
        equipment_available: this.generateEquipmentAvailable(),
        certification_level: this.generateCertificationLevel(),
        license_number: this.generateLicenseNumber(),
        license_expiry: this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
        insurance_coverage: this.randomBoolean(0.9),
        emergency_protocols: this.generateEmergencyProtocols(),
        referral_hospitals: this.generateReferralHospitals(),
        is_operational: this.randomBoolean(0.95),
        last_inspection_date: this.randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date()),
        next_inspection_date: this.randomDate(new Date(), new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)),
        compliance_status: this.generateComplianceStatus(),
        notes: this.generateFacilityNotes(),
        created_by: `staff_${this.randomInt(1, 10)}`,
        created_at: this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      facilities.push(facility);
      this.logProgress(i, count, 'health facility');
    }
    
    return facilities;
  }
  
  private async generateMedicalStaff(count: number): Promise<any[]> {
    const staff = [];
    
    for (let i = 1; i <= count; i++) {
      const staffMember = {
        id: `medical_staff_${i}`,
        staff_id: `staff_${this.randomInt(1, 100)}`,
        medical_license_number: this.generateMedicalLicenseNumber(),
        specialization: this.generateMedicalSpecialization(),
        qualification: this.generateMedicalQualification(),
        years_of_experience: this.randomInt(1, 30),
        certification: this.generateMedicalCertification(),
        certification_expiry: this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
        facility_id: `health_facility_${this.randomInt(1, 5)}`,
        role: this.generateMedicalRole(),
        shift_schedule: this.generateShiftSchedule(),
        emergency_contact_person: this.generatePersonName(),
        emergency_contact_number: this.generatePhoneNumber(),
        blood_type: this.generateBloodType(),
        allergies: this.generateAllergies(),
        medical_conditions: this.generateStaffMedicalConditions(),
        vaccination_status: this.generateVaccinationStatus(),
        last_medical_checkup: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        next_medical_checkup: this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
        insurance_provider: this.generateInsuranceProvider(),
        insurance_policy_number: this.generatePolicyNumber(),
        is_active: this.randomBoolean(0.95),
        start_date: this.randomDate(new Date(Date.now() - 1095 * 24 * 60 * 60 * 1000), new Date()),
        end_date: this.randomBoolean(0.1) ? this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()) : null,
        notes: this.generateStaffNotes(),
        created_by: `staff_${this.randomInt(1, 10)}`,
        created_at: this.randomDate(),
        updated_at: this.randomDate()
      };
      
      staff.push(staffMember);
      this.logProgress(i, count, 'medical staff');
    }
    
    return staff;
  }
  
  private async generateStudentHealthRecords(count: number): Promise<any[]> {
    const records = [];
    
    for (let i = 1; i <= count; i++) {
      const record = {
        id: `health_record_${i}`,
        student_id: `student_${i}`,
        blood_type: this.generateBloodType(),
        height: this.randomFloat(120, 180, 1),
        weight: this.randomFloat(30, 80, 1),
        bmi: this.randomFloat(16, 30, 1),
        vision_status: this.generateVisionStatus(),
        hearing_status: this.generateHearingStatus(),
        dental_status: this.generateDentalStatus(),
        allergies: this.generateAllergies(),
        chronic_conditions: this.generateChronicConditions(),
        current_medications: this.generateCurrentMedications(),
        dietary_restrictions: this.generateDietaryRestrictions(),
        physical_limitations: this.generatePhysicalLimitations(),
        emergency_contact_name: this.generatePersonName(),
        emergency_contact_relationship: this.generateRelationship(),
        emergency_contact_phone: this.generatePhoneNumber(),
        emergency_contact_address: this.generateAddress(),
        family_doctor_name: this.generateDoctorName(),
        family_doctor_phone: this.generatePhoneNumber(),
        family_doctor_address: this.generateAddress(),
        insurance_provider: this.generateInsuranceProvider(),
        insurance_policy_number: this.generatePolicyNumber(),
        insurance_expiry_date: this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
        parent_consent_medical_treatment: this.randomBoolean(0.95),
        parent_consent_emergency_treatment: this.randomBoolean(0.98),
        special_medical_needs: this.generateSpecialMedicalNeeds(),
        last_physical_exam_date: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        next_physical_exam_date: this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
        immunization_status: this.generateImmunizationStatus(),
        health_alerts: this.generateHealthAlerts(),
        medical_history: this.generateMedicalHistory(),
        family_medical_history: this.generateFamilyMedicalHistory(),
        created_by: `staff_${this.randomInt(1, 10)}`,
        created_at: this.randomDate(),
        updated_at: this.randomDate()
      };
      
      records.push(record);
      this.logProgress(i, count, 'health record');
    }
    
    return records;
  }
  
  private async generateHealthScreenings(count: number): Promise<any[]> {
    const screenings = [];
    
    for (let i = 1; i <= count; i++) {
      const screening = {
        id: `health_screening_${i}`,
        student_id: `student_${this.randomInt(1, 500)}`,
        screening_type: this.generateScreeningType(),
        screening_date: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        conducted_by: `medical_staff_${this.randomInt(1, 10)}`,
        facility_id: `health_facility_${this.randomInt(1, 5)}`,
        height: this.randomFloat(120, 180, 1),
        weight: this.randomFloat(30, 80, 1),
        bmi: this.randomFloat(16, 30, 1),
        blood_pressure_systolic: this.randomInt(90, 140),
        blood_pressure_diastolic: this.randomInt(60, 90),
        heart_rate: this.randomInt(60, 100),
        temperature: this.randomFloat(36, 38, 1),
        vision_test_result: this.generateVisionTestResult(),
        hearing_test_result: this.generateHearingTestResult(),
        dental_examination: this.generateDentalExamination(),
        general_health_status: this.generateGeneralHealthStatus(),
        concerns_identified: this.generateConcernsIdentified(),
        recommendations: this.generateHealthRecommendations(),
        follow_up_required: this.randomBoolean(0.3),
        follow_up_date: this.randomBoolean(0.3) ? this.randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) : null,
        parent_notification_sent: this.randomBoolean(0.8),
        parent_notification_date: this.randomBoolean(0.8) ? this.randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()) : null,
        referral_required: this.randomBoolean(0.2),
        referral_to: this.randomBoolean(0.2) ? this.generateReferralDestination() : null,
        screening_results_shared: this.randomBoolean(0.9),
        notes: this.generateScreeningNotes(),
        created_by: `staff_${this.randomInt(1, 10)}`,
        created_at: this.randomDate(),
        updated_at: this.randomDate()
      };
      
      screenings.push(screening);
      this.logProgress(i, count, 'health screening');
    }
    
    return screenings;
  }
  
  private async generateMedicalAppointments(count: number): Promise<any[]> {
    const appointments = [];
    
    for (let i = 1; i <= count; i++) {
      const appointment = {
        id: `medical_appointment_${i}`,
        appointment_number: `APT${new Date().getFullYear()}${i.toString().padStart(4, '0')}`,
        student_id: `student_${this.randomInt(1, 500)}`,
        appointment_type: this.generateAppointmentType(),
        appointment_date: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        appointment_time: this.generateAppointmentTime(),
        duration_minutes: this.randomInt(15, 60),
        medical_staff_id: `medical_staff_${this.randomInt(1, 10)}`,
        facility_id: `health_facility_${this.randomInt(1, 5)}`,
        reason_for_visit: this.generateReasonForVisit(),
        priority: this.generatePriority(),
        status: this.generateAppointmentStatus(),
        booked_by: `staff_${this.randomInt(1, 100)}`,
        booking_date: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
        parent_consent_required: this.randomBoolean(0.7),
        parent_consent_obtained: this.randomBoolean(0.7),
        parent_notification_sent: this.randomBoolean(0.8),
        reminder_sent: this.randomBoolean(0.6),
        reminder_date: this.randomBoolean(0.6) ? this.randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()) : null,
        check_in_time: this.randomBoolean(0.7) ? this.generateAppointmentTime() : null,
        check_out_time: this.randomBoolean(0.7) ? this.generateAppointmentTime() : null,
        diagnosis: this.randomBoolean(0.7) ? this.generateDiagnosis() : null,
        treatment_provided: this.randomBoolean(0.7) ? this.generateTreatmentProvided() : null,
        medication_prescribed: this.randomBoolean(0.4) ? this.generateMedicationPrescribed() : null,
        follow_up_required: this.randomBoolean(0.3),
        follow_up_date: this.randomBoolean(0.3) ? this.randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) : null,
        referral_made: this.randomBoolean(0.2),
        referral_to: this.randomBoolean(0.2) ? this.generateReferralDestination() : null,
        cost: this.randomFloat(0, 5000, 2),
        payment_status: this.generatePaymentStatus(),
        insurance_claim_submitted: this.randomBoolean(0.6),
        notes: this.generateAppointmentNotes(),
        created_by: `staff_${this.randomInt(1, 10)}`,
        created_at: this.randomDate(),
        updated_at: this.randomDate()
      };
      
      appointments.push(appointment);
      this.logProgress(i, count, 'medical appointment');
    }
    
    return appointments;
  }
  
  private async generateVaccinationRecords(count: number): Promise<any[]> {
    const records = [];
    
    for (let i = 1; i <= count; i++) {
      const record = {
        id: `vaccination_record_${i}`,
        student_id: `student_${this.randomInt(1, 500)}`,
        vaccine_name: this.generateVaccineName(),
        vaccine_type: this.generateVaccineType(),
        dose_number: this.randomInt(1, 4),
        total_doses_required: this.randomInt(1, 4),
        vaccination_date: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        administered_by: `medical_staff_${this.randomInt(1, 10)}`,
        facility_id: `health_facility_${this.randomInt(1, 5)}`,
        batch_number: this.generateVaccineBatchNumber(),
        manufacturer: this.generateVaccineManufacturer(),
        expiry_date: this.randomDate(new Date(), new Date(Date.now() + 730 * 24 * 60 * 60 * 1000)),
        site_of_administration: this.generateAdministrationSite(),
        route_of_administration: this.generateAdministrationRoute(),
        dosage: this.generateVaccineDosage(),
        adverse_reactions: this.generateAdverseReactions(),
        contraindications: this.generateContraindications(),
        next_dose_due_date: this.randomBoolean(0.6) ? this.randomDate(new Date(), new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)) : null,
        vaccination_series_complete: this.randomBoolean(0.7),
        certificate_issued: this.randomBoolean(0.9),
        certificate_number: this.randomBoolean(0.9) ? this.generateCertificateNumber() : null,
        parent_consent_obtained: this.randomBoolean(0.95),
        consent_date: this.randomBoolean(0.95) ? this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()) : null,
        pre_vaccination_screening: this.randomBoolean(0.8),
        screening_results: this.randomBoolean(0.8) ? this.generateScreeningResults() : null,
        post_vaccination_observation: this.randomBoolean(0.9),
        observation_period_minutes: this.randomBoolean(0.9) ? this.randomInt(15, 30) : null,
        follow_up_required: this.randomBoolean(0.2),
        follow_up_date: this.randomBoolean(0.2) ? this.randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) : null,
        cost: this.randomFloat(0, 2000, 2),
        payment_status: this.generatePaymentStatus(),
        insurance_coverage: this.randomBoolean(0.7),
        notes: this.generateVaccinationNotes(),
        created_by: `staff_${this.randomInt(1, 10)}`,
        created_at: this.randomDate(),
        updated_at: this.randomDate()
      };
      
      records.push(record);
      this.logProgress(i, count, 'vaccination record');
    }
    
    return records;
  }
  
  private async generateMedicalIncidents(count: number): Promise<any[]> {
    const incidents = [];
    
    for (let i = 1; i <= count; i++) {
      const incident = {
        id: `medical_incident_${i}`,
        incident_number: `INC${new Date().getFullYear()}${i.toString().padStart(4, '0')}`,
        student_id: `student_${this.randomInt(1, 500)}`,
        incident_type: this.generateIncidentType(),
        incident_date: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        incident_time: this.generateIncidentTime(),
        location: this.generateIncidentLocation(),
        severity: this.generateIncidentSeverity(),
        description: this.generateIncidentDescription(),
        cause: this.generateIncidentCause(),
        witnesses: this.generateWitnesses(),
        first_aid_provided: this.randomBoolean(0.8),
        first_aid_by: this.randomBoolean(0.8) ? `staff_${this.randomInt(1, 100)}` : null,
        medical_attention_required: this.randomBoolean(0.6),
        medical_staff_attended: this.randomBoolean(0.6) ? `medical_staff_${this.randomInt(1, 10)}` : null,
        treatment_provided: this.randomBoolean(0.6) ? this.generateTreatmentProvided() : null,
        medication_given: this.randomBoolean(0.3) ? this.generateMedicationGiven() : null,
        hospital_referral_required: this.randomBoolean(0.2),
        hospital_referred_to: this.randomBoolean(0.2) ? this.generateHospitalName() : null,
        ambulance_called: this.randomBoolean(0.1),
        ambulance_arrival_time: this.randomBoolean(0.1) ? this.generateIncidentTime() : null,
        parent_notified: this.randomBoolean(0.9),
        parent_notification_time: this.randomBoolean(0.9) ? this.generateIncidentTime() : null,
        parent_response: this.randomBoolean(0.9) ? this.generateParentResponse() : null,
        incident_reported_by: `staff_${this.randomInt(1, 100)}`,
        report_time: this.generateIncidentTime(),
        follow_up_required: this.randomBoolean(0.4),
        follow_up_date: this.randomBoolean(0.4) ? this.randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) : null,
        investigation_required: this.randomBoolean(0.3),
        investigation_completed: this.randomBoolean(0.3),
        investigation_findings: this.randomBoolean(0.3) ? this.generateInvestigationFindings() : null,
        preventive_measures: this.generatePreventiveMeasures(),
        insurance_claim_required: this.randomBoolean(0.2),
        insurance_claim_number: this.randomBoolean(0.2) ? this.generateClaimNumber() : null,
        status: this.generateIncidentStatus(),
        notes: this.generateIncidentNotes(),
        created_by: `staff_${this.randomInt(1, 10)}`,
        created_at: this.randomDate(),
        updated_at: this.randomDate()
      };
      
      incidents.push(incident);
      this.logProgress(i, count, 'medical incident');
    }
    
    return incidents;
  }
  
  private async generateHealthInsuranceRecords(count: number): Promise<any[]> {
    const records = [];
    
    for (let i = 1; i <= count; i++) {
      const record = {
        id: `health_insurance_${i}`,
        student_id: `student_${this.randomInt(1, 500)}`,
        insurance_provider: this.generateInsuranceProvider(),
        policy_number: this.generatePolicyNumber(),
        policy_holder_name: this.generatePersonName(),
        policy_holder_relationship: this.generateRelationship(),
        policy_type: this.generatePolicyType(),
        coverage_type: this.generateCoverageType(),
        coverage_amount: this.randomFloat(50000, 2000000, 2),
        deductible_amount: this.randomFloat(1000, 50000, 2),
        co_payment_percentage: this.randomFloat(10, 30, 1),
        policy_start_date: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        policy_end_date: this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
        premium_amount: this.randomFloat(5000, 100000, 2),
        premium_frequency: this.generatePremiumFrequency(),
        last_premium_payment_date: this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
        next_premium_due_date: this.randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        payment_status: this.generatePaymentStatus(),
        benefits_covered: this.generateBenefitsCovered(),
        exclusions: this.generateInsuranceExclusions(),
        pre_existing_conditions_covered: this.randomBoolean(0.6),
        waiting_period_months: this.randomInt(0, 12),
        network_hospitals: this.generateNetworkHospitals(),
        emergency_contact_number: this.generatePhoneNumber(),
        claim_procedure: this.generateClaimProcedure(),
        pre_authorization_required: this.randomBoolean(0.7),
        cashless_facility_available: this.randomBoolean(0.8),
        annual_health_checkup_covered: this.randomBoolean(0.9),
        vaccination_covered: this.randomBoolean(0.8),
        dental_coverage: this.randomBoolean(0.6),
        optical_coverage: this.randomBoolean(0.5),
        maternity_coverage: this.randomBoolean(0.4),
        mental_health_coverage: this.randomBoolean(0.3),
        alternative_medicine_coverage: this.randomBoolean(0.2),
        is_active: this.randomBoolean(0.95),
        renewal_reminder_sent: this.randomBoolean(0.7),
        renewal_reminder_date: this.randomBoolean(0.7) ? this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()) : null,
        notes: this.generateInsuranceNotes(),
        created_by: `staff_${this.randomInt(1, 10)}`,
        created_at: this.randomDate(),
        updated_at: this.randomDate()
      };
      
      records.push(record);
      this.logProgress(i, count, 'health insurance record');
    }
    
    return records;
  }
  
  private async generateMedicalInventory(count: number): Promise<any[]> {
    const inventory = [];
    
    for (let i = 1; i <= count; i++) {
      const item = {
        id: `medical_inventory_${i}`,
        item_name: this.generateMedicalItemName(),
        item_code: `MED${i.toString().padStart(4, '0')}`,
        category: this.generateMedicalItemCategory(),
        description: this.generateMedicalItemDescription(),
        manufacturer: this.generateMedicalManufacturer(),
        brand: this.generateMedicalBrand(),
        model_number: this.generateModelNumber(),
        unit_of_measure: this.generateMedicalUnitOfMeasure(),
        unit_cost: this.randomFloat(10, 10000, 2),
        current_stock: this.randomInt(0, 500),
        minimum_stock_level: this.randomInt(5, 50),
        maximum_stock_level: this.randomInt(100, 1000),
        reorder_level: this.randomInt(10, 100),
        reorder_quantity: this.randomInt(50, 200),
        storage_location: this.generateMedicalStorageLocation(),
        storage_requirements: this.generateMedicalStorageRequirements(),
        expiry_date: this.randomBoolean(0.8) ? this.randomDate(new Date(), new Date(Date.now() + 730 * 24 * 60 * 60 * 1000)) : null,
        batch_number: this.randomBoolean(0.7) ? this.generateMedicalBatchNumber() : null,
        supplier_id: `supplier_${this.randomInt(1, 20)}`,
        last_purchase_date: this.randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date()),
        last_purchase_price: this.randomFloat(10, 10000, 2),
        last_issue_date: this.randomBoolean(0.8) ? this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()) : null,
        total_issued_this_month: this.randomInt(0, 100),
        average_monthly_usage: this.randomFloat(5, 50, 1),
        prescription_required: this.randomBoolean(0.4),
        controlled_substance: this.randomBoolean(0.1),
        dangerous_goods: this.randomBoolean(0.2),
        special_handling_required: this.randomBoolean(0.3),
        disposal_method: this.generateDisposalMethod(),
        regulatory_approval: this.generateRegulatoryApproval(),
        license_required: this.randomBoolean(0.3),
        quality_certification: this.generateQualityCertification(),
        warranty_period_months: this.randomInt(0, 60),
        maintenance_required: this.randomBoolean(0.4),
        last_maintenance_date: this.randomBoolean(0.4) ? this.randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date()) : null,
        next_maintenance_date: this.randomBoolean(0.4) ? this.randomDate(new Date(), new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)) : null,
        calibration_required: this.randomBoolean(0.3),
        last_calibration_date: this.randomBoolean(0.3) ? this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()) : null,
        next_calibration_date: this.randomBoolean(0.3) ? this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) : null,
        is_active: this.randomBoolean(0.95),
        notes: this.generateMedicalInventoryNotes(),
        created_by: `staff_${this.randomInt(1, 10)}`,
        created_at: this.randomDate(),
        updated_at: this.randomDate()
      };
      
      inventory.push(item);
      this.logProgress(i, count, 'medical inventory item');
    }
    
    return inventory;
  }
  
  // Helper methods for generating health-related data
  private generateConditionName(): string {
    const conditions = [
      'Asthma', 'Diabetes Type 1', 'Diabetes Type 2', 'Epilepsy', 'ADHD',
      'Allergic Rhinitis', 'Eczema', 'Migraine', 'Hypertension', 'Anemia',
      'Scoliosis', 'Visual Impairment', 'Hearing Loss', 'Anxiety Disorder',
      'Depression', 'Food Allergies', 'Lactose Intolerance', 'Celiac Disease'
    ];
    return this.randomChoice(conditions);
  }
  
  private generateConditionCategory(): string {
    return this.randomChoice([
      'Respiratory', 'Endocrine', 'Neurological', 'Cardiovascular',
      'Dermatological', 'Gastrointestinal', 'Mental Health', 'Musculoskeletal',
      'Sensory', 'Allergic', 'Autoimmune', 'Genetic'
    ]);
  }
  
  private generateSeverityLevel(): string {
    return this.randomChoice(['Mild', 'Moderate', 'Severe', 'Critical']);
  }
  
  private generateConditionDescription(): string {
    const descriptions = [
      'Chronic condition requiring ongoing management',
      'Acute condition with episodic symptoms',
      'Hereditary condition with genetic component',
      'Environmental condition triggered by external factors',
      'Developmental condition affecting growth and learning'
    ];
    return this.randomChoice(descriptions);
  }
  
  private generateSymptoms(): string[] {
    const symptoms = [
      'Shortness of breath', 'Chest pain', 'Fatigue', 'Dizziness',
      'Nausea', 'Headache', 'Fever', 'Cough', 'Skin rash',
      'Joint pain', 'Muscle weakness', 'Vision problems'
    ];
    const numSymptoms = this.randomInt(1, 4);
    return this.randomChoices(symptoms, numSymptoms);
  }
  
  private generateTreatmentProtocol(): string {
    const protocols = [
      'Medication management with regular monitoring',
      'Lifestyle modifications and dietary changes',
      'Physical therapy and exercise program',
      'Regular medical checkups and screenings',
      'Emergency action plan and rescue medications'
    ];
    return this.randomChoice(protocols);
  }
  
  private generateActivityRestrictions(): string[] | null {
    const restrictions = [
      'No strenuous physical activity',
      'Avoid contact sports',
      'Limited exposure to allergens',
      'Regular medication breaks',
      'Modified physical education'
    ];
    const numRestrictions = this.randomInt(0, 3);
    return numRestrictions > 0 ? this.randomChoices(restrictions, numRestrictions) : null;
  }
  
  private generateDietaryRestrictions(): string[] | null {
    const restrictions = [
      'Gluten-free diet', 'Dairy-free diet', 'Nut-free diet',
      'Low sodium diet', 'Diabetic diet', 'Low sugar diet'
    ];
    const numRestrictions = this.randomInt(0, 2);
    return numRestrictions > 0 ? this.randomChoices(restrictions, numRestrictions) : null;
  }
  
  private generateSpecialCareInstructions(): string | null {
    const instructions = [
      'Monitor for signs of distress during physical activity',
      'Ensure access to rescue medication at all times',
      'Provide quiet space for rest when needed',
      'Check blood sugar levels regularly',
      'Avoid known allergens in school environment'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(instructions) : null;
  }
  
  private generateFacilityName(): string {
    const names = [
      'Main Health Center', 'School Clinic', 'First Aid Station',
      'Medical Dispensary', 'Health Services Unit'
    ];
    return this.randomChoice(names);
  }
  
  private generateFacilityType(): string {
    return this.randomChoice([
      'Primary Health Center', 'Clinic', 'Dispensary',
      'First Aid Station', 'Medical Unit'
    ]);
  }
  
  private generateFacilityLocation(): string {
    const locations = [
      'Main Building Ground Floor', 'Administration Block',
      'Student Services Building', 'Sports Complex',
      'Dormitory Block A'
    ];
    return this.randomChoice(locations);
  }
  
  private generateOperatingHours(): string {
    return this.randomChoice([
      '8:00 AM - 5:00 PM', '7:00 AM - 6:00 PM',
      '24/7 Emergency Services', '8:00 AM - 4:00 PM',
      '9:00 AM - 5:00 PM'
    ]);
  }
  
  private generateServicesOffered(): string[] {
    const services = [
      'General Consultation', 'First Aid', 'Health Screening',
      'Vaccination', 'Emergency Care', 'Health Education',
      'Chronic Disease Management', 'Mental Health Support'
    ];
    const numServices = this.randomInt(3, 6);
    return this.randomChoices(services, numServices);
  }
  
  private generateEquipmentAvailable(): string[] {
    const equipment = [
      'Blood Pressure Monitor', 'Thermometer', 'Stethoscope',
      'Weighing Scale', 'Height Measure', 'First Aid Kit',
      'Oxygen Concentrator', 'Defibrillator', 'Wheelchair'
    ];
    const numEquipment = this.randomInt(4, 8);
    return this.randomChoices(equipment, numEquipment);
  }
  
  private generateCertificationLevel(): string {
    return this.randomChoice([
      'Level 1 - Basic Care', 'Level 2 - Primary Care',
      'Level 3 - Secondary Care', 'Emergency Care Certified'
    ]);
  }
  
  private generateLicenseNumber(): string {
    return `HF${this.randomInt(1000, 9999)}/2023`;
  }
  
  private generateEmergencyProtocols(): string[] {
    const protocols = [
      'Cardiac Emergency Protocol', 'Allergic Reaction Protocol',
      'Trauma Response Protocol', 'Infectious Disease Protocol',
      'Mental Health Crisis Protocol'
    ];
    const numProtocols = this.randomInt(2, 4);
    return this.randomChoices(protocols, numProtocols);
  }
  
  private generateReferralHospitals(): string[] {
    const hospitals = [
      'Kenyatta National Hospital', 'Nairobi Hospital',
      'Aga Khan Hospital', 'MP Shah Hospital',
      'Gertrudes Children Hospital'
    ];
    const numHospitals = this.randomInt(2, 4);
    return this.randomChoices(hospitals, numHospitals);
  }
  
  private generateComplianceStatus(): string {
    return this.randomChoice(['Compliant', 'Non-Compliant', 'Under Review']);
  }
  
  private generateFacilityNotes(): string | null {
    const notes = [
      'Well-equipped facility with modern equipment',
      'Needs equipment upgrade and maintenance',
      'Excellent staff and service quality',
      'Limited space but efficient operations',
      'Recently renovated with improved facilities'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }
  
  private generateMedicalLicenseNumber(): string {
    return `ML${this.randomInt(10000, 99999)}`;
  }
  
  private generateMedicalSpecialization(): string {
    return this.randomChoice([
      'General Practice', 'Pediatrics', 'Emergency Medicine',
      'Public Health', 'Occupational Health', 'School Health',
      'Mental Health', 'Nursing'
    ]);
  }
  
  private generateMedicalQualification(): string {
    return this.randomChoice([
      'MBBS', 'BSc Nursing', 'Diploma in Clinical Medicine',
      'MSc Public Health', 'BSc Clinical Medicine',
      'Certificate in First Aid'
    ]);
  }
  
  private generateMedicalCertification(): string[] {
    const certifications = [
      'CPR Certified', 'First Aid Certified', 'BLS Certified',
      'ACLS Certified', 'PALS Certified', 'Trauma Certified'
    ];
    const numCerts = this.randomInt(1, 3);
    return this.randomChoices(certifications, numCerts);
  }
  
  private generateMedicalRole(): string {
    return this.randomChoice([
      'Medical Officer', 'Nurse', 'Clinical Officer',
      'Health Assistant', 'First Aid Officer', 'Health Coordinator'
    ]);
  }
  
  private generateShiftSchedule(): string {
    return this.randomChoice([
      'Day Shift (8AM-5PM)', 'Night Shift (8PM-8AM)',
      'Rotating Shifts', 'On-Call', 'Part-Time'
    ]);
  }
  
  private generateBloodType(): string {
    return this.randomChoice(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
  }
  
  private generateAllergies(): string[] | null {
    const allergies = [
      'Peanuts', 'Tree nuts', 'Shellfish', 'Eggs', 'Milk',
      'Soy', 'Wheat', 'Dust mites', 'Pollen', 'Pet dander',
      'Penicillin', 'Aspirin', 'Latex'
    ];
    const numAllergies = this.randomInt(0, 3);
    return numAllergies > 0 ? this.randomChoices(allergies, numAllergies) : null;
  }
  
  private generateStaffMedicalConditions(): string[] | null {
    const conditions = [
      'Hypertension', 'Diabetes', 'Asthma', 'Back pain',
      'Migraine', 'Arthritis', 'None'
    ];
    const numConditions = this.randomInt(0, 2);
    return numConditions > 0 ? this.randomChoices(conditions, numConditions) : null;
  }
  
  private generateVaccinationStatus(): string {
    return this.randomChoice(['Up to date', 'Partially vaccinated', 'Not vaccinated']);
  }
  
  private generateInsuranceProvider(): string {
    const providers = [
      'NHIF', 'AAR Insurance', 'Jubilee Insurance',
      'CIC Insurance', 'Madison Insurance', 'Britam Insurance',
      'Resolution Insurance', 'ICEA LION', 'Heritage Insurance'
    ];
    return this.randomChoice(providers);
  }
  
  private generatePolicyNumber(): string {
    return `POL${this.randomInt(100000, 999999)}`;
  }
  
  private generateStaffNotes(): string | null {
    const notes = [
      'Excellent performance and dedication',
      'Needs additional training in emergency procedures',
      'Highly experienced and reliable',
      'New staff member under probation',
      'Specialized in pediatric care'
    ];
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }
  
  private generateVisionStatus(): string {
    return this.randomChoice(['Normal', 'Myopia', 'Hyperopia', 'Astigmatism', 'Color blind']);
  }
  
  private generateHearingStatus(): string {
    return this.randomChoice(['Normal', 'Mild hearing loss', 'Moderate hearing loss', 'Severe hearing loss']);
  }
  
  private generateDentalStatus(): string {
    return this.randomChoice(['Good', 'Fair', 'Poor', 'Needs treatment']);
  }
  
  private generateChronicConditions(): string[] | null {
    const conditions = [
      'Asthma', 'Diabetes', 'Epilepsy', 'ADHD', 'Autism',
      'Cerebral Palsy', 'Sickle Cell Disease', 'None'
    ];
    const numConditions = this.randomInt(0, 2);
    return numConditions > 0 ? this.randomChoices(conditions, numConditions) : null;
  }
  
  private generateCurrentMedications(): string[] | null {
    const medications = [
      'Salbutamol inhaler', 'Insulin', 'Antihistamines',
      'Multivitamins', 'Iron supplements', 'None'
    ];
    const numMedications = this.randomInt(0, 3);
    return numMedications > 0 ? this.randomChoices(medications, numMedications) : null;
  }
  
  private generatePhysicalLimitations(): string[] | null {
    const limitations = [
      'Limited mobility', 'Cannot participate in contact sports',
      'Requires wheelchair access', 'Visual impairment',
      'Hearing impairment', 'None'
    ];
    const numLimitations = this.randomInt(0, 2);
    return numLimitations > 0 ? this.randomChoices(limitations, numLimitations) : null;
  }
  
  private generateRelationship(): string {
    return this.randomChoice(['Mother', 'Father', 'Guardian', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle']);
  }
  
  private generateDoctorName(): string {
    const titles = ['Dr.', 'Dr.', 'Dr.'];
    const names = [
      'John Kamau', 'Mary Wanjiku', 'Peter Ochieng', 'Grace Akinyi',
      'David Kiprop', 'Sarah Muthoni', 'James Otieno', 'Ruth Njeri'
    ];
    return `${this.randomChoice(titles)} ${this.randomChoice(names)}`;
  }
  
  private generateSpecialMedicalNeeds(): string[] | null {
    const needs = [
      'Regular medication administration',
      'Blood sugar monitoring',
      'Seizure management protocol',
      'Allergy management',
      'Mobility assistance'
    ];
    const numNeeds = this.randomInt(0, 2);
    return numNeeds > 0 ? this.randomChoices(needs, numNeeds) : null;
  }
  
  private generateImmunizationStatus(): string {
    return this.randomChoice(['Complete', 'Incomplete', 'Up to date', 'Overdue']);
  }
  
  private generateHealthAlerts(): string[] | null {
    const alerts = [
      'Severe allergy - carry EpiPen',
      'Diabetic - monitor for hypoglycemia',
      'Asthmatic - inhaler required',
      'Epileptic - seizure protocol',
      'Hearing impaired - use visual cues'
    ];
    const numAlerts = this.randomInt(0, 2);
    return numAlerts > 0 ? this.randomChoices(alerts, numAlerts) : null;
  }
  
  private generateMedicalHistory(): string[] | null {
    const history = [
      'Previous hospitalization for pneumonia',
      'Surgery for appendicitis',
      'Broken arm at age 8',
      'Allergic reaction to medication',
      'Concussion from sports injury'
    ];
    const numHistory = this.randomInt(0, 3);
    return numHistory > 0 ? this.randomChoices(history, numHistory) : null;
  }
  
  private generateFamilyMedicalHistory(): string[] | null {
    const history = [
      'Family history of diabetes',
      'Family history of heart disease',
      'Family history of asthma',
      'Family history of cancer',
      'Family history of mental illness'
    ];
    const numHistory = this.randomInt(0, 2);
    return numHistory > 0 ? this.randomChoices(history, numHistory) : null;
  }
  
  private generateScreeningType(): string {
    return this.randomChoice([
      'Annual Health Screening', 'Vision Screening', 'Hearing Screening',
      'Dental Screening', 'BMI Screening', 'Scoliosis Screening',
      'Mental Health Screening'
    ]);
  }
  
  private generateVisionTestResult(): string {
    return this.randomChoice(['20/20', '20/30', '20/40', '20/50', '20/60', 'Needs correction']);
  }
  
  private generateHearingTestResult(): string {
    return this.randomChoice(['Normal', 'Mild loss', 'Moderate loss', 'Needs follow-up']);
  }
  
  private generateDentalExamination(): string {
    return this.randomChoice(['Good oral health', 'Needs cleaning', 'Cavities found', 'Orthodontic referral needed']);
  }
  
  private generateGeneralHealthStatus(): string {
    return this.randomChoice(['Excellent', 'Good', 'Fair', 'Needs attention']);
  }
  
  private generateConcernsIdentified(): string[] | null {
    const concerns = [
      'Overweight', 'Underweight', 'Vision problems',
      'Hearing issues', 'Dental problems', 'Posture issues',
      'Skin conditions', 'None identified'
    ];
    const numConcerns = this.randomInt(0, 3);
    return numConcerns > 0 ? this.randomChoices(concerns, numConcerns) : null;
  }
  
  private generateHealthRecommendations(): string[] | null {
    const recommendations = [
      'Increase physical activity',
      'Improve diet and nutrition',
      'Regular eye checkups',
      'Dental hygiene improvement',
      'Follow-up with specialist',
      'Continue current health practices'
    ];
    const numRecommendations = this.randomInt(0, 3);
    return numRecommendations > 0 ? this.randomChoices(recommendations, numRecommendations) : null;
  }
  
  private generateReferralDestination(): string {
    const destinations = [
      'Ophthalmologist', 'Dentist', 'Pediatrician',
      'Cardiologist', 'Dermatologist', 'Orthopedist',
      'Mental Health Counselor', 'Nutritionist'
    ];
    return this.randomChoice(destinations);
  }
  
  private generateScreeningNotes(): string | null {
    const notes = [
      'Student cooperative during screening',
      'Some anxiety noted during examination',
      'Parent present during screening',
      'Follow-up appointment scheduled',
      'Screening completed without issues'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }
  
  private generateAppointmentType(): string {
    return this.randomChoice([
      'General Consultation', 'Follow-up Visit', 'Emergency Visit',
      'Vaccination', 'Health Screening', 'Injury Assessment',
      'Chronic Disease Management', 'Mental Health Consultation'
    ]);
  }
  
  private generateAppointmentTime(): string {
    const hours = this.randomInt(8, 17);
    const minutes = this.randomChoice(['00', '15', '30', '45']);
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  private generateReasonForVisit(): string {
    const reasons = [
      'Routine checkup', 'Fever and cough', 'Stomach pain',
      'Headache', 'Injury from sports', 'Skin rash',
      'Breathing difficulties', 'Anxiety symptoms',
      'Medication review', 'Vaccination due'
    ];
    return this.randomChoice(reasons);
  }
  
  private generatePriority(): string {
    return this.randomChoice(['Low', 'Normal', 'High', 'Urgent']);
  }
  
  private generateAppointmentStatus(): string {
    return this.randomChoice([
      'Scheduled', 'Confirmed', 'In Progress', 'Completed',
      'Cancelled', 'No Show', 'Rescheduled'
    ]);
  }
  
  private generateDiagnosis(): string {
    const diagnoses = [
      'Upper respiratory tract infection',
      'Gastroenteritis', 'Migraine headache',
      'Sports injury - sprain', 'Allergic reaction',
      'Anxiety disorder', 'Asthma exacerbation',
      'Viral fever', 'Contact dermatitis'
    ];
    return this.randomChoice(diagnoses);
  }
  
  private generateTreatmentProvided(): string {
    const treatments = [
      'Medication prescribed',
      'Rest and observation',
      'First aid and bandaging',
      'Breathing treatment',
      'Counseling and support',
      'Referral to specialist',
      'Home care instructions'
    ];
    return this.randomChoice(treatments);
  }
  
  private generateMedicationPrescribed(): string[] {
    const medications = [
      'Paracetamol', 'Ibuprofen', 'Antihistamines',
      'Cough syrup', 'Antibiotics', 'Inhaler',
      'Topical cream', 'Multivitamins'
    ];
    const numMedications = this.randomInt(1, 3);
    return this.randomChoices(medications, numMedications);
  }
  
  private generatePaymentStatus(): string {
    return this.randomChoice(['Paid', 'Pending', 'Insurance Covered', 'Waived']);
  }
  
  private generateAppointmentNotes(): string | null {
    const notes = [
      'Student responded well to treatment',
      'Parent informed of condition and treatment',
      'Follow-up appointment recommended',
      'Emergency contact notified',
      'Return to class approved'
    ];
    return this.randomBoolean(0.5) ? this.randomChoice(notes) : null;
  }
  
  private generateVaccineName(): string {
    const vaccines = [
      'MMR', 'DPT', 'Polio', 'Hepatitis B', 'BCG',
      'Meningitis', 'HPV', 'Influenza', 'Typhoid',
      'Yellow Fever', 'COVID-19'
    ];
    return this.randomChoice(vaccines);
  }
  
  private generateVaccineType(): string {
    return this.randomChoice(['Live attenuated', 'Inactivated', 'Subunit', 'mRNA', 'Viral vector']);
  }
  
  private generateVaccineBatchNumber(): string {
    return `VB${this.randomInt(100000, 999999)}`;
  }
  
  private generateVaccineManufacturer(): string {
    const manufacturers = [
      'Pfizer', 'Moderna', 'AstraZeneca', 'Johnson & Johnson',
      'Sanofi', 'GSK', 'Merck', 'Novartis'
    ];
    return this.randomChoice(manufacturers);
  }
  
  private generateAdministrationSite(): string {
    return this.randomChoice(['Left arm', 'Right arm', 'Left thigh', 'Right thigh']);
  }
  
  private generateAdministrationRoute(): string {
    return this.randomChoice(['Intramuscular', 'Subcutaneous', 'Oral', 'Intranasal']);
  }
  
  private generateVaccineDosage(): string {
    return this.randomChoice(['0.5ml', '1.0ml', '0.25ml', '2 drops', '1 tablet']);
  }
  
  private generateAdverseReactions(): string[] | null {
    const reactions = [
      'Mild pain at injection site',
      'Low-grade fever',
      'Fatigue',
      'Headache',
      'Muscle aches',
      'None observed'
    ];
    const numReactions = this.randomInt(0, 3);
    return numReactions > 0 ? this.randomChoices(reactions, numReactions) : null;
  }
  
  private generateContraindications(): string[] | null {
    const contraindications = [
      'Severe illness',
      'Immunocompromised state',
      'Previous allergic reaction',
      'Pregnancy',
      'None identified'
    ];
    const numContraindications = this.randomInt(0, 2);
    return numContraindications > 0 ? this.randomChoices(contraindications, numContraindications) : null;
  }
  
  private generateCertificateNumber(): string {
    return `CERT${this.randomInt(100000, 999999)}`;
  }
  
  private generateScreeningResults(): string {
    return this.randomChoice(['Normal', 'Mild concerns', 'Cleared for vaccination', 'Defer vaccination']);
  }
  
  private generateVaccinationNotes(): string | null {
    const notes = [
      'Vaccination completed without complications',
      'Student tolerated vaccine well',
      'Parent consent obtained',
      'Added to immunization record',
      'Next dose scheduled'
    ];
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }
  
  private generateIncidentType(): string {
    return this.randomChoice([
      'Sports Injury', 'Fall', 'Cut/Laceration', 'Allergic Reaction',
      'Asthma Attack', 'Seizure', 'Fainting', 'Burns',
      'Insect Bite', 'Nosebleed', 'Headache', 'Stomach Pain'
    ]);
  }
  
  private generateIncidentTime(): string {
    const hours = this.randomInt(7, 18);
    const minutes = this.randomInt(0, 59);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  private generateIncidentLocation(): string {
    const locations = [
      'Playground', 'Classroom', 'Sports Field', 'Cafeteria',
      'Laboratory', 'Corridor', 'Stairs', 'Library',
      'Dormitory', 'Bathroom', 'Assembly Hall'
    ];
    return this.randomChoice(locations);
  }
  
  private generateIncidentSeverity(): string {
    return this.randomChoice(['Minor', 'Moderate', 'Severe', 'Critical']);
  }
  
  private generateIncidentDescription(): string {
    const descriptions = [
      'Student fell while running during break time',
      'Cut finger while using scissors in art class',
      'Allergic reaction after eating lunch',
      'Asthma attack during physical education',
      'Nosebleed during morning assembly',
      'Headache complaint during mathematics class'
    ];
    return this.randomChoice(descriptions);
  }
  
  private generateIncidentCause(): string {
    const causes = [
      'Accidental', 'Sports-related', 'Medical condition',
      'Allergic reaction', 'Equipment failure', 'Slip and fall',
      'Unknown', 'Pre-existing condition'
    ];
    return this.randomChoice(causes);
  }
  
  private generateWitnesses(): string[] | null {
    const witnesses = [];
    const numWitnesses = this.randomInt(0, 3);
    
    for (let i = 0; i < numWitnesses; i++) {
      witnesses.push(`staff_${this.randomInt(1, 100)}`);
    }
    
    return witnesses.length > 0 ? witnesses : null;
  }
  
  private generateMedicationGiven(): string[] {
    const medications = [
      'Paracetamol', 'Antihistamine', 'Inhaler',
      'Glucose tablets', 'Antiseptic cream',
      'Ice pack', 'Bandage'
    ];
    const numMedications = this.randomInt(1, 3);
    return this.randomChoices(medications, numMedications);
  }
  
  private generateHospitalName(): string {
    const hospitals = [
      'Kenyatta National Hospital', 'Nairobi Hospital',
      'Aga Khan Hospital', 'MP Shah Hospital',
      'Gertrudes Children Hospital', 'Mater Hospital'
    ];
    return this.randomChoice(hospitals);
  }
  
  private generateParentResponse(): string {
    return this.randomChoice([
      'Coming to school immediately',
      'Will pick up student',
      'Requested updates on condition',
      'Authorized treatment',
      'Will meet at hospital'
    ]);
  }
  
  private generateInvestigationFindings(): string {
    const findings = [
      'Equipment malfunction identified',
      'Safety protocol not followed',
      'Accidental incident, no fault found',
      'Student medical condition contributed',
      'Environmental hazard identified'
    ];
    return this.randomChoice(findings);
  }
  
  private generatePreventiveMeasures(): string[] {
    const measures = [
      'Improve safety protocols',
      'Additional staff training',
      'Equipment maintenance',
      'Environmental modifications',
      'Student education on safety'
    ];
    const numMeasures = this.randomInt(1, 3);
    return this.randomChoices(measures, numMeasures);
  }
  
  private generateClaimNumber(): string {
    return `CLM${this.randomInt(100000, 999999)}`;
  }
  
  private generateIncidentStatus(): string {
    return this.randomChoice(['Open', 'Under Investigation', 'Closed', 'Pending']);
  }
  
  private generateIncidentNotes(): string | null {
    const notes = [
      'Incident handled according to protocol',
      'Parent satisfied with response',
      'Student recovered fully',
      'Follow-up care arranged',
      'No further action required'
    ];
    return this.randomBoolean(0.5) ? this.randomChoice(notes) : null;
  }
  
  private generatePolicyType(): string {
    return this.randomChoice([
      'Individual Health Insurance',
      'Family Health Insurance',
      'Group Health Insurance',
      'Student Health Insurance'
    ]);
  }
  
  private generateCoverageType(): string {
    return this.randomChoice([
      'Comprehensive Coverage',
      'Basic Coverage',
      'Premium Coverage',
      'Emergency Only Coverage'
    ]);
  }
  
  private generatePremiumFrequency(): string {
    return this.randomChoice(['Monthly', 'Quarterly', 'Semi-Annual', 'Annual']);
  }
  
  private generateBenefitsCovered(): string[] {
    const benefits = [
      'Hospitalization', 'Outpatient Care', 'Emergency Services',
      'Prescription Drugs', 'Diagnostic Tests', 'Specialist Consultations',
      'Preventive Care', 'Mental Health Services'
    ];
    const numBenefits = this.randomInt(4, 7);
    return this.randomChoices(benefits, numBenefits);
  }
  
  private generateInsuranceExclusions(): string[] {
    const exclusions = [
      'Pre-existing conditions',
      'Cosmetic procedures',
      'Experimental treatments',
      'Self-inflicted injuries',
      'War-related injuries'
    ];
    const numExclusions = this.randomInt(2, 4);
    return this.randomChoices(exclusions, numExclusions);
  }
  
  private generateNetworkHospitals(): string[] {
    const hospitals = [
      'Kenyatta National Hospital', 'Nairobi Hospital',
      'Aga Khan Hospital', 'MP Shah Hospital',
      'Gertrudes Children Hospital', 'Mater Hospital',
      'Karen Hospital', 'Coptic Hospital'
    ];
    const numHospitals = this.randomInt(3, 6);
    return this.randomChoices(hospitals, numHospitals);
  }
  
  private generateClaimProcedure(): string {
    const procedures = [
      'Submit claim form with receipts',
      'Online claim submission available',
      'Cashless treatment at network hospitals',
      'Pre-authorization required for major treatments',
      'Direct billing to insurance company'
    ];
    return this.randomChoice(procedures);
  }
  
  private generateInsuranceNotes(): string | null {
    const notes = [
      'Policy in good standing',
      'Premium payments up to date',
      'Recent claim processed successfully',
      'Policy renewal due soon',
      'Coverage limits adequate for needs'
    ];
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }
  
  private generateMedicalItemName(): string {
    const items = [
      'Digital Thermometer', 'Blood Pressure Monitor', 'Stethoscope',
      'Pulse Oximeter', 'Glucometer', 'Nebulizer', 'Wheelchair',
      'Crutches', 'First Aid Kit', 'Bandages', 'Antiseptic Solution',
      'Paracetamol Tablets', 'Ibuprofen Tablets', 'Antihistamine',
      'Insulin', 'Inhaler', 'Syringes', 'Cotton Swabs',
      'Medical Gloves', 'Face Masks'
    ];
    return this.randomChoice(items);
  }
  
  private generateMedicalItemCategory(): string {
    return this.randomChoice([
      'Medical Equipment', 'Pharmaceuticals', 'Medical Supplies',
      'Diagnostic Equipment', 'Emergency Equipment', 'Mobility Aids',
      'Consumables', 'Personal Protective Equipment'
    ]);
  }
  
  private generateMedicalItemDescription(): string {
    const descriptions = [
      'High-quality medical device for accurate measurements',
      'Essential medication for treatment and prevention',
      'Disposable medical supply for hygiene and safety',
      'Diagnostic equipment for health assessment',
      'Emergency medical equipment for critical situations'
    ];
    return this.randomChoice(descriptions);
  }
  
  private generateMedicalManufacturer(): string {
    const manufacturers = [
      'Omron Healthcare', 'Philips Healthcare', 'GE Healthcare',
      'Siemens Healthineers', 'Medtronic', 'Johnson & Johnson',
      'Pfizer', 'GSK', 'Novartis', 'Roche'
    ];
    return this.randomChoice(manufacturers);
  }
  
  private generateMedicalBrand(): string {
    const brands = [
      'Omron', 'Philips', 'GE', 'Siemens', 'Medtronic',
      'J&J', 'Pfizer', 'GSK', 'Novartis', 'Roche'
    ];
    return this.randomChoice(brands);
  }
  
  private generateModelNumber(): string {
    return `${this.randomChoice(['MD', 'HC', 'MX', 'DX'])}${this.randomInt(1000, 9999)}`;
  }
  
  private generateMedicalUnitOfMeasure(): string {
    return this.randomChoice([
      'Pieces', 'Boxes', 'Bottles', 'Vials', 'Packets',
      'Units', 'Strips', 'Rolls', 'Sets', 'Kits'
    ]);
  }
  
  private generateMedicalStorageLocation(): string {
    const locations = [
      'Medical Store Room A', 'Pharmacy Cabinet',
      'Refrigerated Storage', 'Emergency Kit Storage',
      'Equipment Room', 'Controlled Substances Safe'
    ];
    return this.randomChoice(locations);
  }
  
  private generateMedicalStorageRequirements(): string[] {
    const requirements = [
      'Store at room temperature',
      'Keep refrigerated (2-8°C)',
      'Protect from light',
      'Keep dry',
      'Store in original packaging',
      'Controlled access required'
    ];
    const numRequirements = this.randomInt(1, 3);
    return this.randomChoices(requirements, numRequirements);
  }
  
  private generateMedicalBatchNumber(): string {
    return `MB${this.randomInt(100000, 999999)}`;
  }
  
  private generateDisposalMethod(): string {
    return this.randomChoice([
      'Regular waste disposal',
      'Medical waste disposal',
      'Hazardous waste disposal',
      'Pharmaceutical waste disposal',
      'Sharps disposal container'
    ]);
  }
  
  private generateRegulatoryApproval(): string[] {
    const approvals = [
      'FDA Approved', 'CE Marked', 'ISO Certified',
      'WHO Prequalified', 'KEBS Approved'
    ];
    const numApprovals = this.randomInt(1, 3);
    return this.randomChoices(approvals, numApprovals);
  }
  
  private generateQualityCertification(): string[] {
    const certifications = [
      'ISO 9001', 'ISO 13485', 'GMP Certified',
      'Quality Assured', 'Batch Tested'
    ];
    const numCertifications = this.randomInt(1, 2);
    return this.randomChoices(certifications, numCertifications);
  }
  
  private generateMedicalInventoryNotes(): string | null {
    const notes = [
      'Regular stock item with consistent usage',
      'Seasonal demand variation observed',
      'Critical item - maintain adequate stock',
      'Expensive item - monitor usage carefully',
      'New item - monitoring performance'
    ];
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }
}