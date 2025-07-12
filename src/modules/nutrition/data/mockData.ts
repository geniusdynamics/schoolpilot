// ABOUTME: Provides initial mock data for entities specific to the Nutrition & Wallet module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import {
    MealPlan,
    StudentMealPlan,
    Menu,
    MealConsumptionLog,
    Merchant,
    StudentWallet,
    WalletTransaction,
    StudentMealPlanStatus,
    MealType,
    WalletTransactionType
} from '../../../core/types';

export const initialMockMealPlans: MealPlan[] = [
  { id: 1, name: 'Standard Lunch Plan', description: 'Daily lunch for students', cost_per_period: 7500, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, name: 'Full Board Plan (All Meals)', description: 'Breakfast, Lunch, Supper, and Snacks', cost_per_period: 15000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, name: 'Pay-as-you-eat Wallet', description: 'Students use wallet balance to pay for meals', cost_per_period: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockStudentMealPlans: StudentMealPlan[] = [
  { id: 'SMP001', student_id: 'STU001', school_period_id: 3, meal_plan_id: 2, status: StudentMealPlanStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Kevin Malone', school_period_name: 'Term 3 - AY 2023/2024', meal_plan_name: 'Full Board Plan (All Meals)' },
  { id: 'SMP002', student_id: 'STU002', school_period_id: 3, meal_plan_id: 1, status: StudentMealPlanStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Angela Martin', school_period_name: 'Term 3 - AY 2023/2024', meal_plan_name: 'Standard Lunch Plan' },
];

export const initialMockMenus: Menu[] = [
  {id: 'MENU001', menu_date: '2024-07-29', meal_type: MealType.LUNCH, description: "Rice, Beans, Cabbage", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 'MENU002', menu_date: '2024-07-29', meal_type: MealType.BREAKFAST, description: "Tea, Bread, Egg", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 'MENU003', menu_date: '2024-07-30', meal_type: MealType.LUNCH, description: "Ugali, Sukuma Wiki, Beef", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockMealConsumptionLogs: MealConsumptionLog[] = [
    { id: 'MCL001', student_id: 'STU001', menu_id: 'MENU001', consumption_time: '2024-07-29T13:05:00Z', student_name: 'Kevin Malone', menu_description: 'Rice, Beans, Cabbage' }
];

export const initialMockMerchants: Merchant[] = [
  { id: 1, name: 'School Canteen', gl_account_id: 410, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'Canteen Sales Revenue' },
  { id: 2, name: 'Uniform Shop', gl_account_id: 411, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'Uniform Shop Sales Revenue' },
];

export const initialMockStudentWallets: StudentWallet[] = [
  { student_id: 'STU003', balance: 1500.00, last_updated: new Date().toISOString(), student_name: 'Jim Halpert' },
  { student_id: 'STU004', balance: 500.00, last_updated: new Date().toISOString(), student_name: 'Pam Beesly' },
];

export const initialMockWalletTransactions: WalletTransaction[] = [
  { id: 'WTX001', student_id: 'STU003', transaction_date: '2024-07-28T10:00:00Z', transaction_type: WalletTransactionType.DEPOSIT, amount: 2000, description: 'Pocket money deposit by parent', running_balance: 2000, student_name: 'Jim Halpert' },
  { id: 'WTX002', student_id: 'STU003', transaction_date: '2024-07-29T13:10:00Z', transaction_type: WalletTransactionType.PURCHASE, amount: -500, description: 'Canteen Purchase - Snacks', reference_id: '1', reference_type: 'Merchant', running_balance: 1500, student_name: 'Jim Halpert' },
  { id: 'WTX003', student_id: 'STU004', transaction_date: '2024-07-25T08:00:00Z', transaction_type: WalletTransactionType.DEPOSIT, amount: 1500, description: 'Initial wallet funding', running_balance: 1500, student_name: 'Pam Beesly' },
  { id: 'WTX004', student_id: 'STU004', transaction_date: '2024-07-26T12:30:00Z', transaction_type: WalletTransactionType.PURCHASE, amount: -300, description: 'Lunch Purchase - Burger & Fries', reference_id: '1', reference_type: 'Merchant', running_balance: 1200, student_name: 'Pam Beesly' },
  { id: 'WTX005', student_id: 'STU004', transaction_date: '2024-07-27T10:15:00Z', transaction_type: WalletTransactionType.PURCHASE, amount: -150, description: 'Snack Purchase - Juice & Biscuits', reference_id: '1', reference_type: 'Merchant', running_balance: 1050, student_name: 'Pam Beesly' },
  { id: 'WTX006', student_id: 'STU003', transaction_date: '2024-07-30T14:00:00Z', transaction_type: WalletTransactionType.PURCHASE, amount: -250, description: 'Lunch Purchase - Rice & Chicken', reference_id: '1', reference_type: 'Merchant', running_balance: 1250, student_name: 'Jim Halpert' },
];

// Extended nutrition and meal planning mock data
export const initialMockExtendedMealPlans: MealPlan[] = [
  ...initialMockMealPlans,
  { id: 4, name: 'Breakfast Only Plan', description: 'Daily breakfast for day scholars', cost_per_period: 3000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 5, name: 'Lunch & Snack Plan', description: 'Lunch plus afternoon snack', cost_per_period: 9500, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 6, name: 'Weekend Special Plan', description: 'Weekend meals for boarding students', cost_per_period: 4000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 7, name: 'Vegetarian Plan', description: 'Full vegetarian meal plan', cost_per_period: 13000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 8, name: 'Special Diet Plan', description: 'For students with dietary restrictions', cost_per_period: 16000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockExtendedStudentMealPlans: StudentMealPlan[] = [
  ...initialMockStudentMealPlans,
  { id: 'SMP003', student_id: 'STU004', school_period_id: 3, meal_plan_id: 3, status: StudentMealPlanStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Pam Beesly', school_period_name: 'Term 3 - AY 2023/2024', meal_plan_name: 'Pay-as-you-eat Wallet' },
  { id: 'SMP004', student_id: 'STU005', school_period_id: 3, meal_plan_id: 4, status: StudentMealPlanStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Stanley Hudson', school_period_name: 'Term 3 - AY 2023/2024', meal_plan_name: 'Breakfast Only Plan' },
  { id: 'SMP005', student_id: 'STU006', school_period_id: 3, meal_plan_id: 7, status: StudentMealPlanStatus.ACTIVE, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Kelly Kapoor', school_period_name: 'Term 3 - AY 2023/2024', meal_plan_name: 'Vegetarian Plan' },
  { id: 'SMP006', student_id: 'STU007', school_period_id: 3, meal_plan_id: 8, status: StudentMealPlanStatus.PENDING, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Ryan Howard', school_period_name: 'Term 3 - AY 2023/2024', meal_plan_name: 'Special Diet Plan' },
];

export const initialMockExtendedMenus: Menu[] = [
  ...initialMockMenus,
  // Week of July 29 - August 4, 2024
  { id: 'MENU004', menu_date: '2024-07-29', meal_type: MealType.SUPPER, description: 'Chapati, Green Grams, Vegetables', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'MENU005', menu_date: '2024-07-30', meal_type: MealType.BREAKFAST, description: 'Porridge, Bread, Milk, Banana', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'MENU006', menu_date: '2024-07-30', meal_type: MealType.SUPPER, description: 'Rice, Fish Stew, Spinach', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'MENU007', menu_date: '2024-07-31', meal_type: MealType.BREAKFAST, description: 'Tea, Mandazi, Boiled Egg', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'MENU008', menu_date: '2024-07-31', meal_type: MealType.LUNCH, description: 'Ugali, Chicken Curry, Cabbage', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'MENU009', menu_date: '2024-07-31', meal_type: MealType.SUPPER, description: 'Githeri, Beef Stew, Kales', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'MENU010', menu_date: '2024-08-01', meal_type: MealType.BREAKFAST, description: 'Uji, Bread, Margarine, Orange', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'MENU011', menu_date: '2024-08-01', meal_type: MealType.LUNCH, description: 'Rice, Bean Stew, Collard Greens', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'MENU012', menu_date: '2024-08-01', meal_type: MealType.SUPPER, description: 'Chapati, Liver Stew, Mixed Vegetables', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const initialMockExtendedMealConsumptionLogs: MealConsumptionLog[] = [
  ...initialMockMealConsumptionLogs,
  { id: 'MCL002', student_id: 'STU002', menu_id: 'MENU002', consumption_time: '2024-07-29T08:30:00Z', student_name: 'Angela Martin', menu_description: 'Tea, Bread, Egg' },
  { id: 'MCL003', student_id: 'STU001', menu_id: 'MENU004', consumption_time: '2024-07-29T19:00:00Z', student_name: 'Kevin Malone', menu_description: 'Chapati, Green Grams, Vegetables' },
  { id: 'MCL004', student_id: 'STU006', menu_id: 'MENU005', consumption_time: '2024-07-30T08:15:00Z', student_name: 'Kelly Kapoor', menu_description: 'Porridge, Bread, Milk, Banana' },
  { id: 'MCL005', student_id: 'STU002', menu_id: 'MENU003', consumption_time: '2024-07-30T13:20:00Z', student_name: 'Angela Martin', menu_description: 'Ugali, Sukuma Wiki, Beef' },
  { id: 'MCL006', student_id: 'STU006', menu_id: 'MENU006', consumption_time: '2024-07-30T19:15:00Z', student_name: 'Kelly Kapoor', menu_description: 'Rice, Fish Stew, Spinach' },
];

export const initialMockExtendedMerchants: Merchant[] = [
  ...initialMockMerchants,
  { id: 3, name: 'Tuck Shop', gl_account_id: 412, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'Tuck Shop Sales Revenue' },
  { id: 4, name: 'Stationery Store', gl_account_id: 413, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'Stationery Sales Revenue' },
  { id: 5, name: 'Sports Equipment Store', gl_account_id: 414, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), gl_account_name: 'Sports Equipment Sales Revenue' },
];

export const initialMockExtendedStudentWallets: StudentWallet[] = [
  ...initialMockStudentWallets,
  { student_id: 'STU005', balance: 750.00, last_updated: new Date().toISOString(), student_name: 'Stanley Hudson' },
  { student_id: 'STU006', balance: 1200.00, last_updated: new Date().toISOString(), student_name: 'Kelly Kapoor' },
  { student_id: 'STU007', balance: 0.00, last_updated: new Date().toISOString(), student_name: 'Ryan Howard' },
  { student_id: 'STU008', balance: 850.00, last_updated: new Date().toISOString(), student_name: 'Toby Flenderson' },
];

// Nutrition analytics and dietary information
export const initialMockNutritionAnalytics = {
  meal_participation_rate: 0.87,
  average_daily_consumption: {
    breakfast: 0.75,
    lunch: 0.95,
    supper: 0.82
  },
  popular_meals: [
    { meal: 'Rice, Beans, Cabbage', consumption_count: 245 },
    { meal: 'Ugali, Sukuma Wiki, Beef', consumption_count: 198 },
    { meal: 'Chapati, Green Grams, Vegetables', consumption_count: 167 },
    { meal: 'Githeri, Beef Stew, Kales', consumption_count: 143 },
    { meal: 'Rice, Fish Stew, Spinach', consumption_count: 128 }
  ],
  dietary_preferences: [
    { preference: 'Regular Diet', student_count: 287 },
    { preference: 'Vegetarian', student_count: 23 },
    { preference: 'Special Diet', student_count: 12 },
    { preference: 'Halal', student_count: 8 }
  ],
  wallet_usage_stats: {
    total_wallet_transactions: 1247,
    average_transaction_amount: 275,
    most_active_merchant: 'School Canteen',
    daily_wallet_spend: 12450
  }
};

export const initialMockDietaryRestrictions = [
  { id: 1, name: 'Vegetarian', description: 'No meat or fish products' },
  { id: 2, name: 'Vegan', description: 'No animal products' },
  { id: 3, name: 'Halal', description: 'Islamic dietary requirements' },
  { id: 4, name: 'Gluten-Free', description: 'No gluten-containing products' },
  { id: 5, name: 'Dairy-Free', description: 'No dairy products' },
  { id: 6, name: 'Nut Allergy', description: 'No nuts or nut products' },
  { id: 7, name: 'Diabetic', description: 'Low sugar, controlled carbohydrates' },
  { id: 8, name: 'Low Sodium', description: 'Reduced salt intake' }
];

export const initialMockStudentDietaryInfo = [
  { student_id: 'STU006', dietary_restriction_id: 1, notes: 'Strict vegetarian - no meat, fish, or eggs', student_name: 'Kelly Kapoor' },
  { student_id: 'STU007', dietary_restriction_id: 4, notes: 'Celiac disease - requires gluten-free alternatives', student_name: 'Ryan Howard' },
  { student_id: 'STU008', dietary_restriction_id: 6, notes: 'Severe peanut allergy - carry EpiPen', student_name: 'Toby Flenderson' },
  { student_id: 'STU009', dietary_restriction_id: 3, notes: 'Halal dietary requirements', student_name: 'Creed Bratton' },
  { student_id: 'STU010', dietary_restriction_id: 7, notes: 'Type 1 diabetes - monitor carbohydrate intake', student_name: 'Meredith Palmer' }
];

export const initialMockNutritionSettings = {
  meal_serving_times: {
    breakfast: { start: '07:00', end: '09:00' },
    lunch: { start: '12:00', end: '14:00' },
    supper: { start: '18:00', end: '20:00' }
  },
  wallet_limits: {
    daily_spend_limit: 1000,
    low_balance_alert: 200,
    minimum_balance: 50
  },
  meal_plan_settings: {
    advance_booking_days: 7,
    cancellation_deadline_hours: 2,
    special_diet_surcharge: 0.15
  },
  canteen_hours: {
    weekdays: '07:00 - 20:00',
    weekends: '08:00 - 19:00',
    holidays: 'Closed'
  }
};

// Ensure all AppDataType keys for nutrition are exported
export const mealPlans = initialMockMealPlans;
export const menus = initialMockMenus;
export const merchants = initialMockMerchants;
export const mealConsumptionLogs = initialMockMealConsumptionLogs;
export const studentWallets = initialMockStudentWallets;
export const walletTransactions = initialMockWalletTransactions;
