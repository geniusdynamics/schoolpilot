import { logger } from '@/utils/logging';

// ABOUTME: Generates comprehensive clubs and societies data including leadership, members, activities, and financial records
// ABOUTME: Creates realistic club management system with detailed relationships between clubs, members, activities, and events

import { BaseGenerator } from './BaseGenerator';
import { DataGenerationConfig } from '../types';

export class ClubsGenerator extends BaseGenerator {
  private clubCategories: any[] = [];
  private clubs: any[] = [];
  private students: any[] = [];
  private staff: any[] = [];
  private academicYears: any[] = [];

  constructor(config: DataGenerationConfig) {
    super(config);
  }

  async generateData(count: number): Promise<any[]> {
    await this.initialize();
    await this.generateSupportingData();
    
    const results: any[] = [];
    
    // Generate club categories
    const categoryData = await this.generateClubCategories();
    results.push(...categoryData);
    
    // Generate clubs (minimum 25)
    const clubData = await this.generateClubs(Math.max(25, count));
    results.push(...clubData);
    
    // Generate club members
    const memberData = await this.generateClubMembers();
    results.push(...memberData);
    
    // Generate club leadership
    const leadershipData = await this.generateClubLeadership();
    results.push(...leadershipData);
    
    // Generate club activities
    const activityData = await this.generateClubActivities();
    results.push(...activityData);
    
    // Generate club events
    const eventData = await this.generateClubEvents();
    results.push(...eventData);
    
    // Generate club budgets
    const budgetData = await this.generateClubBudgets();
    results.push(...budgetData);
    
    // Generate club achievements
    const achievementData = await this.generateClubAchievements();
    results.push(...achievementData);
    
    return results;
  }

  private async generateSupportingData(): Promise<void> {
    // Generate academic years
    this.academicYears = [
      { id: 'ay_2023', name: '2023', start_date: '2023-01-01', end_date: '2023-12-31', is_current: false },
      { id: 'ay_2024', name: '2024', start_date: '2024-01-01', end_date: '2024-12-31', is_current: true },
      { id: 'ay_2025', name: '2025', start_date: '2025-01-01', end_date: '2025-12-31', is_current: false }
    ];

    // Generate sample students for club membership
    for (let i = 0; i < 200; i++) {
      const gender = this.randomChoice(['male', 'female']) as 'male' | 'female';
      const name = this.generateName(gender);
      this.students.push({
        id: this.generateId('student', i),
        first_name: name.first,
        last_name: name.last,
        current_class: this.randomChoice(['Form 1', 'Form 2', 'Form 3', 'Form 4']),
        stream: this.randomChoice(['A', 'B', 'C', 'D']),
        gender
      });
    }

    // Generate sample staff for club supervision
    for (let i = 0; i < 30; i++) {
      const gender = this.randomChoice(['male', 'female']) as 'male' | 'female';
      const name = this.generateName(gender);
      this.staff.push({
        id: this.generateId('staff', i),
        first_name: name.first,
        last_name: name.last,
        designation: this.randomChoice(['Teacher', 'Senior Teacher', 'Head of Department']),
        gender
      });
    }
  }

  private async generateClubCategories(): Promise<any[]> {
    const results: any[] = [];
    
    const categories = [
      {
        name: 'Academic',
        description: 'Clubs focused on academic excellence and subject-specific activities',
        color: '#6366f1'
      },
      {
        name: 'Sports',
        description: 'Athletic and sports-related clubs and teams',
        color: '#EF4444'
      },
      {
        name: 'Cultural',
        description: 'Clubs celebrating cultural heritage and traditions',
        color: '#F59E0B'
      },
      {
        name: 'Technical',
        description: 'Technology and innovation-focused clubs',
        color: '#10B981'
      },
      {
        name: 'Service',
        description: 'Community service and volunteer organizations',
        color: '#8B5CF6'
      },
      {
        name: 'Religious',
        description: 'Faith-based and spiritual development clubs',
        color: '#06B6D4'
      },
      {
        name: 'Environmental',
        description: 'Environmental conservation and sustainability clubs',
        color: '#84CC16'
      },
      {
        name: 'Arts',
        description: 'Creative arts and performance clubs',
        color: '#EC4899'
      },
      {
        name: 'Leadership',
        description: 'Leadership development and governance clubs',
        color: '#F97316'
      },
      {
        name: 'Special Interest',
        description: 'Hobby and special interest groups',
        color: '#6366F1'
      }
    ];

    categories.forEach((category, index) => {
      const categoryData = {
        id: this.generateId('club_cat', index),
        name: category.name,
        description: category.description,
        color: category.color,
        is_active: true,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.clubCategories.push(categoryData);
      results.push({
        table: 'club_categories',
        data: categoryData
      });
    });
    
    return results;
  }

  private async generateClubs(count: number): Promise<any[]> {
    const results: any[] = [];
    
    logger.info(`Generating ${count} comprehensive club records...`);
    
    const clubsData = [
      // Academic Clubs
      { name: 'Mathematics Club', category: 'Academic', description: 'Promoting mathematical excellence and problem-solving skills' },
      { name: 'Science Club', category: 'Academic', description: 'Exploring scientific concepts through experiments and research' },
      { name: 'Debate Society', category: 'Academic', description: 'Developing critical thinking and public speaking skills' },
      { name: 'Young Economists', category: 'Academic', description: 'Understanding economic principles and business concepts' },
      { name: 'Literature Society', category: 'Academic', description: 'Celebrating literature and creative writing' },
      
      // Sports Clubs
      { name: 'Football Club', category: 'Sports', description: 'Competitive football training and matches' },
      { name: 'Basketball Club', category: 'Sports', description: 'Basketball skills development and competitions' },
      { name: 'Athletics Club', category: 'Sports', description: 'Track and field events training' },
      { name: 'Swimming Club', category: 'Sports', description: 'Swimming techniques and water sports' },
      { name: 'Table Tennis Club', category: 'Sports', description: 'Table tennis skills and tournaments' },
      
      // Cultural Clubs
      { name: 'Cultural Heritage Society', category: 'Cultural', description: 'Preserving and celebrating local cultural traditions' },
      { name: 'Traditional Dance Group', category: 'Cultural', description: 'Learning and performing traditional dances' },
      { name: 'Language Club', category: 'Cultural', description: 'Promoting multilingual communication skills' },
      
      // Technical Clubs
      { name: 'Robotics Club', category: 'Technical', description: 'Building and programming robots' },
      { name: 'Computer Programming Club', category: 'Technical', description: 'Learning programming languages and software development' },
      { name: 'Innovation Hub', category: 'Technical', description: 'Developing innovative solutions to real-world problems' },
      { name: 'Electronics Club', category: 'Technical', description: 'Understanding electronic circuits and devices' },
      
      // Service Clubs
      { name: 'Community Service Club', category: 'Service', description: 'Organizing community outreach programs' },
      { name: 'Red Cross Society', category: 'Service', description: 'First aid training and humanitarian services' },
      { name: 'Environmental Conservation Club', category: 'Environmental', description: 'Promoting environmental awareness and conservation' },
      
      // Religious Clubs
      { name: 'Christian Union', category: 'Religious', description: 'Christian fellowship and spiritual growth' },
      { name: 'Muslim Students Association', category: 'Religious', description: 'Islamic studies and community building' },
      
      // Arts Clubs
      { name: 'Drama Club', category: 'Arts', description: 'Theater productions and dramatic performances' },
      { name: 'Music Society', category: 'Arts', description: 'Musical performances and instrument training' },
      { name: 'Art Club', category: 'Arts', description: 'Visual arts and creative expression' },
      { name: 'Photography Club', category: 'Arts', description: 'Photography skills and visual storytelling' },
      
      // Leadership Clubs
      { name: 'Student Council', category: 'Leadership', description: 'Student government and school leadership' },
      { name: 'Prefects Association', category: 'Leadership', description: 'School discipline and student mentorship' },
      
      // Special Interest Clubs
      { name: 'Chess Club', category: 'Special Interest', description: 'Strategic thinking through chess' },
      { name: 'Gardening Club', category: 'Special Interest', description: 'School beautification and agriculture' },
      { name: 'Cooking Club', category: 'Special Interest', description: 'Culinary skills and nutrition education' }
    ];

    for (let i = 0; i < Math.min(count, clubsData.length); i++) {
      const clubInfo = clubsData[i];
      const category = this.clubCategories.find(cat => cat.name === clubInfo.category);
      
      const club = {
        id: this.generateId('club', i),
        name: clubInfo.name,
        description: clubInfo.description,
        category_id: category?.id,
        patron_id: this.randomChoice(this.staff).id,
        meeting_day: this.randomChoice(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
        meeting_time: this.randomChoice(['14:00', '15:00', '16:00']),
        meeting_venue: this.randomChoice(['Classroom A1', 'Library', 'Computer Lab', 'Science Lab', 'Hall', 'Field']),
        max_members: this.randomInt(20, 100),
        registration_fee: this.randomFloat(500, 2000),
        annual_fee: this.randomFloat(1000, 5000),
        is_active: this.randomBoolean(0.95),
        established_date: this.randomDate(new Date(2020, 0, 1), new Date()),
        objectives: this.generateClubObjectives(clubInfo.name),
        rules_and_regulations: this.generateClubRules(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.clubs.push(club);
      results.push({
        table: 'clubs',
        data: club
      });
    }
    
    return results;
  }

  private async generateClubMembers(): Promise<any[]> {
    const results: any[] = [];
    
    logger.info('Generating club membership records...');
    
    for (const club of this.clubs) {
      const memberCount = this.randomInt(10, Math.min(club.max_members, 50));
      const selectedStudents = this.shuffleArray([...this.students]).slice(0, memberCount);
      
      selectedStudents.forEach((student, index) => {
        const membership = {
          id: this.generateId('club_member', index),
          club_id: club.id,
          student_id: student.id,
          membership_type: this.randomChoice(['Regular', 'Associate', 'Honorary']),
          join_date: this.randomDate(new Date(club.established_date), new Date()),
          membership_status: this.randomChoice(['Active', 'Inactive', 'Suspended']),
          registration_fee_paid: this.randomBoolean(0.8),
          annual_fee_paid: this.randomBoolean(0.7),
          attendance_rate: this.randomFloat(60, 100),
          contribution_score: this.randomInt(1, 10),
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        };
        
        results.push({
          table: 'club_members',
          data: membership
        });
      });
    }
    
    return results;
  }

  private async generateClubLeadership(): Promise<any[]> {
    const results: any[] = [];
    
    logger.info('Generating club leadership positions...');
    
    const positions = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Organizing Secretary'];
    
    for (const club of this.clubs) {
      positions.forEach((position, index) => {
        if (this.randomBoolean(0.8)) { // Not all clubs have all positions
          const leadership = {
            id: this.generateId('club_leadership', index),
            club_id: club.id,
            student_id: this.randomChoice(this.students).id,
            position_title: position,
            start_date: this.randomDate(new Date(club.established_date), new Date()),
            end_date: this.randomBoolean(0.3) ? this.randomDate(new Date(), new Date(2025, 11, 31)) : null,
            responsibilities: this.generateLeadershipResponsibilities(position),
            performance_rating: this.randomFloat(3.0, 5.0),
            is_active: this.randomBoolean(0.9),
            created_at: this.generateTimestamp(365),
            updated_at: this.generateTimestamp(30)
          };
          
          results.push({
            table: 'club_leadership',
            data: leadership
          });
        }
      });
    }
    
    return results;
  }

  private async generateClubActivities(): Promise<any[]> {
    const results: any[] = [];
    
    logger.info('Generating club activities...');
    
    const activityTypes = [
      'Weekly Meeting', 'Training Session', 'Workshop', 'Seminar', 'Competition',
      'Field Trip', 'Community Service', 'Fundraising', 'Social Event', 'Project Work'
    ];
    
    for (const club of this.clubs) {
      const activityCount = this.randomInt(5, 15);
      
      for (let i = 0; i < activityCount; i++) {
        const activity = {
          id: this.generateId('club_activity', i),
          club_id: club.id,
          title: `${club.name} ${this.randomChoice(activityTypes)}`,
          description: this.generateActivityDescription(),
          activity_type: this.randomChoice(activityTypes),
          scheduled_date: this.randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31)),
          duration_hours: this.randomFloat(1, 8),
          venue: this.randomChoice(['School Hall', 'Classroom', 'Library', 'Computer Lab', 'Field', 'Off-campus']),
          target_participants: this.randomInt(10, 50),
          actual_participants: this.randomInt(5, 50),
          budget_allocated: this.randomFloat(1000, 10000),
          budget_spent: this.randomFloat(500, 10000),
          status: this.randomChoice(['Planned', 'Ongoing', 'Completed', 'Cancelled']),
          success_rating: this.randomFloat(3.0, 5.0),
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        };
        
        results.push({
          table: 'club_activities',
          data: activity
        });
      }
    }
    
    return results;
  }

  private async generateClubEvents(): Promise<any[]> {
    const results: any[] = [];
    
    logger.info('Generating club events...');
    
    const eventTypes = [
      'Annual General Meeting', 'Awards Ceremony', 'Competition', 'Exhibition',
      'Festival', 'Conference', 'Tournament', 'Showcase', 'Fundraiser', 'Social Event'
    ];
    
    for (const club of this.clubs) {
      const eventCount = this.randomInt(2, 6);
      
      for (let i = 0; i < eventCount; i++) {
        const event = {
          id: this.generateId('club_event', i),
          club_id: club.id,
          title: `${club.name} ${this.randomChoice(eventTypes)}`,
          description: this.generateEventDescription(),
          event_type: this.randomChoice(eventTypes),
          start_date: this.randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31)),
          end_date: this.randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31)),
          venue: this.randomChoice(['School Hall', 'Assembly Hall', 'Sports Field', 'Library', 'Off-campus Venue']),
          expected_attendance: this.randomInt(50, 500),
          actual_attendance: this.randomInt(30, 500),
          entry_fee: this.randomFloat(0, 1000),
          total_budget: this.randomFloat(5000, 50000),
          total_expenses: this.randomFloat(3000, 50000),
          revenue_generated: this.randomFloat(0, 30000),
          status: this.randomChoice(['Planning', 'Ongoing', 'Completed', 'Cancelled']),
          success_rating: this.randomFloat(3.0, 5.0),
          media_coverage: this.randomBoolean(0.3),
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        };
        
        results.push({
          table: 'club_events',
          data: event
        });
      }
    }
    
    return results;
  }

  private async generateClubBudgets(): Promise<any[]> {
    const results: any[] = [];
    
    logger.info('Generating club budget records...');
    
    for (const club of this.clubs) {
      for (const academicYear of this.academicYears) {
        const budget = {
          id: this.generateId('club_budget'),
          club_id: club.id,
          academic_year_id: academicYear.id,
          allocated_amount: this.randomFloat(10000, 100000),
          spent_amount: this.randomFloat(5000, 80000),
          remaining_amount: 0, // Will be calculated
          income_sources: JSON.stringify([
            { source: 'School Allocation', amount: this.randomFloat(5000, 30000) },
            { source: 'Membership Fees', amount: this.randomFloat(2000, 15000) },
            { source: 'Fundraising', amount: this.randomFloat(1000, 20000) }
          ]),
          expense_categories: JSON.stringify([
            { category: 'Equipment', amount: this.randomFloat(2000, 15000) },
            { category: 'Activities', amount: this.randomFloat(3000, 20000) },
            { category: 'Events', amount: this.randomFloat(5000, 25000) },
            { category: 'Transport', amount: this.randomFloat(1000, 10000) }
          ]),
          budget_status: this.randomChoice(['Draft', 'Approved', 'Under Review', 'Rejected']),
          approval_date: this.randomBoolean(0.7) ? this.randomDate(new Date(academicYear.start_date), new Date()) : null,
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        };
        
        // Calculate remaining amount
        budget.remaining_amount = budget.allocated_amount - budget.spent_amount;
        
        results.push({
          table: 'club_budgets',
          data: budget
        });
      }
    }
    
    return results;
  }

  private async generateClubAchievements(): Promise<any[]> {
    const results: any[] = [];
    
    logger.info('Generating club achievements...');
    
    const achievementTypes = [
      'Competition Winner', 'Best Club Award', 'Community Service Recognition',
      'Innovation Award', 'Leadership Excellence', 'Academic Achievement',
      'Sports Championship', 'Cultural Performance Award', 'Environmental Award'
    ];
    
    for (const club of this.clubs) {
      const achievementCount = this.randomInt(1, 5);
      
      for (let i = 0; i < achievementCount; i++) {
        const achievement = {
          id: this.generateId('club_achievement', i),
          club_id: club.id,
          title: `${this.randomChoice(achievementTypes)} - ${club.name}`,
          description: this.generateAchievementDescription(),
          achievement_type: this.randomChoice(achievementTypes),
          award_level: this.randomChoice(['School', 'District', 'Regional', 'National', 'International']),
          date_achieved: this.randomDate(new Date(2020, 0, 1), new Date()),
          awarding_body: this.generateAwardingBody(),
          certificate_number: this.generateCertificateNumber(),
          points_earned: this.randomInt(10, 100),
          monetary_value: this.randomFloat(0, 50000),
          recognition_level: this.randomChoice(['Bronze', 'Silver', 'Gold', 'Platinum']),
          media_coverage: this.randomBoolean(0.4),
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        };
        
        results.push({
          table: 'club_achievements',
          data: achievement
        });
      }
    }
    
    return results;
  }

  // Helper methods for generating realistic data
  private generateClubObjectives(clubName: string): string {
    const objectives = [
      `To promote excellence in ${clubName.toLowerCase()} activities`,
      'To develop leadership skills among members',
      'To foster teamwork and collaboration',
      'To provide opportunities for skill development',
      'To contribute positively to the school community'
    ];
    return objectives.join('; ');
  }

  private generateClubRules(): string {
    const rules = [
      'Regular attendance at meetings is mandatory',
      'Members must pay fees on time',
      'Respect for fellow members and club property',
      'Active participation in club activities',
      'Adherence to school rules and regulations'
    ];
    return rules.join('; ');
  }

  private generateLeadershipResponsibilities(position: string): string {
    const responsibilities = {
      'President': 'Overall leadership, representing the club, chairing meetings',
      'Vice President': 'Assisting the president, deputizing when necessary',
      'Secretary': 'Record keeping, correspondence, meeting minutes',
      'Treasurer': 'Financial management, budget tracking, fee collection',
      'Organizing Secretary': 'Event planning, activity coordination'
    };
    return responsibilities[position] || 'General club responsibilities';
  }

  private generateActivityDescription(): string {
    const descriptions = [
      'Regular training session to improve skills and knowledge',
      'Interactive workshop with guest speakers and practical exercises',
      'Community outreach program to serve the local community',
      'Competitive event to showcase talents and abilities',
      'Educational field trip to enhance learning experience'
    ];
    return this.randomChoice(descriptions);
  }

  private generateEventDescription(): string {
    const descriptions = [
      'Annual celebration bringing together all club members and supporters',
      'Competitive event showcasing the best talents in the school',
      'Educational conference with industry experts and professionals',
      'Fundraising event to support club activities and community projects',
      'Cultural festival celebrating diversity and creativity'
    ];
    return this.randomChoice(descriptions);
  }

  private generateAchievementDescription(): string {
    const descriptions = [
      'Outstanding performance in inter-school competition',
      'Recognition for exceptional community service contribution',
      'Award for innovative project and creative solutions',
      'Excellence in leadership and organizational skills',
      'Achievement in academic or extracurricular activities'
    ];
    return this.randomChoice(descriptions);
  }

  private generateAwardingBody(): string {
    const bodies = [
      'Ministry of Education',
      'Kenya Secondary Schools Sports Association',
      'National Drama Festival Committee',
      'Kenya Science Congress',
      'Environmental Conservation Society',
      'Youth Leadership Foundation'
    ];
    return this.randomChoice(bodies);
  }

  private generateCertificateNumber(): string {
    return `CERT/${new Date().getFullYear()}/${this.randomInt(1000, 9999)}`;
  }

  private shuffleArray(array: any[]): any[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public async initialize(): Promise<void> {
    logger.info('Initializing ClubsGenerator...');
    await this.generateSupportingData();
    logger.info('ClubsGenerator initialization complete.');
  }
}