// ABOUTME: The discount service: reads the canonical discount_rule and sponsorship rows as the rules
// ABOUTME: the engine applies, writes a rule or a sponsorship back through the canonical repository,
// ABOUTME: and plans a learner's bill from what the repository holds.

import { RepositoryConflictError, type RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { isCurrencyCode, type CurrencyCode } from '@/domain/money';

import {
  discountRuleFromRow,
  discountRuleToRow,
  sponsorshipFromRow,
  sponsorshipToRow,
} from './canonical';
import { planLearnerBill } from './billing';
import { DiscountError } from './errors';
import { assertDiscountRule, ruleInPeriod, ruleReachesLearner } from './rules';
import type {
  BillLineInput,
  DiscountBudget,
  DiscountPlanOptions,
  DiscountRule,
  DiscountStore,
  LearnerBillFacts,
  LearnerBillInput,
  LearnerBillPlan,
  SponsorshipAgreement,
} from './types';

/** The longest page the service reads; the repository caps a page at 500 rows. */
const PAGE_LIMIT = 500;

/** What the service needs: the canonical repository, and the actor its writes are stamped with. */
export interface DiscountServiceOptions {
  readonly repository: DiscountStore;
  readonly actor?: string;
}

/** What a bill request names: the learner, the period, the lines and what applies to them. */
export interface ServiceBillRequest {
  readonly institutionId: Id<'institution'>;
  readonly learnerId: string;
  readonly period: { readonly periodId?: string; readonly on: string };
  readonly lines: readonly BillLineInput[];
  readonly facts: LearnerBillFacts;
  /**
   * The sponsorships the learner is under, by id.
   *
   * The learner-to-sponsorship link is the canonical `enrolment.sponsorship_id`, which the caller
   * resolves; the service loads exactly the rows it is given, so one learner's sponsorship is never
   * applied to another's bill.
   */
  readonly sponsorshipIds?: readonly string[];
  readonly budgets?: readonly DiscountBudget[];
  readonly family?: LearnerBillInput['family'];
  readonly options?: DiscountPlanOptions;
}

/**
 * The discount service.
 *
 * It is a thin seam, not a second engine: the rules it reads are the canonical `discount_rule` rows
 * decoded by `discountRuleFromRow`, the sponsorships are the canonical `sponsorship` rows, and the
 * planning is the pure `planLearnerBill`. What it adds is the currency the canonical rows do not
 * carry, and the repository read the engine cannot do itself.
 */
export class DiscountService {
  private readonly repository: DiscountStore;
  private readonly actor: string | undefined;

  constructor(options: DiscountServiceOptions) {
    this.repository = options.repository;
    this.actor = options.actor;
  }

  /** The institution's base currency, which a fixed canonical amount is read in. */
  async institutionCurrency(institutionId: Id<'institution'>): Promise<CurrencyCode> {
    const institution = await this.repository.get('institution', institutionId);
    if (!institution) {
      throw new DiscountError('not_found', `the institution ${institutionId} does not exist`, institutionId);
    }
    const currency = institution.base_currency;
    if (!isCurrencyCode(currency)) {
      throw new DiscountError(
        'not_found',
        `the institution's base currency "${currency}" is not a currency of the table`,
        institutionId
      );
    }
    return currency;
  }

  /** Every discount rule of an institution, as the engine reads it. */
  async listRules(institutionId: Id<'institution'>): Promise<readonly DiscountRule[]> {
    const currency = await this.institutionCurrency(institutionId);
    const page = await this.repository.list('discount_rule', {
      where: { institution_id: institutionId },
      limit: PAGE_LIMIT,
    });
    return page.items.map((row) => discountRuleFromRow(row, { currency }));
  }

  /** Every sponsorship of an institution, as the split engine reads it. */
  async listSponsorships(institutionId: Id<'institution'>): Promise<readonly SponsorshipAgreement[]> {
    const page = await this.repository.list('sponsorship', {
      where: { institution_id: institutionId },
      limit: PAGE_LIMIT,
    });
    return page.items.map((row) => sponsorshipFromRow(row));
  }

  /** One sponsorship, or null. */
  async getSponsorship(id: Id<'sponsorship'>): Promise<SponsorshipAgreement | null> {
    const row = await this.repository.get('sponsorship', id);
    return row === null ? null : sponsorshipFromRow(row);
  }

  /** Writes a discount rule as a canonical row, refusing one the engine would refuse. */
  async createRule(
    rule: DiscountRule,
    institutionId: Id<'institution'>,
    options: { readonly reason?: string } = {}
  ): Promise<RepositoryRow<'discount_rule'>> {
    const currency = await this.institutionCurrency(institutionId);
    assertDiscountRule(rule, currency);
    try {
      return await this.repository.create('discount_rule', discountRuleToRow(rule, institutionId), {
        ...(this.actor === undefined ? {} : { actor: this.actor }),
        ...(options.reason === undefined ? {} : { reason: options.reason }),
      });
    } catch (error) {
      throw this.asRuleNameTaken(error, rule.name);
    }
  }

  /** Writes a sponsorship as a canonical row. */
  async createSponsorship(
    agreement: SponsorshipAgreement,
    institutionId: Id<'institution'>,
    name: string,
    options: { readonly reason?: string } = {}
  ): Promise<RepositoryRow<'sponsorship'>> {
    const hasShare = agreement.sharePercent !== undefined;
    const hasAmount = agreement.agreedAmount !== undefined;
    if (hasShare === hasAmount) {
      throw new DiscountError(
        'sponsorship_invalid',
        `${agreement.sponsorName} must state exactly one of an agreed share and an agreed amount`,
        agreement.id
      );
    }
    if (name.trim() === '') {
      throw new DiscountError('sponsorship_invalid', 'a sponsorship needs a name', agreement.id);
    }
    return this.repository.create('sponsorship', sponsorshipToRow(agreement, institutionId, name), {
      ...(this.actor === undefined ? {} : { actor: this.actor }),
      ...(options.reason === undefined ? {} : { reason: options.reason }),
    });
  }

  /**
   * Plans a learner's bill from what the repository holds.
   *
   * This is what a billing run calls: the rules are the institution's canonical `discount_rule`
   * rows, the sponsorships are the ones the caller names (resolved from the learner's enrolment),
   * and the budgets are the stored figures the caller supplies. The planning itself is the pure
   * `planLearnerBill`, so the run can preview it and post it without the two disagreeing.
   */
  async planBill(request: ServiceBillRequest): Promise<LearnerBillPlan> {
    const currency = await this.institutionCurrency(request.institutionId);
    const rules = await this.listRules(request.institutionId);
    const sponsorships: SponsorshipAgreement[] = [];
    for (const id of request.sponsorshipIds ?? []) {
      const agreement = await this.getSponsorship(asId<'sponsorship'>(id));
      if (agreement === null) {
        throw new DiscountError('not_found', `the sponsorship ${id} does not exist`, id);
      }
      sponsorships.push(agreement);
    }
    return planLearnerBill({
      institutionId: request.institutionId,
      learnerId: request.learnerId,
      currency,
      period: request.period,
      lines: request.lines,
      rules,
      sponsorships,
      facts: request.facts,
      ...(request.budgets === undefined ? {} : { budgets: request.budgets }),
      ...(request.family === undefined ? {} : { family: request.family }),
      ...(request.options === undefined ? {} : { options: request.options }),
    });
  }

  /** The rules of an institution that reach one learner in one period, as a screen shows them. */
  async applicableRules(
    institutionId: Id<'institution'>,
    facts: LearnerBillFacts,
    period: { readonly periodId?: string; readonly on: string }
  ): Promise<readonly DiscountRule[]> {
    const rules = await this.listRules(institutionId);
    return rules.filter((rule) => ruleReachesLearner(rule, facts) && ruleInPeriod(rule, period));
  }

  private asRuleNameTaken(error: unknown, name: string): unknown {
    if (error instanceof RepositoryConflictError && error.reason === 'unique') {
      return new DiscountError(
        'discount_rule_invalid',
        `a discount rule named "${name}" already exists in this institution`,
        name
      );
    }
    return error;
  }
}
