// ABOUTME: The organisation part of the plan: the school profile becomes the institution, the
// ABOUTME: year structures become the calendars, and the financial years keep their bounds.

import type { SqliteRow } from '@/data/adapters/sqlite';
import {
  type Calendar,
  type FinancialYear,
  type Institution,
  type InstitutionIdentifier,
} from '@/domain/schema';
import { generateUuidv7 } from '@/domain/ids';

import {
  canonicalTimestamp,
  legacyDay,
  legacyId,
  legacyText,
  LEGACY_SOURCES,
  type LegacyCalendarSource,
} from './001-legacy-calendar';
import type { PlanContext } from './001-calendar-plan';

const OWNERSHIP_BY_LEGACY: Record<string, Institution['ownership']> = {
  public: 'public',
  government: 'public',
  private: 'private',
  international: 'international',
  faith_based: 'faith_based',
  'faith based': 'faith_based',
  community: 'community',
};

const GENDER_BY_LEGACY: Record<string, Institution['gender_policy']> = {
  mixed: 'mixed',
  'boys only': 'boys',
  boys: 'boys',
  'girls only': 'girls',
  girls: 'girls',
};

/** The legacy financial year status; the values the finance module stores. */
const FINANCIAL_YEAR_OPEN = 'open';
const FINANCIAL_YEAR_CLOSED = 'closed';
const FINANCIAL_YEAR_ARCHIVED = 'archived';

/**
 * The ownership the legacy school type names.
 *
 * An empty school type is an assumption: the setup wizard never sets it. A school type the
 * canonical model does not know stops the migration: without an institution no other row can
 * be attached to one.
 */
function resolveOwnership(
  profile: SqliteRow,
  profileId: string,
  context: PlanContext
): Institution['ownership'] | null {
  const rawType = legacyText(profile, 'school_type');
  if (rawType === null) {
    const fallback = context.options.defaults.ownership;
    context.addAssumption(
      `institution.ownership was set to "${fallback}": the legacy school profile carries no school type`
    );
    return fallback;
  }
  const mapped = OWNERSHIP_BY_LEGACY[rawType.toLowerCase()];
  if (mapped === undefined) {
    context.addUnmappable(
      LEGACY_SOURCES.schoolDetails,
      profileId,
      'institution',
      `the school type "${rawType}" is not one of the values the canonical model knows`
    );
    context.addError(
      'unknown_school_type',
      'institution',
      LEGACY_SOURCES.schoolDetails,
      profileId,
      `the school type "${rawType}" is not one of the values the canonical model knows, so the school cannot be migrated`
    );
    return null;
  }
  return mapped;
}

/** The gender policy the legacy school gender names. */
function resolveGenderPolicy(
  profile: SqliteRow,
  profileId: string,
  context: PlanContext
): Institution['gender_policy'] | null {
  const rawGender = legacyText(profile, 'school_gender');
  if (rawGender === null) {
    const fallback = context.options.defaults.genderPolicy;
    context.addAssumption(
      `institution.gender_policy was set to "${fallback}": the legacy school profile carries no school gender`
    );
    return fallback;
  }
  const mapped = GENDER_BY_LEGACY[rawGender.toLowerCase()];
  if (mapped === undefined) {
    context.addUnmappable(
      LEGACY_SOURCES.schoolDetails,
      profileId,
      'institution',
      `the school gender "${rawGender}" is not one of the values the canonical model knows`
    );
    context.addError(
      'unknown_school_gender',
      'institution',
      LEGACY_SOURCES.schoolDetails,
      profileId,
      `the school gender "${rawGender}" is not one of the values the canonical model knows, so the school cannot be migrated`
    );
    return null;
  }
  return mapped;
}

/**
 * The institution the legacy school profile becomes.
 *
 * The legacy profile carries no country, locale, time zone, currency or boarding policy, so the
 * platform defaults fill them in and each one is recorded as an assumption.
 */
export function planInstitution(
  source: LegacyCalendarSource,
  context: PlanContext
): { institution: Institution; identifier: InstitutionIdentifier | null } | null {
  const profile = source.schoolDetails[0];
  for (const extra of source.schoolDetails.slice(1)) {
    context.addUnmappable(
      LEGACY_SOURCES.schoolDetails,
      legacyId(extra),
      'institution',
      'the legacy database holds more than one school profile'
    );
  }
  if (profile === undefined) {
    context.addError(
      'no_school_profile',
      'institution',
      LEGACY_SOURCES.schoolDetails,
      '',
      'the legacy database holds no school profile, so no row can be attached to one'
    );
    return null;
  }

  const profileId = legacyId(profile);
  const name = legacyText(profile, 'name');
  if (name === null) {
    context.addUnmappable(
      LEGACY_SOURCES.schoolDetails,
      profileId,
      'institution',
      'the school profile has no name'
    );
    context.addError(
      'school_profile_without_name',
      'institution',
      LEGACY_SOURCES.schoolDetails,
      profileId,
      'the school profile has no name, so the school cannot be migrated'
    );
    return null;
  }

  const defaults = context.options.defaults;
  const ownership = resolveOwnership(profile, profileId, context);
  if (ownership === null) return null;
  const genderPolicy = resolveGenderPolicy(profile, profileId, context);
  if (genderPolicy === null) return null;

  // A school with dormitories is a boarding school; the legacy data says so.
  const boardingPolicy = source.dormitoryCount > 0 ? 'boarding' : defaults.boardingPolicy;
  if (source.dormitoryCount === 0) {
    context.addAssumption(
      `institution.boarding_policy was set to "${defaults.boardingPolicy}": the legacy school has no dormitories`
    );
  }

  const createdAt = canonicalTimestamp(
    legacyText(profile, 'created_at'),
    context.options.referenceTimestamp
  );
  const updatedAt = canonicalTimestamp(
    legacyText(profile, 'updated_at'),
    context.options.referenceTimestamp
  );
  const region = legacyText(profile, 'town');
  const motto = legacyText(profile, 'motto');
  const setupCompletedAt = legacyText(profile, 'setup_completed_at');

  context.addAssumption(
    `institution.country was set to "${defaults.country}": the legacy school profile carries no country`
  );
  context.addAssumption(
    `institution.default_locale was set to "${defaults.defaultLocale}": the legacy school profile carries no locale`
  );
  context.addAssumption(
    `institution.time_zone was set to "${defaults.timeZone}": the legacy school profile carries no time zone`
  );
  context.addAssumption(
    `institution.base_currency was set to "${defaults.baseCurrency}": the legacy school profile carries no currency`
  );

  const institutionId = generateUuidv7();
  const institution: Institution = {
    id: institutionId,
    name,
    ...(region === null ? {} : { region }),
    ...(motto === null ? {} : { motto }),
    country: defaults.country,
    ownership,
    gender_policy: genderPolicy,
    boarding_policy: boardingPolicy,
    default_locale: defaults.defaultLocale,
    time_zone: defaults.timeZone,
    base_currency: defaults.baseCurrency,
    ...(setupCompletedAt === null
      ? {}
      : {
          setup_completed_at: canonicalTimestamp(
            setupCompletedAt,
            context.options.referenceTimestamp
          ),
        }),
    created_at: createdAt,
    updated_at: updatedAt,
  };
  context.mapping.push({
    legacyTable: LEGACY_SOURCES.schoolDetails,
    legacyId: profileId,
    canonicalEntity: 'institution',
    canonicalId: institutionId,
  });

  const schoolCode = legacyText(profile, 'school_code');
  if (schoolCode === null) return { institution, identifier: null };

  const identifierId = generateUuidv7();
  const identifier: InstitutionIdentifier = {
    id: identifierId,
    institution_id: institutionId,
    scheme: 'legacy.school_code',
    value: schoolCode,
    created_at: createdAt,
    updated_at: updatedAt,
  };
  context.mapping.push({
    legacyTable: LEGACY_SOURCES.schoolDetails,
    legacyId: profileId,
    canonicalEntity: 'institution_identifier',
    canonicalId: identifierId,
  });
  return { institution, identifier };
}

/** The calendars: one per legacy year structure. */
export function planCalendars(
  source: LegacyCalendarSource,
  context: PlanContext,
  institutionId: string
): { calendars: Calendar[]; byStructureId: Map<string, Calendar> } {
  const calendars: Calendar[] = [];
  const byStructureId = new Map<string, Calendar>();
  const names = new Set<string>();
  for (const row of source.yearStructures) {
    const structureId = legacyId(row);
    const name = legacyText(row, 'name');
    if (name === null) {
      context.addUnmappable(
        LEGACY_SOURCES.yearStructures,
        structureId,
        'calendar',
        'the year structure has no name'
      );
      continue;
    }
    if (names.has(name.toLowerCase())) {
      context.addUnmappable(
        LEGACY_SOURCES.yearStructures,
        structureId,
        'calendar',
        `another year structure is already called "${name}"`
      );
      continue;
    }
    names.add(name.toLowerCase());
    const calendarId = generateUuidv7();
    const calendar: Calendar = {
      id: calendarId,
      institution_id: institutionId,
      name,
      programme_ids: [],
      created_at: canonicalTimestamp(
        legacyText(row, 'created_at'),
        context.options.referenceTimestamp
      ),
      updated_at: canonicalTimestamp(
        legacyText(row, 'updated_at'),
        context.options.referenceTimestamp
      ),
    };
    calendars.push(calendar);
    byStructureId.set(structureId, calendar);
    context.mapping.push({
      legacyTable: LEGACY_SOURCES.yearStructures,
      legacyId: structureId,
      canonicalEntity: 'calendar',
      canonicalId: calendarId,
    });
  }
  return { calendars, byStructureId };
}

/** The financial years: the legacy rows, with their dates and their status. */
export function planFinancialYears(
  source: LegacyCalendarSource,
  context: PlanContext,
  institutionId: string
): { financialYears: FinancialYear[]; legacyIdByCanonicalId: Map<string, string> } {
  const financialYears: FinancialYear[] = [];
  const legacyIdByCanonicalId = new Map<string, string>();
  const names = new Set<string>();
  for (const row of source.financialYears) {
    const rowId = legacyId(row);
    const name = legacyText(row, 'name');
    const startDate = legacyDay(row, 'start_date');
    const endDate = legacyDay(row, 'end_date');
    const legacyStatus = (legacyText(row, 'status') ?? '').toLowerCase();
    if (name === null) {
      context.addUnmappable(
        LEGACY_SOURCES.financialYears,
        rowId,
        'financial_year',
        'the financial year has no name'
      );
      continue;
    }
    if (names.has(name.toLowerCase())) {
      context.addUnmappable(
        LEGACY_SOURCES.financialYears,
        rowId,
        'financial_year',
        `another financial year is already called "${name}"`
      );
      continue;
    }
    if (startDate === null || endDate === null) {
      context.addUnmappable(
        LEGACY_SOURCES.financialYears,
        rowId,
        'financial_year',
        'the financial year has no start and end date'
      );
      continue;
    }
    if (endDate < startDate) {
      context.addUnmappable(
        LEGACY_SOURCES.financialYears,
        rowId,
        'financial_year',
        `the financial year ends (${endDate}) before it starts (${startDate})`
      );
      continue;
    }
    const status = financialYearStatus(
      { start_date: startDate, end_date: endDate, legacyStatus },
      context.options.referenceDate
    );
    if (status === null) {
      context.addUnmappable(
        LEGACY_SOURCES.financialYears,
        rowId,
        'financial_year',
        `the status "${legacyStatus}" is not one of the values the canonical model knows`
      );
      continue;
    }
    names.add(name.toLowerCase());
    const financialYear: FinancialYear = {
      id: generateUuidv7(),
      institution_id: institutionId,
      name,
      start_date: startDate,
      end_date: endDate,
      status,
      created_at: canonicalTimestamp(
        legacyText(row, 'created_at'),
        context.options.referenceTimestamp
      ),
      updated_at: canonicalTimestamp(
        legacyText(row, 'updated_at'),
        context.options.referenceTimestamp
      ),
    };
    financialYears.push(financialYear);
    legacyIdByCanonicalId.set(financialYear.id, rowId);
    context.mapping.push({
      legacyTable: LEGACY_SOURCES.financialYears,
      legacyId: rowId,
      canonicalEntity: 'financial_year',
      canonicalId: financialYear.id,
    });
  }
  return { financialYears, legacyIdByCanonicalId };
}

/** The status of a financial year: the legacy status, read against the reference day. */
function financialYearStatus(
  year: { start_date: string; end_date: string; legacyStatus: string },
  referenceDate: string
): FinancialYear['status'] | null {
  const status = year.legacyStatus;
  if (status === FINANCIAL_YEAR_CLOSED || status === FINANCIAL_YEAR_ARCHIVED) return 'closed';
  if (status !== FINANCIAL_YEAR_OPEN) return null;
  if (year.start_date <= referenceDate && referenceDate <= year.end_date) return 'current';
  if (year.start_date > referenceDate) return 'planned';
  return 'closed';
}
