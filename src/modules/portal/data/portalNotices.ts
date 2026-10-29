// ABOUTME: The notices the portal shows: published, in date, addressed to the viewer's own audience,
// ABOUTME: each with whether this account has read it.

import { PortalAccessError, type PortalIdentity, type PortalRole } from './portalAccess';

/** A notice as the portal shows it. */
export interface PortalNotice {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly priority: string;
  readonly audience: string;
  readonly authorName: string;
  readonly publishedAt: string;
  readonly expiresAt: string | null;
  readonly read: boolean;
}

export interface NoticeSource {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly priority: string;
  readonly audience: string;
  readonly authorName: string;
  readonly publishedAt: string;
  readonly expiresAt?: string | null;
  readonly isPublished: boolean;
  readonly readBy?: readonly string[];
}

export interface NoticeReadInput {
  readonly notices: readonly NoticeSource[];
  /** The canonical user id, the key the notice's `readBy` list carries. */
  readonly readerId: string;
  readonly now: Date;
  /** Whose audience to read; defaults to the viewer's role. */
  readonly audience?: 'parents' | 'students';
}

/** Whether a notice is addressed to the audience reading it. */
export function noticeIsForViewer(
  notice: Pick<NoticeSource, 'audience'>,
  audience: 'parents' | 'students'
): boolean {
  return notice.audience === 'all' || notice.audience === audience;
}

const audienceFor = (role: PortalRole | null): 'parents' | 'students' =>
  role === 'guardian' ? 'parents' : 'students';

/**
 * The notices this viewer may read, newest first.
 *
 * An unlinked account has no audience of its own, so it is refused rather than shown the
 * school-wide notices it has no relationship with.
 */
export function readNotices(
  identity: PortalIdentity,
  input: NoticeReadInput
): readonly PortalNotice[] {
  if (identity.status !== 'linked') throw new PortalAccessError('notices');
  const audience = input.audience ?? audienceFor(identity.role);

  return input.notices
    .filter((notice) => notice.isPublished)
    .filter((notice) => notice.expiresAt == null || new Date(notice.expiresAt) > input.now)
    .filter((notice) => noticeIsForViewer(notice, audience))
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    .map((notice) => ({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      priority: notice.priority,
      audience: notice.audience,
      authorName: notice.authorName,
      publishedAt: notice.publishedAt,
      expiresAt: notice.expiresAt ?? null,
      read: (notice.readBy ?? []).includes(input.readerId),
    }));
}
