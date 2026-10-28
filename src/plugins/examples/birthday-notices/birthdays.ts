// ABOUTME: The birthday arithmetic behind the example plug-in: the next occurrence of a learner's
// ABOUTME: birthday, their age on it, the weekend filter and the notice text.

/** The part of a learner this plug-in needs: an id, a display name and a date of birth. */
export interface LearnerBirthday {
  readonly learnerId: string;
  readonly firstName: string;
  readonly lastName: string;
  /** `YYYY-MM-DD`, as the learner record stores it. */
  readonly dateOfBirth: string;
}

export interface BirthdayNotice {
  readonly learnerId: string;
  readonly name: string;
  /** `YYYY-MM-DD` of the next occurrence. */
  readonly date: string;
  readonly daysUntil: number;
  readonly turningAge: number;
  /** The text the widget shows, from the plug-in's template. */
  readonly message: string;
}

export interface UpcomingBirthdayOptions {
  /** The school's current date, read at UTC midnight so the arithmetic is date-only. */
  readonly from: Date;
  readonly daysAhead: number;
  /** Defaults to true; a school that does not celebrate on weekends can turn this off. */
  readonly includeWeekends?: boolean;
  readonly template?: string;
}

export interface BuildNoticeOptions {
  readonly learner: LearnerBirthday;
  readonly occurrenceDate: string;
  readonly daysUntil: number;
  readonly turningAge: number;
  readonly template?: string;
}

export const DEFAULT_NOTICE_TEMPLATE = '{name} turns {age} on {date}';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses `YYYY-MM-DD` without a time zone, returning null for anything that is not a real date. */
function parseDateOnly(value: string): CalendarDate | null {
  const match = DATE_ONLY.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const stamp = Date.UTC(year, month - 1, day);
  const roundTrip = new Date(stamp);
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function utcStampOf(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day);
}

/** The day and month the school observes in `year`, moving 29 February to the 28th in a common year. */
function observedInYear(birthday: CalendarDate, year: number): CalendarDate {
  if (birthday.month === 2 && birthday.day === 29 && !isLeapYear(year)) {
    return { year, month: 2, day: 28 };
  }
  return { year, month: birthday.month, day: birthday.day };
}

function formatDateOnly(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function displayName(learner: LearnerBirthday): string {
  return `${learner.firstName} ${learner.lastName}`.trim();
}

/** Fills the plug-in's notice template; an omitted or blank template falls back to the default. */
export function buildNotice(options: BuildNoticeOptions): BirthdayNotice {
  const name = displayName(options.learner);
  const template = options.template?.trim() ? options.template : DEFAULT_NOTICE_TEMPLATE;
  const message = template
    .replace(/\{name\}/g, name)
    .replace(/\{age\}/g, String(options.turningAge))
    .replace(/\{date\}/g, options.occurrenceDate)
    .replace(/\{days\}/g, String(options.daysUntil));

  return {
    learnerId: options.learner.learnerId,
    name,
    date: options.occurrenceDate,
    daysUntil: options.daysUntil,
    turningAge: options.turningAge,
    message,
  };
}

/**
 * The birthdays falling inside the window that starts today, soonest first. A learner whose birthday
 * already passed this year rolls over to next year; an unusable date of birth is skipped, not guessed.
 */
export function upcomingBirthdays(
  learners: readonly LearnerBirthday[],
  options: UpcomingBirthdayOptions
): BirthdayNotice[] {
  const today = new Date(
    utcStampOf(
      options.from.getUTCFullYear(),
      options.from.getUTCMonth() + 1,
      options.from.getUTCDate()
    )
  );
  const todayStamp = today.getTime();

  const notices: BirthdayNotice[] = [];

  for (const learner of learners) {
    const birthday = parseDateOnly(learner.dateOfBirth);
    if (!birthday) continue;

    let observed = observedInYear(birthday, today.getUTCFullYear());
    if (utcStampOf(observed.year, observed.month, observed.day) < todayStamp) {
      observed = observedInYear(birthday, today.getUTCFullYear() + 1);
    }

    const occurrenceStamp = utcStampOf(observed.year, observed.month, observed.day);
    const daysUntil = Math.round((occurrenceStamp - todayStamp) / MS_PER_DAY);
    if (daysUntil > options.daysAhead) continue;
    if (options.includeWeekends === false) {
      const weekday = new Date(occurrenceStamp).getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
    }

    notices.push(
      buildNotice({
        learner,
        occurrenceDate: formatDateOnly(observed.year, observed.month, observed.day),
        daysUntil,
        turningAge: observed.year - birthday.year,
        template: options.template,
      })
    );
  }

  return notices.sort(
    (a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name) || a.learnerId.localeCompare(b.learnerId)
  );
}
