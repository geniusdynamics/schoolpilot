import { logger } from '@/utils/logging';

// ABOUTME: Generates comprehensive dormitory management data including rooms, assignments, and matron supervision
// ABOUTME: Creates realistic accommodation structures with capacity tracking and student occupancy management

import { BaseGenerator } from './BaseGenerator';
import { DataGenerationConfig } from '../types';

export class DormitoryGenerator extends BaseGenerator {
  private dormitories: any[] = [];
  private rooms: any[] = [];
  private matrons: any[] = [];
  private students: any[] = [];

  constructor(config: DataGenerationConfig) {
    super(config);
  }

  async generateData(count: number): Promise<any[]> {
    await this.initialize();
    
    const results: any[] = [];
    
    // Generate dormitories
    const dormitoryData = await this.generateDormitories(8);
    results.push(...dormitoryData);
    
    // Generate dormitory rooms
    const roomData = await this.generateDormitoryRooms(120);
    results.push(...roomData);
    
    // Generate room assignments
    const assignmentData = await this.generateRoomAssignments(300);
    results.push(...assignmentData);
    
    // Generate dormitory inspections
    const inspectionData = await this.generateDormitoryInspections(50);
    results.push(...inspectionData);
    
    // Generate dormitory incidents
    const incidentData = await this.generateDormitoryIncidents(25);
    results.push(...incidentData);
    
    return results;
  }

  private async generateDormitories(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const dormitoryTypes = [
      {
        name: 'Boys Dormitories',
        dormitories: [
          { name: 'Mandela House', capacity: 80, floors: 2, gender: 'Male' },
          { name: 'Kenyatta House', capacity: 100, floors: 3, gender: 'Male' },
          { name: 'Nyerere House', capacity: 90, floors: 2, gender: 'Male' },
          { name: 'Nkrumah House', capacity: 85, floors: 2, gender: 'Male' }
        ]
      },
      {
        name: 'Girls Dormitories',
        dormitories: [
          { name: 'Wangari House', capacity: 75, floors: 2, gender: 'Female' },
          { name: 'Miriam House', capacity: 95, floors: 3, gender: 'Female' },
          { name: 'Grace House', capacity: 80, floors: 2, gender: 'Female' },
          { name: 'Ruth House', capacity: 70, floors: 2, gender: 'Female' }
        ]
      }
    ];
    
    let dormitoryIndex = 0;
    
    logger.info(`Generating dormitories...`);
    
    for (const dormType of dormitoryTypes) {
      for (const dormInfo of dormType.dormitories) {
        const dormitory = {
          id: this.generateId('dormitory', dormitoryIndex),
          name: dormInfo.name,
          code: this.generateDormitoryCode(dormInfo.name),
          description: `${dormInfo.gender} dormitory with ${dormInfo.capacity} bed capacity`,
          gender: dormInfo.gender,
          capacity: dormInfo.capacity,
          current_occupancy: 0, // Will be updated when generating assignments
          floors: dormInfo.floors,
          rooms_per_floor: Math.ceil(dormInfo.capacity / (dormInfo.floors * 4)), // Assuming 4 beds per room
          matron_id: this.generateMatronId(dormInfo.gender),
          assistant_matron_id: this.randomBoolean(0.7) ? this.generateMatronId(dormInfo.gender) : null,
          building_year: this.randomInt(1990, 2020),
          last_renovation: this.formatDate(this.randomDate(new Date(Date.now() - 1095 * 24 * 60 * 60 * 1000), new Date())), // Within last 3 years
          facilities: this.generateDormitoryFacilities(),
          rules_and_regulations: this.generateDormitoryRules(),
          visiting_hours: this.generateVisitingHours(),
          curfew_time: this.generateCurfewTime(),
          status: this.randomChoice(['Active', 'Active', 'Active', 'Under Maintenance']),
          is_active: true,
          created_at: this.generateTimestamp(365),
          updated_at: this.generateTimestamp(30)
        };
        
        this.dormitories.push(dormitory);
        
        results.push({
          table: 'dormitories',
          data: dormitory
        });
        
        dormitoryIndex++;
      }
    }
    
    logger.info(`Generated ${dormitoryIndex} dormitories`);
    
    return results;
  }

  private generateDormitoryCode(name: string): string {
    const words = name.split(' ');
    if (words.length > 1) {
      return words.map(word => word.charAt(0)).join('').toUpperCase();
    }
    return name.substring(0, 3).toUpperCase();
  }

  private generateMatronId(gender: string): string {
    // Generate matron ID based on gender preference
    const matronId = `staff_${this.randomInt(1, 20)}`;
    return matronId;
  }

  private generateDormitoryFacilities(): string {
    const facilities = [
      'Common room with TV and seating area',
      'Study hall with desks and lighting',
      'Laundry room with washing facilities',
      'Kitchen for light cooking',
      'Storage lockers for personal items',
      'Recreation area with games',
      'Prayer/meditation room',
      'First aid station',
      'Wi-Fi internet access',
      'Hot water system',
      'Security cameras',
      'Fire safety equipment'
    ];
    
    const selectedFacilities = [];
    const numFacilities = this.randomInt(6, 10);
    
    for (let i = 0; i < numFacilities; i++) {
      const facility = this.randomChoice(facilities);
      if (!selectedFacilities.includes(facility)) {
        selectedFacilities.push(facility);
      }
    }
    
    return selectedFacilities.join(', ');
  }

  private generateDormitoryRules(): string {
    const rules = [
      'Lights out at 10:00 PM on weekdays, 11:00 PM on weekends',
      'No visitors allowed in dormitory rooms',
      'Keep personal areas clean and tidy',
      'No loud music or noise after 9:00 PM',
      'Report any maintenance issues immediately',
      'No cooking in dormitory rooms',
      'Respect other students privacy and property',
      'Follow dress code within dormitory premises',
      'No smoking or alcohol consumption',
      'Sign in/out when leaving dormitory premises'
    ];
    
    return rules.slice(0, this.randomInt(6, 8)).join('; ');
  }

  private generateVisitingHours(): string {
    const hours = [
      'Weekdays: 4:00 PM - 6:00 PM, Weekends: 2:00 PM - 6:00 PM',
      'Daily: 3:00 PM - 7:00 PM',
      'Weekdays: 5:00 PM - 7:00 PM, Weekends: 10:00 AM - 6:00 PM',
      'Saturday and Sunday: 2:00 PM - 5:00 PM only'
    ];
    
    return this.randomChoice(hours);
  }

  private generateCurfewTime(): string {
    const times = ['9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM'];
    return this.randomChoice(times);
  }

  private async generateDormitoryRooms(count: number): Promise<any[]> {
    const results: any[] = [];
    
    logger.info(`Generating ${count} dormitory rooms...`);
    
    let roomIndex = 0;
    
    for (const dormitory of this.dormitories) {
      const roomsInDormitory = Math.ceil(dormitory.capacity / 4); // 4 beds per room
      
      for (let floor = 1; floor <= dormitory.floors; floor++) {
        const roomsPerFloor = Math.ceil(roomsInDormitory / dormitory.floors);
        
        for (let roomNum = 1; roomNum <= roomsPerFloor; roomNum++) {
          const roomNumber = `${floor}${roomNum.toString().padStart(2, '0')}`;
          
          const room = {
            id: this.generateId('room', roomIndex),
            dormitory_id: dormitory.id,
            room_number: roomNumber,
            floor: floor,
            capacity: 4,
            current_occupancy: 0, // Will be updated when generating assignments
            room_type: this.getRoomType(),
            amenities: this.generateRoomAmenities(),
            condition: this.randomChoice(['Excellent', 'Good', 'Fair', 'Needs Repair']),
            last_maintenance: this.formatDate(this.randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date())),
            next_maintenance: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))),
            furniture_inventory: this.generateFurnitureInventory(),
            monthly_rent: this.randomInt(3000, 8000),
            security_deposit: this.randomInt(5000, 15000),
            utilities_included: this.randomBoolean(0.8),
            is_available: this.randomBoolean(0.7),
            special_notes: this.generateRoomNotes(),
            created_at: this.generateTimestamp(365),
            updated_at: this.generateTimestamp(30)
          };
          
          this.rooms.push(room);
          
          results.push({
            table: 'dormitory_rooms',
            data: room
          });
          
          roomIndex++;
          
          if (roomIndex >= count) break;
        }
        if (roomIndex >= count) break;
      }
      if (roomIndex >= count) break;
    }
    
    logger.info(`Generated ${roomIndex} dormitory rooms`);
    
    return results;
  }

  private getRoomType(): string {
    return this.randomChoice(['Standard', 'Standard', 'Standard', 'Premium', 'Economy']);
  }

  private generateRoomAmenities(): string {
    const amenities = [
      'Individual study desks',
      'Built-in wardrobes',
      'Reading lights',
      'Power outlets for each bed',
      'Window with curtains',
      'Mirror and washbasin',
      'Ceiling fan',
      'Lockable storage boxes',
      'Notice board',
      'Waste basket'
    ];
    
    const selectedAmenities = [];
    const numAmenities = this.randomInt(5, 8);
    
    for (let i = 0; i < numAmenities; i++) {
      const amenity = this.randomChoice(amenities);
      if (!selectedAmenities.includes(amenity)) {
        selectedAmenities.push(amenity);
      }
    }
    
    return selectedAmenities.join(', ');
  }

  private generateFurnitureInventory(): string {
    const furniture = [
      '4 single beds with mattresses',
      '4 study desks with chairs',
      '4 wardrobes/lockers',
      '1 bookshelf',
      '1 waste basket',
      '4 reading lamps',
      '1 mirror',
      '1 notice board'
    ];
    
    return furniture.join(', ');
  }

  private generateRoomNotes(): string | null {
    const notes = [
      'Recently renovated with new paint',
      'Excellent natural lighting',
      'Quiet location away from main corridor',
      'Close to bathroom facilities',
      'Near staircase - easy access',
      'Corner room with extra space',
      'Needs minor electrical repairs',
      'Popular room with good ventilation'
    ];
    
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }

  private async generateRoomAssignments(count: number): Promise<any[]> {
    const results: any[] = [];
    
    logger.info(`Generating ${count} room assignments...`);
    
    // Track occupancy per room and dormitory
    const roomOccupancy: { [key: string]: number } = {};
    const dormitoryOccupancy: { [key: string]: number } = {};
    
    for (let i = 0; i < count; i++) {
      const room = this.randomChoice(this.rooms.filter(r => r.is_available));
      const studentId = `student_${this.randomInt(1, 500)}`;
      
      // Initialize occupancy tracking
      if (!roomOccupancy[room.id]) {
        roomOccupancy[room.id] = 0;
      }
      if (!dormitoryOccupancy[room.dormitory_id]) {
        dormitoryOccupancy[room.dormitory_id] = 0;
      }
      
      // Check room capacity
      if (roomOccupancy[room.id] >= room.capacity) {
        continue;
      }
      
      const assignment = {
        id: this.generateId('assignment', i),
        student_id: studentId,
        dormitory_id: room.dormitory_id,
        room_id: room.id,
        bed_number: roomOccupancy[room.id] + 1,
        assignment_date: this.formatDate(this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())),
        academic_year: this.getCurrentAcademicYear(),
        term: this.randomChoice(['Term 1', 'Term 2', 'Term 3']),
        status: this.randomChoice(['Active', 'Active', 'Active', 'Transferred', 'Graduated']),
        rent_amount: room.monthly_rent,
        deposit_paid: room.security_deposit,
        rent_paid_months: this.randomInt(1, 12),
        outstanding_balance: this.randomInt(0, room.monthly_rent * 2),
        check_in_date: this.formatDate(this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())),
        check_out_date: this.randomBoolean(0.2) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))) : null,
        emergency_contact: this.generateEmergencyContact(),
        special_requirements: this.generateSpecialRequirements(),
        disciplinary_record: this.generateDisciplinaryRecord(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      roomOccupancy[room.id]++;
      dormitoryOccupancy[room.dormitory_id]++;
      
      results.push({
        table: 'room_assignments',
        data: assignment
      });
      
      this.logProgress(i + 1, count, 'room assignment');
    }
    
    // Update room and dormitory occupancy
    for (const room of this.rooms) {
      room.current_occupancy = roomOccupancy[room.id] || 0;
    }
    
    for (const dormitory of this.dormitories) {
      dormitory.current_occupancy = dormitoryOccupancy[dormitory.id] || 0;
    }
    
    return results;
  }

  private getCurrentAcademicYear(): string {
    const currentYear = new Date().getFullYear();
    return `${currentYear}/${currentYear + 1}`;
  }

  private generateEmergencyContact(): string {
    const contacts = [
      'Parent: +254 700 123 456',
      'Guardian: +254 722 987 654',
      'Relative: +254 733 456 789',
      'Family Friend: +254 711 234 567'
    ];
    
    return this.randomChoice(contacts);
  }

  private generateSpecialRequirements(): string | null {
    const requirements = [
      'Lower bunk bed due to medical condition',
      'Near bathroom due to health needs',
      'Quiet environment for studies',
      'Ground floor access required',
      'Special dietary considerations',
      'Medication storage needs'
    ];
    
    return this.randomBoolean(0.15) ? this.randomChoice(requirements) : null;
  }

  private generateDisciplinaryRecord(): string | null {
    const records = [
      'Clean record - no incidents',
      'Minor noise complaint - resolved',
      'Late return warning - improved',
      'Room cleanliness issue - addressed',
      'Excellent behavior record'
    ];
    
    return this.randomBoolean(0.3) ? this.randomChoice(records) : 'Clean record - no incidents';
  }

  private async generateDormitoryInspections(count: number): Promise<any[]> {
    const results: any[] = [];
    
    logger.info(`Generating ${count} dormitory inspections...`);
    
    for (let i = 0; i < count; i++) {
      const dormitory = this.randomChoice(this.dormitories);
      
      const inspection = {
        id: this.generateId('inspection', i),
        dormitory_id: dormitory.id,
        inspection_date: this.formatDate(this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date())),
        inspector_id: dormitory.matron_id,
        inspection_type: this.randomChoice(['Routine', 'Surprise', 'Maintenance', 'Health & Safety']),
        overall_rating: this.randomInt(3, 5),
        cleanliness_score: this.randomInt(3, 5),
        maintenance_score: this.randomInt(2, 5),
        safety_score: this.randomInt(3, 5),
        discipline_score: this.randomInt(3, 5),
        areas_inspected: this.generateInspectionAreas(),
        issues_found: this.generateInspectionIssues(),
        recommendations: this.generateInspectionRecommendations(),
        follow_up_required: this.randomBoolean(0.4),
        follow_up_date: this.randomBoolean(0.4) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))) : null,
        status: this.randomChoice(['Completed', 'Pending Follow-up', 'Action Required']),
        notes: this.generateInspectionNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'dormitory_inspections',
        data: inspection
      });
      
      this.logProgress(i + 1, count, 'dormitory inspection');
    }
    
    return results;
  }

  private generateInspectionAreas(): string {
    const areas = [
      'Individual rooms',
      'Common areas',
      'Bathrooms and toilets',
      'Kitchen facilities',
      'Study areas',
      'Laundry room',
      'Storage areas',
      'Corridors and staircases',
      'Electrical systems',
      'Plumbing systems'
    ];
    
    const selectedAreas = [];
    const numAreas = this.randomInt(5, 8);
    
    for (let i = 0; i < numAreas; i++) {
      const area = this.randomChoice(areas);
      if (!selectedAreas.includes(area)) {
        selectedAreas.push(area);
      }
    }
    
    return selectedAreas.join(', ');
  }

  private generateInspectionIssues(): string | null {
    const issues = [
      'Minor plumbing leaks in bathroom',
      'Some electrical outlets need repair',
      'Paint peeling in common area',
      'Broken window latch in room 205',
      'Clogged drain in laundry room',
      'Loose door handle in room 103',
      'Insufficient lighting in corridor',
      'Damaged floor tiles in bathroom'
    ];
    
    if (this.randomBoolean(0.6)) {
      const numIssues = this.randomInt(1, 3);
      const selectedIssues = [];
      
      for (let i = 0; i < numIssues; i++) {
        const issue = this.randomChoice(issues);
        if (!selectedIssues.includes(issue)) {
          selectedIssues.push(issue);
        }
      }
      
      return selectedIssues.join('; ');
    }
    
    return null;
  }

  private generateInspectionRecommendations(): string | null {
    const recommendations = [
      'Schedule regular maintenance checks',
      'Improve ventilation in common areas',
      'Install additional security lighting',
      'Upgrade bathroom facilities',
      'Enhance fire safety measures',
      'Organize student cleanliness training',
      'Repair identified maintenance issues',
      'Update furniture in study areas'
    ];
    
    if (this.randomBoolean(0.7)) {
      const numRecommendations = this.randomInt(1, 3);
      const selectedRecommendations = [];
      
      for (let i = 0; i < numRecommendations; i++) {
        const recommendation = this.randomChoice(recommendations);
        if (!selectedRecommendations.includes(recommendation)) {
          selectedRecommendations.push(recommendation);
        }
      }
      
      return selectedRecommendations.join('; ');
    }
    
    return null;
  }

  private generateInspectionNotes(): string | null {
    const notes = [
      'Overall excellent condition with minor issues',
      'Students maintaining good cleanliness standards',
      'Some maintenance items need immediate attention',
      'Significant improvement since last inspection',
      'Matron doing excellent job supervising',
      'Need to address recurring maintenance issues',
      'Students cooperative during inspection'
    ];
    
    return this.randomBoolean(0.5) ? this.randomChoice(notes) : null;
  }

  private async generateDormitoryIncidents(count: number): Promise<any[]> {
    const results: any[] = [];
    
    logger.info(`Generating ${count} dormitory incidents...`);
    
    for (let i = 0; i < count; i++) {
      const dormitory = this.randomChoice(this.dormitories);
      
      const incident = {
        id: this.generateId('incident', i),
        dormitory_id: dormitory.id,
        incident_date: this.formatDate(this.randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date())),
        incident_time: this.generateIncidentTime(),
        incident_type: this.randomChoice(['Disciplinary', 'Medical', 'Maintenance', 'Security', 'Fire Safety']),
        severity: this.randomChoice(['Low', 'Medium', 'High']),
        description: this.generateIncidentDescription(),
        students_involved: this.generateStudentsInvolved(),
        staff_involved: dormitory.matron_id,
        witnesses: this.generateWitnesses(),
        action_taken: this.generateActionTaken(),
        follow_up_required: this.randomBoolean(0.5),
        follow_up_date: this.randomBoolean(0.5) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))) : null,
        status: this.randomChoice(['Open', 'Resolved', 'Under Investigation', 'Closed']),
        reported_by: this.generateReporter(),
        investigation_notes: this.generateInvestigationNotes(),
        resolution_notes: this.generateResolutionNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'dormitory_incidents',
        data: incident
      });
      
      this.logProgress(i + 1, count, 'dormitory incident');
    }
    
    return results;
  }

  private generateIncidentTime(): string {
    const hours = this.randomInt(18, 23); // Evening incidents more common
    const minutes = this.randomChoice(['00', '15', '30', '45']);
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  private generateIncidentDescription(): string {
    const descriptions = [
      'Noise complaint from neighboring room',
      'Student reported feeling unwell',
      'Broken window in common area',
      'Unauthorized visitor in dormitory',
      'Fire alarm malfunction',
      'Water leak in bathroom',
      'Missing personal property reported',
      'Violation of curfew rules',
      'Electrical power outage',
      'Conflict between roommates'
    ];
    
    return this.randomChoice(descriptions);
  }

  private generateStudentsInvolved(): string {
    const numStudents = this.randomInt(1, 4);
    const students = [];
    
    for (let i = 0; i < numStudents; i++) {
      students.push(`student_${this.randomInt(1, 500)}`);
    }
    
    return students.join(', ');
  }

  private generateWitnesses(): string | null {
    if (this.randomBoolean(0.4)) {
      const numWitnesses = this.randomInt(1, 3);
      const witnesses = [];
      
      for (let i = 0; i < numWitnesses; i++) {
        witnesses.push(`student_${this.randomInt(1, 500)}`);
      }
      
      return witnesses.join(', ');
    }
    
    return null;
  }

  private generateActionTaken(): string {
    const actions = [
      'Verbal warning issued to student',
      'Parents contacted and informed',
      'Medical attention provided',
      'Maintenance team notified',
      'Security patrol increased',
      'Student counseling arranged',
      'Room change approved',
      'Disciplinary committee referral',
      'Emergency services contacted',
      'Incident documented for records'
    ];
    
    return this.randomChoice(actions);
  }

  private generateReporter(): string {
    const reporters = [
      'Dormitory Matron',
      'Student Prefect',
      'Security Guard',
      'Fellow Student',
      'Maintenance Staff',
      'Duty Teacher'
    ];
    
    return this.randomChoice(reporters);
  }

  private generateInvestigationNotes(): string | null {
    const notes = [
      'Thorough investigation conducted with all parties',
      'CCTV footage reviewed for evidence',
      'Statements taken from involved students',
      'No evidence of malicious intent found',
      'Incident appears to be accidental',
      'Pattern of behavior noted for monitoring',
      'Additional supervision recommended'
    ];
    
    return this.randomBoolean(0.6) ? this.randomChoice(notes) : null;
  }

  private generateResolutionNotes(): string | null {
    const resolutions = [
      'Issue resolved satisfactorily for all parties',
      'Preventive measures implemented',
      'Student showed remorse and understanding',
      'Maintenance issue fixed promptly',
      'Additional training provided to staff',
      'Policy clarification communicated to students',
      'Follow-up monitoring scheduled'
    ];
    
    return this.randomBoolean(0.7) ? this.randomChoice(resolutions) : null;
  }
}