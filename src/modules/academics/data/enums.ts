// ABOUTME: This file contains all enum definitions for the Academics module.
// ABOUTME: It helps prevent circular dependencies between schema and type definition files.

export enum ResultState {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  REVIEWED = 'Reviewed',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PUBLISHED = 'Published'
}

export enum SubjectGrouping {
  GROUP_1_COMPULSORY = "Group 1 (Compulsory)",
  GROUP_2_SCIENCES = "Group 2 (Sciences)",
  GROUP_3_HUMANITIES = "Group 3 (Humanities)",
  GROUP_4_TECHNICALS = "Group 4 (Technicals)",
  GROUP_5_LANGUAGES = "Group 5 (Foreign Languages)",
  OTHER = "Other/Optional"
}

export enum DayOfWeek {
    MONDAY = 'MONDAY', TUESDAY = 'TUESDAY', WEDNESDAY = 'WEDNESDAY', THURSDAY = 'THURSDAY', FRIDAY = 'FRIDAY', SATURDAY = 'SATURDAY', SUNDAY = 'SUNDAY'
}

export enum StudentEnrollmentStatus {
    ENROLLED = 'Enrolled', WITHDRAWN = 'Withdrawn'
}

export enum ExamSessionStatus {
    PLANNING = 'Planning', MARKS_ENTRY_OPEN = 'Marks Entry Open', PUBLISHED = 'Published', CLOSED = 'Closed', ARCHIVED = 'Archived'
}

export enum EducationSystemType {
  PRIMARY = 'Primary',
  SECONDARY = 'Secondary',
  UNIVERSITY = 'University',
  COLLEGE = 'College',
  TECHNICAL = 'Technical',
  VOCATIONAL = 'Vocational'
}

export enum GradingSystemType {
  LETTER_GRADES = 'Letter Grades',
  PERCENTAGE = 'Percentage',
  COMPETENCY_BASED = 'Competency Based',
  POINTS = 'Points/GPA',
  PASS_FAIL = 'Pass/Fail'
}

export enum AcademicPeriodType {
  TERM = 'Term',
  SEMESTER = 'Semester',
  QUARTER = 'Quarter',
  TRIMESTER = 'Trimester'
}

export enum AssessmentType {
  FORMATIVE = 'Formative',
  SUMMATIVE = 'Summative',
  COMPETENCY = 'Competency',
  PROJECT_BASED = 'Project Based',
  PRACTICAL = 'Practical'
}

export enum BreakType {
    SHORT_BREAK = 'Short Break',
    LUNCH = 'Lunch',
    HEALTH_BREAK = 'Health Break'
}