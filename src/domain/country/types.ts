// ABOUTME: The shape of a country pack document (packs/country/schema.json) and of what the module
// ABOUTME: returns from it: identifier scheme options, dated holidays and the address hierarchy.

import type { IDENTIFIER_OWNER_TYPES } from '@/domain/schema/people';

export type OwnerType = (typeof IDENTIFIER_OWNER_TYPES)[number];
export type Verification = 'draft' | 'verified';
export type IdentifierNormalisation = 'trim' | 'remove_spaces' | 'remove_hyphens' | 'uppercase';

export interface CountrySource {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  readonly accessed: string;
}

export type IdentifierValidation =
  | {
      readonly type: 'pattern';
      readonly pattern: string;
      readonly normalise: readonly IdentifierNormalisation[];
    }
  | { readonly type: 'free' };

export interface CountryIdentifier {
  readonly scheme: string;
  readonly labelKey: string;
  readonly appliesTo: readonly OwnerType[];
  readonly order?: Readonly<Partial<Record<OwnerType, number>>>;
  readonly validation: IdentifierValidation;
  readonly hintKey: string;
  readonly example: string;
  readonly sourceRef?: string;
  readonly verification: Verification;
  readonly note?: string;
}

export interface AddressOption {
  readonly code: string;
  readonly name: string;
}

export interface CountryAddressLevel {
  readonly key: string;
  readonly labelKey: string;
  readonly required: boolean;
  readonly options?: {
    readonly values: readonly AddressOption[];
    readonly sourceRef?: string;
    readonly verification?: Verification;
  };
}

export interface CountryAddressHierarchy {
  readonly levels: readonly CountryAddressLevel[];
  readonly hasCity: boolean;
  readonly cityRequired: boolean;
  readonly postalCode: { readonly required: boolean; readonly pattern?: string };
}

export type HolidayRule =
  | { readonly type: 'fixed'; readonly month: number; readonly day: number }
  | { readonly type: 'easter'; readonly offsetDays: number }
  | { readonly type: 'byYear'; readonly dates: Readonly<Record<string, string>> };

export interface CountryHoliday {
  readonly id: string;
  readonly nameKey: string;
  readonly rule: HolidayRule;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly observed: 'none' | 'sunday_to_monday';
  readonly sourceRef: string;
  readonly verification: Verification;
  readonly note?: string;
}

export type DueRule =
  | { readonly type: 'day_of_following_month'; readonly day: number }
  | { readonly type: 'working_day_of_following_month'; readonly workingDay: number };

export interface StatutoryReturn {
  readonly id: string;
  readonly nameKey: string;
  readonly authority: string;
  readonly frequency: 'monthly' | 'quarterly' | 'annual' | 'per_event';
  readonly due: DueRule;
  readonly sourceRef: string;
  readonly verification: Verification;
  readonly note?: string;
}

/** A `packs/country/<cc>/country.json` document. */
export interface CountryPack {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: 'country';
  readonly country: string;
  readonly name: string;
  readonly version: string;
  readonly verification: Verification;
  readonly notes?: readonly string[];
  readonly sources: readonly CountrySource[];
  readonly defaults: {
    readonly currency: string;
    readonly languages: readonly string[];
    readonly timeZone: string;
    readonly phoneRegion: string;
    readonly calendar: 'gregorian';
    readonly weekStartsOn: number;
  };
  readonly identifiers: readonly CountryIdentifier[];
  readonly addressHierarchy: CountryAddressHierarchy;
  readonly holidays: readonly CountryHoliday[];
  readonly statutoryReturns: readonly StatutoryReturn[];
}

/** One identifier scheme as a form offers it. */
export interface IdentifierSchemeOption {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
}

export type IdentifierValidationResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

/** A public holiday of one year: the date the pack names and the date it is observed on. */
export interface DatedHoliday {
  readonly id: string;
  readonly nameKey: string;
  /** The date the law names (`YYYY-MM-DD`). */
  readonly date: string;
  /** The date the day off falls on after the pack's observance rule. */
  readonly observed: string;
  readonly verification: Verification;
}

/** What a country's address form collects; the shape `utils/locale/addresses` uses. */
export interface CountryAddressSchema {
  readonly country: string;
  readonly levels: readonly { readonly key: string; readonly labelKey: string; readonly required: boolean }[];
  readonly hasCity: boolean;
  readonly cityRequired: boolean;
  readonly postalCodeRequired: boolean;
  readonly postalCodeLabelKey: string;
  readonly line1LabelKey: string;
  readonly line2LabelKey: string;
}
