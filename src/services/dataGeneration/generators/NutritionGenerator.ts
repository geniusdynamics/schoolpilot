import { logger } from '@/utils/logging';

// ABOUTME: Generates comprehensive nutrition and meal management data including meal plans, menus, and student assignments
// ABOUTME: Creates realistic meal planning data with dietary considerations and nutritional tracking

import { BaseGenerator } from './BaseGenerator';
import { DataGenerationConfig } from '../types';

export class NutritionGenerator extends BaseGenerator {
  private mealTypes: any[] = [];
  private mealPlans: any[] = [];
  private menuItems: any[] = [];
  private suppliers: any[] = [];

  constructor(config: DataGenerationConfig) {
    super(config);
  }

  async generateData(count: number): Promise<any[]> {
    await this.initialize();
    
    const results: any[] = [];
    
    // Generate meal types
    const mealTypeData = await this.generateMealTypes(6);
    results.push(...mealTypeData);
    
    // Generate food suppliers
    const supplierData = await this.generateFoodSuppliers(15);
    results.push(...supplierData);
    
    // Generate menu items
    const menuItemData = await this.generateMenuItems(200);
    results.push(...menuItemData);
    
    // Generate meal plans
    const mealPlanData = await this.generateMealPlans(12);
    results.push(...mealPlanData);
    
    // Generate daily menus
    const dailyMenuData = await this.generateDailyMenus(90);
    results.push(...dailyMenuData);
    
    // Generate student meal assignments
    const studentMealData = await this.generateStudentMealAssignments(400);
    results.push(...studentMealData);
    
    // Generate meal attendance
    const attendanceData = await this.generateMealAttendance(1000);
    results.push(...attendanceData);
    
    // Generate nutrition reports
    const nutritionReportData = await this.generateNutritionReports(30);
    results.push(...nutritionReportData);
    
    return results;
  }

  private async generateMealTypes(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const mealTypeData = [
      { name: 'Breakfast', time: '07:00', duration: 60, description: 'Morning meal to start the day' },
      { name: 'Mid-Morning Snack', time: '10:00', duration: 15, description: 'Light snack between breakfast and lunch' },
      { name: 'Lunch', time: '13:00', duration: 45, description: 'Main meal of the day' },
      { name: 'Afternoon Snack', time: '15:30', duration: 15, description: 'Light refreshment in the afternoon' },
      { name: 'Dinner', time: '18:30', duration: 45, description: 'Evening meal' },
      { name: 'Supper', time: '20:30', duration: 30, description: 'Light evening meal for boarders' }
    ];
    
    logger.info(`Generating meal types...`);
    
    for (let i = 0; i < mealTypeData.length; i++) {
      const mealTypeInfo = mealTypeData[i];
      
      const mealType = {
        id: this.generateId('mealtype', i),
        name: mealTypeInfo.name,
        serving_time: mealTypeInfo.time,
        duration_minutes: mealTypeInfo.duration,
        description: mealTypeInfo.description,
        is_mandatory: ['Breakfast', 'Lunch', 'Dinner'].includes(mealTypeInfo.name),
        is_for_boarders: true,
        is_for_day_scholars: !mealTypeInfo.name.includes('Supper'),
        calories_target: this.generateCaloriesTarget(mealTypeInfo.name),
        cost_per_serving: this.generateMealCost(mealTypeInfo.name),
        preparation_time: this.generatePreparationTime(mealTypeInfo.name),
        serving_location: this.generateServingLocation(),
        is_active: true,
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.mealTypes.push(mealType);
      
      results.push({
        table: 'meal_types',
        data: mealType
      });
    }
    
    logger.info(`Generated ${mealTypeData.length} meal types`);
    
    return results;
  }

  private generateCaloriesTarget(mealName: string): number {
    const calorieMap: { [key: string]: number } = {
      'Breakfast': 400,
      'Mid-Morning Snack': 150,
      'Lunch': 600,
      'Afternoon Snack': 200,
      'Dinner': 500,
      'Supper': 250
    };
    
    return calorieMap[mealName] || 300;
  }

  private generateMealCost(mealName: string): number {
    const costMap: { [key: string]: number } = {
      'Breakfast': 80,
      'Mid-Morning Snack': 30,
      'Lunch': 120,
      'Afternoon Snack': 40,
      'Dinner': 100,
      'Supper': 60
    };
    
    return costMap[mealName] || 50;
  }

  private generatePreparationTime(mealName: string): number {
    const timeMap: { [key: string]: number } = {
      'Breakfast': 90,
      'Mid-Morning Snack': 30,
      'Lunch': 120,
      'Afternoon Snack': 20,
      'Dinner': 100,
      'Supper': 60
    };
    
    return timeMap[mealName] || 60;
  }

  private generateServingLocation(): string {
    const locations = ['Main Dining Hall', 'Junior Dining Hall', 'Staff Dining Room', 'Outdoor Pavilion'];
    return this.randomChoice(locations);
  }

  private async generateFoodSuppliers(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const supplierNames = [
      'Fresh Farm Produce Ltd', 'Healthy Foods Suppliers', 'Green Valley Farms',
      'Organic Harvest Co.', 'Quality Meat Suppliers', 'Dairy Fresh Ltd',
      'Grain Masters', 'Tropical Fruits Ltd', 'Spice World Suppliers',
      'Bakery Supreme', 'Ocean Fresh Seafood', 'Mountain Spring Water',
      'Local Farmers Cooperative', 'Nutrition Plus Suppliers', 'Farm to Table Ltd'
    ];
    
    logger.info(`Generating ${count} food suppliers...`);
    
    for (let i = 0; i < count; i++) {
      let supplierName;
      if (i < supplierNames.length) {
        supplierName = supplierNames[i];
      } else {
        supplierName = `Food Supplier ${i - supplierNames.length + 1}`;
      }
      
      const supplier = {
        id: this.generateId('supplier', i),
        name: supplierName,
        contact_person: (() => { const name = this.generateName(); return `${name.first} ${name.last}`; })(),
        phone: this.generatePhoneNumber(),
        email: `info@${supplierName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        address: this.generateAddress(),
        city: this.randomChoice(['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret']),
        specialization: this.generateSupplierSpecialization(),
        delivery_days: this.generateDeliveryDays(),
        minimum_order: this.randomInt(5000, 20000),
        payment_terms: this.generatePaymentTerms(),
        quality_rating: this.randomInt(3, 5),
        reliability_rating: this.randomInt(3, 5),
        price_rating: this.randomInt(2, 5),
        contract_start: this.formatDate(this.randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())),
        contract_end: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))),
        is_active: this.randomBoolean(0.9),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.suppliers.push(supplier);
      
      results.push({
        table: 'food_suppliers',
        data: supplier
      });
      
      this.logProgress(i + 1, count, 'food supplier');
    }
    
    return results;
  }

  private generateSupplierSpecialization(): string {
    const specializations = [
      'Fresh Vegetables', 'Fruits', 'Meat & Poultry', 'Dairy Products',
      'Grains & Cereals', 'Spices & Seasonings', 'Bakery Items', 'Beverages',
      'Frozen Foods', 'Organic Products', 'Seafood', 'Snacks & Confectionery'
    ];
    return this.randomChoice(specializations);
  }

  private generateDeliveryDays(): string {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const numDays = this.randomInt(1, 3);
    const selectedDays = [];
    
    for (let i = 0; i < numDays; i++) {
      const day = this.randomChoice(days);
      if (!selectedDays.includes(day)) {
        selectedDays.push(day);
      }
    }
    
    return selectedDays.join(', ');
  }

  private generatePaymentTerms(): string {
    const terms = ['Cash on Delivery', 'Net 7 days', 'Net 14 days', 'Net 30 days', 'Advance Payment'];
    return this.randomChoice(terms);
  }

  private async generateMenuItems(count: number): Promise<any[]> {
    const results: any[] = [];
    
    const menuItemsData = [
      // Breakfast items
      { name: 'Porridge (Uji)', category: 'Breakfast', calories: 150, protein: 6, carbs: 30, fat: 2 },
      { name: 'Bread with Margarine', category: 'Breakfast', calories: 200, protein: 6, carbs: 35, fat: 8 },
      { name: 'Tea with Milk', category: 'Breakfast', calories: 80, protein: 3, carbs: 12, fat: 3 },
      { name: 'Mandazi', category: 'Breakfast', calories: 180, protein: 4, carbs: 25, fat: 8 },
      { name: 'Boiled Eggs', category: 'Breakfast', calories: 140, protein: 12, carbs: 1, fat: 10 },
      
      // Lunch items
      { name: 'Rice and Beans', category: 'Lunch', calories: 350, protein: 15, carbs: 65, fat: 5 },
      { name: 'Ugali with Sukuma Wiki', category: 'Lunch', calories: 300, protein: 8, carbs: 55, fat: 4 },
      { name: 'Chapati with Stew', category: 'Lunch', calories: 400, protein: 18, carbs: 50, fat: 12 },
      { name: 'Githeri', category: 'Lunch', calories: 320, protein: 14, carbs: 58, fat: 6 },
      { name: 'Pilau with Chicken', category: 'Lunch', calories: 450, protein: 25, carbs: 55, fat: 15 },
      
      // Dinner items
      { name: 'Fish with Ugali', category: 'Dinner', calories: 380, protein: 22, carbs: 45, fat: 10 },
      { name: 'Beef Stew with Rice', category: 'Dinner', calories: 420, protein: 28, carbs: 48, fat: 12 },
      { name: 'Chicken with Vegetables', category: 'Dinner', calories: 350, protein: 30, carbs: 20, fat: 15 },
      { name: 'Lentil Curry', category: 'Dinner', calories: 280, protein: 18, carbs: 40, fat: 8 },
      
      // Snacks
      { name: 'Fresh Fruit Salad', category: 'Snack', calories: 120, protein: 2, carbs: 30, fat: 1 },
      { name: 'Roasted Groundnuts', category: 'Snack', calories: 160, protein: 7, carbs: 6, fat: 14 },
      { name: 'Biscuits', category: 'Snack', calories: 140, protein: 3, carbs: 20, fat: 6 },
      { name: 'Yogurt', category: 'Snack', calories: 100, protein: 6, carbs: 12, fat: 4 }
    ];
    
    logger.info(`Generating ${count} menu items...`);
    
    for (let i = 0; i < count; i++) {
      let itemData;
      if (i < menuItemsData.length) {
        itemData = menuItemsData[i];
      } else {
        // Generate additional items
        itemData = this.generateRandomMenuItem();
      }
      
      const supplier = this.randomChoice(this.suppliers);
      
      const menuItem = {
        id: this.generateId('menuitem', i),
        name: itemData.name,
        description: this.generateItemDescription(itemData.name),
        category: itemData.category,
        meal_type: this.getMealTypeForCategory(itemData.category),
        calories_per_serving: itemData.calories,
        protein_grams: itemData.protein,
        carbohydrates_grams: itemData.carbs,
        fat_grams: itemData.fat,
        fiber_grams: this.randomInt(2, 8),
        sodium_mg: this.randomInt(200, 800),
        sugar_grams: this.randomInt(5, 20),
        serving_size: this.generateServingSize(itemData.category),
        ingredients: this.generateIngredients(itemData.name),
        allergens: this.generateAllergens(),
        dietary_restrictions: this.generateDietaryRestrictions(),
        preparation_method: this.generatePreparationMethod(),
        cooking_time: this.randomInt(15, 90),
        cost_per_serving: this.randomInt(30, 150),
        supplier_id: supplier.id,
        shelf_life_days: this.generateShelfLife(itemData.category),
        storage_requirements: this.generateStorageRequirements(),
        popularity_rating: this.randomInt(1, 5),
        nutritional_rating: this.randomInt(2, 5),
        is_vegetarian: this.isVegetarian(itemData.name),
        is_vegan: this.isVegan(itemData.name),
        is_gluten_free: this.isGlutenFree(itemData.name),
        is_active: this.randomBoolean(0.95),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.menuItems.push(menuItem);
      
      results.push({
        table: 'menu_items',
        data: menuItem
      });
      
      this.logProgress(i + 1, count, 'menu item');
    }
    
    return results;
  }

  private generateRandomMenuItem(): any {
    const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    const category = this.randomChoice(categories);
    
    const names = {
      'Breakfast': ['Pancakes', 'Omelette', 'Cereal', 'Toast', 'Fruit Bowl'],
      'Lunch': ['Pasta', 'Salad', 'Soup', 'Sandwich', 'Curry'],
      'Dinner': ['Grilled Fish', 'Roast Chicken', 'Vegetable Stir-fry', 'Meat Pie', 'Casserole'],
      'Snack': ['Cookies', 'Crackers', 'Nuts', 'Dried Fruit', 'Energy Bar']
    };
    
    const name = this.randomChoice(names[category as keyof typeof names]);
    
    return {
      name,
      category,
      calories: this.randomInt(100, 500),
      protein: this.randomInt(5, 30),
      carbs: this.randomInt(10, 60),
      fat: this.randomInt(2, 20)
    };
  }

  private generateItemDescription(name: string): string {
    const descriptions = {
      'Porridge (Uji)': 'Nutritious traditional porridge made from maize flour, served hot',
      'Rice and Beans': 'Protein-rich combination of rice and beans with vegetables',
      'Ugali with Sukuma Wiki': 'Traditional staple food served with nutritious kale vegetables',
      'Chapati with Stew': 'Soft flatbread served with flavorful meat or vegetable stew',
      'Fresh Fruit Salad': 'Seasonal fresh fruits cut and mixed for optimal nutrition'
    };
    
    return descriptions[name as keyof typeof descriptions] || `Delicious ${name} prepared with fresh ingredients`;
  }

  private getMealTypeForCategory(category: string): string {
    const mealTypeMap: { [key: string]: string } = {
      'Breakfast': 'Breakfast',
      'Lunch': 'Lunch',
      'Dinner': 'Dinner',
      'Snack': 'Mid-Morning Snack'
    };
    
    return mealTypeMap[category] || 'Lunch';
  }

  private generateServingSize(category: string): string {
    const sizes = {
      'Breakfast': ['1 cup', '2 slices', '1 bowl', '1 piece'],
      'Lunch': ['1 plate', '1 portion', '1 serving', '1 bowl'],
      'Dinner': ['1 plate', '1 portion', '1 serving'],
      'Snack': ['1 piece', '1 handful', '1 small bowl', '1 cup']
    };
    
    return this.randomChoice(sizes[category as keyof typeof sizes] || sizes['Lunch']);
  }

  private generateIngredients(itemName: string): string {
    const ingredientMap: { [key: string]: string } = {
      'Porridge (Uji)': 'Maize flour, water, milk, sugar, salt',
      'Rice and Beans': 'Rice, beans, onions, tomatoes, cooking oil, spices',
      'Ugali with Sukuma Wiki': 'Maize flour, water, kale, onions, tomatoes, cooking oil',
      'Chapati with Stew': 'Wheat flour, water, oil, salt, meat/vegetables, spices',
      'Fresh Fruit Salad': 'Seasonal fruits, lemon juice, honey'
    };
    
    return ingredientMap[itemName] || 'Various fresh ingredients and spices';
  }

  private generateAllergens(): string | null {
    const allergens = ['Gluten', 'Dairy', 'Nuts', 'Soy', 'Eggs', 'Fish', 'Shellfish'];
    const numAllergens = this.randomInt(0, 2);
    
    if (numAllergens === 0) return null;
    
    const selectedAllergens = [];
    for (let i = 0; i < numAllergens; i++) {
      const allergen = this.randomChoice(allergens);
      if (!selectedAllergens.includes(allergen)) {
        selectedAllergens.push(allergen);
      }
    }
    
    return selectedAllergens.join(', ');
  }

  private generateDietaryRestrictions(): string | null {
    const restrictions = ['Halal', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Low-Sodium'];
    return this.randomBoolean(0.3) ? this.randomChoice(restrictions) : null;
  }

  private generatePreparationMethod(): string {
    const methods = ['Boiled', 'Steamed', 'Fried', 'Grilled', 'Baked', 'Roasted', 'Stewed', 'Raw'];
    return this.randomChoice(methods);
  }

  private generateShelfLife(category: string): number {
    const shelfLifeMap: { [key: string]: number } = {
      'Breakfast': 2,
      'Lunch': 1,
      'Dinner': 1,
      'Snack': 7
    };
    
    return shelfLifeMap[category] || 1;
  }

  private generateStorageRequirements(): string {
    const requirements = ['Refrigerated', 'Room Temperature', 'Frozen', 'Dry Storage', 'Cool & Dry'];
    return this.randomChoice(requirements);
  }

  private isVegetarian(itemName: string): boolean {
    const vegetarianItems = ['Porridge (Uji)', 'Ugali with Sukuma Wiki', 'Fresh Fruit Salad', 'Lentil Curry'];
    return vegetarianItems.includes(itemName) || this.randomBoolean(0.3);
  }

  private isVegan(itemName: string): boolean {
    const veganItems = ['Fresh Fruit Salad', 'Lentil Curry'];
    return veganItems.includes(itemName) || this.randomBoolean(0.15);
  }

  private isGlutenFree(itemName: string): boolean {
    const glutenFreeItems = ['Fresh Fruit Salad', 'Rice and Beans', 'Boiled Eggs'];
    return glutenFreeItems.includes(itemName) || this.randomBoolean(0.2);
  }

  private async generateMealPlans(count: number): Promise<any[]> {
    const results: any[] = [];
    
    logger.info(`Generating ${count} meal plans...`);
    
    for (let i = 0; i < count; i++) {
      const startDate = this.randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30); // 30-day meal plans
      
      const mealPlan = {
        id: this.generateId('mealplan', i),
        name: this.generateMealPlanName(i),
        description: this.generateMealPlanDescription(),
        start_date: this.formatDate(startDate),
        end_date: this.formatDate(endDate),
        target_group: this.generateTargetGroup(),
        total_students: this.randomInt(100, 500),
        daily_budget: this.randomInt(15000, 50000),
        calories_per_day: this.randomInt(1800, 2500),
        meals_per_day: this.randomInt(3, 6),
        dietary_focus: this.generateDietaryFocus(),
        nutritionist_id: `staff_${this.randomInt(1, 5)}`,
        approved_by: `staff_${this.randomInt(1, 10)}`,
        approval_date: this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())),
        status: this.randomChoice(['Draft', 'Active', 'Completed', 'Cancelled']),
        feedback_score: this.randomInt(3, 5),
        cost_effectiveness: this.randomInt(3, 5),
        nutritional_balance: this.randomInt(3, 5),
        student_satisfaction: this.randomInt(2, 5),
        notes: this.generateMealPlanNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      this.mealPlans.push(mealPlan);
      
      results.push({
        table: 'meal_plans',
        data: mealPlan
      });
      
      this.logProgress(i + 1, count, 'meal plan');
    }
    
    return results;
  }

  private generateMealPlanName(index: number): string {
    const names = [
      'Balanced Nutrition Plan',
      'High Protein Diet',
      'Vegetarian Meal Plan',
      'Budget-Friendly Menu',
      'Cultural Diversity Plan',
      'Exam Period Nutrition',
      'Sports Team Diet',
      'Weight Management Plan',
      'Allergy-Friendly Menu',
      'Traditional Foods Plan',
      'Healthy Growth Diet',
      'Energy Boost Menu'
    ];
    
    return index < names.length ? names[index] : `Meal Plan ${index + 1}`;
  }

  private generateMealPlanDescription(): string {
    const descriptions = [
      'Comprehensive meal plan designed to meet nutritional needs of growing students',
      'Balanced diet plan focusing on protein, vitamins, and minerals',
      'Cost-effective meal plan without compromising nutritional value',
      'Culturally diverse menu to cater to different student backgrounds',
      'Special diet plan for students with dietary restrictions'
    ];
    return this.randomChoice(descriptions);
  }

  private generateTargetGroup(): string {
    const groups = [
      'All Students', 'Boarders Only', 'Day Scholars', 'Form 1-2', 'Form 3-4',
      'Sports Teams', 'Special Dietary Needs', 'Staff', 'Primary Section'
    ];
    return this.randomChoice(groups);
  }

  private generateDietaryFocus(): string {
    const focuses = [
      'Balanced Nutrition', 'High Protein', 'Low Fat', 'High Fiber',
      'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Traditional Foods'
    ];
    return this.randomChoice(focuses);
  }

  private generateMealPlanNotes(): string | null {
    const notes = [
      'Plan approved by school nutritionist',
      'Positive feedback from students',
      'Cost-effective implementation',
      'Requires special ingredient sourcing',
      'Seasonal menu adjustments needed'
    ];
    
    return this.randomBoolean(0.4) ? this.randomChoice(notes) : null;
  }

  private async generateDailyMenus(count: number): Promise<any[]> {
    const results: any[] = [];
    
    logger.info(`Generating ${count} daily menus...`);
    
    for (let i = 0; i < count; i++) {
      const mealPlan = this.randomChoice(this.mealPlans);
      const menuDate = this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date());
      
      const dailyMenu = {
        id: this.generateId('dailymenu', i),
        meal_plan_id: mealPlan.id,
        menu_date: this.formatDate(menuDate),
        day_of_week: this.getDayOfWeek(menuDate),
        breakfast_items: this.selectMenuItems('Breakfast', 3),
        lunch_items: this.selectMenuItems('Lunch', 4),
        dinner_items: this.selectMenuItems('Dinner', 3),
        snack_items: this.selectMenuItems('Snack', 2),
        total_calories: this.randomInt(1800, 2500),
        total_cost: this.randomInt(300, 600),
        students_served: this.randomInt(150, 450),
        waste_percentage: this.randomInt(5, 15),
        satisfaction_rating: this.randomInt(3, 5),
        special_notes: this.generateDailyMenuNotes(),
        prepared_by: `staff_${this.randomInt(1, 8)}`,
        approved_by: `staff_${this.randomInt(1, 5)}`,
        is_published: this.randomBoolean(0.9),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'daily_menus',
        data: dailyMenu
      });
      
      this.logProgress(i + 1, count, 'daily menu');
    }
    
    return results;
  }

  private selectMenuItems(mealType: string, count: number): string {
    const items = this.menuItems.filter(item => item.meal_type === mealType);
    const selectedItems = [];
    
    for (let i = 0; i < Math.min(count, items.length); i++) {
      const item = this.randomChoice(items);
      if (!selectedItems.includes(item.id)) {
        selectedItems.push(item.id);
      }
    }
    
    return selectedItems.join(', ');
  }

  private getDayOfWeek(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  private generateDailyMenuNotes(): string | null {
    const notes = [
      'Special occasion menu',
      'Seasonal ingredients featured',
      'Student request accommodated',
      'Cultural celebration menu',
      'Healthy eating promotion day'
    ];
    
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }

  private async generateStudentMealAssignments(count: number): Promise<any[]> {
    const results: any[] = [];
    
    logger.info(`Generating ${count} student meal assignments...`);
    
    for (let i = 0; i < count; i++) {
      const studentId = `student_${this.randomInt(1, 500)}`;
      const mealPlan = this.randomChoice(this.mealPlans);
      
      const assignment = {
        id: this.generateId('studentmeal', i),
        student_id: studentId,
        meal_plan_id: mealPlan.id,
        assignment_date: this.formatDate(this.randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date())),
        meal_type_preferences: this.generateMealPreferences(),
        dietary_restrictions: this.generateStudentDietaryRestrictions(),
        allergies: this.generateStudentAllergies(),
        special_requirements: this.generateSpecialRequirements(),
        daily_calorie_target: this.randomInt(1600, 2200),
        payment_status: this.randomChoice(['Paid', 'Pending', 'Partial', 'Overdue']),
        monthly_fee: this.randomInt(3000, 8000),
        amount_paid: 0, // Will be calculated
        balance: 0, // Will be calculated
        parent_approval: this.randomBoolean(0.9),
        medical_clearance: this.randomBoolean(0.95),
        start_date: this.formatDate(this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())),
        end_date: this.formatDate(this.randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))),
        status: this.randomChoice(['Active', 'Suspended', 'Completed', 'Cancelled']),
        assigned_by: `staff_${this.randomInt(1, 5)}`,
        notes: this.generateAssignmentNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      // Calculate payment amounts
      if (assignment.payment_status === 'Paid') {
        assignment.amount_paid = assignment.monthly_fee;
        assignment.balance = 0;
      } else if (assignment.payment_status === 'Partial') {
        assignment.amount_paid = this.randomInt(assignment.monthly_fee * 0.3, assignment.monthly_fee * 0.8);
        assignment.balance = assignment.monthly_fee - assignment.amount_paid;
      } else {
        assignment.balance = assignment.monthly_fee;
      }
      
      results.push({
        table: 'student_meal_assignments',
        data: assignment
      });
      
      this.logProgress(i + 1, count, 'student meal assignment');
    }
    
    return results;
  }

  private generateMealPreferences(): string {
    const preferences = ['All Meals', 'Breakfast & Lunch', 'Lunch & Dinner', 'Lunch Only', 'Breakfast & Dinner'];
    return this.randomChoice(preferences);
  }

  private generateStudentDietaryRestrictions(): string | null {
    const restrictions = ['Vegetarian', 'Vegan', 'Halal', 'No Pork', 'Low Sodium', 'Diabetic Diet'];
    return this.randomBoolean(0.2) ? this.randomChoice(restrictions) : null;
  }

  private generateStudentAllergies(): string | null {
    const allergies = ['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy'];
    return this.randomBoolean(0.15) ? this.randomChoice(allergies) : null;
  }

  private generateSpecialRequirements(): string | null {
    const requirements = [
      'Extra portions for sports training',
      'Soft foods due to dental work',
      'High protein for muscle building',
      'Low fat for health reasons',
      'Cultural food preferences'
    ];
    
    return this.randomBoolean(0.1) ? this.randomChoice(requirements) : null;
  }

  private generateAssignmentNotes(): string | null {
    const notes = [
      'Parent requested special diet',
      'Medical recommendation',
      'Sports team member',
      'Regular meal plan assignment',
      'Temporary dietary adjustment'
    ];
    
    return this.randomBoolean(0.3) ? this.randomChoice(notes) : null;
  }

  private async generateMealAttendance(count: number): Promise<any[]> {
    const results: any[] = [];
    
    logger.info(`Generating ${count} meal attendance records...`);
    
    for (let i = 0; i < count; i++) {
      const studentId = `student_${this.randomInt(1, 500)}`;
      const mealType = this.randomChoice(this.mealTypes);
      const attendanceDate = this.randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
      
      const attendance = {
        id: this.generateId('attendance', i),
        student_id: studentId,
        meal_type_id: mealType.id,
        attendance_date: this.formatDate(attendanceDate),
        check_in_time: this.generateMealCheckInTime(mealType.serving_time),
        check_out_time: this.generateMealCheckOutTime(mealType.serving_time, mealType.duration_minutes),
        attended: this.randomBoolean(0.85),
        late_arrival: this.randomBoolean(0.15),
        early_departure: this.randomBoolean(0.1),
        meal_rating: this.randomInt(1, 5),
        portion_consumed: this.randomChoice(['Full', 'Partial', 'None']),
        waste_reported: this.randomBoolean(0.2),
        special_request: this.generateSpecialMealRequest(),
        health_issue: this.randomBoolean(0.05),
        recorded_by: `staff_${this.randomInt(1, 8)}`,
        notes: this.generateAttendanceNotes(),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'meal_attendance',
        data: attendance
      });
      
      this.logProgress(i + 1, count, 'meal attendance');
    }
    
    return results;
  }

  private generateMealCheckInTime(servingTime: string): string {
    const [hours, minutes] = servingTime.split(':').map(Number);
    const checkInTime = new Date();
    checkInTime.setHours(hours, minutes + this.randomInt(-10, 15), 0, 0);
    return checkInTime.toTimeString().slice(0, 5);
  }

  private generateMealCheckOutTime(servingTime: string, duration: number): string {
    const [hours, minutes] = servingTime.split(':').map(Number);
    const checkOutTime = new Date();
    checkOutTime.setHours(hours, minutes + duration + this.randomInt(-10, 10), 0, 0);
    return checkOutTime.toTimeString().slice(0, 5);
  }

  private generateSpecialMealRequest(): string | null {
    const requests = [
      'Extra portion',
      'No vegetables',
      'Less spicy',
      'Extra sauce',
      'Separate serving',
      'Warm food only'
    ];
    
    return this.randomBoolean(0.1) ? this.randomChoice(requests) : null;
  }

  private generateAttendanceNotes(): string | null {
    const notes = [
      'Student enjoyed the meal',
      'Complained about taste',
      'Requested recipe',
      'Allergic reaction reported',
      'Praised kitchen staff'
    ];
    
    return this.randomBoolean(0.2) ? this.randomChoice(notes) : null;
  }

  private async generateNutritionReports(count: number): Promise<any[]> {
    const results: any[] = [];
    
    logger.info(`Generating ${count} nutrition reports...`);
    
    for (let i = 0; i < count; i++) {
      const reportDate = this.randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date());
      const mealPlan = this.randomChoice(this.mealPlans);
      
      const report = {
        id: this.generateId('nutritionreport', i),
        report_date: this.formatDate(reportDate),
        report_period: this.generateReportPeriod(),
        meal_plan_id: mealPlan.id,
        total_students: this.randomInt(200, 500),
        total_meals_served: this.randomInt(5000, 15000),
        average_calories_per_day: this.randomInt(1800, 2400),
        average_protein_grams: this.randomInt(60, 100),
        average_carbs_grams: this.randomInt(200, 350),
        average_fat_grams: this.randomInt(50, 90),
        average_fiber_grams: this.randomInt(20, 40),
        vitamin_a_adequacy: this.randomInt(70, 120),
        vitamin_c_adequacy: this.randomInt(80, 150),
        iron_adequacy: this.randomInt(75, 110),
        calcium_adequacy: this.randomInt(65, 105),
        nutritional_score: this.randomInt(70, 95),
        cost_per_student_per_day: this.randomInt(250, 450),
        food_waste_percentage: this.randomInt(8, 18),
        student_satisfaction: this.randomInt(3, 5),
        recommendations: this.generateNutritionRecommendations(),
        prepared_by: `staff_${this.randomInt(1, 3)}`,
        reviewed_by: `staff_${this.randomInt(1, 5)}`,
        status: this.randomChoice(['Draft', 'Final', 'Under Review']),
        created_at: this.generateTimestamp(365),
        updated_at: this.generateTimestamp(30)
      };
      
      results.push({
        table: 'nutrition_reports',
        data: report
      });
      
      this.logProgress(i + 1, count, 'nutrition report');
    }
    
    return results;
  }

  private generateReportPeriod(): string {
    const periods = ['Weekly', 'Monthly', 'Quarterly', 'Termly', 'Annual'];
    return this.randomChoice(periods);
  }

  private generateNutritionRecommendations(): string {
    const recommendations = [
      'Increase vegetable portions in lunch meals',
      'Add more protein sources to breakfast',
      'Reduce sodium content in prepared foods',
      'Include more whole grains in meal plans',
      'Increase fruit servings for vitamin C',
      'Consider iron-fortified foods for growing students',
      'Reduce food waste through better portion control',
      'Introduce more culturally diverse healthy options'
    ];
    
    const numRecommendations = this.randomInt(2, 4);
    const selectedRecommendations = [];
    
    for (let i = 0; i < numRecommendations; i++) {
      const recommendation = this.randomChoice(recommendations);
      if (!selectedRecommendations.includes(recommendation)) {
        selectedRecommendations.push(recommendation);
      }
    }
    
    return selectedRecommendations.join('; ');
  }
}