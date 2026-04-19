// ABOUTME: Utility functions for generating realistic mock data
// ABOUTME: Provides names, addresses, phone numbers, and other data for Kenya/East African context

export const FIRST_NAMES = {
  male: [
    'James', 'John', 'Michael', 'David', 'Peter', 'Joseph', 'Paul', 'George', 'Daniel', 'Samuel',
    'Patrick', 'Francis', 'Stephen', 'Charles', 'Andrew', 'Robert', 'Thomas', 'William', 'Henry', 'Edward',
    'Emmanuel', 'Timothy', 'Joshua', 'Matthew', 'Simon', 'Mark', 'Luke', 'Benjamin', 'Isaac', 'Jacob',
    'Mwangi', 'Kamau', 'Njoroge', 'Kariuki', 'Wanjiru', 'Wafula', 'Ochieng', 'Otieno', 'Omondi', 'Kipchoge',
    'Kiptoo', 'Kiprotich', 'Kibet', 'Langat', 'Rono', 'Koech', 'Kimutai', 'Too', 'Kosgei', 'Kigen'
  ],
  female: [
    'Mary', 'Jane', 'Elizabeth', 'Grace', 'Mercy', 'Ann', 'Susan', 'Margaret', 'Lucy', 'Agnes',
    'Rose', 'Linda', 'Sarah', 'Joyce', 'Julia', 'Beatrice', 'Catherine', 'Ruth', 'Esther', 'Martha',
    'Faith', 'Hope', 'Charity', 'Patience', 'Joy', 'Peace', 'Comfort', 'Constance', 'Priscilla', 'Rebecca',
    'Wanjiku', 'Wambui', 'Wangari', 'Wanjiru', 'Wangechi', 'Wairimu', 'Waithera', 'Wahu', 'Akinyi', 'Achieng',
    'Atieno', 'Adhiambo', 'Anyango', 'Auma', 'Chebet', 'Jepchirchir', 'Jepkoech', 'Jeptoo', 'Kipchumba', 'Cherono'
  ]
};

export const LAST_NAMES = [
  'Mwangi', 'Kamau', 'Njoroge', 'Kariuki', 'Wanjiru', 'Wafula', 'Ochieng', 'Otieno', 'Omondi', 'Odhiambo',
  'Kipchoge', 'Kiptoo', 'Kiprotich', 'Kibet', 'Langat', 'Rono', 'Koech', 'Kimutai', 'Too', 'Kosgei',
  'Wanjiku', 'Wambui', 'Wangari', 'Wangechi', 'Wairimu', 'Waithera', 'Wahu', 'Akinyi', 'Achieng', 'Atieno',
  'Adhiambo', 'Anyango', 'Auma', 'Chebet', 'Jepchirchir', 'Jepkoech', 'Jeptoo', 'Kigen', 'Cherono', 'Kimani',
  'Mutua', 'Mutiso', 'Musyoka', 'Munyao', 'Muthama', 'Muli', 'Mbai', 'Kioko', 'Kivuva', 'Kilonzo',
  'Wekesa', 'Wanyonyi', 'Simiyu', 'Mayabi', 'Barasa', 'Masika', 'Wafubwa', 'Shikuku', 'Khisa', 'Mulongo',
  'Ochieng', 'Oloo', 'Onyango', 'Owuor', 'Okoth', 'Okello', 'Omollo', 'Omondi', 'Odong', 'Odhiambo',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor'
];

export const TOWNS = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale', 'Machakos', 'Kakamega',
  'Kisii', 'Meru', 'Nyeri', 'Embu', 'Kericho', 'Bungoma', 'Kajiado', 'Nyahururu', 'Narok', 'Naivasha'
];

export const STREETS = [
  'Moi Avenue', 'Kenyatta Avenue', 'Tom Mboya Street', 'Kimathi Street', 'Haile Selassie Avenue', 'Ronald Ngala Street',
  'Mama Ngina Street', 'Mombasa Road', 'Langata Road', 'Ngong Road', 'Jogoo Road', 'Kasarani Road',
  'Thika Road', 'Waiyaki Way', 'Jogoo Road', 'Lusaka Road', 'Enterprise Road', 'Industrial Area Road',
  'Church Road', 'School Lane', 'Teachers Road', 'Hospital Road', 'Market Street', 'Station Road'
];

export const RELATIONSHIP_TYPES = [
  'Father', 'Mother', 'Step-Father', 'Step-Mother', 'Guardian', 'Grandfather', 'Grandmother',
  'Uncle', 'Aunt', 'Brother', 'Sister', 'Cousin', 'Family Friend', 'Sponsor'
];

export const GUARDIAN_OCCUPATIONS = [
  'Teacher', 'Doctor', 'Nurse', 'Engineer', 'Business Owner', 'Farmer', 'Accountant', 'Lawyer',
  'Driver', 'Mechanic', 'Trader', 'Civil Servant', 'Police Officer', 'Soldier', 'Retired',
  'Housewife', 'Unemployed', 'Self-employed', 'Consultant', 'Manager'
];

export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateKenyanPhone(): string {
  const prefixes = ['0700', '0701', '0702', '0703', '0704', '0705', '0706', '0707', '0708', '0709',
    '0710', '0711', '0712', '0713', '0714', '0715', '0716', '0717', '0718', '0719',
    '0720', '0721', '0722', '0723', '0724', '0725', '0726', '0727', '0728', '0729',
    '0740', '0741', '0742', '0743', '0744', '0745', '0746', '0747', '0748', '0749',
    '0750', '0751', '0752', '0753', '0754', '0755', '0756', '0757', '0758', '0759',
    '0760', '0761', '0762', '0763', '0764', '0765', '0766', '0767', '0768', '0769',
    '0770', '0771', '0772', '0773', '0774', '0775', '0776', '0777', '0778', '0779',
    '0790', '0791', '0792', '0793', '0794', '0795', '0796', '0797', '0798', '0799'];
  const prefix = getRandomItem(prefixes);
  const suffix = String(getRandomInt(100000, 999999));
  return prefix + suffix;
}

export function generateEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.co.ke', 'email.co.ke'];
  const patterns = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}`,
    `${lastName.toLowerCase()}.${firstName.toLowerCase()}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${getRandomInt(1, 99)}`
  ];
  return `${getRandomItem(patterns)}@${getRandomItem(domains)}`;
}

export function generateAddress(): { town: string; street: string; postalCode: string } {
  return {
    town: getRandomItem(TOWNS),
    street: getRandomItem(STREETS),
    postalCode: String(getRandomInt(100, 99999)).padStart(5, '0')
  };
}

export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${random}`;
}

export function generateAdmissionNo(index: number): string {
  const year = new Date().getFullYear();
  const paddedIndex = String(index).padStart(4, '0');
  return `ADM${year}${paddedIndex}`;
}

export function generateStaffNo(index: number): string {
  const year = new Date().getFullYear();
  const paddedIndex = String(index).padStart(3, '0');
  return `EMP${year}${paddedIndex}`;
}

export function generateDateOfBirth(minAge: number = 12, maxAge: number = 20): string {
  const today = new Date();
  const year = today.getFullYear() - getRandomInt(minAge, maxAge);
  const month = getRandomInt(0, 11);
  const day = getRandomInt(1, 28); // Avoid invalid dates
  return new Date(year, month, day).toISOString().split('T')[0];
}

export function generateGuardianForStudent(
  studentFirstName: string,
  studentLastName: string,
  relationshipType: string
): {
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string;
  email: string;
  occupation: string;
} {
  // 70% chance guardian shares surname with student
  const shareSurname = Math.random() < 0.7;
  const lastName = shareSurname ? studentLastName : getRandomItem(LAST_NAMES);
  
  // For mothers, use female name; for fathers, male name; others random
  let firstName: string;
  if (relationshipType === 'Mother' || relationshipType === 'Step-Mother' || relationshipType === 'Grandmother' || relationshipType === 'Aunt') {
    firstName = getRandomItem(FIRST_NAMES.female);
  } else if (relationshipType === 'Father' || relationshipType === 'Step-Father' || relationshipType === 'Grandfather' || relationshipType === 'Uncle') {
    firstName = getRandomItem(FIRST_NAMES.male);
  } else {
    firstName = getRandomItem([...FIRST_NAMES.male, ...FIRST_NAMES.female]);
  }

  return {
    firstName,
    lastName,
    relationship: relationshipType,
    phone: generateKenyanPhone(),
    email: generateEmail(firstName, lastName),
    occupation: getRandomItem(GUARDIAN_OCCUPATIONS)
  };
}

// Distribution helpers for realistic data scenarios
export function weightedRandom<T>(items: { item: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const { item, weight } of items) {
    random -= weight;
    if (random <= 0) return item;
  }
  
  return items[items.length - 1].item;
}
