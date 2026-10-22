// ABOUTME: Review and publish: the reviewer sees what will go out and can exclude learners, a
// ABOUTME: publish freezes the exact content into an immutable snapshot, and a re-issue appends a
// ABOUTME: new version linked to the original rather than changing what was published.

import { canonicalJson } from '@/domain/curriculum/registry/json';
import type { Json } from '@/domain/curriculum/registry/json';
import { buildVerificationLink, resolveDocument } from '@/domain/reports';
import type { ReportTemplate } from '@/domain/reports/types';
import { asId } from '@/domain/ids';
import { MAX_LIMIT } from '@/data/repository';

import type { WritableQueryRepository } from '../../data/canonicalRepository';
import { buildPortalLink, buildSmsLink } from './distribution';
import { freezeDocument, hashSnapshotContent, signSnapshot } from './snapshot';
import type {
  GeneratedReport,
  GenerationBatch,
  Publication,
  ReviewItem,
  ReviewStatus,
  ReviewSummary,
  ReviewedBatch,
  SnapshotContent,
} from './types';
import { ReportPublishError } from './types';

// ------------------------------------------------------------------- review

export interface ReviewOptions {
  readonly reviewedBy: string;
  readonly reviewedAt: string;
  /** The learners the reviewer took out of the publish. */
  readonly excluded?: ReadonlySet<string>;
  /** Extra plain-language lines per learner, from whatever else the page knows. */
  readonly issuesOf?: (report: GeneratedReport) => readonly string[];
}

/**
 * Builds the review a publish requires.
 *
 * The reviewer sees the counts, the learners with incomplete results, the moderated grades and the
 * learners outside their scope, and can exclude any individual. Nothing is published until this
 * has been produced and handed to `publish`.
 */
export function reviewBatch(batch: GenerationBatch, options: ReviewOptions): ReviewedBatch {
  const excluded = options.excluded ?? new Set<string>();
  const items: ReviewItem[] = batch.reports.map((report) => {
    const issues: string[] = [];
    if (report.outsideScope) {
      issues.push('Outside your teaching scope: this learner’s report cannot be published here.');
    }
    if (report.incomplete) {
      issues.push('The aggregate has no complete result, so the card prints the gaps.');
    }
    if (report.moderation !== null) {
      issues.push(
        `Moderated: ${report.moderation.value} (the engine computed ${
          report.aggregate.engineGrade ?? 'no grade'
        }) — ${report.moderation.reason}`
      );
    }
    for (const extra of options.issuesOf?.(report) ?? []) issues.push(extra);
    const status: ReviewStatus = report.outsideScope
      ? 'outside_scope'
      : report.incomplete
        ? 'incomplete'
        : report.moderation !== null
          ? 'moderated'
          : 'ready';
    return {
      enrolmentId: report.enrolmentId,
      learnerName: report.learnerName,
      status,
      issues,
      moderation: report.moderation,
      excluded: excluded.has(report.enrolmentId),
    };
  });

  const summary: ReviewSummary = {
    total: items.length,
    ready: items.filter((item) => item.status === 'ready').length,
    incomplete: items.filter((item) => item.status === 'incomplete').length,
    moderated: items.filter((item) => item.moderation !== null).length,
    outsideScope: items.filter((item) => item.status === 'outside_scope').length,
    excluded: items.filter((item) => item.excluded).length,
    included: items.filter((item) => !item.excluded && item.status !== 'outside_scope').length,
    failures: batch.failures,
  };

  return { batch, items, summary, reviewedBy: options.reviewedBy, reviewedAt: options.reviewedAt };
}

// -------------------------------------------------------------------- store

/**
 * Where published snapshots live.
 *
 * The store is append-only in practice: `writeAll` is handed the whole list, and the publisher
 * refuses to hand back a list in which a record it read has changed. The product adapter persists
 * to the canonical `report_card` entity, whose `published_snapshot_immutable` invariant refuses an
 * in-place snapshot change even if a future caller tried one.
 */
export interface PublicationStore {
  readAll(): Promise<readonly Publication[]>;
  writeAll(records: readonly Publication[]): Promise<void>;
}

/** A store for the session and for tests. */
export function createMemoryPublicationStore(
  initial: readonly Publication[] = []
): PublicationStore {
  let records: readonly Publication[] = [...initial];
  return {
    async readAll() {
      return records;
    },
    async writeAll(next) {
      records = [...next];
    },
  };
}

function isPublication(value: unknown): value is Publication {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Publication>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.documentId === 'string' &&
    typeof candidate.version === 'number' &&
    typeof candidate.snapshotHash === 'string' &&
    typeof candidate.signature === 'string' &&
    typeof candidate.content === 'object' &&
    candidate.content !== null
  );
}

/** A store backed by browser storage, for a deployment with no canonical database in reach. */
export function createStoragePublicationStore(
  key: string,
  storage?: Storage | null
): PublicationStore {
  const resolve = (): Storage | null => {
    if (storage !== undefined) return storage;
    try {
      return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
      return null;
    }
  };
  return {
    async readAll() {
      const target = resolve();
      if (!target) return [];
      try {
        const raw = target.getItem(key);
        const parsed: unknown = raw === null ? null : JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(isPublication) : [];
      } catch {
        return [];
      }
    },
    async writeAll(records) {
      const target = resolve();
      if (!target) return;
      try {
        target.setItem(key, JSON.stringify(records));
      } catch {
        // A blocked store must not break the page; the caller keeps the records it just made.
      }
    },
  };
}

/**
 * The product store: one `report_card` row per published version.
 *
 * `snapshot` holds the whole publication (the frozen content, the signature and the links); the
 * row's own columns mirror the key and the publish metadata, so the canonical indexes and the
 * unique `(enrolment, period, template, template_version, version)` key still apply. An existing
 * version is never rewritten: `writeAll` only ever creates rows it has not seen.
 */
export function createRepositoryPublicationStore(
  repository: WritableQueryRepository,
  institutionId: string
): PublicationStore {
  const readRows = async () => (await repository.list('report_card', { limit: MAX_LIMIT })).items;
  const asPublication = (row: { readonly snapshot?: unknown }): Publication | null =>
    isPublication(row.snapshot) ? row.snapshot : null;

  return {
    async readAll() {
      const rows = await readRows();
      return rows.map(asPublication).filter((record): record is Publication => record !== null);
    },
    async writeAll(records) {
      const rows = await readRows();
      const known = new Set(
        rows.map(asPublication).filter((record): record is Publication => record !== null).map((record) => record.id)
      );
      for (const record of records) {
        if (known.has(record.id)) continue;
        await repository.create(
          'report_card',
          {
            institution_id: asId<'institution'>(institutionId),
            enrolment_id: asId<'enrolment'>(record.enrolmentId),
            academic_period_id: asId<'academic_period'>(record.periodId),
            template_code: record.templateCode,
            template_version: record.templateVersion,
            version: record.version,
            // The whole publication, so the row round-trips exactly. It is JSON by construction.
            snapshot: record as unknown as Json,
            published_at: record.publishedAt,
            published_by: asId<'user'>(record.publishedBy),
          },
          { reason: record.reason ?? undefined }
        );
      }
    },
  };
}

// ---------------------------------------------------------------- publisher

export interface PublisherOptions {
  readonly store: PublicationStore;
  /** The key the verification signature is computed with; the verification host holds it too. */
  readonly secret: string;
  readonly verificationHost: string;
  readonly portalHost: string;
  readonly shortHost: string;
  readonly now: () => string;
  /** A new publication row id. */
  readonly newId: () => string;
  /** A new opaque document id for a re-issue. */
  readonly newDocumentId: () => string;
  /** Replaces the default keyed-MAC signer (for example with Web Crypto HMAC or Ed25519). */
  readonly sign?: (message: string) => string;
}

/**
 * Refuses to accept a write that changed or dropped a publication already stored.
 *
 * The acceptance is that a published snapshot never changes. The publisher checks the state it read
 * against the state the store holds after the write: a store that rewrites or loses a published
 * record is reported instead of being trusted, and a created record must be persisted byte-identical.
 */
function assertAppendOnly(before: readonly Publication[], after: readonly Publication[]): void {
  const kept = new Map(after.map((record) => [record.id, record] as const));
  for (const record of before) {
    const current = kept.get(record.id);
    if (current === undefined || canonicalJson(current) !== canonicalJson(record)) {
      throw new ReportPublishError(
        'already_published',
        `Publication ${record.id} would change; a published snapshot is never rewritten.`
      );
    }
  }
}

/** Every record the publisher created must be persisted byte-identical, or the write failed. */
function assertPersisted(created: readonly Publication[], persisted: readonly Publication[]): void {
  const byId = new Map(persisted.map((record) => [record.id, record] as const));
  for (const record of created) {
    const stored = byId.get(record.id);
    if (stored === undefined || canonicalJson(stored) !== canonicalJson(record)) {
      throw new ReportPublishError(
        'already_published',
        `Publication ${record.id} was not stored as issued; the store is not append-only.`
      );
    }
  }
}

/** Publishes frozen report snapshots and re-issues them as new, linked versions. */
export class ReportPublisher {
  private readonly options: PublisherOptions;

  constructor(options: PublisherOptions) {
    this.options = options;
  }

  /** Issues the first version of every included learner's report. */
  async publish(
    review: ReviewedBatch | null | undefined,
    options: { readonly reason?: string } = {}
  ): Promise<Publication[]> {
    if (!review) {
      throw new ReportPublishError(
        'no_review',
        'A batch must be reviewed before it is published; nothing goes out unreviewed.'
      );
    }
    const included = review.items.filter(
      (item) => !item.excluded && item.status !== 'outside_scope'
    );
    if (included.length === 0) {
      throw new ReportPublishError(
        'nothing_to_publish',
        'Every learner is either excluded or outside your scope, so there is nothing to publish.'
      );
    }

    const reason = (options.reason ?? '').trim();
    const reportByEnrolment = new Map(
      review.batch.reports.map((report) => [report.enrolmentId, report] as const)
    );
    const existing = await this.options.store.readAll();
    const created: Publication[] = [];
    for (const item of included) {
      const report = reportByEnrolment.get(item.enrolmentId);
      if (report === undefined) continue;
      const prior = latestInScope(existing, report, review.batch.template.code, review.batch.templateVersion);
      // A later publish of the same learner is a re-issue: it needs a reason, and it links back.
      if (prior !== null && reason === '') {
        throw new ReportPublishError(
          'reason_required',
          `${report.learnerName} already has a published report for this period; write why it is being re-issued.`
        );
      }
      created.push(
        this.issue({
          report,
          template: review.batch.template,
          templateVersion: review.batch.templateVersion,
          stored: [...existing, ...created],
          reason: prior === null ? null : reason,
          actorId: review.reviewedBy,
        })
      );
    }

    const next = [...existing, ...created];
    assertAppendOnly(existing, next);
    await this.options.store.writeAll(next);
    const persisted = await this.options.store.readAll();
    assertAppendOnly(existing, persisted);
    assertPersisted(created, persisted);
    return created;
  }

  /**
   * Issues a new version of a publication, linked to the original.
   *
   * The reason and the actor are recorded on the new version. The original is never touched: it
   * stays readable, and the new version's `supersedes` names the version in force. A re-release
   * reuses the original's frozen content and template, so nothing that changed since can leak in;
   * a corrected report goes through `publish` again, which issues the next version the same way.
   */
  async reissue(input: {
    readonly publicationId: string;
    readonly reason: string;
    readonly actorId: string;
  }): Promise<Publication> {
    const reason = input.reason.trim();
    if (reason === '') {
      throw new ReportPublishError(
        'reason_required',
        'Write why the report is being re-issued; the reason is recorded on the new version.'
      );
    }
    const existing = await this.options.store.readAll();
    const original = existing.find((record) => record.id === input.publicationId);
    if (original === undefined) {
      throw new ReportPublishError('not_found', 'That published report could not be found.');
    }

    const created = this.issue({
      report: this.reportFromPublication(original),
      template: original.content.template,
      templateVersion: original.content.templateVersion,
      stored: existing,
      reason,
      actorId: input.actorId,
    });
    const next = [...existing, created];
    assertAppendOnly(existing, next);
    await this.options.store.writeAll(next);
    const persisted = await this.options.store.readAll();
    assertAppendOnly(existing, persisted);
    assertPersisted([created], persisted);
    return created;
  }

  async read(publicationId: string): Promise<Publication | null> {
    const records = await this.options.store.readAll();
    return records.find((record) => record.id === publicationId) ?? null;
  }

  /** Every stored publication, across learners and periods. */
  async all(): Promise<readonly Publication[]> {
    return this.options.store.readAll();
  }

  /** Every version of one learner's report for a period and template, oldest first. */
  async versions(scope: {
    readonly enrolmentId: string;
    readonly periodId: string;
    readonly templateCode: string;
  }): Promise<Publication[]> {
    const records = await this.options.store.readAll();
    return records
      .filter(
        (record) =>
          record.enrolmentId === scope.enrolmentId &&
          record.periodId === scope.periodId &&
          record.templateCode === scope.templateCode
      )
      .sort((left, right) => left.version - right.version);
  }

  /** The version in force for one learner: the highest version issued. */
  async latest(scope: {
    readonly enrolmentId: string;
    readonly periodId: string;
    readonly templateCode: string;
  }): Promise<Publication | null> {
    const versions = await this.versions(scope);
    return versions.length === 0 ? null : versions[versions.length - 1];
  }

  /** Rebuilds a report from a stored publication, for a re-release that changes nothing. */
  private reportFromPublication(publication: Publication): GeneratedReport {
    return {
      enrolmentId: publication.enrolmentId,
      learnerName: publication.content.card.learner.name,
      admissionNumber: publication.content.card.learner.admissionNo ?? null,
      house: publication.content.card.learner.house ?? null,
      documentId: this.options.newDocumentId(),
      periodId: publication.periodId,
      issuedAt: this.options.now(),
      card: publication.content.card,
      grades: publication.content.grades,
      aggregate: publication.content.aggregate,
      previewDocument: publication.document,
      incomplete: publication.content.aggregate.publishedGrade === null,
      moderation: null,
      outsideScope: false,
    };
  }

  /**
   * Builds and stores one version.
   *
   * The hash covers the frozen content only (document id, issued-at, template, card, grades) and
   * never the signature or the QR, so the signature can be attached after the hash without the two
   * chasing each other. The document is resolved from the frozen template and card, never from the
   * live ones, so a later template or mark change cannot reach it. The version and the supersession
   * are read from what is already stored for the learner's scope.
   */
  private issue(input: {
    readonly report: GeneratedReport;
    readonly template: ReportTemplate;
    readonly templateVersion: string;
    readonly stored: readonly Publication[];
    readonly reason: string | null;
    readonly actorId: string;
  }): Publication {
    const { report, template, templateVersion } = input;
    const labelSource = report.previewDocument.labelSource;
    // A deep copy, so the snapshot is independent of the caller's object graph: a later mutation of
    // the batch's card or template cannot reach what was published.
    const content: SnapshotContent = structuredClone({
      documentId: report.documentId,
      issuedAt: report.issuedAt,
      template,
      templateVersion,
      locale: labelSource.locale,
      card: report.card,
      grades: report.grades,
      aggregate: report.aggregate,
    });

    const snapshotHash = hashSnapshotContent(content);
    const signature = signSnapshot({
      documentId: content.documentId,
      snapshotHash,
      issuedAt: content.issuedAt,
      secret: this.options.secret,
      ...(this.options.sign === undefined ? {} : { sign: this.options.sign }),
    });
    const model = resolveDocument({
      template: content.template,
      card: content.card,
      locales: labelSource.bundles,
      locale: labelSource.locale,
      defaultLocale: labelSource.defaultLocale,
      documentId: content.documentId,
      issuedAt: content.issuedAt,
      verification: { host: this.options.verificationHost, signature },
    });
    const document = freezeDocument(model, labelSource);
    const verification = buildVerificationLink({
      host: this.options.verificationHost,
      documentId: content.documentId,
      signature,
    });

    const prior = latestInScope(input.stored, report, template.code, templateVersion);
    const version = (prior?.version ?? 0) + 1;

    return {
      id: this.options.newId(),
      documentId: content.documentId,
      enrolmentId: report.enrolmentId,
      periodId: report.periodId,
      templateCode: template.code,
      templateVersion,
      version,
      supersedes: prior?.id ?? null,
      reason: input.reason,
      publishedBy: input.actorId,
      publishedAt: this.options.now(),
      snapshotHash,
      signature,
      content,
      document,
      verificationUrl: verification.url,
      portalUrl: buildPortalLink({
        host: this.options.portalHost,
        documentId: content.documentId,
        signature,
      }).url,
      smsUrl: buildSmsLink({
        host: this.options.shortHost,
        documentId: content.documentId,
        signature,
      }).url,
    };
  }
}

/** The highest version already stored for one learner's report scope, or null. */
function latestInScope(
  stored: readonly Publication[],
  report: Pick<GeneratedReport, 'enrolmentId' | 'periodId'>,
  templateCode: string,
  templateVersion: string
): Publication | null {
  const scope = stored.filter(
    (record) =>
      record.enrolmentId === report.enrolmentId &&
      record.periodId === report.periodId &&
      record.templateCode === templateCode &&
      record.templateVersion === templateVersion
  );
  if (scope.length === 0) return null;
  return scope.reduce((highest, record) => (record.version > highest.version ? record : highest));
}
