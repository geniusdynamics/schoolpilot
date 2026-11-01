// ABOUTME: The people of the demo school as data: staff, guardians and learners, each tagged with the
// ABOUTME: scenario it exists to show (a family shape, a fee standing, a medical need, a fate).

/** Where in the school's levels a learner sits; the levels are the school's own, lowest first. */
export type LevelSlot = 'entry' | 'middle' | 'final';

export type CastGender = 'female' | 'male';

/** What happened to a learner by the day the demo is set on. */
export type Fate =
  | 'enrolled'
  | 'suspended'
  | 'graduated'
  | 'transferred_out'
  | 'expelled';

/**
 * How a family deals with the fees, term by term.
 *
 * The finance phase turns a standing into payments, discounts and refunds; the names say what the
 * learner's statement should look like on the day the demo is set on.
 */
export type Standing =
  | 'cleared'
  | 'balance'
  | 'arrears_terms'
  | 'arrears_years'
  | 'overpaid'
  | 'prepaid'
  | 'installments'
  | 'bounced_cheque'
  | 'staff_half'
  | 'staff_quarter'
  | 'proprietor'
  | 'bursary'
  | 'alumni_cleared'
  | 'alumni_refund_paid'
  | 'alumni_refund_pending'
  | 'alumni_owing'
  | 'alumni_writeoff_pending'
  | 'alumni_writeoff_approved';

export type TransportRoute = 'route_a' | 'route_b';

export interface CastGuardian {
  readonly key: string;
  readonly given: string;
  readonly family: string;
  readonly gender: CastGender;
  readonly phone: string;
  readonly occupation: string;
  /** The guardian is this member of staff, so a staff-ward discount can find them. */
  readonly staffKey?: string;
  /** The guardian owns the school. */
  readonly proprietor?: boolean;
  /** The guardian signs in to the parent portal. */
  readonly login?: string;
}

export interface CastLink {
  readonly guardian: string;
  readonly relationship: 'mother' | 'father' | 'guardian' | 'grandparent';
}

export interface CastLearner {
  readonly key: string;
  readonly given: string;
  readonly family: string;
  readonly gender: CastGender;
  readonly slot: LevelSlot;
  /** The stream of the level; wrapped over the streams the school has. */
  readonly stream: number;
  readonly links: readonly CastLink[];
  /** Whether the learner was already in the school last year, or joined this year. */
  readonly joined: 'previous' | 'current';
  readonly fate: Fate;
  /** For an exit this year: the index of the term after which the learner left. */
  readonly leftAfterTerm?: number;
  readonly standing: Standing;
  readonly medical?: {
    readonly allergies?: readonly string[];
    readonly conditions?: readonly string[];
    readonly medications?: readonly string[];
  };
  readonly previousSchool?: string;
  readonly transport?: TransportRoute;
  readonly uniform?: 'paid' | 'pending';
  readonly libraryFine?: 'paid' | 'pending';
  /** What the learner owed from a previous system, in whole shillings. */
  readonly openingBalance?: number;
  /** Co-curricular learning areas, by code. */
  readonly activities?: readonly string[];
  /** Elective learning areas, by code. */
  readonly electives?: readonly string[];
}

export interface CastStaff {
  readonly key: string;
  readonly given: string;
  readonly family: string;
  readonly gender: CastGender;
  readonly number: string;
  readonly title: string;
  readonly department: string;
  readonly employment: 'permanent' | 'contract' | 'board_employed';
  /** The year the member of staff started, relative to the current year (0 = this year). */
  readonly startedYearsAgo: number;
  readonly head?: boolean;
  readonly login?: string;
}

export const TITLE_HEAD = 'Head Teacher';
export const TITLE_DEPUTY = 'Deputy Head Teacher';
export const TITLE_TEACHER = 'Teacher';
export const TITLE_BURSAR = 'Bursar';

/** The departments of the school, with the kind each one is. */
export const DEPARTMENTS = [
  { name: 'Sciences', kind: 'academic' },
  { name: 'Humanities', kind: 'academic' },
  { name: 'Languages', kind: 'academic' },
  { name: 'Mathematics', kind: 'academic' },
  { name: 'Creative Arts and Sports', kind: 'academic' },
  { name: 'Administration', kind: 'administrative' },
  { name: 'Finance', kind: 'administrative' },
  { name: 'Library', kind: 'support' },
  { name: 'Stores', kind: 'support' },
  { name: 'Catering', kind: 'support' },
  { name: 'Transport', kind: 'support' },
] as const;

/** The job titles; teaching ones are teaching, the rest are not. */
export const JOB_TITLES = [
  { name: TITLE_HEAD, category: 'teaching' },
  { name: TITLE_DEPUTY, category: 'teaching' },
  { name: TITLE_TEACHER, category: 'teaching' },
  { name: TITLE_BURSAR, category: 'non_teaching' },
  { name: 'Secretary', category: 'non_teaching' },
  { name: 'Librarian', category: 'non_teaching' },
  { name: 'Storekeeper', category: 'non_teaching' },
  { name: 'Laboratory Technician', category: 'non_teaching' },
  { name: 'Cook', category: 'non_teaching' },
  { name: 'Driver', category: 'non_teaching' },
  { name: 'Watchman', category: 'non_teaching' },
  { name: 'School Nurse', category: 'non_teaching' },
] as const;

/**
 * The staff of the school. The teaching staff are paid by the government (permanent) or by the
 * board (board employed) or on a contract; the support staff are the school's own. Two started this
 * year, so the roster holds people who have worked more than a year and people who have not.
 */
export const STAFF: readonly CastStaff[] = [
  { key: 'head', given: 'Wanjiku', family: 'Kamau', gender: 'female', number: 'EMP/001', title: TITLE_HEAD, department: 'Administration', employment: 'permanent', startedYearsAgo: 11, head: true, login: 'headteacher' },
  { key: 'deputy', given: 'Peter', family: 'Otieno', gender: 'male', number: 'EMP/002', title: TITLE_DEPUTY, department: 'Humanities', employment: 'permanent', startedYearsAgo: 9 },
  { key: 'science', given: 'Mercy', family: 'Achieng', gender: 'female', number: 'EMP/003', title: TITLE_TEACHER, department: 'Sciences', employment: 'permanent', startedYearsAgo: 8, head: true },
  { key: 'english', given: 'Daniel', family: 'Kiptoo', gender: 'male', number: 'EMP/004', title: TITLE_TEACHER, department: 'Languages', employment: 'board_employed', startedYearsAgo: 7, head: true },
  { key: 'humanities', given: 'Fatuma', family: 'Noor', gender: 'female', number: 'EMP/005', title: TITLE_TEACHER, department: 'Humanities', employment: 'permanent', startedYearsAgo: 10, head: true },
  { key: 'maths', given: 'Samuel', family: 'Mugambi', gender: 'male', number: 'EMP/006', title: TITLE_TEACHER, department: 'Mathematics', employment: 'permanent', startedYearsAgo: 5, head: true },
  { key: 'kiswahili', given: 'Esther', family: 'Wambui', gender: 'female', number: 'EMP/007', title: TITLE_TEACHER, department: 'Languages', employment: 'board_employed', startedYearsAgo: 0 },
  { key: 'technical', given: 'John', family: 'Barasa', gender: 'male', number: 'EMP/008', title: TITLE_TEACHER, department: 'Sciences', employment: 'contract', startedYearsAgo: 3, login: 'teacher' },
  { key: 'arts', given: 'Lucy', family: 'Chebet', gender: 'female', number: 'EMP/009', title: TITLE_TEACHER, department: 'Creative Arts and Sports', employment: 'permanent', startedYearsAgo: 6, head: true },
  { key: 'bursar', given: 'Grace', family: 'Njoroge', gender: 'female', number: 'EMP/010', title: TITLE_BURSAR, department: 'Finance', employment: 'board_employed', startedYearsAgo: 4, head: true, login: 'finance' },
  { key: 'secretary', given: 'Mary', family: 'Wairimu', gender: 'female', number: 'EMP/011', title: 'Secretary', department: 'Administration', employment: 'board_employed', startedYearsAgo: 2 },
  { key: 'librarian', given: 'Joyce', family: 'Muthoni', gender: 'female', number: 'EMP/012', title: 'Librarian', department: 'Library', employment: 'board_employed', startedYearsAgo: 3, head: true },
  { key: 'storekeeper', given: 'Hassan', family: 'Abdi', gender: 'male', number: 'EMP/013', title: 'Storekeeper', department: 'Stores', employment: 'board_employed', startedYearsAgo: 6, head: true },
  { key: 'technician', given: 'Kennedy', family: 'Oduor', gender: 'male', number: 'EMP/014', title: 'Laboratory Technician', department: 'Sciences', employment: 'board_employed', startedYearsAgo: 0 },
  { key: 'cook', given: 'Beatrice', family: 'Akinyi', gender: 'female', number: 'EMP/015', title: 'Cook', department: 'Catering', employment: 'board_employed', startedYearsAgo: 5, head: true },
  { key: 'driver', given: 'Isaac', family: 'Maina', gender: 'male', number: 'EMP/016', title: 'Driver', department: 'Transport', employment: 'contract', startedYearsAgo: 2, head: true },
  { key: 'watchman', given: 'Peter', family: 'Nzomo', gender: 'male', number: 'EMP/017', title: 'Watchman', department: 'Administration', employment: 'board_employed', startedYearsAgo: 1 },
  { key: 'nurse', given: 'Rose', family: 'Auma', gender: 'female', number: 'EMP/018', title: 'School Nurse', department: 'Administration', employment: 'board_employed', startedYearsAgo: 2 },
];

/** The learning area each member of the teaching staff teaches, by staff key. */
export const TEACHES: Readonly<Record<string, readonly string[]>> = {
  english: ['ENG'],
  kiswahili: ['KIS'],
  maths: ['MAT', 'COM'],
  science: ['SCI'],
  humanities: ['SST', 'CRE'],
  technical: ['PTS', 'AGR'],
  arts: ['CAS', 'VIS', 'MUS'],
};

/** The patron of each co-curricular activity, by activity code. */
export const PATRONS: Readonly<Record<string, string>> = {
  FBL: 'technical',
  VBL: 'maths',
  NBL: 'kiswahili',
  BBL: 'deputy',
  DRA: 'arts',
  SCT: 'english',
  GGD: 'humanities',
};

export const GUARDIANS: readonly CastGuardian[] = [
  { key: 'naomi-wekesa', given: 'Naomi', family: 'Wekesa', gender: 'female', phone: '+254711000101', occupation: 'Nurse', login: 'parent' },
  { key: 'joseph-wekesa', given: 'Joseph', family: 'Wekesa', gender: 'male', phone: '+254711000102', occupation: 'Surveyor' },
  { key: 'lucy-mwangi', given: 'Lucy', family: 'Mwangi', gender: 'female', phone: '+254711000103', occupation: 'Shopkeeper' },
  { key: 'peter-mwangi', given: 'Peter', family: 'Mwangi', gender: 'male', phone: '+254711000104', occupation: 'Mechanic' },
  { key: 'alice-otieno', given: 'Alice', family: 'Otieno', gender: 'female', phone: '+254711000105', occupation: 'Tailor' },
  { key: 'james-otieno', given: 'James', family: 'Otieno', gender: 'male', phone: '+254711000106', occupation: 'Boda boda rider' },
  { key: 'grace-njeri', given: 'Grace', family: 'Njeri', gender: 'female', phone: '+254711000107', occupation: 'Accountant' },
  { key: 'samuel-njeri', given: 'Samuel', family: 'Njeri', gender: 'male', phone: '+254711000108', occupation: 'Farmer' },
  { key: 'halima-hassan', given: 'Halima', family: 'Hassan', gender: 'female', phone: '+254711000109', occupation: 'Caterer' },
  { key: 'anne-kariuki', given: 'Anne', family: 'Kariuki', gender: 'female', phone: '+254711000110', occupation: 'Teacher' },
  { key: 'michael-ochieng', given: 'Michael', family: 'Ochieng', gender: 'male', phone: '+254711000111', occupation: 'Driver' },
  { key: 'daniel-barasa', given: 'Daniel', family: 'Barasa', gender: 'male', phone: '+254711000112', occupation: 'Clerk' },
  { key: 'rose-kimani', given: 'Rose', family: 'Kimani', gender: 'female', phone: '+254711000113', occupation: 'Retired nurse' },
  { key: 'daniel-kiptoo', given: 'Daniel', family: 'Kiptoo', gender: 'male', phone: '+254711000114', occupation: 'Teacher', staffKey: 'english' },
  { key: 'hassan-abdi', given: 'Hassan', family: 'Abdi', gender: 'male', phone: '+254711000115', occupation: 'Storekeeper', staffKey: 'storekeeper' },
  { key: 'margaret-kamau', given: 'Margaret', family: 'Kamau', gender: 'female', phone: '+254711000116', occupation: 'Proprietor', proprietor: true },
  { key: 'agnes-mutua', given: 'Agnes', family: 'Mutua', gender: 'female', phone: '+254711000117', occupation: 'Trader' },
  { key: 'robert-achieng', given: 'Robert', family: 'Achieng', gender: 'male', phone: '+254711000118', occupation: 'Pastor' },
  { key: 'jane-rotich', given: 'Jane', family: 'Rotich', gender: 'female', phone: '+254711000119', occupation: 'Pharmacist' },
  { key: 'esther-chebet', given: 'Esther', family: 'Chebet', gender: 'female', phone: '+254711000120', occupation: 'Banker' },
  { key: 'paul-kiplagat', given: 'Paul', family: 'Kiplagat', gender: 'male', phone: '+254711000121', occupation: 'Engineer' },
  { key: 'zainab-said', given: 'Zainab', family: 'Said', gender: 'female', phone: '+254711000122', occupation: 'Tailor' },
  { key: 'yusuf-salim', given: 'Yusuf', family: 'Salim', gender: 'male', phone: '+254711000123', occupation: 'Fisherman' },
  { key: 'miriam-wairimu', given: 'Miriam', family: 'Wairimu', gender: 'female', phone: '+254711000124', occupation: 'Hairdresser' },
  { key: 'stephen-mugo', given: 'Stephen', family: 'Mugo', gender: 'male', phone: '+254711000125', occupation: 'Electrician' },
  { key: 'beatrice-atieno', given: 'Beatrice', family: 'Atieno', gender: 'female', phone: '+254711000126', occupation: 'Clerk' },
  { key: 'rebecca-okello', given: 'Rebecca', family: 'Okello', gender: 'female', phone: '+254711000127', occupation: 'Trader' },
  { key: 'francis-waweru', given: 'Francis', family: 'Waweru', gender: 'male', phone: '+254711000128', occupation: 'Mason' },
  { key: 'ann-ndungu', given: 'Ann', family: 'Ndungu', gender: 'female', phone: '+254711000129', occupation: 'Nurse' },
  { key: 'tabitha-ndegwa', given: 'Tabitha', family: 'Ndegwa', gender: 'female', phone: '+254711000130', occupation: 'Teacher' },
  { key: 'moses-karanja', given: 'Moses', family: 'Karanja', gender: 'male', phone: '+254711000131', occupation: 'Pilot' },
  { key: 'lydia-wafula', given: 'Lydia', family: 'Wafula', gender: 'female', phone: '+254711000132', occupation: 'Trader' },
  { key: 'gideon-mwenda', given: 'Gideon', family: 'Mwenda', gender: 'male', phone: '+254711000133', occupation: 'Farmer' },
  { key: 'naomi-kipchumba', given: 'Naomi', family: 'Kipchumba', gender: 'female', phone: '+254711000134', occupation: 'Nurse' },
  { key: 'collins-onyango', given: 'Collins', family: 'Onyango', gender: 'male', phone: '+254711000135', occupation: 'Mechanic' },
];

const mother = (guardian: string): CastLink => ({ guardian, relationship: 'mother' });
const father = (guardian: string): CastLink => ({ guardian, relationship: 'father' });

/**
 * The learners of the school. Each exists to show something the notes of the old system asked a
 * demo to carry; the comment on a row names the scenario.
 */
export const LEARNERS: readonly CastLearner[] = [
  // Siblings in different classes, sharing both parents; the older sibling owes no more than the younger.
  { key: 'amani', given: 'Amani', family: 'Wekesa', gender: 'female', slot: 'middle', stream: 0, links: [mother('naomi-wekesa'), father('joseph-wekesa')], joined: 'previous', fate: 'enrolled', standing: 'cleared', medical: { conditions: ['Asthma'], medications: ['Salbutamol inhaler'] }, activities: ['NBL', 'DRA'], electives: ['VIS'] },
  { key: 'baraka', given: 'Baraka', family: 'Wekesa', gender: 'male', slot: 'entry', stream: 1, links: [mother('naomi-wekesa'), father('joseph-wekesa')], joined: 'current', fate: 'enrolled', standing: 'cleared', medical: { allergies: ['Peanuts'] }, activities: ['FBL'], electives: ['COM'] },
  // Twins in the same class, sharing both parents.
  { key: 'chloe', given: 'Chloe', family: 'Mwangi', gender: 'female', slot: 'entry', stream: 0, links: [mother('lucy-mwangi'), father('peter-mwangi')], joined: 'current', fate: 'enrolled', standing: 'balance', activities: ['NBL'], electives: ['MUS'] },
  { key: 'cyrus', given: 'Cyrus', family: 'Mwangi', gender: 'male', slot: 'entry', stream: 0, links: [mother('lucy-mwangi'), father('peter-mwangi')], joined: 'current', fate: 'enrolled', standing: 'balance', transport: 'route_a', activities: ['FBL'], electives: ['COM'] },
  // Two learners, each with their own separate mother and father.
  { key: 'david', given: 'David', family: 'Otieno', gender: 'male', slot: 'middle', stream: 1, links: [mother('alice-otieno'), father('james-otieno')], joined: 'previous', fate: 'enrolled', standing: 'arrears_terms', transport: 'route_b', activities: ['VBL'] },
  { key: 'esther', given: 'Esther', family: 'Njeri', gender: 'female', slot: 'final', stream: 0, links: [mother('grace-njeri'), father('samuel-njeri')], joined: 'previous', fate: 'enrolled', standing: 'arrears_years', libraryFine: 'pending', activities: ['GGD'], electives: ['VIS'] },
  // Single mothers.
  { key: 'farida', given: 'Farida', family: 'Hassan', gender: 'female', slot: 'entry', stream: 0, links: [mother('halima-hassan')], joined: 'current', fate: 'enrolled', standing: 'overpaid', activities: ['NBL'] },
  { key: 'imani', given: 'Imani', family: 'Kariuki', gender: 'female', slot: 'middle', stream: 0, links: [mother('anne-kariuki')], joined: 'previous', fate: 'enrolled', standing: 'prepaid', medical: { conditions: ['Epilepsy'], medications: ['Carbamazepine'] }, activities: ['DRA'], electives: ['MUS'] },
  // Single fathers.
  { key: 'joseph', given: 'Joseph', family: 'Ochieng', gender: 'male', slot: 'final', stream: 1, links: [father('michael-ochieng')], joined: 'previous', fate: 'enrolled', standing: 'installments', uniform: 'paid', activities: ['BBL'], electives: ['COM'] },
  { key: 'liam', given: 'Liam', family: 'Barasa', gender: 'male', slot: 'entry', stream: 1, links: [father('daniel-barasa')], joined: 'current', fate: 'enrolled', standing: 'bounced_cheque', activities: ['FBL'] },
  // A learner whose only guardian is a grandparent: no parent records at all.
  { key: 'kendi', given: 'Kendi', family: 'Kimani', gender: 'female', slot: 'middle', stream: 1, links: [{ guardian: 'rose-kimani', relationship: 'grandparent' }], joined: 'previous', fate: 'enrolled', standing: 'cleared', activities: ['GGD'] },
  // A teacher's child (half fee), a support-staff member's child (quarter fee) and the proprietor's child (not billed).
  { key: 'brian', given: 'Brian', family: 'Kiptoo', gender: 'male', slot: 'entry', stream: 0, links: [father('daniel-kiptoo')], joined: 'current', fate: 'enrolled', standing: 'staff_half', activities: ['FBL', 'SCT'] },
  { key: 'zawadi', given: 'Zawadi', family: 'Abdi', gender: 'female', slot: 'middle', stream: 0, links: [father('hassan-abdi')], joined: 'previous', fate: 'enrolled', standing: 'staff_quarter', activities: ['NBL'] },
  { key: 'tumaini', given: 'Tumaini', family: 'Kamau', gender: 'female', slot: 'final', stream: 1, links: [mother('margaret-kamau')], joined: 'previous', fate: 'enrolled', standing: 'proprietor', activities: ['DRA'], electives: ['VIS'] },
  // The rest of the school: some clear, some owe, each with something else to show.
  { key: 'ian', given: 'Ian', family: 'Mutua', gender: 'male', slot: 'entry', stream: 0, links: [mother('agnes-mutua')], joined: 'current', fate: 'enrolled', standing: 'cleared', transport: 'route_a', uniform: 'pending', activities: ['FBL'] },
  { key: 'joy', given: 'Joy', family: 'Achieng', gender: 'female', slot: 'entry', stream: 1, links: [father('robert-achieng')], joined: 'current', fate: 'enrolled', standing: 'balance', medical: { conditions: ['Type 1 diabetes'], medications: ['Insulin'] }, activities: ['NBL'] },
  { key: 'kevin', given: 'Kevin', family: 'Rotich', gender: 'male', slot: 'middle', stream: 0, links: [mother('jane-rotich')], joined: 'previous', fate: 'suspended', standing: 'arrears_terms', activities: ['BBL'] },
  { key: 'lilian', given: 'Lilian', family: 'Chebet', gender: 'female', slot: 'middle', stream: 1, links: [mother('esther-chebet')], joined: 'previous', fate: 'enrolled', standing: 'bursary', activities: ['DRA'], electives: ['MUS'] },
  { key: 'moses', given: 'Moses', family: 'Kiplagat', gender: 'male', slot: 'final', stream: 0, links: [father('paul-kiplagat')], joined: 'previous', fate: 'enrolled', standing: 'cleared', uniform: 'paid', activities: ['BBL'], electives: ['COM'] },
  { key: 'nadia', given: 'Nadia', family: 'Said', gender: 'female', slot: 'final', stream: 0, links: [mother('zainab-said')], joined: 'previous', fate: 'enrolled', standing: 'balance', activities: ['GGD'] },
  { key: 'omar', given: 'Omar', family: 'Salim', gender: 'male', slot: 'middle', stream: 0, links: [father('yusuf-salim')], joined: 'previous', fate: 'enrolled', standing: 'overpaid', medical: { allergies: ['Penicillin'] }, activities: ['FBL', 'VBL'] },
  { key: 'purity', given: 'Purity', family: 'Wairimu', gender: 'female', slot: 'entry', stream: 1, links: [mother('miriam-wairimu')], joined: 'current', fate: 'enrolled', standing: 'cleared', previousSchool: 'Sunrise Primary School', openingBalance: 4000, activities: ['NBL'] },
  { key: 'quentin', given: 'Quentin', family: 'Mugo', gender: 'male', slot: 'final', stream: 1, links: [father('stephen-mugo')], joined: 'previous', fate: 'enrolled', standing: 'balance', libraryFine: 'paid', activities: ['SCT'] },
  { key: 'ruth', given: 'Ruth', family: 'Atieno', gender: 'female', slot: 'final', stream: 1, links: [mother('beatrice-atieno')], joined: 'previous', fate: 'enrolled', standing: 'cleared', activities: ['SCT', 'DRA'] },
  // Learners who left during the year.
  { key: 'sharon', given: 'Sharon', family: 'Okello', gender: 'female', slot: 'middle', stream: 0, links: [mother('rebecca-okello')], joined: 'previous', fate: 'transferred_out', leftAfterTerm: 0, standing: 'balance' },
  { key: 'tom', given: 'Tom', family: 'Waweru', gender: 'male', slot: 'final', stream: 0, links: [father('francis-waweru')], joined: 'previous', fate: 'transferred_out', leftAfterTerm: 1, standing: 'arrears_terms' },
  { key: 'victor', given: 'Victor', family: 'Ndungu', gender: 'male', slot: 'final', stream: 1, links: [mother('ann-ndungu')], joined: 'previous', fate: 'expelled', leftAfterTerm: 1, standing: 'balance' },
  // Alumni: left the final level at the end of last year, each in a different position with the school.
  { key: 'angela', given: 'Angela', family: 'Ndegwa', gender: 'female', slot: 'final', stream: 0, links: [mother('tabitha-ndegwa')], joined: 'previous', fate: 'graduated', standing: 'alumni_cleared' },
  { key: 'boniface', given: 'Boniface', family: 'Karanja', gender: 'male', slot: 'final', stream: 1, links: [father('moses-karanja')], joined: 'previous', fate: 'graduated', standing: 'alumni_refund_paid' },
  { key: 'catherine', given: 'Catherine', family: 'Wafula', gender: 'female', slot: 'final', stream: 0, links: [mother('lydia-wafula')], joined: 'previous', fate: 'graduated', standing: 'alumni_refund_pending' },
  { key: 'dennis', given: 'Dennis', family: 'Mwenda', gender: 'male', slot: 'final', stream: 1, links: [father('gideon-mwenda')], joined: 'previous', fate: 'graduated', standing: 'alumni_owing' },
  { key: 'evelyn', given: 'Evelyn', family: 'Kipchumba', gender: 'female', slot: 'final', stream: 0, links: [mother('naomi-kipchumba')], joined: 'previous', fate: 'graduated', standing: 'alumni_writeoff_pending' },
  { key: 'felix', given: 'Felix', family: 'Onyango', gender: 'male', slot: 'final', stream: 1, links: [father('collins-onyango')], joined: 'previous', fate: 'graduated', standing: 'alumni_writeoff_approved' },
];

/** The co-curricular activities: sports and clubs, with the gender a club is limited to, if any. */
export const ACTIVITIES = [
  { code: 'FBL', name: 'Football', kind: 'sport' },
  { code: 'VBL', name: 'Volleyball', kind: 'sport' },
  { code: 'NBL', name: 'Netball', kind: 'sport', only: 'female' },
  { code: 'BBL', name: 'Basketball', kind: 'sport' },
  { code: 'DRA', name: 'Drama Club', kind: 'club' },
  { code: 'SCT', name: 'Scouts', kind: 'club' },
  { code: 'GGD', name: 'Girl Guides', kind: 'club', only: 'female' },
] as const;

/** The learning areas of the school: nine every learner takes, and three electives. */
export const LEARNING_AREAS = [
  { code: 'ENG', name: 'English', short: 'Eng', group: 'languages', kind: 'core' },
  { code: 'KIS', name: 'Kiswahili', short: 'Kis', group: 'languages', kind: 'core' },
  { code: 'MAT', name: 'Mathematics', short: 'Maths', group: 'mathematics', kind: 'core' },
  { code: 'SCI', name: 'Integrated Science', short: 'Sci', group: 'sciences', kind: 'core' },
  { code: 'SST', name: 'Social Studies', short: 'SST', group: 'humanities', kind: 'core' },
  { code: 'CRE', name: 'Christian Religious Education', short: 'CRE', group: 'humanities', kind: 'core' },
  { code: 'PTS', name: 'Pre-Technical Studies', short: 'PTS', group: 'sciences', kind: 'core' },
  { code: 'AGR', name: 'Agriculture and Nutrition', short: 'Agri', group: 'sciences', kind: 'core' },
  { code: 'CAS', name: 'Creative Arts and Sports', short: 'CAS', group: 'arts', kind: 'core' },
  { code: 'VIS', name: 'Visual Arts', short: 'Vis', group: 'arts', kind: 'elective' },
  { code: 'MUS', name: 'Music', short: 'Mus', group: 'arts', kind: 'elective' },
  { code: 'COM', name: 'Computer Studies', short: 'Comp', group: 'technology', kind: 'elective' },
] as const;

/** The learning areas that are split into papers; their marks are held per paper. */
export const SPLIT_PAPERS: Readonly<Record<string, readonly { readonly code: string; readonly name: string; readonly kind: 'paper' | 'practical' | 'oral'; readonly weight: number }[]>> = {
  ENG: [
    { code: 'P1', name: 'Paper 1: Functional Writing', kind: 'paper', weight: 40 },
    { code: 'P2', name: 'Paper 2: Comprehension and Literature', kind: 'paper', weight: 40 },
    { code: 'ORAL', name: 'Oral', kind: 'oral', weight: 20 },
  ],
  SCI: [
    { code: 'P1', name: 'Paper 1: Theory', kind: 'paper', weight: 70 },
    { code: 'PRAC', name: 'Practical', kind: 'practical', weight: 30 },
  ],
};
