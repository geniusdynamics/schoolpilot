// ABOUTME: The review step of report publishing: what will be published, who has gaps or a
// ABOUTME: moderation, who is outside scope, and the per-learner exclusion the reviewer can set.

import type { ReactNode } from 'react';

import Badge from '@/components/ui/Badge';
import Checkbox from '@/components/ui/Checkbox';

import type { ReviewItem, ReviewStatus, ReviewedBatch } from './types';

const STATUS_LABEL: Readonly<Record<ReviewStatus, string>> = {
  ready: 'Ready',
  incomplete: 'Incomplete results',
  moderated: 'Moderated',
  outside_scope: 'Outside scope',
};

function statusVariant(status: ReviewStatus): 'success' | 'warning' | 'info' | 'danger' {
  switch (status) {
    case 'ready':
      return 'success';
    case 'incomplete':
      return 'warning';
    case 'moderated':
      return 'info';
    default:
      return 'danger';
  }
}

export interface ReviewPanelProps {
  readonly review: ReviewedBatch | null;
  readonly onToggle: (enrolmentId: string) => void;
  readonly busy: boolean;
}

/** One review row. An out-of-scope learner cannot be included, so its checkbox is disabled. */
const ReviewRow: React.FC<{
  readonly item: ReviewItem;
  readonly onToggle: (enrolmentId: string) => void;
  readonly busy: boolean;
}> = ({ item, onToggle, busy }) => {
  const locked = item.status === 'outside_scope';
  return (
    <tr className="border-b border-surface-border align-top">
      <td className="px-2 py-2">
        <Checkbox
          checked={!item.excluded && !locked}
          disabled={busy || locked}
          onChange={() => onToggle(item.enrolmentId)}
          aria-label={`Include ${item.learnerName}`}
        />
      </td>
      <th scope="row" className="px-2 py-2 text-left font-medium">
        {item.learnerName}
      </th>
      <td className="px-2 py-2">
        <Badge variant={statusVariant(item.status)} size="sm">
          {STATUS_LABEL[item.status]}
        </Badge>
      </td>
      <td className="px-2 py-2 text-sm text-surface-muted-fg">
        {item.issues.length === 0 ? '—' : <ul className="list-disc space-y-1 pl-4">{item.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
      </td>
    </tr>
  );
};

/**
 * The review the publish requires.
 *
 * It shows the counts a reviewer needs to decide, the failures the batch reported, and one row per
 * learner with the reason they are flagged. Nothing publishes until this has been seen: the page
 * only enables Publish once a review exists, and the service refuses a publish without one.
 */
export function ReviewPanel({ review, onToggle, busy }: ReviewPanelProps): ReactNode {
  if (review === null) {
    return (
      <p className="text-sm text-surface-muted-fg" data-testid="review-empty">
        Generate a batch to review what will be published. Nothing goes out unreviewed.
      </p>
    );
  }

  const { summary } = review;
  return (
    <div className="space-y-4" data-testid="review-panel">
      <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
        <Badge variant="secondary" size="sm">{summary.total} learner{summary.total === 1 ? '' : 's'}</Badge>
        <Badge variant="success" size="sm">{summary.ready} ready</Badge>
        <Badge variant="warning" size="sm">{summary.incomplete} incomplete</Badge>
        <Badge variant="info" size="sm">{summary.moderated} moderated</Badge>
        <Badge variant="danger" size="sm">{summary.outsideScope} outside scope</Badge>
        <Badge variant="secondary" size="sm">{summary.excluded} excluded</Badge>
        <span className="text-surface-muted-fg" data-testid="review-included">
          {summary.included} will be published
        </span>
      </div>

      {summary.failures.length === 0 ? null : (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="review-failures">
          <p className="font-medium">{summary.failures.length} learner(s) could not be generated:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {summary.failures.map((failure) => (
              <li key={failure.enrolmentId}>
                {failure.learnerName}: {failure.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" data-testid="review-table">
          <thead>
            <tr className="border-b border-surface-border">
              <th scope="col" className="px-2 py-2 text-left font-semibold">Include</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">Learner</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">Status</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">What the reviewer should know</th>
            </tr>
          </thead>
          <tbody>
            {review.items.map((item) => (
              <ReviewRow key={item.enrolmentId} item={item} onToggle={onToggle} busy={busy} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
