// ABOUTME: Defines RxDB JSON schemas for entities specific to the Administration module.
// ABOUTME: These schemas are used by rxdbService.ts to create collections.

import { RxJsonSchema } from 'rxdb';
import * as types from './types';
import { createEntitySchema } from '../../../services/rxdbService';

export const partnerSchema: RxJsonSchema<types.AdminPartnerType> = createEntitySchema<types.AdminPartnerType>(
    'partner',
    {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string', maxLength: 200 },
        partner_type: { type: 'string', enum: Object.values(types.PartnerType) },
        contact_person: { type: ['string', 'null'] },
        email: { type: ['string', 'null'], format: 'email' },
        phone: { type: ['string', 'null'] },
        address: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
    },
    { key: 'id', type: 'string', final: true, maxLength: 100 },
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