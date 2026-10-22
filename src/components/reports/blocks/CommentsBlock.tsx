// ABOUTME: The comments block: each role's free text (class teacher, head teacher, boarding, guidance)
// ABOUTME: with Latin runs isolated so a date or a URL inside Arabic prose still reads correctly.

import type { ReactNode } from 'react';
import { roleLabel } from '@/domain/reports/labels';
import type { ReportBlockModel, ReportLabels } from '@/domain/reports/types';
import { Ltr } from './shared';

export type CommentsBlockModel = Extract<ReportBlockModel, { kind: 'comments' }>;

export function CommentsBlock({ block, labels }: { block: CommentsBlockModel; labels: ReportLabels }): ReactNode {
  return (
    <>
      {block.payload.comments.map((comment, index) => (
        <div className="report-comment" key={`${comment.role}:${index}`}>
          <p className="report-comment__role">{roleLabel(labels, 'comment', comment.role)}</p>
          <p className="report-comment__body">
            <Ltr>{comment.text}</Ltr>
          </p>
        </div>
      ))}
    </>
  );
}
