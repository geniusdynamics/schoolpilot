// ABOUTME: Receipt layout editor: the paper profile, header title, footer and school identity that the
// ABOUTME: cashier's printable receipt uses. The preview is the real ReceiptDocument, not a mock-up.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { PrinterIcon } from '@/components/ui/icons';
import { printReport } from '@/components/reports';
import {
  ReceiptDocument,
  RECEIPT_TEMPLATE_KINDS,
  buildReceiptDocument,
  type ReceiptTemplateKind,
} from '@/components/finance/receipts';
import type { ReceiptView } from '@/domain/finance/payments';
import { fromMinor } from '@/domain/money';
import { useToast } from '@/hooks/useToast';
import { useSchoolProfile, formatSchoolAddress, formatSchoolContact } from '@/hooks/useSchoolProfile';

import {
  DEFAULT_RECEIPT_LAYOUT,
  readReceiptLayout,
  writeReceiptLayout,
  type ReceiptLayout,
} from '../data/receiptLayout';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';

const SAMPLE_VIEW: ReceiptView = {
  number: 'RCT/2027/000123',
  issuedAt: '2027-02-10T09:00:00.000Z',
  status: 'issued',
  payer: 'Grace Wanjiku',
  learners: ['Amina Wanjiku'],
  amount: fromMinor(150_000, 'KES'),
  amountInWords: 'one thousand five hundred shillings',
  channel: 'cash',
  channelLabel: 'Cash',
  reference: null,
  allocationByVoteHead: [
    { label: 'TUITION Tuition', amount: fromMinor(100_000, 'KES') },
    { label: 'LUNCH Lunch', amount: fromMinor(50_000, 'KES') },
  ],
  balanceAfter: fromMinor(25_000, 'KES'),
  cashier: 'Grace the cashier',
};

const TEMPLATE_LABELS: Readonly<Record<ReceiptTemplateKind, string>> = {
  thermal: 'Thermal roll (80 mm)',
  a5: 'A5 sheet',
  a4: 'A4 sheet',
};

export const FeesReceiptTemplatePageContent: React.FC = () => {
  const { profile } = useSchoolProfile();
  const { showSuccess, showWarning } = useToast();
  const [layout, setLayout] = useState<ReceiptLayout>(() => readReceiptLayout());

  const school = useMemo(
    () => ({
      name: profile?.name ?? '',
      ...(layout.showLogo && profile?.logo_path ? { logo: profile.logo_path } : {}),
      ...(layout.showAddress ? { address: formatSchoolAddress(profile) } : {}),
      ...(layout.showContact ? { contact: formatSchoolContact(profile) } : {}),
    }),
    [profile, layout.showLogo, layout.showAddress, layout.showContact]
  );

  const document = useMemo(
    () =>
      buildReceiptDocument({
        view: SAMPLE_VIEW,
        template: layout.template,
        school,
        title: layout.title,
        footer: layout.footer.trim() === '' ? null : layout.footer,
      }),
    [layout, school]
  );

  const save = () => {
    if (layout.title.trim() === '') {
      showWarning('Give the receipt a header title.');
      return;
    }
    if (writeReceiptLayout(layout)) {
      showSuccess('Receipt layout saved. New receipts use it.');
    } else {
      showWarning('The layout could not be saved in this browser.');
    }
  };

  return (
    <div className="space-y-4">
      <Card
        title="Receipt layout"
        info="The cashier's printable receipt uses this profile. It is a local print preference, not a financial document, so it does not post to the ledger."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setLayout(DEFAULT_RECEIPT_LAYOUT)}>
              Reset
            </Button>
            <Button variant="secondary" onClick={() => void printReport()}>
              <PrinterIcon className="h-4 w-4" />
              Print preview
            </Button>
            <Button onClick={save}>Save layout</Button>
          </div>
        }
      >
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Paper</span>
            <select
              value={layout.template}
              onChange={(event) =>
                setLayout((current) => ({
                  ...current,
                  template: event.target.value as ReceiptTemplateKind,
                }))
              }
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              {RECEIPT_TEMPLATE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {TEMPLATE_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Header title</span>
            <Input
              value={layout.title}
              onChange={(event) => setLayout((current) => ({ ...current, title: event.target.value }))}
              placeholder="OFFICIAL RECEIPT"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-surface-foreground">Footer message</span>
            <Input
              value={layout.footer}
              onChange={(event) => setLayout((current) => ({ ...current, footer: event.target.value }))}
              placeholder="Thank you for your payment."
            />
          </label>

          <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
            {[
              ['showLogo', 'Print the school logo'],
              ['showAddress', 'Print the school address'],
              ['showContact', 'Print the school phone and email'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layout[key as 'showLogo' | 'showAddress' | 'showContact']}
                  onChange={(event) =>
                    setLayout((current) => ({ ...current, [key]: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-surface-border"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="max-h-[36rem] overflow-auto rounded-lg border border-surface-border bg-surface-muted p-4">
          <ReceiptDocument model={document} toolbar={false} />
        </div>
      </Card>
    </div>
  );
};

const FeesReceiptTemplatePage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <FeesReceiptTemplatePageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FeesReceiptTemplatePage;
