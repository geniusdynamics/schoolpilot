// ABOUTME: This file generates comprehensive communication data including SMS/email templates and logs
// ABOUTME: Handles communication management for school messaging and notification systems

import { BaseGenerator } from './BaseGenerator';
import { DataGenerationConfig } from '../types';

export class CommunicationGenerator extends BaseGenerator {
  async generateData(): Promise<any[]> {
    await this.initialize();
    
    const results = [];
    
    // Generate SMS templates
    const smsTemplates = await this.generateSMSTemplates(25);
    results.push(...smsTemplates);
    
    // Generate email templates
    const emailTemplates = await this.generateEmailTemplates(30);
    results.push(...emailTemplates);
    
    // Generate communication logs
    const communicationLogs = await this.generateCommunicationLogs(200);
    results.push(...communicationLogs);
    
    // Generate notification settings
    const notificationSettings = await this.generateNotificationSettings(50);
    results.push(...notificationSettings);
    
    // Generate message queues
    const messageQueues = await this.generateMessageQueues(100);
    results.push(...messageQueues);
    
    // Generate communication groups
    const communicationGroups = await this.generateCommunicationGroups(15);
    results.push(...communicationGroups);
    
    // Generate group memberships
    const groupMemberships = await this.generateGroupMemberships(300);
    results.push(...groupMemberships);
    
    return results;
  }
  
  private async generateSMSTemplates(count: number): Promise<any[]> {
    const templates = [];
    
    for (let i = 1; i <= count; i++) {
      const template = {
        id: `sms_template_${i}`,
        template_name: this.generateSMSTemplateName(),
        template_code: `SMS${i.toString().padStart(3, '0')}`,
        category: this.generateTemplateCategory(),
        subject: this.generateSMSSubject(),
        message_body: this.generateSMSBody(),
        variables: this.generateTemplateVariables(),
        target_audience: this.generateTargetAudience(),
        priority: this.generateMessagePriority(),
        is_active: this.randomBoolean(0.9),
        requires_approval: this.randomBoolean(0.3),
        character_limit: this.randomInt(160, 320),
        delivery_time_preference: this.generateDeliveryTimePreference(),
        created_by: `staff_${this.randomInt(1, 100)}`,
        approved_by: this.randomBoolean(0.7) ? `staff_${this.randomInt(1, 20)}` : null,
        usage_count: this.randomInt(0, 500),
        last_used: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        created_at: this.generateTimestamp(this.randomInt(30, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      templates.push(template);
      this.logProgress(i, count, 'SMS template');
    }
    
    return templates;
  }
  
  private async generateEmailTemplates(count: number): Promise<any[]> {
    const templates = [];
    
    for (let i = 1; i <= count; i++) {
      const template = {
        id: `email_template_${i}`,
        template_name: this.generateEmailTemplateName(),
        template_code: `EMAIL${i.toString().padStart(3, '0')}`,
        category: this.generateTemplateCategory(),
        subject: this.generateEmailSubject(),
        html_body: this.generateEmailHTMLBody(),
        text_body: this.generateEmailTextBody(),
        variables: this.generateTemplateVariables(),
        target_audience: this.generateTargetAudience(),
        priority: this.generateMessagePriority(),
        is_active: this.randomBoolean(0.9),
        requires_approval: this.randomBoolean(0.4),
        has_attachments: this.randomBoolean(0.2),
        attachment_types: this.generateAttachmentTypes(),
        sender_name: this.generateSenderName(),
        sender_email: this.generateSenderEmail(),
        reply_to_email: this.generateReplyToEmail(),
        delivery_time_preference: this.generateDeliveryTimePreference(),
        created_by: `staff_${this.randomInt(1, 100)}`,
        approved_by: this.randomBoolean(0.7) ? `staff_${this.randomInt(1, 20)}` : null,
        usage_count: this.randomInt(0, 300),
        last_used: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        created_at: this.generateTimestamp(this.randomInt(30, 90)),
         updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      templates.push(template);
      this.logProgress(i, count, 'email template');
    }
    
    return templates;
  }
  
  private async generateCommunicationLogs(count: number): Promise<any[]> {
    const logs = [];
    
    for (let i = 1; i <= count; i++) {
      const log = {
        id: `comm_log_${i}`,
        message_type: this.generateMessageType(),
        template_id: this.randomBoolean(0.8) ? `${this.generateMessageType().toLowerCase()}_template_${this.randomInt(1, 30)}` : null,
        recipient_type: this.generateRecipientType(),
        recipient_id: this.generateRecipientId(),
        recipient_contact: this.generateRecipientContact(),
        sender_id: `staff_${this.randomInt(1, 100)}`,
        subject: this.generateMessageSubject(),
        message_content: this.generateMessageContent(),
        delivery_status: this.generateDeliveryStatus(),
        sent_at: this.generateTimestamp(this.randomInt(0, 60)),
        delivered_at: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 7)) : null,
        read_at: this.randomBoolean(0.6) ? this.generateTimestamp(this.randomInt(0, 7)) : null,
        failed_reason: this.generateFailedReason(),
        retry_count: this.generateRetryCount(),
        cost: this.generateMessageCost(),
        priority: this.generateMessagePriority(),
        campaign_id: this.randomBoolean(0.3) ? `campaign_${this.randomInt(1, 20)}` : null,
        response_received: this.randomBoolean(0.1),
        response_content: this.generateResponseContent(),
        metadata: this.generateMessageMetadata(),
        created_at: this.generateTimestamp(this.randomInt(30, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      logs.push(log);
      this.logProgress(i, count, 'communication log');
    }
    
    return logs;
  }
  
  private async generateNotificationSettings(count: number): Promise<any[]> {
    const settings = [];
    
    for (let i = 1; i <= count; i++) {
      const setting = {
        id: `notification_setting_${i}`,
        user_id: `staff_${this.randomInt(1, 100)}`,
        user_type: this.generateUserType(),
        notification_type: this.generateNotificationType(),
        channel: this.generateNotificationChannel(),
        is_enabled: this.randomBoolean(0.8),
        frequency: this.generateNotificationFrequency(),
        time_preference: this.generateTimePreference(),
        day_preference: this.generateDayPreference(),
        quiet_hours_start: this.generateQuietHoursStart(),
        quiet_hours_end: this.generateQuietHoursEnd(),
        language_preference: this.generateLanguagePreference(),
        format_preference: this.generateFormatPreference(),
        priority_threshold: this.generatePriorityThreshold(),
        keywords_filter: this.generateKeywordsFilter(),
        auto_reply_enabled: this.randomBoolean(0.2),
        auto_reply_message: this.generateAutoReplyMessage(),
        created_at: this.generateTimestamp(this.randomInt(30, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      settings.push(setting);
      this.logProgress(i, count, 'notification setting');
    }
    
    return settings;
  }
  
  private async generateMessageQueues(count: number): Promise<any[]> {
    const queues = [];
    
    for (let i = 1; i <= count; i++) {
      const queue = {
        id: `message_queue_${i}`,
        message_type: this.generateMessageType(),
        template_id: this.randomBoolean(0.7) ? `${this.generateMessageType().toLowerCase()}_template_${this.randomInt(1, 30)}` : null,
        recipient_list: this.generateRecipientList(),
        sender_id: `staff_${this.randomInt(1, 100)}`,
        subject: this.generateMessageSubject(),
        message_content: this.generateMessageContent(),
        scheduled_time: this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 30)) : this.generateTimestamp(this.randomInt(0, 7)),
        priority: this.generateMessagePriority(),
        status: this.generateQueueStatus(),
        total_recipients: this.randomInt(1, 200),
        sent_count: this.randomInt(0, 200),
        delivered_count: this.randomInt(0, 200),
        failed_count: this.randomInt(0, 50),
        processing_started_at: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 7)) : null,
        processing_completed_at: this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 7)) : null,
        estimated_cost: this.generateEstimatedCost(),
        actual_cost: this.generateActualCost(),
        campaign_id: this.randomBoolean(0.4) ? `campaign_${this.randomInt(1, 20)}` : null,
        retry_attempts: this.randomInt(0, 3),
        error_message: this.generateErrorMessage(),
        created_at: this.generateTimestamp(this.randomInt(30, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      queues.push(queue);
      this.logProgress(i, count, 'message queue');
    }
    
    return queues;
  }
  
  private async generateCommunicationGroups(count: number): Promise<any[]> {
    const groups = [];
    
    for (let i = 1; i <= count; i++) {
      const group = {
        id: `comm_group_${i}`,
        group_name: this.generateGroupName(),
        group_code: `GRP${i.toString().padStart(3, '0')}`,
        group_type: this.generateGroupType(),
        description: this.generateGroupDescription(),
        target_audience: this.generateTargetAudience(),
        is_active: this.randomBoolean(0.9),
        is_default: this.randomBoolean(0.1),
        auto_enrollment: this.randomBoolean(0.3),
        enrollment_criteria: this.generateEnrollmentCriteria(),
        member_count: this.randomInt(5, 150),
        created_by: `staff_${this.randomInt(1, 100)}`,
        managed_by: `staff_${this.randomInt(1, 50)}`,
        last_message_sent: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        message_count: this.randomInt(0, 100),
        privacy_level: this.generatePrivacyLevel(),
        approval_required: this.randomBoolean(0.4),
        created_at: this.generateTimestamp(this.randomInt(30, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      groups.push(group);
      this.logProgress(i, count, 'communication group');
    }
    
    return groups;
  }
  
  private async generateGroupMemberships(count: number): Promise<any[]> {
    const memberships = [];
    
    for (let i = 1; i <= count; i++) {
      const membership = {
        id: `group_membership_${i}`,
        group_id: `comm_group_${this.randomInt(1, 15)}`,
        member_id: this.generateMemberId(),
        member_type: this.generateMemberType(),
        role: this.generateMemberRole(),
        status: this.generateMembershipStatus(),
        joined_date: this.generateTimestamp(this.randomInt(0, 180)),
        invited_by: this.randomBoolean(0.7) ? `staff_${this.randomInt(1, 100)}` : null,
        invitation_sent_at: this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 90)) : null,
        invitation_accepted_at: this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 90)) : null,
        last_activity: this.randomBoolean(0.9) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        notification_preferences: this.generateNotificationPreferences(),
        can_send_messages: this.randomBoolean(0.6),
        can_invite_members: this.randomBoolean(0.3),
        can_manage_group: this.randomBoolean(0.1),
        opt_out_date: this.randomBoolean(0.05) ? this.generateTimestamp(this.randomInt(0, 30)) : null,
        opt_out_reason: this.generateOptOutReason(),
        created_at: this.generateTimestamp(this.randomInt(30, 90)),
        updated_at: this.generateTimestamp(this.randomInt(0, 30))
      };
      
      memberships.push(membership);
      this.logProgress(i, count, 'group membership');
    }
    
    return memberships;
  }
  
  // Helper methods for generating specific communication-related data
  private generateSMSTemplateName(): string {
    const names = [
      'Fee Reminder', 'Exam Schedule', 'Parent Meeting', 'Holiday Notice',
      'Emergency Alert', 'Event Invitation', 'Grade Report', 'Attendance Alert',
      'Transport Update', 'School Closure', 'Achievement Notification',
      'Disciplinary Notice', 'Medical Alert', 'Library Reminder'
    ];
    return this.randomChoice(names);
  }
  
  private generateEmailTemplateName(): string {
    const names = [
      'Welcome Email', 'Fee Statement', 'Progress Report', 'Event Invitation',
      'Newsletter', 'Admission Confirmation', 'Certificate Award',
      'Parent Conference', 'Graduation Ceremony', 'Sports Day Invitation',
      'Academic Calendar', 'Policy Update', 'Emergency Notification'
    ];
    return this.randomChoice(names);
  }
  
  private generateTemplateCategory(): string {
    return this.randomChoice([
      'Academic', 'Administrative', 'Financial', 'Emergency',
      'Events', 'Disciplinary', 'Medical', 'Transport',
      'Library', 'Sports', 'General'
    ]);
  }
  
  private generateSMSSubject(): string {
    const subjects = [
      'Fee Payment Due', 'Exam Schedule Update', 'Parent Meeting Notice',
      'School Holiday', 'Emergency Alert', 'Event Reminder',
      'Grade Available', 'Attendance Issue', 'Transport Change'
    ];
    return this.randomChoice(subjects);
  }
  
  private generateSMSBody(): string {
    const bodies = [
      'Dear {{parent_name}}, your child {{student_name}} has {{message_content}}. Please contact school for details.',
      'Reminder: {{event_name}} is scheduled for {{date}} at {{time}}. {{additional_info}}',
      'Alert: {{student_name}} was absent today {{date}}. Please confirm if this was authorized.',
      'Fee payment of {{amount}} is due on {{due_date}} for {{student_name}}. Pay via {{payment_method}}.',
      'Congratulations! {{student_name}} has achieved {{achievement}}. Well done!'
    ];
    return this.randomChoice(bodies);
  }
  
  private generateEmailSubject(): string {
    const subjects = [
      'Monthly Progress Report - {{student_name}}',
      'Invitation to {{event_name}} - {{date}}',
      'Fee Statement for {{term}} Term',
      'Important: {{announcement_title}}',
      'Welcome to {{school_name}} - {{academic_year}}'
    ];
    return this.randomChoice(subjects);
  }
  
  private generateEmailHTMLBody(): string {
    return `
    <html>
      <body>
        <h2>{{school_name}}</h2>
        <p>Dear {{recipient_name}},</p>
        <p>{{message_content}}</p>
        <p>Best regards,<br/>{{sender_name}}</p>
        <footer>
          <p>{{school_address}} | {{school_phone}} | {{school_email}}</p>
        </footer>
      </body>
    </html>
    `;
  }
  
  private generateEmailTextBody(): string {
    return 'Dear {{recipient_name}},\n\n{{message_content}}\n\nBest regards,\n{{sender_name}}\n\n{{school_name}}\n{{school_address}}';
  }
  
  private generateTemplateVariables(): string[] {
    const variables = [
      'student_name', 'parent_name', 'school_name', 'date', 'time',
      'amount', 'event_name', 'teacher_name', 'class_name', 'term',
      'academic_year', 'grade', 'subject', 'message_content'
    ];
    
    const numVars = this.randomInt(3, 8);
    return this.randomChoices(variables, numVars);
  }
  
  private generateTargetAudience(): string {
    return this.randomChoice([
      'Parents', 'Students', 'Staff', 'Teachers', 'Administrators',
      'All Users', 'Class Parents', 'Grade Level', 'Department Staff'
    ]);
  }
  
  private generateMessagePriority(): string {
    return this.randomChoice(['Low', 'Normal', 'High', 'Urgent']);
  }
  
  private generateDeliveryTimePreference(): string {
    return this.randomChoice([
      'Immediate', 'Business Hours', 'Morning', 'Afternoon',
      'Evening', 'Weekend', 'Scheduled'
    ]);
  }
  
  private generateAttachmentTypes(): string[] | null {
    const types = ['PDF', 'DOC', 'XLS', 'JPG', 'PNG'];
    return this.randomBoolean(0.2) ? this.randomChoices(types, this.randomInt(1, 3)) : null;
  }
  
  private generateSenderName(): string {
    return this.randomChoice([
      'School Administration', 'Principal Office', 'Academic Office',
      'Finance Department', 'Student Affairs', 'Admissions Office'
    ]);
  }
  
  private generateSenderEmail(): string {
    const domains = ['school.edu', 'academy.ac.ke', 'institution.org'];
    const prefixes = ['admin', 'info', 'principal', 'academic', 'finance'];
    return `${this.randomChoice(prefixes)}@${this.randomChoice(domains)}`;
  }
  
  private generateReplyToEmail(): string {
    return this.generateSenderEmail();
  }
  
  private generateMessageType(): string {
    return this.randomChoice(['SMS', 'Email', 'Push', 'WhatsApp']);
  }
  
  private generateRecipientType(): string {
    return this.randomChoice(['Student', 'Parent', 'Staff', 'Teacher', 'Administrator']);
  }
  
  private generateRecipientId(): string {
    const types = ['student', 'parent', 'staff'];
    const type = this.randomChoice(types);
    return `${type}_${this.randomInt(1, 500)}`;
  }
  
  private generateRecipientContact(): string {
    if (this.randomBoolean(0.6)) {
      return this.generatePhoneNumber();
    } else {
      const name = this.generateName();
      return this.generateEmail(name.first, name.last);
    }
  }
  
  private generateMessageSubject(): string {
    const subjects = [
      'Fee Payment Reminder', 'Exam Schedule', 'Parent Meeting',
      'School Event', 'Grade Report', 'Attendance Alert',
      'Transport Update', 'Emergency Notice', 'Achievement Award'
    ];
    return this.randomChoice(subjects);
  }
  
  private generateMessageContent(): string {
    const contents = [
      'Your child has an upcoming exam on Mathematics scheduled for tomorrow.',
      'Fee payment of KES 15,000 is due by end of this week.',
      'Parent-teacher conference is scheduled for next Friday at 2 PM.',
      'Congratulations! Your child has been selected for the school debate team.',
      'Please note that school will be closed tomorrow due to a public holiday.'
    ];
    return this.randomChoice(contents);
  }
  
  private generateDeliveryStatus(): string {
    return this.randomChoice([
      'Sent', 'Delivered', 'Failed', 'Pending', 'Queued', 'Read'
    ]);
  }
  
  private generateDeliveredAt(): string | null {
    return this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 7)) : null;
  }
  
  private generateReadAt(): string | null {
    return this.randomBoolean(0.6) ? this.generateTimestamp(this.randomInt(0, 7)) : null;
  }
  
  private generateFailedReason(): string | null {
    const reasons = [
      'Invalid phone number', 'Network error', 'Recipient blocked',
      'Insufficient credits', 'Message too long', 'Invalid email address'
    ];
    return this.randomBoolean(0.1) ? this.randomChoice(reasons) : null;
  }
  
  private generateRetryCount(): number {
    return this.randomInt(0, 3);
  }
  
  private generateMessageCost(): number {
    return this.randomFloat(1, 10, 2);
  }
  
  private generateResponseContent(): string | null {
    const responses = [
      'Thank you for the information',
      'Please call me back',
      'Received and understood',
      'Will attend the meeting',
      'Payment has been made'
    ];
    return this.randomBoolean(0.1) ? this.randomChoice(responses) : null;
  }
  
  private generateMessageMetadata(): any {
    return {
      device_type: this.randomChoice(['mobile', 'desktop', 'tablet']),
      ip_address: this.generateIPAddress(),
      user_agent: this.generateUserAgent(),
      location: this.generateLocation()
    };
  }
  
  private generateUserType(): string {
    return this.randomChoice(['Student', 'Parent', 'Staff', 'Teacher', 'Administrator']);
  }
  
  private generateNotificationType(): string {
    return this.randomChoice([
      'Fee Reminder', 'Exam Alert', 'Event Notification', 'Grade Update',
      'Attendance Alert', 'Emergency Notice', 'General Announcement'
    ]);
  }
  
  private generateNotificationChannel(): string {
    return this.randomChoice(['SMS', 'Email', 'Push', 'In-App', 'WhatsApp']);
  }
  
  private generateNotificationFrequency(): string {
    return this.randomChoice(['Immediate', 'Daily', 'Weekly', 'Monthly', 'Custom']);
  }
  
  private generateTimePreference(): string {
    return this.randomChoice(['Morning', 'Afternoon', 'Evening', 'Any Time']);
  }
  
  private generateDayPreference(): string[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const numDays = this.randomInt(1, 7);
    return this.randomChoices(days, numDays);
  }
  
  private generateQuietHoursStart(): string {
    return `${this.randomInt(20, 23)}:00`;
  }
  
  private generateQuietHoursEnd(): string {
    return `${this.randomInt(6, 9)}:00`;
  }
  
  private generateLanguagePreference(): string {
    return this.randomChoice(['English', 'Swahili', 'French', 'Spanish']);
  }
  
  private generateFormatPreference(): string {
    return this.randomChoice(['Text', 'HTML', 'Rich Text', 'Plain']);
  }
  
  private generatePriorityThreshold(): string {
    return this.randomChoice(['Low', 'Normal', 'High', 'Urgent']);
  }
  
  private generateKeywordsFilter(): string[] | null {
    const keywords = ['urgent', 'fee', 'exam', 'meeting', 'emergency', 'grade'];
    return this.randomBoolean(0.3) ? this.randomChoices(keywords, this.randomInt(1, 3)) : null;
  }
  
  private generateAutoReplyMessage(): string | null {
    const messages = [
      'Thank you for your message. We will respond within 24 hours.',
      'Your message has been received and will be reviewed shortly.',
      'This is an automated response. For urgent matters, please call the school.',
      'We have received your inquiry and will get back to you soon.'
    ];
    return this.randomBoolean(0.2) ? this.randomChoice(messages) : null;
  }
  
  private generateRecipientList(): string[] {
    const recipients = [];
    const count = this.randomInt(1, 50);
    
    for (let i = 0; i < count; i++) {
      recipients.push(this.generateRecipientId());
    }
    
    return recipients;
  }
  
  private generateScheduledTime(): string {
    return this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 30)) : this.generateTimestamp(this.randomInt(0, 7));
  }
  
  private generateQueueStatus(): string {
    return this.randomChoice([
      'Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Scheduled'
    ]);
  }
  
  private generateProcessingStartedAt(): string | null {
    return this.randomBoolean(0.8) ? this.generateTimestamp(this.randomInt(0, 7)) : null;
  }
  
  private generateProcessingCompletedAt(): string | null {
    return this.randomBoolean(0.7) ? this.generateTimestamp(this.randomInt(0, 7)) : null;
  }
  
  private generateEstimatedCost(): number {
    return this.randomFloat(50, 1000, 2);
  }
  
  private generateActualCost(): number | null {
    return this.randomBoolean(0.8) ? this.randomFloat(50, 1000, 2) : null;
  }
  
  private generateErrorMessage(): string | null {
    const errors = [
      'Network timeout error',
      'Invalid recipient format',
      'Insufficient account balance',
      'Message content blocked',
      'Rate limit exceeded'
    ];
    return this.randomBoolean(0.1) ? this.randomChoice(errors) : null;
  }
  
  private generateGroupName(): string {
    const names = [
      'All Parents', 'Grade 1 Parents', 'Teaching Staff', 'Administrative Staff',
      'Sports Team Parents', 'Drama Club Members', 'Science Department',
      'Mathematics Teachers', 'Primary Section', 'Secondary Section',
      'Board Members', 'Emergency Contacts', 'Transport Users'
    ];
    return this.randomChoice(names);
  }
  
  private generateGroupType(): string {
    return this.randomChoice([
      'Academic', 'Administrative', 'Departmental', 'Grade Level',
      'Activity Based', 'Emergency', 'General', 'Special Interest'
    ]);
  }
  
  private generateGroupDescription(): string {
    const descriptions = [
      'Communication group for all parents in the school',
      'Teachers and staff in the mathematics department',
      'Parents of students in grade level activities',
      'Emergency communication for urgent notifications',
      'General announcements and school updates'
    ];
    return this.randomChoice(descriptions);
  }
  
  private generateEnrollmentCriteria(): string | null {
    const criteria = [
      'All parents with children in specific grade',
      'Staff members in department',
      'Students participating in activity',
      'Manual enrollment only',
      'Automatic based on role'
    ];
    return this.randomBoolean(0.6) ? this.randomChoice(criteria) : null;
  }
  
  private generatePrivacyLevel(): string {
    return this.randomChoice(['Public', 'Private', 'Restricted', 'Confidential']);
  }
  
  private generateMemberId(): string {
    const types = ['student', 'parent', 'staff'];
    const type = this.randomChoice(types);
    return `${type}_${this.randomInt(1, 500)}`;
  }
  
  private generateMemberType(): string {
    return this.randomChoice(['Student', 'Parent', 'Staff', 'Teacher', 'Administrator']);
  }
  
  private generateMemberRole(): string {
    return this.randomChoice(['Member', 'Moderator', 'Admin', 'Owner', 'Viewer']);
  }
  
  private generateMembershipStatus(): string {
    return this.randomChoice(['Active', 'Inactive', 'Pending', 'Suspended', 'Invited']);
  }
  
  private generateInvitationSentAt(): string | null {
    return this.randomBoolean(0.7) ? this.randomDate() : null;
  }
  
  private generateInvitationAcceptedAt(): string | null {
    return this.randomBoolean(0.8) ? this.randomDate() : null;
  }
  
  private generateLastActivity(): string | null {
    return this.randomBoolean(0.9) ? this.randomDate() : null;
  }
  
  private generateNotificationPreferences(): any {
    return {
      email: this.randomBoolean(0.8),
      sms: this.randomBoolean(0.6),
      push: this.randomBoolean(0.7),
      in_app: this.randomBoolean(0.9)
    };
  }
  
  private generateOptOutReason(): string | null {
    const reasons = [
      'Too many messages',
      'Not relevant',
      'Changed contact information',
      'No longer associated with school',
      'Privacy concerns'
    ];
    return this.randomBoolean(0.05) ? this.randomChoice(reasons) : null;
  }
  
  private generateIPAddress(): string {
    return `${this.randomInt(1, 255)}.${this.randomInt(1, 255)}.${this.randomInt(1, 255)}.${this.randomInt(1, 255)}`;
  }
  
  private generateUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
      'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0'
    ];
    return this.randomChoice(agents);
  }
  
  private generateLocation(): string {
    const locations = [
      'Nairobi, Kenya', 'Mombasa, Kenya', 'Kisumu, Kenya',
      'Nakuru, Kenya', 'Eldoret, Kenya', 'Thika, Kenya'
    ];
    return this.randomChoice(locations);
  }
  
  private async initialize(): Promise<void> {
    console.log('Initializing CommunicationGenerator...');
  }
  
  private logProgress(current: number, total: number, type: string): void {
    if (current % 25 === 0 || current === total) {
      console.log(`Generated ${current}/${total} ${type}s`);
    }
  }
}