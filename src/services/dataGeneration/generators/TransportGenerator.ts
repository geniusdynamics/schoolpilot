// ABOUTME: This file generates comprehensive transport data including routes, vehicles, and student assignments
// ABOUTME: Handles transport management for school bus services and student transportation

import { BaseGenerator } from './BaseGenerator';

export class TransportGenerator extends BaseGenerator {
  async generateData(): Promise<any[]> {
    await this.initialize();
    
    const results = [];
    
    // Generate transport routes
    const routes = await this.generateTransportRoutes(20);
    results.push(...routes);
    
    // Generate vehicles
    const vehicles = await this.generateVehicles(15);
    results.push(...vehicles);
    
    // Generate drivers
    const drivers = await this.generateDrivers(18);
    results.push(...drivers);
    
    // Generate route assignments
    const routeAssignments = await this.generateRouteAssignments(25);
    results.push(...routeAssignments);
    
    // Generate student transport assignments
    const studentAssignments = await this.generateStudentTransportAssignments(300);
    results.push(...studentAssignments);
    
    // Generate transport schedules
    const schedules = await this.generateTransportSchedules(40);
    results.push(...schedules);
    
    // Generate transport fees
    const fees = await this.generateTransportFees(15);
    results.push(...fees);
    
    // Generate maintenance records
    const maintenance = await this.generateMaintenanceRecords(50);
    results.push(...maintenance);
    
    return results;
  }
  
  private async generateTransportRoutes(count: number): Promise<any[]> {
    const routes = [];
    
    for (let i = 1; i <= count; i++) {
      const route = {
        id: `route_${i}`,
        route_name: this.generateRouteName(),
        route_code: `RT${i.toString().padStart(3, '0')}`,
        start_location: this.generateLocation(),
        end_location: 'School Campus',
        distance_km: this.randomFloat(5, 50, 1),
        estimated_duration: this.generateDuration(),
        route_type: this.generateRouteType(),
        stops: this.generateRouteStops(),
        fare_amount: this.randomFloat(500, 3000, 0),
        status: this.generateRouteStatus(),
        description: this.generateRouteDescription(),
        created_at: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      routes.push(route);
      this.logProgress(i, count, 'transport route');
    }
    
    return routes;
  }
  
  private async generateVehicles(count: number): Promise<any[]> {
    const vehicles = [];
    
    for (let i = 1; i <= count; i++) {
      const vehicle = {
        id: `vehicle_${i}`,
        vehicle_number: this.generateVehicleNumber(),
        vehicle_type: this.generateVehicleType(),
        make: this.generateVehicleMake(),
        model: this.generateVehicleModel(),
        year: this.randomInt(2015, 2024),
        capacity: this.generateVehicleCapacity(),
        fuel_type: this.generateFuelType(),
        registration_number: this.generateRegistrationNumber(),
        insurance_number: this.generateInsuranceNumber(),
        insurance_expiry: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))),
        license_expiry: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 730 * 24 * 60 * 60 * 1000))),
        last_service_date: this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
        next_service_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))),
        mileage: this.randomInt(50000, 200000),
        status: this.generateVehicleStatus(),
        purchase_date: this.randomDate(new Date(Date.now() - 2000 * 24 * 60 * 60 * 1000), new Date()),
        purchase_price: this.randomFloat(1500000, 8000000, 0),
        current_value: this.randomFloat(800000, 5000000, 0),
        notes: this.generateVehicleNotes(),
        created_at: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      vehicles.push(vehicle);
      this.logProgress(i, count, 'vehicle');
    }
    
    return vehicles;
  }
  
  private async generateDrivers(count: number): Promise<any[]> {
    const drivers = [];
    
    for (let i = 1; i <= count; i++) {
      const driver = {
        id: `driver_${i}`,
        staff_id: `staff_${this.randomInt(1, 100)}`,
        driver_name: (() => { const name = this.generateName(); return `${name.first} ${name.last}`; })(),
        license_number: this.generateLicenseNumber(),
        license_class: this.generateLicenseClass(),
        license_expiry: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 730 * 24 * 60 * 60 * 1000))),
        phone_number: this.generatePhoneNumber(),
        emergency_contact: this.generatePhoneNumber(),
        experience_years: this.randomInt(2, 25),
        employment_date: this.randomDate(new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000), new Date()),
        salary: this.randomFloat(25000, 60000, 0),
        status: this.generateDriverStatus(),
        medical_certificate_expiry: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))),
        training_certificates: this.generateTrainingCertificates(),
        performance_rating: this.randomFloat(3.0, 5.0, 1),
        violations: this.generateViolations(),
        notes: this.generateDriverNotes(),
        created_at: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      drivers.push(driver);
      this.logProgress(i, count, 'driver');
    }
    
    return drivers;
  }
  
  private async generateRouteAssignments(count: number): Promise<any[]> {
    const assignments = [];
    
    for (let i = 1; i <= count; i++) {
      const assignment = {
        id: `route_assignment_${i}`,
        route_id: `route_${this.randomInt(1, 20)}`,
        vehicle_id: `vehicle_${this.randomInt(1, 15)}`,
        driver_id: `driver_${this.randomInt(1, 18)}`,
        assistant_driver_id: this.randomBoolean(0.3) ? `driver_${this.randomInt(1, 18)}` : null,
        shift_type: this.generateShiftType(),
        start_time: this.generateStartTime(),
        end_time: this.generateEndTime(),
        days_of_week: this.generateDaysOfWeek(),
        effective_date: this.randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date()),
        end_date: this.randomBoolean(0.2) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 180 * 24 * 60 * 60 * 1000))) : null,
        status: this.generateAssignmentStatus(),
        notes: this.generateAssignmentNotes(),
        created_at: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      assignments.push(assignment);
      this.logProgress(i, count, 'route assignment');
    }
    
    return assignments;
  }
  
  private async generateStudentTransportAssignments(count: number): Promise<any[]> {
    const assignments = [];
    
    for (let i = 1; i <= count; i++) {
      const assignment = {
        id: `student_transport_${i}`,
        student_id: `student_${this.randomInt(1, 500)}`,
        route_id: `route_${this.randomInt(1, 20)}`,
        pickup_stop: this.generatePickupStop(),
        dropoff_stop: this.generateDropoffStop(),
        pickup_time: this.generatePickupTime(),
        dropoff_time: this.generateDropoffTime(),
        monthly_fee: this.randomFloat(1000, 4000, 0),
        payment_status: this.generatePaymentStatus(),
        start_date: this.randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date()),
        end_date: this.randomBoolean(0.1) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 180 * 24 * 60 * 60 * 1000))) : null,
        emergency_contact: this.generatePhoneNumber(),
        special_instructions: this.generateSpecialInstructions(),
        status: this.generateStudentTransportStatus(),
        created_at: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      assignments.push(assignment);
      this.logProgress(i, count, 'student transport assignment');
    }
    
    return assignments;
  }
  
  private async generateTransportSchedules(count: number): Promise<any[]> {
    const schedules = [];
    
    for (let i = 1; i <= count; i++) {
      const schedule = {
        id: `schedule_${i}`,
        route_id: `route_${this.randomInt(1, 20)}`,
        vehicle_id: `vehicle_${this.randomInt(1, 15)}`,
        driver_id: `driver_${this.randomInt(1, 18)}`,
        schedule_date: this.generateScheduleDate(),
        departure_time: this.generateDepartureTime(),
        arrival_time: this.generateArrivalTime(),
        actual_departure: this.generateActualTime(),
        actual_arrival: this.generateActualTime(),
        passengers_count: this.randomInt(5, 45),
        fuel_consumed: this.randomFloat(5, 25, 1),
        distance_covered: this.randomFloat(20, 100, 1),
        incidents: this.generateIncidents(),
        weather_conditions: this.generateWeatherConditions(),
        traffic_conditions: this.generateTrafficConditions(),
        status: this.generateScheduleStatus(),
        notes: this.generateScheduleNotes(),
        created_at: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      schedules.push(schedule);
      this.logProgress(i, count, 'transport schedule');
    }
    
    return schedules;
  }
  
  private async generateTransportFees(count: number): Promise<any[]> {
    const fees = [];
    
    for (let i = 1; i <= count; i++) {
      const fee = {
        id: `transport_fee_${i}`,
        route_id: `route_${this.randomInt(1, 20)}`,
        fee_type: this.generateFeeType(),
        amount: this.randomFloat(1000, 5000, 0),
        currency: 'KES',
        billing_cycle: this.generateBillingCycle(),
        effective_date: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        end_date: this.randomBoolean(0.2) ? this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))) : null,
        discount_percentage: this.randomBoolean(0.3) ? this.randomFloat(5, 20, 0) : 0,
        late_fee_amount: this.randomFloat(100, 500, 0),
        grace_period_days: this.randomInt(3, 14),
        status: this.generateFeeStatus(),
        description: this.generateFeeDescription(),
        created_at: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      fees.push(fee);
      this.logProgress(i, count, 'transport fee');
    }
    
    return fees;
  }
  
  private async generateMaintenanceRecords(count: number): Promise<any[]> {
    const records = [];
    
    for (let i = 1; i <= count; i++) {
      const record = {
        id: `maintenance_${i}`,
        vehicle_id: `vehicle_${this.randomInt(1, 15)}`,
        maintenance_type: this.generateMaintenanceType(),
        service_provider: this.generateServiceProvider(),
        service_date: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        next_service_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))),
        mileage_at_service: this.randomInt(50000, 200000),
        cost: this.randomFloat(5000, 50000, 0),
        parts_replaced: this.generatePartsReplaced(),
        work_description: this.generateWorkDescription(),
        technician_name: (() => { const name = this.generateName(); return `${name.first} ${name.last}`; })(),
        warranty_period_days: this.randomInt(30, 365),
        invoice_number: this.generateInvoiceNumber(),
        status: this.generateMaintenanceStatus(),
        notes: this.generateMaintenanceNotes(),
        created_at: this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
        updated_at: this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      };
      
      records.push(record);
      this.logProgress(i, count, 'maintenance record');
    }
    
    return records;
  }
  
  // Helper methods for generating specific transport-related data
  private generateRouteName(): string {
    const areas = [
      'Westlands', 'Eastleigh', 'Kasarani', 'Embakasi', 'Langata',
      'Kileleshwa', 'Kilimani', 'Parklands', 'Runda', 'Karen',
      'Muthaiga', 'Spring Valley', 'Lavington', 'Riverside',
      'Upperhill', 'Hurlingham', 'Kiambu', 'Thika', 'Ruiru'
    ];
    return `${this.randomChoice(areas)} Route`;
  }
  
  private generateLocation(): string {
    const locations = [
      'Westlands Shopping Center', 'Eastleigh Mosque', 'Kasarani Stadium',
      'Embakasi Market', 'Langata Link', 'Kileleshwa Mall',
      'Kilimani Junction', 'Parklands Mosque', 'Runda Estate',
      'Karen Shopping Center', 'Muthaiga Country Club', 'Spring Valley',
      'Lavington Mall', 'Riverside Drive', 'Upperhill Medical Center'
    ];
    return this.randomChoice(locations);
  }
  
  private generateDuration(): string {
    const minutes = this.randomInt(30, 120);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  }
  
  private generateRouteType(): string {
    return this.randomChoice([
      'Urban', 'Suburban', 'Rural', 'Highway', 'Mixed'
    ]);
  }
  
  private generateRouteStops(): string[] {
    const stops = [
      'Main Gate', 'Shopping Center', 'Hospital', 'Market',
      'Church', 'Mosque', 'Police Station', 'Post Office',
      'Bank', 'Petrol Station', 'School', 'Estate Gate'
    ];
    
    const numStops = this.randomInt(3, 8);
    return this.randomChoices(stops, numStops);
  }
  
  private generateRouteStatus(): string {
    return this.randomChoice(['Active', 'Inactive', 'Suspended', 'Under Review']);
  }
  
  private generateRouteDescription(): string {
    const descriptions = [
      'Main residential route serving multiple estates',
      'Express route with limited stops',
      'Suburban route covering outer areas',
      'City center route with frequent stops',
      'Mixed route serving both residential and commercial areas'
    ];
    return this.randomChoice(descriptions);
  }
  
  private generateVehicleNumber(): string {
    return `BUS${this.randomInt(100, 999)}`;
  }
  
  private generateVehicleType(): string {
    return this.randomChoice([
      'School Bus', 'Mini Bus', 'Van', 'Coaster', 'Large Bus'
    ]);
  }
  
  private generateVehicleMake(): string {
    return this.randomChoice([
      'Toyota', 'Nissan', 'Isuzu', 'Mitsubishi', 'Mercedes-Benz',
      'Hyundai', 'Mazda', 'Ford', 'Volkswagen'
    ]);
  }
  
  private generateVehicleModel(): string {
    const models = {
      'Toyota': ['Hiace', 'Coaster', 'Dyna'],
      'Nissan': ['Civilian', 'Urvan', 'Cabstar'],
      'Isuzu': ['NPR', 'ELF', 'Forward'],
      'Mitsubishi': ['Rosa', 'Canter', 'Fuso'],
      'Mercedes-Benz': ['Sprinter', 'Vario', 'Atego']
    };
    
    const makes = Object.keys(models);
    const make = this.randomChoice(makes);
    return this.randomChoice(models[make] || ['Standard']);
  }
  
  private generateVehicleCapacity(): number {
    return this.randomChoice([14, 25, 33, 45, 60]);
  }
  
  private generateFuelType(): string {
    return this.randomChoice(['Diesel', 'Petrol', 'Hybrid']);
  }
  
  private generateRegistrationNumber(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter1 = letters[this.randomInt(0, 25)];
    const letter2 = letters[this.randomInt(0, 25)];
    const letter3 = letters[this.randomInt(0, 25)];
    const numbers = this.randomInt(100, 999);
    return `K${letter1}${letter2} ${numbers}${letter3}`;
  }
  
  private generateInsuranceNumber(): string {
    return `INS${this.randomInt(100000, 999999)}`;
  }
  
  private generateVehicleStatus(): string {
    return this.randomChoice(['Active', 'Maintenance', 'Retired', 'Under Repair']);
  }
  
  private generateVehicleNotes(): string | null {
    const notes = [
      'Regular maintenance required',
      'Good condition, well maintained',
      'Minor repairs needed',
      'Recently serviced',
      'High mileage vehicle'
    ];
    
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }
  
  private generateLicenseNumber(): string {
    return `DL${this.randomInt(1000000, 9999999)}`;
  }
  
  private generateLicenseClass(): string {
    return this.randomChoice(['C', 'D', 'E', 'F']);
  }
  
  private generateDriverStatus(): string {
    return this.randomChoice(['Active', 'On Leave', 'Suspended', 'Training']);
  }
  
  private generateTrainingCertificates(): string[] {
    const certificates = [
      'Defensive Driving', 'First Aid', 'Student Safety',
      'Vehicle Maintenance', 'Emergency Response',
      'Customer Service', 'Road Safety'
    ];
    
    const numCerts = this.randomInt(1, 4);
    return this.randomChoices(certificates, numCerts);
  }
  
  private generateViolations(): number {
    return this.randomInt(0, 3);
  }
  
  private generateDriverNotes(): string | null {
    const notes = [
      'Excellent safety record',
      'Experienced driver with good student rapport',
      'Requires additional training',
      'Punctual and reliable',
      'Good mechanical knowledge'
    ];
    
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }
  
  private generateShiftType(): string {
    return this.randomChoice(['Morning', 'Evening', 'Full Day', 'Split Shift']);
  }
  
  private generateStartTime(): string {
    const hour = this.randomInt(6, 8);
    const minute = this.randomChoice([0, 15, 30, 45]);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  
  private generateEndTime(): string {
    const hour = this.randomInt(15, 18);
    const minute = this.randomChoice([0, 15, 30, 45]);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  
  private generateDaysOfWeek(): string[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const includeWeekend = this.randomBoolean(0.2);
    
    if (includeWeekend) {
      days.push('Saturday');
    }
    
    return days;
  }
  
  private generateAssignmentStatus(): string {
    return this.randomChoice(['Active', 'Inactive', 'Temporary', 'Suspended']);
  }
  
  private generateAssignmentNotes(): string | null {
    const notes = [
      'Regular assignment',
      'Temporary assignment due to vehicle maintenance',
      'New route assignment',
      'Backup driver assignment',
      'Special event assignment'
    ];
    
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }
  
  private generatePickupStop(): string {
    return this.generateLocation();
  }
  
  private generateDropoffStop(): string {
    return 'School Main Gate';
  }
  
  private generatePickupTime(): string {
    const hour = this.randomInt(6, 8);
    const minute = this.randomChoice([0, 15, 30, 45]);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  
  private generateDropoffTime(): string {
    const hour = this.randomInt(15, 17);
    const minute = this.randomChoice([0, 15, 30, 45]);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  
  private generatePaymentStatus(): string {
    return this.randomChoice(['Paid', 'Pending', 'Overdue', 'Partial']);
  }
  
  private generateSpecialInstructions(): string | null {
    const instructions = [
      'Student requires assistance boarding',
      'Medical condition - keep inhaler available',
      'Pick up only on specific days',
      'Parent pickup on Fridays',
      'Emergency contact required'
    ];
    
    return this.randomBoolean(0.2) ? this.randomChoice(instructions) : null;
  }
  
  private generateStudentTransportStatus(): string {
    return this.randomChoice(['Active', 'Suspended', 'Temporary Hold', 'Cancelled']);
  }
  
  private generateScheduleDate(): string {
    return this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()));
  }
  
  private generateDepartureTime(): string {
    return this.generateStartTime();
  }
  
  private generateArrivalTime(): string {
    return this.generateEndTime();
  }
  
  private generateActualTime(): string | null {
    return this.randomBoolean(0.8) ? this.generateStartTime() : null;
  }
  
  private generateIncidents(): string | null {
    const incidents = [
      'Minor traffic delay',
      'Vehicle breakdown',
      'Student behavioral issue',
      'Road construction delay',
      'Weather-related delay'
    ];
    
    return this.randomBoolean(0.1) ? this.randomChoice(incidents) : null;
  }
  
  private generateWeatherConditions(): string {
    return this.randomChoice([
      'Clear', 'Cloudy', 'Rainy', 'Foggy', 'Sunny', 'Overcast'
    ]);
  }
  
  private generateTrafficConditions(): string {
    return this.randomChoice([
      'Light', 'Moderate', 'Heavy', 'Congested', 'Free Flow'
    ]);
  }
  
  private generateScheduleStatus(): string {
    return this.randomChoice(['Completed', 'In Progress', 'Cancelled', 'Delayed']);
  }
  
  private generateScheduleNotes(): string | null {
    const notes = [
      'On time departure and arrival',
      'Slight delay due to traffic',
      'All students accounted for',
      'Vehicle performed well',
      'Route completed successfully'
    ];
    
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }
  
  private generateFeeType(): string {
    return this.randomChoice([
      'Monthly Fee', 'Term Fee', 'Annual Fee', 'Registration Fee', 'Late Fee'
    ]);
  }
  
  private generateBillingCycle(): string {
    return this.randomChoice(['Monthly', 'Termly', 'Annual', 'Weekly']);
  }
  
  private generateFeeStatus(): string {
    return this.randomChoice(['Active', 'Inactive', 'Under Review', 'Suspended']);
  }
  
  private generateFeeDescription(): string {
    const descriptions = [
      'Standard transport fee for route',
      'Express service fee',
      'Long distance route fee',
      'Premium service fee',
      'Basic transport service fee'
    ];
    return this.randomChoice(descriptions);
  }
  
  private generateMaintenanceType(): string {
    return this.randomChoice([
      'Routine Service', 'Oil Change', 'Brake Service', 'Tire Replacement',
      'Engine Repair', 'Transmission Service', 'Electrical Repair',
      'Body Work', 'Safety Inspection', 'Emergency Repair'
    ]);
  }
  
  private generateServiceProvider(): string {
    const providers = [
      'City Motors', 'Express Auto Service', 'Reliable Garage',
      'Professional Auto Care', 'Quick Fix Motors', 'Elite Auto Service',
      'Trusted Mechanics', 'Auto Excellence', 'Premier Service Center'
    ];
    return this.randomChoice(providers);
  }
  
  private generatePartsReplaced(): string[] {
    const parts = [
      'Oil Filter', 'Air Filter', 'Brake Pads', 'Tires', 'Battery',
      'Spark Plugs', 'Belts', 'Hoses', 'Lights', 'Wipers'
    ];
    
    const numParts = this.randomInt(1, 4);
    return this.randomChoices(parts, numParts);
  }
  
  private generateWorkDescription(): string {
    const descriptions = [
      'Routine maintenance and inspection',
      'Engine oil and filter change',
      'Brake system service and repair',
      'Tire rotation and replacement',
      'Electrical system diagnosis and repair',
      'Transmission service and fluid change',
      'Cooling system maintenance',
      'Safety inspection and certification'
    ];
    return this.randomChoice(descriptions);
  }
  
  private generateInvoiceNumber(): string {
    return `INV${this.randomInt(10000, 99999)}`;
  }
  
  private generateMaintenanceStatus(): string {
    return this.randomChoice(['Completed', 'In Progress', 'Scheduled', 'Cancelled']);
  }
  
  private generateMaintenanceNotes(): string | null {
    const notes = [
      'Service completed successfully',
      'Additional work recommended',
      'Vehicle in good condition',
      'Follow-up service required',
      'Warranty work performed'
    ];
    
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }
  
  private async initialize(): Promise<void> {
    console.log('Initializing TransportGenerator...');
  }
  
  private logProgress(current: number, total: number, type: string): void {
    if (current % 10 === 0 || current === total) {
      console.log(`Generated ${current}/${total} ${type}s`);
    }
  }
}