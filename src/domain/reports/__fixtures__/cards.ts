// ABOUTME: Deterministic report fixtures for the unit and visual tests: one full card, a long-comment
// ABOUTME: card, an empty card, an Arabic card and a wide landscape table.

import type {
  ReportCardData,
  ReportLocaleBundles,
  ReportRating,
  ReportResultRow,
  ReportTemplate,
} from '../types';

const LOGO_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
  "<circle cx='32' cy='32' r='30' fill='none' stroke='%23111827' stroke-width='2.5'/>" +
  "<path d='M32 12l17 10v6H15v-6z' fill='%23111827'/>" +
  "<path d='M20 32h24v16H20z' fill='none' stroke='%23111827' stroke-width='2.5'/>" +
  "<path d='M26 32v16M32 32v16M38 32v16' stroke='%23111827' stroke-width='2'/>" +
  "<path d='M14 52h36' stroke='%23111827' stroke-width='3'/></svg>";

export const SCHOOL_LOGO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`;

/** The reference school: a long name, a motto, contacts and a vector logo. */
export const SCHOOL = {
  name: 'Riverside Academy',
  motto: 'Knowledge · Integrity · Service',
  address: 'P.O. Box 4021-00100 · Nairobi',
  contact: '+254 20 555 0134 · info@riverside.ac.ke',
  logo: SCHOOL_LOGO,
} as const;

const ARABIC_SCHOOL = {
  name: 'أكاديمية ريفرسايد',
  motto: 'المعرفة · النزاهة · الخدمة',
  address: 'ص.ب 4021-00100 · نيروبي',
  contact: '+254 20 555 0134 · info@riverside.ac.ke',
  logo: SCHOOL_LOGO,
} as const;

/** Eight learning areas, one row each, with the component split the pack reports. */
const RESULT_ROWS: ReportResultRow[] = [
  { code: 'ENG', name: 'English', cells: { components: '28/30 · 18/20 · 44/50', total: '90', grade: 'EE1', points: '8', position: '2', class_mean: '78.4', highest: '94', lowest: '51', teacher_initials: 'JM', remark: 'Reads widely' } },
  { code: 'KIS', name: 'Kiswahili', cells: { components: '24/30 · 15/20 · 38/50', total: '77', grade: 'ME1', points: '6', position: '6', class_mean: '71.2', highest: '88', lowest: '44', teacher_initials: 'AK', remark: 'Improving steadily' } },
  { code: 'MAT', name: 'Mathematics', cells: { components: '20/30 · 12/20 · 30/50', total: '62', grade: 'AE1', points: '4', position: '14', class_mean: '64.8', highest: '92', lowest: '38', teacher_initials: 'WO', remark: 'Needs more practice' } },
  { code: 'SCI', name: 'Science & Technology', cells: { components: '26/30 · 16/20 · 42/50', total: '84', grade: 'ME1', points: '6', position: '4', class_mean: '74.1', highest: '90', lowest: '47', teacher_initials: 'SN', remark: 'Consistent effort' } },
  { code: 'SST', name: 'Social Studies', cells: { components: '27/30 · 17/20 · 40/50', total: '84', grade: 'ME1', points: '6', position: '3', class_mean: '72.9', highest: '89', lowest: '49', teacher_initials: 'JM', remark: 'Strong participation' } },
  { code: 'CRE', name: 'C.R.E', cells: { components: '22/30 · 14/20 · 36/50', total: '72', grade: 'ME1', points: '6', position: '9', class_mean: '69.5', highest: '86', lowest: '41', teacher_initials: 'AK', remark: 'Good progress' } },
  { code: 'ART', name: 'Creative Arts', cells: { components: '29/30 · 19/20 · 45/50', total: '93', grade: 'EE1', points: '8', position: '1', class_mean: '77.0', highest: '95', lowest: '52', teacher_initials: 'WO', remark: 'Exceptional' } },
  { code: 'AGR', name: 'Agriculture', cells: { components: '18/30 · 11/20 · 28/50', total: '57', grade: 'AE1', points: '4', position: '18', class_mean: '61.3', highest: '84', lowest: '35', teacher_initials: 'SN', remark: 'Keep it up' } },
];

const RESULT_TOTALS: ReportResultRow = {
  code: 'TOTAL',
  name: 'Total',
  cells: { components: '194/240 · 122/160 · 303/400', total: '619', grade: 'ME1', points: '48', position: '5', class_mean: '71.2', highest: '—', lowest: '—', teacher_initials: '', remark: '' },
};

const COMPETENCIES: ReportRating[] = [
  { name: 'Communication and collaboration', level: 'ME1', descriptor: 'Works well in a group and shares ideas clearly.' },
  { name: 'Critical thinking and problem solving', level: 'EE1', descriptor: 'Applies reasoning independently to new problems.' },
  { name: 'Creativity and imagination', level: 'ME1', descriptor: 'Offers original ideas in project work.' },
  { name: 'Citizenship and digital literacy', level: 'AE1', descriptor: 'Needs prompting to use the tools safely.' },
];

const TRAITS: ReportRating[] = [
  { name: 'Punctuality', level: 'Always' },
  { name: 'Neatness', level: 'Often' },
  { name: 'Honesty', level: 'Always' },
  { name: 'Leadership', level: 'Sometimes' },
];

const CLASS_TEACHER_COMMENT =
  'Amina has shown steady commitment to attendance and class participation. Reading fluency and written expression have improved noticeably; multi-step problem solving in mathematics needs more practice. Daily reading at home is encouraged.';

/** 486 characters of complete prose: the pack allows 500, and this is the DR-05 overflow case. */
const LONG_COMMENT =
  'Amina has shown steady commitment to attendance and class participation throughout the term. ' +
  'Her reading fluency has improved noticeably, and she now writes connected paragraphs with a clear structure. ' +
  'Multi-step problem solving in mathematics remains the area to practise, particularly fractions and measurement conversions. ' +
  'Daily reading at home and two short mathematics tasks each week will keep the momentum. ' +
  'She contributes thoughtfully to group work and supports her classmates. Well done.';

const ARABIC_COMMENT =
  'أظهرت أمينة التزامًا جيدًا بالحضور والمشاركة خلال الفصل. تحسنت القراءة والكتابة بشكل ملحوظ، وتحتاج إلى مزيد من التدريب في المسائل الرياضية متعددة الخطوات. يُشجع على القراءة اليومية في المنزل.';

const RTL_SAFE_COMMENT = `${ARABIC_COMMENT} Academic year 2026/2027 closes 31 Oct 2026.`;

/** A complete primary-term card: every block the schema declares. */
export const FULL_CARD: ReportCardData = {
  school: SCHOOL,
  learner: {
    name: 'Amina Achieng',
    admissionNo: 'ADM-2026142',
    className: 'Grade 5 · East',
    house: 'Simba',
    fields: [
      { key: 'learner.upi', value: '9000000000013' },
      { key: 'learner.gender', value: 'F' },
    ],
  },
  term: { name: 'Term 2', year: '2026' },
  attendance: { daysOpen: 62, present: 58, absent: 4, late: 2 },
  results: { rows: RESULT_ROWS, totals: RESULT_TOTALS },
  rubric: {
    rows: [
      { area: 'English', strand: 'Reading', level: 'EE1', descriptor: 'Reads fluently and infers meaning.' },
      { area: 'English', strand: 'Writing', level: 'ME1', descriptor: 'Writes connected paragraphs.' },
      { area: 'Mathematics', strand: 'Number', level: 'AE1', descriptor: 'Needs prompting with fractions.' },
      { area: 'Science', strand: 'Investigation', level: 'ME1', descriptor: 'Records observations accurately.' },
    ],
  },
  competencies: COMPETENCIES,
  traits: TRAITS,
  coCurricular: ['Science club', 'Football team', 'Community service (neighbourhood clean-up)'],
  summary: [
    { key: 'summary.total', value: '619 / 800' },
    { key: 'summary.mean', value: '77.4' },
    { key: 'summary.mean_grade', value: 'ME1' },
    { key: 'summary.position', value: '5 / 32' },
  ],
  comments: [
    { role: 'class_teacher', text: CLASS_TEACHER_COMMENT },
    { role: 'head_teacher', text: 'A solid term. Continue the effort in mathematics and daily reading.' },
  ],
  progression: { decision: 'Promoted to Grade 6', note: 'Final term decision.' },
  fees: { balance: 'KES 12,400', nextTerm: 'KES 28,500', note: 'Payable by the first day of Term 1.' },
  calendar: { closing: '31 Oct 2026', opening: '4 Jan 2027' },
  signatures: [
    { role: 'class_teacher', name: 'J. Mwangi' },
    { role: 'head_teacher', name: 'W. Otieno' },
  ],
};

/**
 * The fit-check case: the 500-character comment the pack permits, on a card whose rubric reports four
 * strands. Together they are taller than the A4 content box at full density, so the surface must
 * compact before it can call the sheet a one-page card.
 */
export const LONG_COMMENT_CARD: ReportCardData = {
  ...FULL_CARD,
  rubric: {
    rows: [
      { area: 'English', strand: 'Reading', level: 'EE1', descriptor: 'Reads fluently and infers meaning from unfamiliar texts.' },
      { area: 'Mathematics', strand: 'Number', level: 'AE1', descriptor: 'Needs prompting with fractions and multi-step problems.' },
      { area: 'Science', strand: 'Investigation', level: 'ME1', descriptor: 'Records observations accurately and asks useful questions.' },
      { area: 'Creative Arts', strand: 'Performance', level: 'EE1', descriptor: 'Performs confidently and supports others.' },
    ],
  },
  comments: [
    { role: 'class_teacher', text: LONG_COMMENT },
    { role: 'head_teacher', text: 'A solid term. Continue the effort in mathematics and daily reading.' },
  ],
};

/** Every data-bearing field absent, so every block must render its empty state. */
export const EMPTY_CARD: ReportCardData = {
  school: { name: '' },
  learner: { name: '' },
  term: null,
  attendance: null,
  results: null,
  rubric: null,
  competencies: null,
  traits: null,
  coCurricular: null,
  summary: null,
  comments: null,
  progression: null,
  fees: null,
  calendar: null,
  signatures: null,
};

/** The Arabic card: RTL direction, Arabic labels, a Latin date and a Latin URL inside the text. */
export const RTL_CARD: ReportCardData = {
  ...FULL_CARD,
  school: ARABIC_SCHOOL,
  learner: { name: 'أمينة أتشينغ', admissionNo: 'ADM-2026142', className: 'الصف الخامس · شرق', house: 'سيمبا' },
  attendance: { daysOpen: 62, present: 58, absent: 4, late: 2 },
  summary: [
    { key: 'summary.total', value: '619 / 800' },
    { key: 'summary.mean', value: '77.4' },
    { key: 'summary.position', value: '5 / 32' },
  ],
  comments: [
    { role: 'class_teacher', text: RTL_SAFE_COMMENT },
    { role: 'head_teacher', text: 'نتائج جيدة. واصل الجهد في الرياضيات والقراءة.' },
  ],
  calendar: { closing: '31 Oct 2026', opening: '4 Jan 2027' },
  progression: { decision: 'ينتقل إلى الصف السادس' },
};

/** Forty ledger-like rows for a landscape results table that spans pages. */
export const WIDE_ROWS: ReportResultRow[] = Array.from({ length: 40 }, (_, index) => {
  const code = `SUB-${String(index + 1).padStart(3, '0')}`;
  const total = 40 + ((index * 7) % 55);
  return {
    code,
    name: `Learning area ${index + 1}`,
    cells: {
      components: `${10 + (index % 9)}/30 · ${6 + (index % 7)}/20 · ${20 + (index % 21)}/50`,
      slots: `${3 + (index % 4)}`,
      total: `${total}`,
      grade: total >= 80 ? 'EE1' : total >= 65 ? 'ME1' : total >= 50 ? 'AE1' : 'BE1',
      points: `${1 + (index % 8)}`,
      position: `${1 + (index % 32)}`,
      class_mean: `${55 + (index % 20)}.4`,
      highest: `${88 + (index % 9)}`,
      lowest: `${31 + (index % 12)}`,
      teacher_initials: ['JM', 'AK', 'WO', 'SN'][index % 4],
      remark: ['Good progress', 'Needs practice', 'Consistent effort', 'Reads widely'][index % 4],
    },
  };
});

export const WIDE_CARD: ReportCardData = {
  ...FULL_CARD,
  results: { rows: WIDE_ROWS, totals: null },
};

/** The pack's primary-term template (packs/ke-cbe/reports/primary-term.report.json). */
export const PRIMARY_TERM_TEMPLATE: ReportTemplate = {
  code: 'primary-term',
  name: 'Primary term report (PP1 to G6)',
  levels: ['PP1', 'PP2', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
  page: { size: 'A4', orientation: 'portrait' },
  blocks: [
    { type: 'header', label_key: 'block.header' },
    { type: 'learner', label_key: 'block.learner' },
    { type: 'attendance', label_key: 'block.attendance' },
    { type: 'rubric_table', label_key: 'block.rubric' },
    { type: 'competencies', label_key: 'block.competencies' },
    { type: 'co_curricular', label_key: 'block.co_curricular' },
    { type: 'summary', label_key: 'block.summary' },
    { type: 'comments', label_key: 'block.comments' },
    { type: 'calendar', label_key: 'block.calendar' },
    { type: 'signatures', label_key: 'block.signatures' },
    { type: 'verification', label_key: 'block.verification' },
  ],
  comment_max_length: 500,
};

/** The senior-school template: the widest results table the packs declare (11 columns). */
export const SENIOR_TERM_TEMPLATE: ReportTemplate = {
  code: 'senior-school-term',
  name: 'Senior School term report (G10 to G12)',
  levels: ['G10', 'G11', 'G12'],
  page: { size: 'A4', orientation: 'portrait' },
  blocks: [
    { type: 'header', label_key: 'block.header' },
    { type: 'learner', label_key: 'block.learner' },
    { type: 'attendance', label_key: 'block.attendance' },
    {
      type: 'results_table',
      label_key: 'block.results',
      columns: ['components', 'slots', 'total', 'grade', 'points', 'position', 'class_mean', 'highest', 'lowest', 'teacher_initials', 'remark'],
    },
    { type: 'summary', label_key: 'block.summary' },
    { type: 'comments', label_key: 'block.comments' },
    { type: 'signatures', label_key: 'block.signatures' },
    { type: 'verification', label_key: 'block.verification' },
  ],
  comment_max_length: 500,
};

/** The same block list on A5, so the reduced path has a template to act on. */
export const A5_TEMPLATE: ReportTemplate = { ...PRIMARY_TERM_TEMPLATE, page: { size: 'A5', orientation: 'portrait' } };

/** A landscape template for a wide table that legitimately spans pages. */
export const LANDSCAPE_TEMPLATE: ReportTemplate = {
  ...SENIOR_TERM_TEMPLATE,
  code: 'landscape-broadsheet',
  name: 'Landscape broadsheet',
  page: { size: 'A4', orientation: 'landscape' },
};

/**
 * The verification target used by every fixture: a published document with a base64url signature.
 * The host is the DR-05 example so the payload length in the tests is the measured one.
 */
export const VERIFICATION = {
  host: 'https://verify.schoolpilot.app',
  signature: '6Kq2x0Yb8m3TfWc',
} as const;

/** Pack locale files, in the shape `packs/<pack>/locales/<locale>.json` uses. */
export const LOCALES: ReportLocaleBundles = {
  en: {
    labels: {
      'block.header': 'School report',
      'block.learner': 'Learner',
      'block.attendance': 'Attendance',
      'block.results': 'Results',
      'block.rubric': 'Learning areas and levels',
      'block.competencies': 'Core competencies and values',
      'block.co_curricular': 'Co-curricular activities',
      'block.summary': 'Summary',
      'block.comments': 'Comments',
      'block.calendar': 'Calendar',
      'block.signatures': 'Signatures',
      'block.verification': 'Verification',
      'column.total': 'Total',
      'column.grade': 'Grade',
      'column.remark': 'Remark',
    },
  },
  sw: {
    labels: {
      'block.header': 'Ripoti ya shule',
      'block.learner': 'Mwanafunzi',
      'block.attendance': 'Mahudhurio',
      'block.rubric': 'Masomo na viwango',
      'block.competencies': 'Umahiri na maadili',
      'block.summary': 'Muhtasari',
      'block.comments': 'Maoni',
      'block.verification': 'Uthibitisho',
      'column.total': 'Jumla',
      'column.grade': 'Daraja',
    },
  },
  ar: {
    labels: {
      'report.title': 'بطاقة تقرير الفصل الدراسي',
      'block.header': 'تقرير المدرسة',
      'block.learner': 'الطالب',
      'block.attendance': 'الحضور',
      'block.results': 'النتائج',
      'block.rubric': 'مجالات التعلم والمستويات',
      'block.competencies': 'الكفاءات والقيم الأساسية',
      'block.co_curricular': 'الأنشطة اللاصفية',
      'block.summary': 'الملخص',
      'block.comments': 'التعليقات',
      'block.calendar': 'التقويم',
      'block.signatures': 'التوقيعات',
      'block.verification': 'التحقق',
      'column.total': 'المجموع',
      'column.grade': 'التقدير',
      'column.remark': 'ملاحظة',
      'comment.class_teacher': 'تعليق معلم الصف',
      'comment.head_teacher': 'تعليق مدير المدرسة',
      'signature.class_teacher': 'معلم الصف',
      'signature.head_teacher': 'مدير المدرسة',
      'calendar.closing': 'تاريخ الإغلاق',
      'calendar.opening': 'بداية الفصل القادم',
      'attendance.days_open': 'أيام الدراسة',
      'attendance.present': 'حاضر',
      'attendance.absent': 'غائب',
      'attendance.late': 'متأخر',
      'learner.name': 'الطالب',
      'learner.admission_no': 'رقم القيد',
      'learner.class': 'المستوى / الصف',
      'learner.house': 'الدار',
      'summary.total': 'المجموع',
      'summary.mean': 'المتوسط',
      'summary.position': 'الترتيب',
      'verification.scan': 'امسح للتحقق من هذا المستند',
      'verification.preview': 'معاينة — غير صالح للتحقق',
      'empty.attendance': 'لا يوجد سجل حضور لهذا الفصل.',
    },
  },
};

/** A pack default locale other than `en`, to prove the chain's middle step. */
export const SWAHILI_DEFAULT = 'sw';
