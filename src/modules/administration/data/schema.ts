// ABOUTME: Defines database-agnostic schemas for entities specific to the Administration module.
// ABOUTME: These schemas are used by both RxDB and PouchDB services to create collections.

import * as types from './types';
import { 
  createDatabaseSchema, 
  SchemaHelpers,
  type DatabaseSchema, 
  type DatabaseProperty, 
} from '../../../utils/databaseAgnosticSchema';

export const partnerSchema: DatabaseSchema = createDatabaseSchema({
    title: 'partner',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the partner' }),
        name: SchemaHelpers.string({ description: 'Partner name', maxLength: 200 }),
        partner_type: SchemaHelpers.string({ description: 'Type of partner', enum: Object.values(types.PartnerType), maxLength: 50 }),
        contact_person: SchemaHelpers.string({ description: 'Contact person name', maxLength: 200 }),
        email: SchemaHelpers.string({ description: 'Partner email address', maxLength: 100 }),
        phone: SchemaHelpers.string({ description: 'Partner phone number', maxLength: 20 }),
        address: SchemaHelpers.string({ description: 'Partner address', maxLength: 500 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'name', 'partner_type', 'created_at', 'updated_at'],
    indexes: ['name', 'partner_type']
});

export const clubAndSocietySchema: DatabaseSchema = createDatabaseSchema({
    title: 'club', // collection name remains 'club'
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the club' }),
        name: SchemaHelpers.string({ description: 'Club name', maxLength: 150 }),
        type: SchemaHelpers.string({ description: 'Type of club', enum: Object.values(types.ClubType), maxLength: 50 }),
        patron_id: SchemaHelpers.ref('staff', { description: 'Reference to staff patron' }),
        description: SchemaHelpers.string({ description: 'Club description', maxLength: 500 }),
        patron_name: SchemaHelpers.string({ description: 'Patron name (denormalized)', maxLength: 200 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'name', 'type', 'created_at', 'updated_at'],
    indexes: ['name', 'type', 'patron_id']
});

export const customerSchema: DatabaseSchema = createDatabaseSchema({
    title: 'customer',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the customer' }),
        name: SchemaHelpers.string({ description: 'Customer name', maxLength: 200 }),
        phone: SchemaHelpers.string({ description: 'Customer phone number', maxLength: 20 }),
        email: SchemaHelpers.string({ description: 'Customer email address', maxLength: 100 }),
        address: SchemaHelpers.string({ description: 'Customer address', maxLength: 500 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'name', 'created_at', 'updated_at'],
    indexes: ['name']
});

export const studentHealthRecordSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_health_record',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the health record' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        blood_type: SchemaHelpers.string({ description: 'Student blood type', maxLength: 10 }),
        allergies: SchemaHelpers.string({ description: 'Known allergies', maxLength: 500 }),
        medical_conditions: SchemaHelpers.string({ description: 'Medical conditions', maxLength: 500 }),
        emergency_contact_override: SchemaHelpers.string({ description: 'Emergency contact override', maxLength: 200 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
    },
    required: ['id', 'student_id', 'created_at', 'updated_at'],
    indexes: ['student_id']
});

export const studentAttendanceSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_attendance',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the attendance record' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        period_id: SchemaHelpers.ref('timetable_period_definitions', { description: 'Reference to timetable period' }),
        date: SchemaHelpers.string({ description: 'Attendance date', maxLength: 20 }),
        status: SchemaHelpers.string({ description: 'Attendance status', enum: Object.values(types.AttendanceStatus), maxLength: 50 }),
        reason_for_absence: SchemaHelpers.string({ description: 'Reason for absence', maxLength: 200 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        period_name: SchemaHelpers.string({ description: 'Period name (denormalized)', maxLength: 100 }),
    },
    required: ['id', 'student_id', 'date', 'period_id', 'status'],
    indexes: ['student_id', 'date', 'period_id']
});

export const templateCommSchema: DatabaseSchema = createDatabaseSchema({
    title: 'communication_template', // Collection name
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the template' }),
        name: SchemaHelpers.string({ description: 'Template name', maxLength: 150 }),
        type: SchemaHelpers.string({ description: 'Template type', enum: Object.values(types.TemplateType), maxLength: 50 }),
        subject: SchemaHelpers.string({ description: 'Template subject', maxLength: 200 }),
        body_template: SchemaHelpers.string({ description: 'Template body content', maxLength: 2000 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'name', 'type', 'body_template', 'created_at', 'updated_at'],
    indexes: ['name', 'type']
});

export const campaignSchema: DatabaseSchema = createDatabaseSchema({
    title: 'message_campaign',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the campaign' }),
        name: SchemaHelpers.string({ description: 'Campaign name', maxLength: 200 }),
        template_id: SchemaHelpers.ref('communication_templates', { description: 'Reference to communication template' }),
        subject: SchemaHelpers.string({ description: 'Campaign subject', maxLength: 200 }),
        body: SchemaHelpers.string({ description: 'Campaign body content', maxLength: 2000 }),
        status: SchemaHelpers.string({ description: 'Campaign status', enum: Object.values(types.CampaignStatus), maxLength: 50 }),
        target_audience_type: SchemaHelpers.string({ description: 'Target audience type', enum: Object.values(types.CampaignAudienceType), maxLength: 50 }),
        target_id: SchemaHelpers.string({ description: 'Target ID for specific audience', maxLength: 100 }),
        scheduled_for: SchemaHelpers.timestamp({ description: 'Scheduled send time' }),
        sent_at: SchemaHelpers.timestamp({ description: 'Actual send time' }),
        created_by: SchemaHelpers.ref('users', { description: 'Reference to user who created campaign' }),
        approved_by: SchemaHelpers.ref('users', { description: 'Reference to user who approved campaign' }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        template_name: SchemaHelpers.string({ description: 'Template name (denormalized)', maxLength: 150 }),
        created_by_name: SchemaHelpers.string({ description: 'Creator name (denormalized)', maxLength: 200 }),
        approved_by_name: SchemaHelpers.string({ description: 'Approver name (denormalized)', maxLength: 200 }),
        target_audience_display: SchemaHelpers.string({ description: 'Target audience display name', maxLength: 100 }),
    },
    required: ['id', 'name', 'status', 'created_by', 'created_at', 'updated_at'],
    indexes: ['name', 'status', 'target_audience_type']
});

// === ADMISSIONS SYSTEM SCHEMAS ===

export const applicationSchema: DatabaseSchema = createDatabaseSchema({
    title: 'admissions_applications',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the application' }),
        application_number: SchemaHelpers.string({ description: 'Application number', maxLength: 20 }),
        academic_year_id: SchemaHelpers.ref('academic_years', { description: 'Reference to academic year' }),
        intended_class_id: SchemaHelpers.ref('classes', { description: 'Reference to intended class' }),
        application_type: SchemaHelpers.string({ description: 'Application type', enum: Object.values(types.ApplicationType), maxLength: 50 }),
        
        // Applicant Information
        first_name: SchemaHelpers.string({ description: 'Applicant first name', maxLength: 100 }),
        middle_name: SchemaHelpers.string({ description: 'Applicant middle name', maxLength: 100 }),
        last_name: SchemaHelpers.string({ description: 'Applicant last name', maxLength: 100 }),
        date_of_birth: SchemaHelpers.string({ description: 'Date of birth', maxLength: 20 }),
        gender: SchemaHelpers.string({ description: 'Gender', enum: ['Male', 'Female', 'Other'], maxLength: 20 }),
        nationality: SchemaHelpers.string({ description: 'Nationality', maxLength: 50 }),
        religion: SchemaHelpers.string({ description: 'Religion', maxLength: 50 }),
        birth_certificate_number: SchemaHelpers.string({ description: 'Birth certificate number', maxLength: 50 }),
        
        // Academic Background
        previous_school: SchemaHelpers.string({ description: 'Previous school', maxLength: 200 }),
        previous_class: SchemaHelpers.string({ description: 'Previous class', maxLength: 50 }),
        kcpe_index_number: SchemaHelpers.string({ description: 'KCPE index number', maxLength: 20 }),
        kcpe_marks: SchemaHelpers.object({ description: 'KCPE marks' }),
        kcpe_grade: SchemaHelpers.string({ description: 'KCPE grade', maxLength: 5 }),
        
        // Guardian Information
        guardian_type: SchemaHelpers.string({ description: 'Guardian type', enum: ['Father', 'Mother', 'Guardian', 'Other'] }),
        guardian_first_name: SchemaHelpers.string({ description: 'Guardian first name', maxLength: 100 }),
        guardian_last_name: SchemaHelpers.string({ description: 'Guardian last name', maxLength: 100 }),
        guardian_phone: SchemaHelpers.string({ description: 'Guardian phone', maxLength: 20 }),
        guardian_email: SchemaHelpers.string({ description: 'Guardian email', maxLength: 255 }),
        guardian_occupation: SchemaHelpers.string({ description: 'Guardian occupation', maxLength: 100 }),
        guardian_employer: SchemaHelpers.string({ description: 'Guardian employer', maxLength: 200 }),
        
        // Address Information
        residential_address: SchemaHelpers.string({ description: 'Residential address', maxLength: 500 }),
        postal_address: SchemaHelpers.string({ description: 'Postal address', maxLength: 200 }),
        county: SchemaHelpers.string({ description: 'County', maxLength: 50 }),
        sub_county: SchemaHelpers.string({ description: 'Sub county', maxLength: 50 }),
        location: SchemaHelpers.string({ description: 'Location', maxLength: 100 }),
        sub_location: SchemaHelpers.string({ description: 'Sub location', maxLength: 100 }),
        
        // Application Status
        status: SchemaHelpers.string({ description: 'Application status', enum: Object.values(types.ApplicationStatus), maxLength: 50 }),
        submission_date: SchemaHelpers.timestamp({ description: 'Submission date' }),
        review_deadline: SchemaHelpers.string({ description: 'Review deadline', maxLength: 20 }),
        
        // System Fields
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        created_by: SchemaHelpers.ref('users', { description: 'Created by user' }),
        updated_by: SchemaHelpers.ref('users', { description: 'Updated by user' }),
        
        // Denormalized fields
        intended_class_name: SchemaHelpers.string({ description: 'Intended class name (denormalized)', maxLength: 100 }),
        academic_year_name: SchemaHelpers.string({ description: 'Academic year name (denormalized)', maxLength: 100 }),
    },
    required: ['id', 'application_number', 'application_type', 'first_name', 'last_name', 'date_of_birth', 'gender', 'status', 'created_at', 'updated_at'],
    indexes: ['application_number', 'status', 'first_name', 'last_name', 'kcpe_index_number']
});

export const preNAsMarksSchema: DatabaseSchema = createDatabaseSchema({
    title: 'pre_nas_marks',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the marks record' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        application_id: SchemaHelpers.ref('admissions_applications', { description: 'Reference to application' }),
        index_number: SchemaHelpers.string({ description: 'Index number', maxLength: 20 }),
        year: SchemaHelpers.number({ description: 'Assessment year', minimum: 1900, maximum: 2100 }),
        assessment_type: SchemaHelpers.string({ description: 'Assessment type', enum: ['KCPE', 'CBC', 'Other'], maxLength: 20 }),
        
        // Core Subject Marks
        english: SchemaHelpers.number({ description: 'English marks', minimum: 0, maximum: 100 }),
        kiswahili: SchemaHelpers.number({ description: 'Kiswahili marks', minimum: 0, maximum: 100 }),
        mathematics: SchemaHelpers.number({ description: 'Mathematics marks', minimum: 0, maximum: 100 }),
        science: SchemaHelpers.number({ description: 'Science marks', minimum: 0, maximum: 100 }),
        social_studies: SchemaHelpers.number({ description: 'Social studies marks', minimum: 0, maximum: 100 }),
        
        // Additional CBC subjects (optional)
        integrated_science: SchemaHelpers.number({ description: 'Integrated science marks', minimum: 0, maximum: 100 }),
        pre_technical_studies: SchemaHelpers.number({ description: 'Pre-technical studies marks', minimum: 0, maximum: 100 }),
        creative_arts: SchemaHelpers.number({ description: 'Creative arts marks', minimum: 0, maximum: 100 }),
        
        // Calculated Fields
        total_marks: SchemaHelpers.number({ description: 'Total marks', minimum: 0, maximum: 999999.99 }),
        mean_grade: SchemaHelpers.number({ description: 'Mean grade', minimum: 0, maximum: 100 }),
        overall_grade: SchemaHelpers.string({ description: 'Overall grade', maxLength: 5 }),
        
        // Meta
        imported_date: SchemaHelpers.timestamp({ description: 'Import date' }),
        verified: SchemaHelpers.boolean({ description: 'Verification status' }),
        verification_date: SchemaHelpers.timestamp({ description: 'Verification date' }),
        verified_by: SchemaHelpers.string({ description: 'Verified by user', maxLength: 100 }),
        
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'index_number', 'year', 'english', 'kiswahili', 'mathematics', 'science', 'social_studies', 'total_marks', 'mean_grade', 'overall_grade', 'verified', 'created_at', 'updated_at'],
    indexes: ['index_number', 'year', 'overall_grade']
});

export const applicationReviewSchema: DatabaseSchema = createDatabaseSchema({
    title: 'application_reviews',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the review' }),
        application_id: SchemaHelpers.ref('admissions_applications', { description: 'Reference to application' }),
        reviewer_id: SchemaHelpers.ref('users', { description: 'Reference to reviewer' }),
        review_stage: SchemaHelpers.string({ description: 'Review stage', enum: Object.values(types.ReviewStage), maxLength: 50 }),
        
        // Review Criteria
        academic_score: SchemaHelpers.number({ description: 'Academic score', minimum: 0, maximum: 100 }),
        interview_score: SchemaHelpers.number({ description: 'Interview score', minimum: 0, maximum: 100 }),
        behavioral_assessment: SchemaHelpers.string({ description: 'Behavioral assessment', maxLength: 1000 }),
        recommendation: SchemaHelpers.string({ description: 'Review recommendation', enum: Object.values(types.ReviewDecision), maxLength: 50 }),
        
        // Comments
        academic_comments: SchemaHelpers.string({ description: 'Academic comments', maxLength: 1000 }),
        general_comments: SchemaHelpers.string({ description: 'General comments', maxLength: 1000 }),
        internal_notes: SchemaHelpers.string({ description: 'Internal notes', maxLength: 1000 }),
        
        // Status
        review_status: SchemaHelpers.string({ description: 'Review status', enum: ['Pending', 'In Progress', 'Completed'], maxLength: 50 }),
        review_date: SchemaHelpers.timestamp({ description: 'Review date' }),
        
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        
        // Denormalized
        reviewer_name: SchemaHelpers.string({ description: 'Reviewer name (denormalized)', maxLength: 200 }),
        application_number: SchemaHelpers.string({ description: 'Application number (denormalized)', maxLength: 20 }),
        applicant_name: SchemaHelpers.string({ description: 'Applicant name (denormalized)', maxLength: 200 }),
    },
    required: ['id', 'application_id', 'reviewer_id', 'review_stage', 'recommendation', 'review_status', 'created_at', 'updated_at'],
    indexes: ['application_id', 'reviewer_id', 'review_stage', 'review_status']
});

export const applicationDocumentSchema: DatabaseSchema = createDatabaseSchema({
    title: 'application_documents',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the document' }),
        application_id: SchemaHelpers.ref('admissions_applications', { description: 'Reference to application' }),
        document_type: SchemaHelpers.string({ description: 'Document type', enum: Object.values(types.DocumentType), maxLength: 50 }),
        original_filename: SchemaHelpers.string({ description: 'Original filename', maxLength: 255 }),
        stored_filename: SchemaHelpers.string({ description: 'Stored filename', maxLength: 255 }),
        file_path: SchemaHelpers.string({ description: 'File path', maxLength: 500 }),
        file_size: SchemaHelpers.number({ description: 'File size in bytes', minimum: 0, maximum: 999999999 }),
        mime_type: SchemaHelpers.string({ description: 'MIME type', maxLength: 100 }),
        
        // Verification
        verified: SchemaHelpers.boolean({ description: 'Verification status' }),
        verification_date: SchemaHelpers.timestamp({ description: 'Verification date' }),
        verified_by: SchemaHelpers.string({ description: 'Verified by user', maxLength: 100 }),
        verification_notes: SchemaHelpers.string({ description: 'Verification notes', maxLength: 500 }),
        
        uploaded_at: SchemaHelpers.timestamp({ description: 'Upload timestamp' }),
        uploaded_by: SchemaHelpers.string({ description: 'Uploaded by user', maxLength: 100 }),
        
        // Denormalized
        application_number: SchemaHelpers.string({ description: 'Application number (denormalized)', maxLength: 20 }),
        applicant_name: SchemaHelpers.string({ description: 'Applicant name (denormalized)', maxLength: 200 }),
    },
    required: ['id', 'application_id', 'document_type', 'original_filename', 'stored_filename', 'file_path', 'file_size', 'mime_type', 'verified', 'uploaded_at'],
    indexes: ['application_id', 'document_type', 'verified']
});

export const applicationInterviewSchema: DatabaseSchema = createDatabaseSchema({
    title: 'application_interviews',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the interview' }),
        application_id: SchemaHelpers.ref('admissions_applications', { description: 'Reference to application' }),
        interviewer_id: SchemaHelpers.ref('users', { description: 'Reference to interviewer' }),
        
        // Scheduling
        scheduled_date: SchemaHelpers.string({ description: 'Scheduled date', maxLength: 20 }),
        scheduled_time: SchemaHelpers.string({ description: 'Scheduled time', maxLength: 20 }),
        duration_minutes: SchemaHelpers.number({ description: 'Duration in minutes', minimum: 0, maximum: 999999 }),
        location: SchemaHelpers.string({ description: 'Interview location', maxLength: 200 }),
        interview_type: SchemaHelpers.string({ description: 'Interview type', enum: Object.values(types.InterviewType), maxLength: 50 }),
        
        // Results
        conducted: SchemaHelpers.boolean({ description: 'Whether interview was conducted' }),
        attendance: SchemaHelpers.string({ description: 'Attendance status', enum: Object.values(types.AttendanceType), maxLength: 50 }),
        
        // Scoring
        communication_score: SchemaHelpers.number({ description: 'Communication score', minimum: 1, maximum: 10 }),
        confidence_score: SchemaHelpers.number({ description: 'Confidence score', minimum: 1, maximum: 10 }),
        academic_readiness_score: SchemaHelpers.number({ description: 'Academic readiness score', minimum: 1, maximum: 10 }),
        overall_impression: SchemaHelpers.string({ description: 'Overall impression', maxLength: 1000 }),
        
        // Recommendations
        interviewer_recommendation: SchemaHelpers.string({ description: 'Interviewer recommendation', enum: Object.values(types.ApprovalDecision), maxLength: 50 }),
        conditions: SchemaHelpers.string({ description: 'Conditions', maxLength: 500 }),
        
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        
        // Denormalized
        interviewer_name: SchemaHelpers.string({ description: 'Interviewer name (denormalized)', maxLength: 200 }),
        application_number: SchemaHelpers.string({ description: 'Application number (denormalized)', maxLength: 20 }),
        applicant_name: SchemaHelpers.string({ description: 'Applicant name (denormalized)', maxLength: 200 }),
    },
    required: ['id', 'application_id', 'interviewer_id', 'scheduled_date', 'scheduled_time', 'duration_minutes', 'interview_type', 'conducted', 'attendance', 'created_at', 'updated_at'],
    indexes: ['application_id', 'interviewer_id', 'scheduled_date', 'conducted']
});

export const applicationApprovalSchema: DatabaseSchema = createDatabaseSchema({
    title: 'application_approvals',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the approval' }),
        application_id: SchemaHelpers.ref('admissions_applications', { description: 'Reference to application' }),
        review_id: SchemaHelpers.ref('application_reviews', { description: 'Reference to application review' }),
        approved_by: SchemaHelpers.ref('users', { description: 'Reference to approver' }),
        approval_date: SchemaHelpers.timestamp({ description: 'Approval date' }),
        final_decision: SchemaHelpers.string({ description: 'Final decision', enum: Object.values(types.ApprovalDecision), maxLength: 50 }),
        
        // Assignment Details
        assigned_class: SchemaHelpers.string({ description: 'Assigned class', maxLength: 100 }),
        assigned_stream: SchemaHelpers.string({ description: 'Assigned stream', maxLength: 100 }),
        start_date: SchemaHelpers.string({ description: 'Start date', maxLength: 20 }),
        admission_number: SchemaHelpers.string({ description: 'Admission number', maxLength: 20 }),
        
        // Conditions and Comments
        conditions: SchemaHelpers.string({ description: 'Approval conditions', maxLength: 500 }),
        final_comments: SchemaHelpers.string({ description: 'Final comments', maxLength: 1000 }),
        
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        
        // Denormalized
        approver_name: SchemaHelpers.string({ description: 'Approver name (denormalized)', maxLength: 200 }),
        application_number: SchemaHelpers.string({ description: 'Application number (denormalized)', maxLength: 20 }),
        applicant_name: SchemaHelpers.string({ description: 'Applicant name (denormalized)', maxLength: 200 }),
    },
    required: ['id', 'application_id', 'approved_by', 'approval_date', 'final_decision', 'created_at', 'updated_at'],
    indexes: ['application_id', 'final_decision', 'approval_date']
});

export const smsCampaignSchema: DatabaseSchema = createDatabaseSchema({
    title: 'sms_campaigns',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the SMS campaign' }),
        name: SchemaHelpers.string({ description: 'Campaign name', maxLength: 200 }),
        message: SchemaHelpers.string({ description: 'SMS message content', maxLength: 1000 }),
        target_group: SchemaHelpers.string({ description: 'Target group', enum: ['students', 'parents', 'staff', 'applicants'], maxLength: 50 }),
        target_filter: SchemaHelpers.object({ description: 'Target filter criteria' }),
        
        // Scheduling
        scheduled_date: SchemaHelpers.timestamp({ description: 'Scheduled send date' }),
        sent_date: SchemaHelpers.timestamp({ description: 'Actual send date' }),
        
        // Status
        status: SchemaHelpers.string({ description: 'Campaign status', enum: ['Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'], maxLength: 50 }),
        total_recipients: SchemaHelpers.number({ description: 'Total number of recipients', minimum: 0, maximum: 999999999 }),
        successful_sends: SchemaHelpers.number({ description: 'Number of successful sends', minimum: 0, maximum: 999999999 }),
        failed_sends: SchemaHelpers.number({ description: 'Number of failed sends', minimum: 0, maximum: 999999999 }),
        
        // System
        created_by: SchemaHelpers.ref('users', { description: 'Reference to user who created campaign' }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        
        // Denormalized
        created_by_name: SchemaHelpers.string({ description: 'Creator name (denormalized)', maxLength: 200 }),
    },
    required: ['id', 'name', 'target_group', 'status', 'created_by', 'created_at', 'updated_at'],
    indexes: ['name', 'target_group', 'status']
});

export const bulkImportSchema: DatabaseSchema = createDatabaseSchema({
    title: 'bulk_imports',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the bulk import' }),
        import_type: SchemaHelpers.string({ description: 'Import type', enum: ['students', 'applications', 'kcpe_marks'], maxLength: 50 }),
        filename: SchemaHelpers.string({ description: 'Import filename', maxLength: 255 }),
        file_path: SchemaHelpers.string({ description: 'Import file path', maxLength: 500 }),
        
        // Status
        status: SchemaHelpers.string({ description: 'Import status', enum: ['Pending', 'Processing', 'Completed', 'Failed'], maxLength: 50 }),
        total_records: SchemaHelpers.number({ description: 'Total number of records', minimum: 0, maximum: 999999999 }),
        processed_records: SchemaHelpers.number({ description: 'Number of processed records', minimum: 0, maximum: 999999999 }),
        successful_records: SchemaHelpers.number({ description: 'Number of successful records', minimum: 0, maximum: 999999999 }),
        failed_records: SchemaHelpers.number({ description: 'Number of failed records', minimum: 0, maximum: 999999999 }),
        
        // Results
        error_log: SchemaHelpers.string({ description: 'Error log', maxLength: 2000 }),
        validation_errors: SchemaHelpers.string({ description: 'Validation errors', maxLength: 2000 }),
        
        // System
        started_by: SchemaHelpers.ref('users', { description: 'Reference to user who started import' }),
        started_at: SchemaHelpers.timestamp({ description: 'Import start timestamp' }),
        completed_at: SchemaHelpers.timestamp({ description: 'Import completion timestamp' }),
        
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        
        // Denormalized
        started_by_name: SchemaHelpers.string({ description: 'Starter name (denormalized)', maxLength: 200 }),
    },
    required: ['id', 'import_type', 'filename', 'status', 'total_records', 'processed_records', 'successful_records', 'failed_records', 'started_by', 'started_at', 'created_at', 'updated_at'],
    indexes: ['import_type', 'status', 'filename']
});
