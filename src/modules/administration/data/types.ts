// ABOUTME: This file defines TypeScript interfaces, enums, and type aliases for the Administration module.
// ABOUTME: It ensures all administration-related data structures are managed in one place.

export enum PartnerType {
    SPONSOR = 'Sponsor',
    BOARD_MEMBER = 'Board Member',
    SERVICE_PROVIDER = 'Service Provider',
    GOVERNMENT_AGENCY = 'Government Agency',
    NGO = 'NGO',
    OTHER = 'Other'
}

export enum ClubType {
    CLUB = 'Club',
    SOCIETY = 'Society',
    SPORTS_TEAM = 'Sports Team'
}

export enum AttendanceStatus {
    PRESENT = 'Present',
    ABSENT = 'Absent',
    LATE = 'Late',
    EXCUSED = 'Excused'
}

export enum TemplateType {
    SMS = 'SMS',
    EMAIL = 'Email',
    PUSH_NOTIFICATION = 'Push Notification'
}

export enum CampaignAudienceType {
    ALL_STUDENTS = 'All Students',
    ALL_PARENTS = 'All Parents',
    ALL_STAFF = 'All Staff',
    STUDENTS_OF_CLASS = 'Students of Class',
    PARENTS_OF_CLASS = 'Parents of Class'
}

export enum CampaignStatus {
    DRAFT = 'Draft',
    SCHEDULED = 'Scheduled',
    APPROVED = 'Approved',
    SENT = 'Sent',
    CANCELLED = 'Cancelled'
}

export interface AdminPartnerType {
  id: string;
  name: string;
  partner_type: PartnerType;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminClubAndSocietyType {
  id: number;
  name: string;
  type: ClubType;
  patron_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  patron_name?: string;
}

export interface AdminCustomerType {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminStudentHealthRecordType {
  id: string;
  student_id: string;
  blood_type?: string;
  allergies?: string;
  medical_conditions?: string;
  emergency_contact_override?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
}

export interface AdminStudentAttendanceType {
  id: string;
  student_id: string;
  period_id: number;
  date: string;
  status: AttendanceStatus;
  reason_for_absence?: string;
  created_at?: string;
  student_name?: string;
  period_name?: string;
}

export interface AdminTemplateCommType {
  id: number;
  name: string;
  type: TemplateType;
  subject?: string;
  body_template: string;
  created_at: string;
  updated_at: string;
}

export interface AdminCampaignType {
  id: string;
  name: string;
  template_id?: number;
  subject?: string;
  body?: string;
  status: CampaignStatus;
  target_audience_type?: CampaignAudienceType;
  target_id?: string | number;
  scheduled_for?: string;
  sent_at?: string;
  created_by: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  template_name?: string;
  created_by_name?: string;
  approved_by_name?: string;
  target_audience_display?: string;
}
