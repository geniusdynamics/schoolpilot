// ABOUTME: Defines TypeScript interfaces for alumni management, extending student data
// ABOUTME: Alumni records track graduates and their post-graduation engagement

export enum AlumniEngagementStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  LOST_CONTACT = 'Lost Contact',
  DECEASED = 'Deceased'
}

export enum AlumniCategory {
  GENERAL = 'General',
  DISTINGUISHED = 'Distinguished',
  DONOR = 'Donor',
  VOLUNTEER = 'Volunteer',
  MENTOR = 'Mentor'
}

export interface AlumniRecord {
  id: string;
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  other_names?: string;
  gender: string;
  graduation_year: string;
  graduation_class_name?: string;
  graduation_stream_name?: string;
  phone?: string;
  email?: string;
  alternative_email?: string;
  current_occupation?: string;
  employer?: string;
  current_city?: string;
  current_country?: string;
  postal_address?: string;
  engagement_status: AlumniEngagementStatus;
  alumni_category: AlumniCategory;
  is_newsletter_subscribed: boolean;
  last_contact_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AlumniEngagementRecord {
  id: string;
  alumni_id: string;
  engagement_type: string; // e.g., 'Reunion', 'Donation', 'Mentorship', 'Event', 'Newsletter'
  engagement_date: string;
  description?: string;
  amount?: number;
  created_by?: string;
  created_at: string;
}

export interface AlumniDonationRecord {
  id: string;
  alumni_id: string;
  alumni_name?: string;
  amount: number;
  currency: string;
  donation_date: string;
  donation_type: string; // e.g., ' Monetary', 'Asset', 'Time'
  purpose?: string; // e.g., 'Building Fund', 'Scholarship', 'Library'
  receipt_number?: string;
  is_anonymous: boolean;
  notes?: string;
  created_at: string;
}

export interface AlumniEventRecord {
  id: string;
  title: string;
  event_type: string; // e.g., 'Reunion', 'Fundraiser', 'Networking', 'Sports'
  description?: string;
  event_date: string;
  venue?: string;
  expected_attendees?: number;
  actual_attendees?: number;
  is_online: boolean;
  registration_deadline?: string;
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled';
  created_at: string;
  updated_at: string;
}
