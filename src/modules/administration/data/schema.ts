// ABOUTME: Defines RxDB JSON schemas for entities specific to the Administration module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../utils/schemaUtils';

export const partnerSchema: RxJsonSchema<types.AdminPartnerType> = createEntitySchema<types.AdminPartnerType>(
    'partner',
    {
        id: { type: 'string', maxLength: 100, final: true },
        name: { type: 'string', maxLength: 200 },
        partner_type: { type: 'string', enum: Object.values(types.PartnerType) },
        contact_person: { type: ['string', 'null'] },
        email: { type: ['string', 'null'], format: 'email' },
        phone: { type: ['string', 'null'] },
        address: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'string' },
    ['id', 'name', 'partner_type', 'created_at', 'updated_at'],
    ['name', 'partner_type']
);

export const clubAndSocietySchema: RxJsonSchema<types.AdminClubAndSocietyType> = createEntitySchema<types.AdminClubAndSocietyType>(
    'club', // collection name remains 'club'
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 150 },
        type: { type: 'string', enum: Object.values(types.ClubType) },
        patron_id: { type: ['string', 'null'], ref: 'staff' }, 
        description: { type: ['string', 'null'] },
        patron_name: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'type', 'created_at', 'updated_at'],
    ['name', 'type', 'patron_id']
);

export const customerSchema: RxJsonSchema<types.AdminCustomerType> = createEntitySchema<types.AdminCustomerType>(
    'customer',
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 200 },
        phone: { type: ['string', 'null'] },
        email: { type: ['string', 'null'], format: 'email' },
        address: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'created_at', 'updated_at'],
    ['name']
);

export const studentHealthRecordSchema: RxJsonSchema<types.AdminStudentHealthRecordType> = createEntitySchema<types.AdminStudentHealthRecordType>(
    'student_health_record',
    {
        id: { type: 'string', maxLength: 100 },
        student_id: { type: 'string', ref: 'students' }, 
        blood_type: { type: ['string', 'null'] },
        allergies: { type: ['string', 'null'] },
        medical_conditions: { type: ['string', 'null'] },
        emergency_contact_override: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        student_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'student_id', 'created_at', 'updated_at'],
    ['student_id']
);

export const studentAttendanceSchema: RxJsonSchema<types.AdminStudentAttendanceType> = createEntitySchema<types.AdminStudentAttendanceType>(
    'student_attendance',
    {
        id: { type: 'string', maxLength: 100 },
        student_id: { type: 'string', ref: 'students' }, 
        period_id: { type: 'number', ref: 'timetable_period_definitions' }, 
        date: { type: 'string', format: 'date' },
        status: { type: 'string', enum: Object.values(types.AttendanceStatus) },
        reason_for_absence: { type: ['string', 'null'] },
        created_at: { type: ['string', 'null'], format: 'date-time' }, // Made optional if it's system-generated on insert
        student_name: { type: ['string', 'null'] },
        period_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'student_id', 'date', 'period_id', 'status'], // created_at removed from required if system-generated
    ['student_id', 'date', 'period_id']
);

export const templateCommSchema: RxJsonSchema<types.AdminTemplateCommType> = createEntitySchema<types.AdminTemplateCommType>(
    'communication_template', // Collection name
    {
        id: { type: 'number' },
        name: { type: 'string', maxLength: 150 },
        type: { type: 'string', enum: Object.values(types.TemplateType) },
        subject: { type: ['string', 'null'] },
        body_template: { type: 'string' }, 
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'number' },
    ['id', 'name', 'type', 'body_template', 'created_at', 'updated_at'],
    ['name', 'type']
);

export const campaignSchema: RxJsonSchema<types.AdminCampaignType> = createEntitySchema<types.AdminCampaignType>(
    'message_campaign', // Collection name
    {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string', maxLength: 200 },
        template_id: { type: ['number', 'null'], ref: 'communication_templates' },
        subject: { type: ['string', 'null'] },
        body: { type: ['string', 'null'] }, 
        status: { type: 'string', enum: Object.values(types.CampaignStatus) },
        target_audience_type: { type: ['string', 'null'], enum: [...Object.values(types.CampaignAudienceType), null] as any[] },
        target_id: { type: ['string', 'null'] }, 
        scheduled_for: { type: ['string', 'null'], format: 'date-time' },
        sent_at: { type: ['string', 'null'], format: 'date-time' },
        created_by: { type: 'string', ref: 'users' }, 
        approved_by: { type: ['string', 'null'], ref: 'users' }, 
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        template_name: { type: ['string', 'null'] },
        created_by_name: { type: ['string', 'null'] },
        approved_by_name: { type: ['string', 'null'] },
        target_audience_display: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'name', 'status', 'created_by', 'created_at', 'updated_at'],
    ['name', 'status', 'target_audience_type']
);

// === ADMISSIONS SYSTEM SCHEMAS ===

export const applicationSchema: RxJsonSchema<types.AdminApplicationType> = createEntitySchema<types.AdminApplicationType>(
    'admissions_applications',
    {
        id: { type: 'string', maxLength: 100 },
        application_number: { type: 'string', maxLength: 20 },
        academic_year_id: { type: ['string', 'null'] },
        intended_class_id: { type: ['string', 'null'] },
        application_type: { type: 'string', enum: Object.values(types.ApplicationType) },
        
        // Applicant Information
        first_name: { type: 'string', maxLength: 100 },
        middle_name: { type: ['string', 'null'], maxLength: 100 },
        last_name: { type: 'string', maxLength: 100 },
        date_of_birth: { type: 'string', format: 'date' },
        gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
        nationality: { type: ['string', 'null'], maxLength: 50 },
        religion: { type: ['string', 'null'], maxLength: 50 },
        birth_certificate_number: { type: ['string', 'null'], maxLength: 50 },
        
        // Academic Background
        previous_school: { type: ['string', 'null'], maxLength: 200 },
        previous_class: { type: ['string', 'null'], maxLength: 50 },
        kcpe_index_number: { type: ['string', 'null'], maxLength: 20 },
        kcpe_marks: { type: ['object', 'null'] },
        kcpe_grade: { type: ['string', 'null'], maxLength: 5 },
        
        // Guardian Information
        guardian_type: { type: ['string', 'null'], enum: ['Father', 'Mother', 'Guardian', 'Other', null] as any[] },
        guardian_first_name: { type: ['string', 'null'], maxLength: 100 },
        guardian_last_name: { type: ['string', 'null'], maxLength: 100 },
        guardian_phone: { type: ['string', 'null'], maxLength: 20 },
        guardian_email: { type: ['string', 'null'], format: 'email' },
        guardian_occupation: { type: ['string', 'null'], maxLength: 100 },
        guardian_employer: { type: ['string', 'null'], maxLength: 200 },
        
        // Address Information
        residential_address: { type: ['string', 'null'] },
        postal_address: { type: ['string', 'null'] },
        county: { type: ['string', 'null'], maxLength: 50 },
        sub_county: { type: ['string', 'null'], maxLength: 50 },
        location: { type: ['string', 'null'], maxLength: 100 },
        sub_location: { type: ['string', 'null'], maxLength: 100 },
        
        // Application Status
        status: { type: 'string', enum: Object.values(types.ApplicationStatus) },
        submission_date: { type: ['string', 'null'], format: 'date-time' },
        review_deadline: { type: ['string', 'null'], format: 'date' },
        
        // System Fields
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        created_by: { type: ['string', 'null'] },
        updated_by: { type: ['string', 'null'] },
        
        // Denormalized fields
        intended_class_name: { type: ['string', 'null'] },
        academic_year_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'application_number', 'application_type', 'first_name', 'last_name', 'date_of_birth', 'gender', 'status', 'created_at', 'updated_at'],
    ['application_number', 'status', 'first_name', 'last_name', 'kcpe_index_number']
);

export const preNAsMarksSchema: RxJsonSchema<types.AdminPreNAsMarksType> = createEntitySchema<types.AdminPreNAsMarksType>(
    'pre_nas_marks',
    {
        id: { type: 'string', maxLength: 100 },
        student_id: { type: ['string', 'null'], ref: 'students' },
        application_id: { type: ['string', 'null'], ref: 'admissions_applications' },
        index_number: { type: 'string', maxLength: 20 },
        year: { type: 'number' },
        assessment_type: { type: 'string', enum: ['KCPE', 'CBC', 'Other'], default: 'KCPE' },
        
        // Core Subject Marks
        english: { type: 'number', minimum: 0, maximum: 100 },
        kiswahili: { type: 'number', minimum: 0, maximum: 100 },
        mathematics: { type: 'number', minimum: 0, maximum: 100 },
        science: { type: 'number', minimum: 0, maximum: 100 },
        social_studies: { type: 'number', minimum: 0, maximum: 100 },
        
        // Additional CBC subjects (optional)
        integrated_science: { type: ['number', 'null'], minimum: 0, maximum: 100 },
        pre_technical_studies: { type: ['number', 'null'], minimum: 0, maximum: 100 },
        creative_arts: { type: ['number', 'null'], minimum: 0, maximum: 100 },
        
        // Calculated Fields
        total_marks: { type: 'number' },
        mean_grade: { type: 'number' },
        overall_grade: { type: 'string', maxLength: 5 },
        
        // Meta
        imported_date: { type: ['string', 'null'], format: 'date-time' },
        verified: { type: 'boolean' },
        verification_date: { type: ['string', 'null'], format: 'date-time' },
        verified_by: { type: ['string', 'null'] },
        
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'index_number', 'year', 'english', 'kiswahili', 'mathematics', 'science', 'social_studies', 'total_marks', 'mean_grade', 'overall_grade', 'verified', 'created_at', 'updated_at'],
    ['index_number', 'year', 'overall_grade']
);

export const applicationReviewSchema: RxJsonSchema<types.AdminApplicationReviewType> = createEntitySchema<types.AdminApplicationReviewType>(
    'application_reviews',
    {
        id: { type: 'string', maxLength: 100 },
        application_id: { type: 'string', ref: 'admissions_applications' },
        reviewer_id: { type: 'string', ref: 'users' },
        review_stage: { type: 'string', enum: Object.values(types.ReviewStage) },
        
        // Review Criteria
        academic_score: { type: ['number', 'null'], minimum: 1, maximum: 100 },
        interview_score: { type: ['number', 'null'], minimum: 1, maximum: 100 },
        behavioral_assessment: { type: ['string', 'null'] },
        recommendation: { type: 'string', enum: Object.values(types.ReviewDecision) },
        
        // Comments
        academic_comments: { type: ['string', 'null'] },
        general_comments: { type: ['string', 'null'] },
        internal_notes: { type: ['string', 'null'] },
        
        // Status
        review_status: { type: 'string', enum: ['Pending', 'In Progress', 'Completed'] },
        review_date: { type: ['string', 'null'], format: 'date-time' },
        
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        
        // Denormalized
        reviewer_name: { type: ['string', 'null'] },
        application_number: { type: ['string', 'null'] },
        applicant_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'application_id', 'reviewer_id', 'review_stage', 'recommendation', 'review_status', 'created_at', 'updated_at'],
    ['application_id', 'reviewer_id', 'review_stage', 'review_status']
);

export const applicationDocumentSchema: RxJsonSchema<types.AdminApplicationDocumentType> = createEntitySchema<types.AdminApplicationDocumentType>(
    'application_documents',
    {
        id: { type: 'string', maxLength: 100 },
        application_id: { type: 'string', ref: 'admissions_applications' },
        document_type: { type: 'string', enum: Object.values(types.DocumentType) },
        original_filename: { type: 'string', maxLength: 255 },
        stored_filename: { type: 'string', maxLength: 255 },
        file_path: { type: 'string' },
        file_size: { type: 'number' },
        mime_type: { type: 'string', maxLength: 100 },
        
        // Verification
        verified: { type: 'boolean' },
        verification_date: { type: ['string', 'null'], format: 'date-time' },
        verified_by: { type: ['string', 'null'] },
        verification_notes: { type: ['string', 'null'] },
        
        uploaded_at: { type: 'string', format: 'date-time' },
        uploaded_by: { type: ['string', 'null'] },
        
        // Denormalized
        application_number: { type: ['string', 'null'] },
        applicant_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'application_id', 'document_type', 'original_filename', 'stored_filename', 'file_path', 'file_size', 'mime_type', 'verified', 'uploaded_at'],
    ['application_id', 'document_type', 'verified']
);

export const applicationInterviewSchema: RxJsonSchema<types.AdminApplicationInterviewType> = createEntitySchema<types.AdminApplicationInterviewType>(
    'application_interviews',
    {
        id: { type: 'string', maxLength: 100 },
        application_id: { type: 'string', ref: 'admissions_applications' },
        interviewer_id: { type: 'string', ref: 'users' },
        
        // Scheduling
        scheduled_date: { type: 'string', format: 'date' },
        scheduled_time: { type: 'string' },
        duration_minutes: { type: 'number', default: 30 },
        location: { type: ['string', 'null'], maxLength: 200 },
        interview_type: { type: 'string', enum: Object.values(types.InterviewType) },
        
        // Results
        conducted: { type: 'boolean', default: false },
        attendance: { type: 'string', enum: Object.values(types.AttendanceType) },
        
        // Scoring
        communication_score: { type: ['number', 'null'], minimum: 1, maximum: 10 },
        confidence_score: { type: ['number', 'null'], minimum: 1, maximum: 10 },
        academic_readiness_score: { type: ['number', 'null'], minimum: 1, maximum: 10 },
        overall_impression: { type: ['string', 'null'] },
        
        // Recommendations
        interviewer_recommendation: { type: ['string', 'null'], enum: [...Object.values(types.ApprovalDecision), null] as any[] },
        conditions: { type: ['string', 'null'] },
        
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        
        // Denormalized
        interviewer_name: { type: ['string', 'null'] },
        application_number: { type: ['string', 'null'] },
        applicant_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'application_id', 'interviewer_id', 'scheduled_date', 'scheduled_time', 'duration_minutes', 'interview_type', 'conducted', 'attendance', 'created_at', 'updated_at'],
    ['application_id', 'interviewer_id', 'scheduled_date', 'conducted']
);

export const applicationApprovalSchema: RxJsonSchema<types.AdminApplicationApprovalType> = createEntitySchema<types.AdminApplicationApprovalType>(
    'application_approvals',
    {
        id: { type: 'string', maxLength: 100 },
        application_id: { type: 'string', ref: 'admissions_applications' },
        review_id: { type: ['string', 'null'], ref: 'application_reviews' },
        approved_by: { type: 'string', ref: 'users' },
        approval_date: { type: 'string', format: 'date-time' },
        final_decision: { type: 'string', enum: Object.values(types.ApprovalDecision) },
        
        // Assignment Details
        assigned_class: { type: ['string', 'null'] },
        assigned_stream: { type: ['string', 'null'] },
        start_date: { type: ['string', 'null'], format: 'date' },
        admission_number: { type: ['string', 'null'] },
        
        // Conditions and Comments
        conditions: { type: ['string', 'null'] },
        final_comments: { type: ['string', 'null'] },
        
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        
        // Denormalized
        approver_name: { type: ['string', 'null'] },
        application_number: { type: ['string', 'null'] },
        applicant_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'application_id', 'approved_by', 'approval_date', 'final_decision', 'created_at', 'updated_at'],
    ['application_id', 'final_decision', 'approval_date']
);

export const smsCampaignSchema: RxJsonSchema<types.AdminSMSCampaignType> = createEntitySchema<types.AdminSMSCampaignType>(
    'sms_campaigns',
    {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string', maxLength: 200 },
        message: { type: 'string' },
        target_group: { type: 'string', enum: ['students', 'parents', 'staff', 'applicants'] },
        target_filter: { type: ['object', 'null'] },
        
        // Scheduling
        scheduled_date: { type: ['string', 'null'], format: 'date-time' },
        sent_date: { type: ['string', 'null'], format: 'date-time' },
        
        // Status
        status: { type: 'string', enum: ['Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'] },
        total_recipients: { type: ['number', 'null'] },
        successful_sends: { type: ['number', 'null'] },
        failed_sends: { type: ['number', 'null'] },
        
        // System
        created_by: { type: 'string', ref: 'users' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        
        // Denormalized
        created_by_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'name', 'target_group', 'status', 'created_by', 'created_at', 'updated_at'],
    ['name', 'target_group', 'status']
);

export const bulkImportSchema: RxJsonSchema<types.AdminBulkImportType> = createEntitySchema<types.AdminBulkImportType>(
    'bulk_imports',
    {
        id: { type: 'string', maxLength: 100 },
        import_type: { type: 'string', enum: ['students', 'applications', 'kcpe_marks'] },
        filename: { type: 'string', maxLength: 255 },
        file_path: { type: 'string' },
        
        // Status
        status: { type: 'string', enum: ['Pending', 'Processing', 'Completed', 'Failed'] },
        total_records: { type: 'number' },
        processed_records: { type: 'number' },
        successful_records: { type: 'number' },
        failed_records: { type: 'number' },
        
        // Results
        error_log: { type: ['string', 'null'] },
        validation_errors: { type: ['string', 'null'] },
        
        // System
        started_by: { type: 'string', ref: 'users' },
        started_at: { type: 'string', format: 'date-time' },
        completed_at: { type: ['string', 'null'], format: 'date-time' },
        
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        
        // Denormalized
        started_by_name: { type: ['string', 'null'] },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
    ['id', 'import_type', 'filename', 'status', 'total_records', 'processed_records', 'successful_records', 'failed_records', 'started_by', 'started_at', 'created_at', 'updated_at'],
    ['import_type', 'status', 'filename']
);
