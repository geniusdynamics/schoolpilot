// ABOUTME: Defines database-agnostic schemas for entities specific to the Administration module.
// ABOUTME: These schemas are used by both RxDB and PouchDB services to create collections.

import * as types from './types';
import { createDatabaseSchema, SchemaHelpers, type DatabaseSchema } from '../../../utils/databaseAgnosticSchema';

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
        notes: SchemaHelpers.string({ description: 'Additional notes for manually marked attendance', nullable: true, maxLength: 500 }),
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

// Property names for the three schemas below intentionally mirror the admissions
// module types that write to them (ApplicationNote, EnrollmentDetails, FormTemplate),
// which are camelCase - documents are persisted exactly as written.
export const applicationNoteSchema: DatabaseSchema = createDatabaseSchema({
    title: 'application_notes',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the note' }),
        applicationId: SchemaHelpers.ref('admissions_applications', { description: 'Reference to application' }),
        authorId: SchemaHelpers.string({ description: 'Note author user id', maxLength: 100 }),
        authorName: SchemaHelpers.string({ description: 'Note author display name (denormalized)', maxLength: 200 }),
        content: SchemaHelpers.string({ description: 'Note content', maxLength: 2000 }),
        isInternal: SchemaHelpers.boolean({ description: 'Whether the note is internal-only' }),
        createdAt: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
    },
    required: ['id', 'applicationId', 'authorId', 'content', 'isInternal', 'createdAt'],
    indexes: ['applicationId', 'authorId']
});

export const admissionEnrollmentSchema: DatabaseSchema = createDatabaseSchema({
    title: 'admission_enrollments',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the enrollment' }),
        applicationId: SchemaHelpers.ref('admissions_applications', { description: 'Reference to application' }),
        studentId: SchemaHelpers.ref('students', { description: 'Reference to the created student' }),
        admissionNumber: SchemaHelpers.string({ description: 'Admission number assigned', maxLength: 20 }),
        enrolledAt: SchemaHelpers.timestamp({ description: 'Enrollment timestamp' }),
        enrolledBy: SchemaHelpers.string({ description: 'User who performed the enrollment', maxLength: 100 }),
        classId: SchemaHelpers.string({ description: 'Assigned class id', maxLength: 100 }),
        className: SchemaHelpers.string({ description: 'Assigned class name (denormalized)', maxLength: 200 }),
        streamId: SchemaHelpers.string({ description: 'Assigned stream id', maxLength: 100 }),
        streamName: SchemaHelpers.string({ description: 'Assigned stream name (denormalized)', maxLength: 200 }),
        dormitoryId: SchemaHelpers.string({ description: 'Assigned dormitory id', maxLength: 100 }),
        dormitoryName: SchemaHelpers.string({ description: 'Assigned dormitory name (denormalized)', maxLength: 200 }),
        feeStructureId: SchemaHelpers.string({ description: 'Applied fee structure id', maxLength: 100 }),
        documentsReceived: SchemaHelpers.array(SchemaHelpers.string({ maxLength: 255 }), {
            description: 'Document ids received at enrollment'
        }),
        isActive: SchemaHelpers.boolean({ description: 'Whether the enrollment is active' }),
        createdAt: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updatedAt: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'applicationId', 'studentId', 'admissionNumber', 'enrolledAt', 'enrolledBy', 'classId', 'documentsReceived', 'isActive', 'createdAt', 'updatedAt'],
    indexes: ['applicationId', 'studentId', 'admissionNumber']
});

export const applicationFormTemplateSchema: DatabaseSchema = createDatabaseSchema({
    title: 'application_form_templates',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the form template' }),
        name: SchemaHelpers.string({ description: 'Form template name', maxLength: 200 }),
        description: SchemaHelpers.string({ description: 'Form template description', maxLength: 500 }),
        sections: SchemaHelpers.integer({ description: 'Number of sections in the form', minimum: 0, maximum: 999 }),
        fields: SchemaHelpers.integer({ description: 'Number of fields in the form', minimum: 0, maximum: 9999 }),
        isActive: SchemaHelpers.boolean({ description: 'Whether the template is active' }),
        lastModified: SchemaHelpers.string({ description: 'Last modification date (ISO date)', maxLength: 20 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'name', 'description', 'sections', 'fields', 'isActive', 'lastModified'],
    indexes: ['name', 'isActive']
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

// === STUDENT DATA IMPORT SCHEMAS ===

export const studentImportSessionSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_import_sessions',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the import session' }),
        filename: SchemaHelpers.string({ description: 'Original filename', maxLength: 255 }),
        total_records: SchemaHelpers.integer({ description: 'Total number of records', minimum: 0, maximum: 999999 }),
        valid_records: SchemaHelpers.integer({ description: 'Number of valid records', minimum: 0, maximum: 999999 }),
        invalid_records: SchemaHelpers.integer({ description: 'Number of invalid records', minimum: 0, maximum: 999999 }),
        imported_records: SchemaHelpers.integer({ description: 'Number of imported records', minimum: 0, maximum: 999999 }),
        failed_records: SchemaHelpers.integer({ description: 'Number of failed records', minimum: 0, maximum: 999999 }),
        status: SchemaHelpers.string({ description: 'Import status', enum: Object.values(types.ImportStatus), maxLength: 50 }),
        started_by: SchemaHelpers.ref('users', { description: 'Reference to user who started import' }),
        started_at: SchemaHelpers.timestamp({ description: 'Import start timestamp' }),
        completed_at: SchemaHelpers.timestamp({ description: 'Import completion timestamp' }),
        error_log: SchemaHelpers.string({ description: 'Error log', maxLength: 2000 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
        started_by_name: SchemaHelpers.string({ description: 'Starter name (denormalized)', maxLength: 200 }),
    },
    required: ['id', 'filename', 'total_records', 'valid_records', 'invalid_records', 'imported_records', 'failed_records', 'status', 'started_by', 'started_at', 'created_at', 'updated_at'],
    indexes: ['status', 'filename', 'started_at']
});

export const studentImportRecordSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_import_records',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the import record' }),
        import_id: SchemaHelpers.ref('student_import_sessions', { description: 'Reference to import session' }),
        row_number: SchemaHelpers.integer({ description: 'Row number in original file', minimum: 1, maximum: 999999 }),
        admission_number: SchemaHelpers.string({ description: 'Student admission number', maxLength: 50 }),
        first_name: SchemaHelpers.string({ description: 'Student first name', maxLength: 100 }),
        middle_name: SchemaHelpers.string({ description: 'Student middle name', maxLength: 100 }),
        last_name: SchemaHelpers.string({ description: 'Student last name', maxLength: 100 }),
        date_of_birth: SchemaHelpers.string({ description: 'Date of birth', maxLength: 20 }),
        gender: SchemaHelpers.string({ description: 'Gender', enum: ['Male', 'Female', 'Other'], maxLength: 20 }),
        grade_level: SchemaHelpers.string({ description: 'Grade level', maxLength: 50 }),
        class_name: SchemaHelpers.string({ description: 'Class name', maxLength: 100 }),
        stream_name: SchemaHelpers.string({ description: 'Stream name', maxLength: 100 }),
        guardian_name: SchemaHelpers.string({ description: 'Guardian name', maxLength: 200 }),
        guardian_phone: SchemaHelpers.string({ description: 'Guardian phone', maxLength: 20 }),
        guardian_email: SchemaHelpers.string({ description: 'Guardian email', maxLength: 255 }),
        validation_status: SchemaHelpers.string({ description: 'Validation status', enum: Object.values(types.ImportValidationStatus), maxLength: 50 }),
        validation_errors: SchemaHelpers.string({ description: 'Validation errors (JSON)', maxLength: 2000 }),
        validation_warnings: SchemaHelpers.string({ description: 'Validation warnings (JSON)', maxLength: 2000 }),
        import_status: SchemaHelpers.string({ description: 'Import status', enum: ['Pending', 'Imported', 'Skipped', 'Failed'], maxLength: 50 }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to created student (if imported)' }),
        error_message: SchemaHelpers.string({ description: 'Error message (if failed)', maxLength: 500 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'import_id', 'row_number', 'admission_number', 'first_name', 'last_name', 'date_of_birth', 'gender', 'grade_level', 'guardian_name', 'guardian_phone', 'validation_status', 'import_status', 'created_at', 'updated_at'],
    indexes: ['import_id', 'row_number', 'admission_number', 'validation_status', 'import_status']
});

// === STUDENT CLEARANCE SCHEMAS ===

export const studentClearanceSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_clearances',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the clearance' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        admission_number: SchemaHelpers.string({ description: 'Admission number (denormalized)', maxLength: 50 }),
        clearance_type: SchemaHelpers.string({ description: 'Clearance type', enum: Object.values(types.ClearanceType), maxLength: 50 }),
        status: SchemaHelpers.string({ description: 'Clearance status', enum: Object.values(types.ClearanceStatus), maxLength: 50 }),
        remarks: SchemaHelpers.string({ description: 'Remarks', maxLength: 500 }),
        cleared_by: SchemaHelpers.ref('users', { description: 'Reference to user who cleared' }),
        cleared_by_name: SchemaHelpers.string({ description: 'Cleared by name (denormalized)', maxLength: 200 }),
        cleared_at: SchemaHelpers.timestamp({ description: 'Cleared timestamp' }),
        requested_at: SchemaHelpers.timestamp({ description: 'Requested timestamp' }),
        completed_at: SchemaHelpers.timestamp({ description: 'Completed timestamp' }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'student_id', 'clearance_type', 'status', 'requested_at', 'created_at', 'updated_at'],
    indexes: ['student_id', 'clearance_type', 'status', 'admission_number']
});

export const studentClearanceRequestSchema: DatabaseSchema = createDatabaseSchema({
    title: 'student_clearance_requests',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the clearance request' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        admission_number: SchemaHelpers.string({ description: 'Admission number (denormalized)', maxLength: 50 }),
        academic_year_id: SchemaHelpers.ref('academic_years', { description: 'Reference to academic year' }),
        academic_year_name: SchemaHelpers.string({ description: 'Academic year name (denormalized)', maxLength: 100 }),
        reason: SchemaHelpers.string({ description: 'Reason for clearance', maxLength: 500 }),
        status: SchemaHelpers.string({ description: 'Request status', enum: Object.values(types.ClearanceRequestStatus), maxLength: 50 }),
        total_departments: SchemaHelpers.integer({ description: 'Total departments to clear', minimum: 0, maximum: 100 }),
        cleared_departments: SchemaHelpers.integer({ description: 'Cleared departments count', minimum: 0, maximum: 100 }),
        pending_departments: SchemaHelpers.integer({ description: 'Pending departments count', minimum: 0, maximum: 100 }),
        rejected_departments: SchemaHelpers.integer({ description: 'Rejected departments count', minimum: 0, maximum: 100 }),
        requested_by: SchemaHelpers.ref('users', { description: 'Reference to user who requested' }),
        requested_by_name: SchemaHelpers.string({ description: 'Requested by name (denormalized)', maxLength: 200 }),
        requested_at: SchemaHelpers.timestamp({ description: 'Requested timestamp' }),
        completed_at: SchemaHelpers.timestamp({ description: 'Completed timestamp' }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'student_id', 'reason', 'status', 'total_departments', 'cleared_departments', 'pending_departments', 'rejected_departments', 'requested_by', 'requested_at', 'created_at', 'updated_at'],
    indexes: ['student_id', 'status', 'admission_number', 'requested_at']
});

// === DISCIPLINARY CASES SCHEMAS ===

export const disciplinaryCaseSchema: DatabaseSchema = createDatabaseSchema({
    title: 'disciplinary_cases',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the disciplinary case' }),
        case_number: SchemaHelpers.string({ description: 'Case number', maxLength: 50 }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        admission_number: SchemaHelpers.string({ description: 'Admission number (denormalized)', maxLength: 50 }),
        class_name: SchemaHelpers.string({ description: 'Class name (denormalized)', maxLength: 100 }),
        category: SchemaHelpers.string({ description: 'Category', enum: Object.values(types.DisciplinaryCategory), maxLength: 50 }),
        severity: SchemaHelpers.string({ description: 'Severity', enum: Object.values(types.DisciplinarySeverity), maxLength: 50 }),
        status: SchemaHelpers.string({ description: 'Status', enum: Object.values(types.DisciplinaryStatus), maxLength: 50 }),
        title: SchemaHelpers.string({ description: 'Case title', maxLength: 200 }),
        description: SchemaHelpers.string({ description: 'Case description', maxLength: 2000 }),
        incident_date: SchemaHelpers.string({ description: 'Incident date', maxLength: 20 }),
        incident_time: SchemaHelpers.string({ description: 'Incident time', maxLength: 20 }),
        incident_location: SchemaHelpers.string({ description: 'Incident location', maxLength: 200 }),
        reported_by: SchemaHelpers.ref('users', { description: 'Reference to user who reported' }),
        reported_by_name: SchemaHelpers.string({ description: 'Reporter name (denormalized)', maxLength: 200 }),
        assigned_to: SchemaHelpers.ref('users', { description: 'Reference to assigned user' }),
        assigned_to_name: SchemaHelpers.string({ description: 'Assignee name (denormalized)', maxLength: 200 }),
        witnesses: SchemaHelpers.string({ description: 'Witnesses', maxLength: 1000 }),
        action_taken: SchemaHelpers.string({ description: 'Action taken', enum: Object.values(types.DisciplinaryAction), maxLength: 50 }),
        action_details: SchemaHelpers.string({ description: 'Action details', maxLength: 1000 }),
        action_date: SchemaHelpers.timestamp({ description: 'Action date' }),
        follow_up_required: SchemaHelpers.boolean({ description: 'Follow up required', default: false }),
        follow_up_date: SchemaHelpers.string({ description: 'Follow up date', maxLength: 20 }),
        follow_up_notes: SchemaHelpers.string({ description: 'Follow up notes', maxLength: 1000 }),
        parent_notified: SchemaHelpers.boolean({ description: 'Parent notified', default: false }),
        parent_notification_date: SchemaHelpers.timestamp({ description: 'Parent notification date' }),
        parent_response: SchemaHelpers.string({ description: 'Parent response', maxLength: 1000 }),
        resolved_at: SchemaHelpers.timestamp({ description: 'Resolved timestamp' }),
        resolution_notes: SchemaHelpers.string({ description: 'Resolution notes', maxLength: 1000 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'case_number', 'student_id', 'category', 'severity', 'status', 'title', 'description', 'incident_date', 'reported_by', 'follow_up_required', 'parent_notified', 'created_at', 'updated_at'],
    indexes: ['case_number', 'student_id', 'category', 'severity', 'status', 'incident_date']
});

export const disciplinaryRecordSchema: DatabaseSchema = createDatabaseSchema({
    title: 'disciplinary_records',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the disciplinary record' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        admission_number: SchemaHelpers.string({ description: 'Admission number (denormalized)', maxLength: 50 }),
        case_id: SchemaHelpers.ref('disciplinary_cases', { description: 'Reference to disciplinary case' }),
        category: SchemaHelpers.string({ description: 'Category', enum: Object.values(types.DisciplinaryCategory), maxLength: 50 }),
        action: SchemaHelpers.string({ description: 'Action', enum: Object.values(types.DisciplinaryAction), maxLength: 50 }),
        action_details: SchemaHelpers.string({ description: 'Action details', maxLength: 1000 }),
        action_date: SchemaHelpers.timestamp({ description: 'Action date' }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'student_id', 'case_id', 'category', 'action', 'action_date', 'created_at', 'updated_at'],
    indexes: ['student_id', 'case_id', 'category', 'action', 'action_date']
});

// === CERTIFICATES MANAGEMENT SCHEMAS ===

export const certificateRequestSchema: DatabaseSchema = createDatabaseSchema({
    title: 'certificate_requests',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the certificate request' }),
        certificate_number: SchemaHelpers.string({ description: 'Certificate number', maxLength: 50 }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        admission_number: SchemaHelpers.string({ description: 'Admission number (denormalized)', maxLength: 50 }),
        class_name: SchemaHelpers.string({ description: 'Class name (denormalized)', maxLength: 100 }),
        certificate_type: SchemaHelpers.string({ description: 'Certificate type', enum: Object.values(types.CertificateType), maxLength: 50 }),
        status: SchemaHelpers.string({ description: 'Status', enum: Object.values(types.CertificateStatus), maxLength: 50 }),
        purpose: SchemaHelpers.string({ description: 'Purpose', maxLength: 500 }),
        remarks: SchemaHelpers.string({ description: 'Remarks', maxLength: 500 }),
        requested_by: SchemaHelpers.ref('users', { description: 'Reference to user who requested' }),
        requested_by_name: SchemaHelpers.string({ description: 'Requested by name (denormalized)', maxLength: 200 }),
        requested_at: SchemaHelpers.timestamp({ description: 'Requested timestamp' }),
        approved_by: SchemaHelpers.ref('users', { description: 'Reference to user who approved' }),
        approved_by_name: SchemaHelpers.string({ description: 'Approved by name (denormalized)', maxLength: 200 }),
        approved_at: SchemaHelpers.timestamp({ description: 'Approved timestamp' }),
        issued_by: SchemaHelpers.ref('users', { description: 'Reference to user who issued' }),
        issued_by_name: SchemaHelpers.string({ description: 'Issued by name (denormalized)', maxLength: 200 }),
        issued_at: SchemaHelpers.timestamp({ description: 'Issued timestamp' }),
        rejection_reason: SchemaHelpers.string({ description: 'Rejection reason', maxLength: 500 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'certificate_number', 'student_id', 'certificate_type', 'status', 'requested_by', 'requested_at', 'created_at', 'updated_at'],
    indexes: ['certificate_number', 'student_id', 'certificate_type', 'status', 'requested_at']
});

// === VISITORS MANAGEMENT SCHEMAS ===

export const visitorLogSchema: DatabaseSchema = createDatabaseSchema({
    title: 'visitor_logs',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the visitor log' }),
        visitor_name: SchemaHelpers.string({ description: 'Visitor name', maxLength: 200 }),
        visitor_type: SchemaHelpers.string({ description: 'Visitor type', enum: Object.values(types.VisitorType), maxLength: 50 }),
        phone: SchemaHelpers.string({ description: 'Phone number', maxLength: 20 }),
        email: SchemaHelpers.string({ description: 'Email', maxLength: 255 }),
        id_type: SchemaHelpers.string({ description: 'ID type', maxLength: 50 }),
        id_number: SchemaHelpers.string({ description: 'ID number', maxLength: 50 }),
        purpose: SchemaHelpers.string({ description: 'Purpose of visit', maxLength: 500 }),
        person_to_meet: SchemaHelpers.string({ description: 'Person to meet', maxLength: 200 }),
        person_to_meet_id: SchemaHelpers.ref('users', { description: 'Reference to person to meet' }),
        status: SchemaHelpers.string({ description: 'Status', enum: Object.values(types.VisitorStatus), maxLength: 50 }),
        check_in_time: SchemaHelpers.timestamp({ description: 'Check-in time' }),
        check_out_time: SchemaHelpers.timestamp({ description: 'Check-out time' }),
        expected_arrival: SchemaHelpers.timestamp({ description: 'Expected arrival time' }),
        remarks: SchemaHelpers.string({ description: 'Remarks', maxLength: 500 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'visitor_name', 'visitor_type', 'phone', 'purpose', 'status', 'check_in_time', 'created_at', 'updated_at'],
    indexes: ['visitor_name', 'visitor_type', 'status', 'check_in_time', 'phone']
});

// === GATE PASSES SCHEMA ===

export const gatePassSchema: DatabaseSchema = createDatabaseSchema({
    title: 'gate_passes',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the gate pass' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        class_name: SchemaHelpers.string({ description: 'Class name (denormalized)', maxLength: 100 }),
        section: SchemaHelpers.string({ description: 'Section/stream name (denormalized)', maxLength: 50 }),
        pass_type: SchemaHelpers.string({ description: 'Type of pass', enum: ['Early Departure', 'Medical Emergency', 'Personal', 'Other'], maxLength: 50 }),
        reason: SchemaHelpers.string({ description: 'Reason for the gate pass', maxLength: 1000 }),
        departure_time: SchemaHelpers.string({ description: 'Departure time', maxLength: 40 }),
        return_time: SchemaHelpers.string({ description: 'Expected return time', nullable: true, maxLength: 40 }),
        authorized_by: SchemaHelpers.string({ description: 'Authorizing parent/guardian', maxLength: 200 }),
        status: SchemaHelpers.string({ description: 'Pass status', enum: ['Pending', 'Approved', 'Rejected', 'Issued', 'Returned'], maxLength: 50 }),
        approved_by: SchemaHelpers.string({ description: 'Approved by user', nullable: true, maxLength: 200 }),
        approved_at: SchemaHelpers.timestamp({ description: 'Approval timestamp', nullable: true }),
        issued_by: SchemaHelpers.string({ description: 'Issued by user', nullable: true, maxLength: 200 }),
        issued_at: SchemaHelpers.timestamp({ description: 'Issue timestamp', nullable: true }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'student_id', 'pass_type', 'reason', 'authorized_by', 'status', 'created_at', 'updated_at'],
    indexes: ['student_id', 'status', 'pass_type', 'departure_time']
});

// === SCHOLARSHIPS SCHEMA ===

export const scholarshipSchema: DatabaseSchema = createDatabaseSchema({
    title: 'scholarships',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the scholarship record' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        admission_no: SchemaHelpers.string({ description: 'Admission number (denormalized)', maxLength: 50 }),
        class_id: SchemaHelpers.string({ description: 'Class reference (denormalized)', maxLength: 100 }),
        class_name: SchemaHelpers.string({ description: 'Class name (denormalized)', maxLength: 100 }),
        scholarship_type: SchemaHelpers.string({ description: 'Type of scholarship', maxLength: 100 }),
        amount: SchemaHelpers.number({ description: 'Scholarship amount', minimum: 0, maximum: 999999999 }),
        academic_year: SchemaHelpers.string({ description: 'Academic year covered', maxLength: 20 }),
        status: SchemaHelpers.string({ description: 'Scholarship status', enum: ['Active', 'Inactive', 'Pending'], maxLength: 50 }),
        start_date: SchemaHelpers.string({ description: 'Start date', maxLength: 20 }),
        end_date: SchemaHelpers.string({ description: 'End date', maxLength: 20 }),
        criteria: SchemaHelpers.string({ description: 'Award criteria', nullable: true, maxLength: 500 }),
        notes: SchemaHelpers.string({ description: 'Additional notes', nullable: true, maxLength: 1000 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'student_id', 'scholarship_type', 'amount', 'academic_year', 'status', 'start_date', 'end_date', 'created_at', 'updated_at'],
    indexes: ['student_id', 'status', 'scholarship_type', 'academic_year']
});

// === SMS REPORTS SCHEMA ===

export const smsReportSchema: DatabaseSchema = createDatabaseSchema({
    title: 'sms_reports',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the SMS report entry' }),
        recipient: SchemaHelpers.string({ description: 'Recipient reference ID', maxLength: 100 }),
        recipient_name: SchemaHelpers.string({ description: 'Recipient display name', maxLength: 200 }),
        recipient_type: SchemaHelpers.string({ description: 'Recipient type', enum: ['Student', 'Staff', 'Parent'], maxLength: 50 }),
        phone: SchemaHelpers.string({ description: 'Recipient phone number', maxLength: 30 }),
        message: SchemaHelpers.string({ description: 'Message content sent', maxLength: 2000 }),
        template: SchemaHelpers.string({ description: 'Template used', nullable: true, maxLength: 150 }),
        sent_date: SchemaHelpers.string({ description: 'Date the message was sent', maxLength: 20 }),
        sent_time: SchemaHelpers.string({ description: 'Time the message was sent', nullable: true, maxLength: 20 }),
        status: SchemaHelpers.string({ description: 'Delivery status', enum: ['Sent', 'Delivered', 'Failed', 'Pending'], maxLength: 50 }),
        delivery_date: SchemaHelpers.string({ description: 'Date of delivery confirmation', nullable: true, maxLength: 20 }),
        error_message: SchemaHelpers.string({ description: 'Failure reason if delivery failed', nullable: true, maxLength: 500 }),
        sender: SchemaHelpers.string({ description: 'Sender identity', nullable: true, maxLength: 100 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'recipient', 'recipient_name', 'recipient_type', 'phone', 'message', 'sent_date', 'status', 'created_at', 'updated_at'],
    indexes: ['recipient', 'recipient_type', 'status', 'sent_date']
});

// === AUTO SMS SETTINGS SCHEMA ===

export const autoSmsSettingSchema: DatabaseSchema = createDatabaseSchema({
    title: 'auto_sms_settings',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the auto-SMS rule' }),
        trigger_type: SchemaHelpers.string({ description: 'Event that triggers the SMS', enum: ['Attendance', 'Fees Due', 'Exam Results', 'Announcements', 'Birthday'], maxLength: 50 }),
        trigger_name: SchemaHelpers.string({ description: 'Human readable rule name', maxLength: 200 }),
        recipient_type: SchemaHelpers.string({ description: 'Who receives the SMS', enum: ['Student', 'Staff', 'Parent', 'All'], maxLength: 50 }),
        template_id: SchemaHelpers.ref('communication_templates', { description: 'Reference to the SMS template' }),
        template_name: SchemaHelpers.string({ description: 'Template name (denormalized)', maxLength: 150 }),
        is_enabled: SchemaHelpers.boolean({ description: 'Whether the rule is enabled', default: false }),
        send_time: SchemaHelpers.string({ description: 'Time of day to send (HH:mm)', nullable: true, maxLength: 10 }),
        conditions: SchemaHelpers.string({ description: 'Trigger conditions', nullable: true, maxLength: 500 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'trigger_type', 'trigger_name', 'recipient_type', 'template_id', 'template_name', 'is_enabled', 'created_at', 'updated_at'],
    indexes: ['trigger_type', 'recipient_type', 'is_enabled']
});

// === STAFF WALLET TRANSACTIONS SCHEMA ===

export const staffWalletTransactionSchema: DatabaseSchema = createDatabaseSchema({
    title: 'staff_wallet_transactions',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the wallet transaction' }),
        staff_id: SchemaHelpers.ref('staff', { description: 'Reference to staff member' }),
        staff_name: SchemaHelpers.string({ description: 'Staff name (denormalized)', maxLength: 200 }),
        employee_id: SchemaHelpers.string({ description: 'Employee/staff number (denormalized)', maxLength: 50 }),
        department: SchemaHelpers.string({ description: 'Department name (denormalized)', maxLength: 200 }),
        transaction_type: SchemaHelpers.string({ description: 'Transaction type', enum: ['Advance', 'Loan', 'Deduction', 'Repayment'], maxLength: 50 }),
        amount: SchemaHelpers.number({ description: 'Transaction amount', minimum: -999999999, maximum: 999999999 }),
        date: SchemaHelpers.string({ description: 'Transaction date', maxLength: 20 }),
        description: SchemaHelpers.string({ description: 'Transaction description', nullable: true, maxLength: 500 }),
        status: SchemaHelpers.string({ description: 'Transaction status', enum: ['Pending', 'Approved', 'Rejected', 'Completed'], maxLength: 50 }),
        balance: SchemaHelpers.number({ description: 'Running balance after this transaction', maximum: 999999999, minimum: -999999999 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'staff_id', 'transaction_type', 'amount', 'date', 'status', 'balance', 'created_at', 'updated_at'],
    indexes: ['staff_id', 'transaction_type', 'status', 'date']
});

// === STAFF ATTENDANCE RECORDS SCHEMA ===

export const staffAttendanceRecordSchema: DatabaseSchema = createDatabaseSchema({
    title: 'staff_attendance_records',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the staff attendance record' }),
        staff_id: SchemaHelpers.ref('staff', { description: 'Reference to staff member' }),
        staff_name: SchemaHelpers.string({ description: 'Staff name (denormalized)', maxLength: 200 }),
        employee_id: SchemaHelpers.string({ description: 'Employee/staff number (denormalized)', maxLength: 50 }),
        department: SchemaHelpers.string({ description: 'Department name (denormalized)', maxLength: 200 }),
        designation: SchemaHelpers.string({ description: 'Designation title (denormalized)', maxLength: 200 }),
        date: SchemaHelpers.string({ description: 'Attendance date', maxLength: 20 }),
        check_in_time: SchemaHelpers.string({ description: 'Check-in time (HH:mm)', nullable: true, maxLength: 10 }),
        check_out_time: SchemaHelpers.string({ description: 'Check-out time (HH:mm)', nullable: true, maxLength: 10 }),
        status: SchemaHelpers.string({ description: 'Attendance status', enum: ['Present', 'Absent', 'Late', 'On Leave'], maxLength: 50 }),
        notes: SchemaHelpers.string({ description: 'Additional notes', nullable: true, maxLength: 500 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'staff_id', 'date', 'status', 'created_at', 'updated_at'],
    indexes: ['staff_id', 'date', 'status']
});

// === SESSION ATTENDANCE SCHEMA ===

export const sessionAttendanceSchema: DatabaseSchema = createDatabaseSchema({
    title: 'session_attendance',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the session attendance record' }),
        student_id: SchemaHelpers.ref('students', { description: 'Reference to student' }),
        student_name: SchemaHelpers.string({ description: 'Student name (denormalized)', maxLength: 200 }),
        admission_no: SchemaHelpers.string({ description: 'Admission number (denormalized)', maxLength: 50 }),
        class_id: SchemaHelpers.string({ description: 'Class reference (denormalized)', maxLength: 100 }),
        class_name: SchemaHelpers.string({ description: 'Class name (denormalized)', maxLength: 100 }),
        session_id: SchemaHelpers.string({ description: 'Identifier of the attendance session', maxLength: 100 }),
        session_name: SchemaHelpers.string({ description: 'Session display name', maxLength: 200 }),
        date: SchemaHelpers.string({ description: 'Session date', nullable: true, maxLength: 20 }),
        check_in_time: SchemaHelpers.string({ description: 'Check-in time (HH:mm)', nullable: true, maxLength: 10 }),
        check_out_time: SchemaHelpers.string({ description: 'Check-out time (HH:mm)', nullable: true, maxLength: 10 }),
        status: SchemaHelpers.string({ description: 'Attendance status', enum: ['Present', 'Absent', 'Late'], maxLength: 50 }),
        notes: SchemaHelpers.string({ description: 'Additional notes', nullable: true, maxLength: 500 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'student_id', 'session_id', 'session_name', 'status', 'created_at', 'updated_at'],
    indexes: ['student_id', 'session_id', 'class_id', 'status', 'date']
});

// === ALUMNI ENGAGEMENTS SCHEMA (page-shaped; see also alumniSchema.ts) ===

export const alumniEngagementRecordSchema: DatabaseSchema = createDatabaseSchema({
    title: 'alumni_engagements',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the engagement activity' }),
        alumni_name: SchemaHelpers.string({ description: 'Alumni full name', maxLength: 200 }),
        graduation_year: SchemaHelpers.string({ description: 'Year of graduation', maxLength: 10 }),
        activity_type: SchemaHelpers.string({ description: 'Type of engagement activity', maxLength: 100 }),
        activity_date: SchemaHelpers.string({ description: 'Date of the activity', maxLength: 20 }),
        description: SchemaHelpers.string({ description: 'Activity description', maxLength: 2000 }),
        amount: SchemaHelpers.number({ description: 'Monetary amount if applicable', nullable: true, minimum: 0, maximum: 999999999 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'alumni_name', 'graduation_year', 'activity_type', 'activity_date', 'description', 'created_at', 'updated_at'],
    indexes: ['alumni_name', 'activity_type', 'activity_date', 'graduation_year']
});

// === ALUMNI EVENTS SCHEMA (page-shaped; see also alumniSchema.ts) ===

export const alumniEventRecordSchema: DatabaseSchema = createDatabaseSchema({
    title: 'alumni_events',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the event' }),
        event_name: SchemaHelpers.string({ description: 'Event name', maxLength: 200 }),
        event_date: SchemaHelpers.string({ description: 'Date of the event', maxLength: 20 }),
        location: SchemaHelpers.string({ description: 'Event location/venue', maxLength: 300 }),
        event_type: SchemaHelpers.string({ description: 'Category of event', maxLength: 100 }),
        expected_attendees: SchemaHelpers.number({ description: 'Expected number of attendees', minimum: 0, maximum: 999999 }),
        status: SchemaHelpers.string({ description: 'Event status', enum: ['Upcoming', 'Completed', 'Cancelled'], maxLength: 20 }),
        description: SchemaHelpers.string({ description: 'Event description', maxLength: 3000 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'event_name', 'event_date', 'location', 'event_type', 'expected_attendees', 'status', 'description', 'created_at', 'updated_at'],
    indexes: ['event_name', 'event_type', 'event_date', 'status']
});

// === DATABASE BACKUP RECORDS SCHEMA ===

export const backupRecordSchema: DatabaseSchema = createDatabaseSchema({
    title: 'backup_records',
    version: 0,
    primaryKey: 'id',
    properties: {
        id: SchemaHelpers.id({ description: 'Unique identifier for the backup record' }),
        filename: SchemaHelpers.string({ description: 'Generated backup filename', maxLength: 255 }),
        size: SchemaHelpers.string({ description: 'Human readable payload size', maxLength: 50 }),
        record_count: SchemaHelpers.number({ description: 'Number of records captured in the backup', default: 0 }),
        type: SchemaHelpers.string({ description: 'Backup type', enum: ['Automatic', 'Manual', 'Scheduled'], maxLength: 20 }),
        status: SchemaHelpers.string({ description: 'Backup status', enum: ['Completed', 'Failed', 'In Progress'], maxLength: 20 }),
        description: SchemaHelpers.string({ description: 'Backup description', maxLength: 500 }),
        payload_json: SchemaHelpers.string({ description: 'Serialized backup snapshot (JSON)', nullable: true, maxLength: 100000000 }),
        created_at: SchemaHelpers.timestamp({ description: 'Record creation timestamp' }),
        updated_at: SchemaHelpers.timestamp({ description: 'Record last update timestamp' }),
    },
    required: ['id', 'filename', 'size', 'type', 'status', 'created_at', 'updated_at'],
    indexes: ['filename', 'type', 'status', 'created_at']
});
