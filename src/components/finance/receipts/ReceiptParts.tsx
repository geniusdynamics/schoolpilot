// ABOUTME: The parts of a printed receipt: the school header, the identity and figure lines, the
// ABOUTME: allocation table across vote heads, the balance, the signed verification QR and the footer.
// ABOUTME: Each part is presentational and reads only the resolved receipt model.

import type { ReactNode } from 'react';
import { formatMoney } from '@/domain/money';
import { isLtrRun, isolateRuns } from '@/domain/reports/bidi';
import { qrSvgPath } from '@/domain/reports/qr';

import type { ReceiptDocumentModel } from './types';

/**
 * Renders a Latin/digit run so an RTL receipt cannot reorder it (a date, a receipt number, a URL).
 * The report surface's rule, applied to the same problem.
 */
function Ltr({ children }: { children: string }): ReactNode {
  if (isLtrRun(children)) return <bdi dir="ltr">{children}</bdi>;
  return <>{isolateRuns(children)}</>;
}

/** One labelled line of the identity block. */
function Line({ label, value, figure = false }: { label: string; value: string; figure?: boolean }): ReactNode {
  return (
    <div className="receipt-line">
      <span className="receipt-line__key">{label}</span>
      <span className={figure ? 'receipt-line__value receipt-figure' : 'receipt-line__value'}>
        <Ltr>{value}</Ltr>
      </span>
    </div>
  );
}

/** The school's identity, its logo and the document title, over a structural rule. */
export function ReceiptHeader({ model }: { model: ReceiptDocumentModel }): ReactNode {
  const { school, title } = model;
  return (
    <header className="receipt-header">
      <div className="receipt-header__top">
        {school.logo ? (
          <img className="receipt-header__logo" src={school.logo} alt="" />
        ) : null}
        <div className="receipt-header__identity">
          <h1 className="receipt-header__name">
            <Ltr>{school.name}</Ltr>
          </h1>
          {school.motto ? <p className="receipt-header__motto">{school.motto}</p> : null}
          {school.address ? (
            <p className="receipt-header__contact">
              <Ltr>{school.address}</Ltr>
            </p>
          ) : null}
          {school.contact ? (
            <p className="receipt-header__contact">
              <Ltr>{school.contact}</Ltr>
            </p>
          ) : null}
        </div>
      </div>
      <h2 className="receipt-title">{title}</h2>
    </header>
  );
}

/** The receipt's identity: its number, the date, the cashier, the payer and the learners. */
export function ReceiptIdentity({ model }: { model: ReceiptDocumentModel }): ReactNode {
  const { labels, view, issuedAtLabel } = model;
  return (
    <section className="receipt-block" data-receipt-block="identity">
      <dl className="receipt-lines">
        <Line label={labels.receiptNo} value={view.number} figure />
        <Line label={labels.date} value={issuedAtLabel} figure />
        <Line label={labels.cashier} value={view.cashier || labels.none} />
        <Line label={labels.payer} value={view.payer || labels.none} />
        <Line
          label={view.learners.length > 1 ? `${labels.learner}s` : labels.learner}
          value={view.learners.join(', ') || labels.none}
        />
      </dl>
      {view.status === 'void' ? <p className="receipt-void">{labels.voided}</p> : null}
    </section>
  );
}

/** The amount in figures and in words: the two must agree, so they sit together. */
export function ReceiptAmount({ model }: { model: ReceiptDocumentModel }): ReactNode {
  const { labels, view } = model;
  return (
    <section className="receipt-block receipt-amount" data-receipt-block="amount">
      <div className="receipt-amount__figure">
        <span className="receipt-line__key">{labels.amount}</span>
        <span className="receipt-figure receipt-amount__value">
          <Ltr>{formatMoney(view.amount)}</Ltr>
        </span>
      </div>
      <p className="receipt-amount__words">
        <span className="receipt-line__key">{labels.inWords}</span> {view.amountInWords}
      </p>
    </section>
  );
}

/** The channel the money arrived through and its reference. */
export function ReceiptChannel({ model }: { model: ReceiptDocumentModel }): ReactNode {
  const { labels, view } = model;
  return (
    <section className="receipt-block" data-receipt-block="channel">
      <dl className="receipt-lines">
        <Line label={labels.channel} value={view.channelLabel} />
        <Line label={labels.reference} value={view.reference || labels.none} figure />
      </dl>
    </section>
  );
}

/**
 * The allocation across vote heads. The total is a row inside `tbody`, never a `tfoot`: a footer
 * group repeats on every page (DR-05). The table may break — a roll or a sheet cannot be asked to
 * hold an unbounded list — so the surrounding block is the one that is allowed to flow.
 */
export function ReceiptAllocation({ model }: { model: ReceiptDocumentModel }): ReactNode {
  const { labels, view } = model;
  const lines = view.allocationByVoteHead;
  if (lines.length === 0) {
    return (
      <section className="receipt-block" data-receipt-block="allocation">
        <h3 className="receipt-block__title">{labels.allocation}</h3>
        <p className="receipt-empty">{labels.unallocated}</p>
      </section>
    );
  }
  const total = lines.reduce((sum, line) => sum + line.amount.amount_minor, 0);
  const currency = lines[0]?.amount.currency ?? view.amount.currency;
  return (
    <section className="receipt-block receipt-block--flow" data-receipt-block="allocation">
      <h3 className="receipt-block__title">{labels.allocation}</h3>
      <table className="receipt-table">
        <thead>
          <tr>
            <th scope="col">{labels.allocation}</th>
            <th scope="col" className="receipt-cell--end">
              {labels.amount}
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.label}>
              <td>{line.label}</td>
              <td className="receipt-cell--end receipt-figure">
                <Ltr>{formatMoney(line.amount)}</Ltr>
              </td>
            </tr>
          ))}
          <tr className="receipt-table__total">
            <td>{labels.total}</td>
            <td className="receipt-cell--end receipt-figure">
              <Ltr>{formatMoney({ amount_minor: total, currency })}</Ltr>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

/** The balance after this payment, kept with the total it follows. */
export function ReceiptBalance({ model }: { model: ReceiptDocumentModel }): ReactNode {
  const { labels, view } = model;
  return (
    <section className="receipt-block receipt-keep" data-receipt-block="balance">
      <dl className="receipt-lines">
        <Line label={labels.balanceAfter} value={formatMoney(view.balanceAfter)} figure />
      </dl>
    </section>
  );
}

/**
 * The verification QR and its address. A preview receipt draws no code at all: a photographed
 * receipt must never carry a mark that looks like it verifies something (DR-05).
 */
export function ReceiptVerification({ model }: { model: ReceiptDocumentModel }): ReactNode {
  const { labels, verification } = model;
  const rendered = verification.qr ? qrSvgPath(verification.qr) : null;
  return (
    <section
      className="receipt-block receipt-verification receipt-keep"
      data-receipt-block="verification"
      data-preview={verification.preview ? 'true' : 'false'}
    >
      {verification.qr && rendered ? (
        <div
          className={verification.qrSizeMm >= 18 ? 'receipt-qr receipt-qr--large' : 'receipt-qr'}
          data-qr-version={verification.qr.version}
          data-qr-size-mm={verification.qrSizeMm}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${rendered.dimension} ${rendered.dimension}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label={labels.verify}
          >
            <rect width={rendered.dimension} height={rendered.dimension} fill="#ffffff" />
            <path d={rendered.path} fill="#000000" />
          </svg>
        </div>
      ) : null}
      <div className="receipt-verification__text">
        <div
          className={
            verification.preview
              ? 'receipt-verification__label receipt-verification__label--preview'
              : 'receipt-verification__label'
          }
        >
          {verification.preview ? labels.preview : labels.verify}
        </div>
        {verification.url ? (
          <div className="receipt-verification__url">
            <Ltr>{verification.url}</Ltr>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** The template's footer message and the receipt's own identity, so a stray sheet is traceable. */
export function ReceiptFooter({ model }: { model: ReceiptDocumentModel }): ReactNode {
  const { labels, footer, view } = model;
  return (
    <footer className="receipt-footer">
      {footer ? <p className="receipt-footer__message">{footer}</p> : null}
      <p className="receipt-footer__meta">
        <Ltr>{`${labels.document} ${view.number}`}</Ltr>
      </p>
    </footer>
  );
}
