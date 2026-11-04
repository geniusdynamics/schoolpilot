// ABOUTME: The one card every analytics page puts above its figures: the shared Year → Class →
// ABOUTME: Stream → Period bar, plus the honest empty state when the school has no academic year.

import type { ReactNode } from 'react';

import { AcademicScopeFilterBar, type AcademicScope, type PeriodMode } from '@/academic-scope';
import Card from '@/components/ui/Card';

export interface AnalyticsScopeCardProps {
  readonly scope: AcademicScope;
  readonly period?: PeriodMode;
  readonly children?: ReactNode;
}

/** The shared filter bar, dressed as the card each analytics page already used. */
export function AnalyticsScopeCard({ scope, period = 'optional', children }: AnalyticsScopeCardProps) {
  return (
    <Card className="border-slate-200 bg-surface-card shadow-sm">
      <AcademicScopeFilterBar scope={scope} period={period}>
        {children}
      </AcademicScopeFilterBar>
    </Card>
  );
}

/** What a screen shows before it can compute anything. */
export function AnalyticsEmptyCard({ title, message }: { readonly title: string; readonly message: string }) {
  return (
    <Card title={title} className="border-slate-200 bg-surface-card shadow-sm">
      <p className="text-sm text-surface-muted-fg">{message}</p>
    </Card>
  );
}
