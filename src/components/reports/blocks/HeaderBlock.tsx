// ABOUTME: The report header block: logo, school name, motto and contacts beside the term and year,
// ABOUTME: with the document title under a structural rule.

import type { ReactNode } from 'react';
import type { ReportBlockModel } from '@/domain/reports/types';
import { Ltr } from './shared';

export type HeaderBlockModel = Extract<ReportBlockModel, { kind: 'header' }>;

export function HeaderBlock({ block }: { block: HeaderBlockModel }): ReactNode {
  const { school, term, title } = block.payload;
  return (
    <>
      <header className="report-header">
        {school.logo ? (
          <img className="report-header__logo" src={school.logo} alt="" />
        ) : (
          <span className="report-header__logo" aria-hidden="true" />
        )}
        <div>
          <h1 className="report-header__name">
            <Ltr>{school.name}</Ltr>
          </h1>
          {school.motto ? <p className="report-header__motto">{school.motto}</p> : null}
          {school.address ? (
            <p className="report-header__contact">
              <Ltr>{school.address}</Ltr>
            </p>
          ) : null}
          {school.contact ? (
            <p className="report-header__contact">
              <Ltr>{school.contact}</Ltr>
            </p>
          ) : null}
        </div>
        <div className="report-header__term">
          {term?.name ? <strong>{term.name}</strong> : null}
          {term?.year ? <span>{term.year}</span> : null}
        </div>
      </header>
      <h2 className="report-doc-title">{title}</h2>
    </>
  );
}
