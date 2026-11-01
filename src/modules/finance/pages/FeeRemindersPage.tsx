// ABOUTME: Fee reminders: the learners with an outstanding balance, their SMS recipient and a message,
// ABOUTME: sent through the school's active SMS gateway. The page never invents a balance; it reads the
// ABOUTME: canonical invoices, allocations and credit notes, and refuses a recipient without a phone.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';
import { useEntityQuery } from '@/data/query';
import { usePlugins } from '@/plugins/usePlugins';

import { formatMoneyMinor, useCanonicalFinance, useFinanceRepository } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import {
  DEFAULT_REMINDER_TEMPLATE,
  buildFeeReminders,
  renderReminderMessage,
  type FeeReminderRow,
} from './feeReminders';

const SMS_PLUGIN_ID = 'com.schoolpilot.sms-gateway';

type RowResult =
  | { readonly status: 'sent'; readonly messageId: string }
  | { readonly status: 'failed'; readonly reason: string };

interface SmsSendResult {
  readonly success: boolean;
  readonly messageId: string;
  readonly status: string;
  readonly message?: string;
}

export const FeeRemindersPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const links = useEntityQuery(repository, 'learner_guardian');
  const guardians = useEntityQuery(repository, 'guardian');
  const { getPlugin } = usePlugins();
  const { profile } = useSchoolProfile();
  const confirm = useConfirm();
  const { showSuccess, showError, showWarning } = useToast();

  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');
  const [template, setTemplate] = useState(DEFAULT_REMINDER_TEMPLATE);
  const [selected, setSelected] = useState<readonly FeeReminderRow[]>([]);
  const [results, setResults] = useState<Record<string, RowResult>>({});
  const [sending, setSending] = useState(false);

  const smsPlugin = getPlugin(SMS_PLUGIN_ID);
  const sender =
    smsPlugin?.status === 'active' && typeof smsPlugin.api?.send === 'function'
      ? (smsPlugin.api.send as (phone: string, message: string) => Promise<SmsSendResult>)
      : null;

  const classOptions = useMemo(
    () =>
      [...new Set(finance.learnerRows.map((learner) => learner.className).filter(Boolean))].sort(),
    [finance.learnerRows]
  );

  const rows = useMemo(
    () =>
      buildFeeReminders({
        learners: finance.learnerRows,
        invoices: finance.invoiceRows,
        creditNotes: finance.creditNotes,
        links: links.data?.items ?? [],
        guardians: guardians.data?.items ?? [],
        filters: { className, search },
      }),
    [finance.learnerRows, finance.invoiceRows, finance.creditNotes, links.data, guardians.data, className, search]
  );

  const targets = selected.length > 0 ? selected : rows;
  const sendable = targets.filter((row) => row.phone.trim() !== '');
  const preview = sendable[0]
    ? renderReminderMessage(template, sendable[0], profile?.name ?? '')
    : '';

  const send = async () => {
    if (!sender) {
      showWarning('Activate an SMS gateway in Settings → Plugins first.');
      return;
    }
    if (!template.trim()) {
      showWarning('Write the message before sending.');
      return;
    }
    if (sendable.length === 0) {
      showWarning('No selected learner has a guardian phone number.');
      return;
    }
    const confirmed = await confirm({
      title: 'Send fee reminders',
      message: `Send ${sendable.length} SMS message(s) to the guardians shown? Each message carries that learner's own balance.`,
      confirmLabel: 'Send messages',
      variant: 'warning',
    });
    if (!confirmed) return;

    setSending(true);
    const next: Record<string, RowResult> = { ...results };
    let sent = 0;
    for (const row of sendable) {
      try {
        const result = await sender(row.phone, renderReminderMessage(template, row, profile?.name ?? ''));
        if (result.success) {
          next[row.id] = { status: 'sent', messageId: result.messageId };
          sent += 1;
        } else {
          next[row.id] = { status: 'failed', reason: result.message ?? result.status };
        }
      } catch (error) {
        next[row.id] = {
          status: 'failed',
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    }
    setResults(next);
    setSending(false);
    if (sent === sendable.length) {
      showSuccess(`${sent} reminder(s) sent.`);
    } else {
      showError(`${sent} sent, ${sendable.length - sent} refused. See the row status.`);
    }
  };

  const columns: DataGridColumn<FeeReminderRow>[] = [
    { key: 'admissionNumber', header: 'Adm no', sortable: true, filterable: true },
    {
      key: 'learnerName',
      header: 'Learner',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    { key: 'className', header: 'Class', sortable: true, filterable: true },
    {
      key: 'balanceMinor',
      header: 'Balance',
      align: 'right',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-red-600 dark:text-red-400">
          {formatMoneyMinor(Number(value))}
        </span>
      ),
    },
    { key: 'guardianName', header: 'Guardian', sortable: true, filterable: true },
    { key: 'phone', header: 'Phone', sortable: true, filterable: true },
    {
      key: 'status',
      header: 'Result',
      sortable: false,
      filterable: false,
      render: (_value, row) => {
        const result = results[row.id];
        if (!result) {
          return row.phone
            ? <span className="text-xs text-surface-muted-fg">Ready</span>
            : <span className="text-xs text-amber-700 dark:text-amber-400">No phone</span>;
        }
        if (result.status === 'sent') {
          return <span className="text-xs text-green-700 dark:text-green-400">{result.messageId}</span>;
        }
        return (
          <span className="text-xs text-red-600 dark:text-red-400" title={result.reason}>
            {result.reason}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {!sender ? (
        <Card title="SMS gateway">
          <p className="text-sm text-surface-foreground">
            The SMS gateway is not active. Configure and activate it in{' '}
            <a className="font-medium text-primary-700 hover:underline" href="/settings/plugins">
              Settings → Plugins → Generic SMS Gateway
            </a>
            ; this screen sends through that configured gateway and never invents a provider.
          </p>
        </Card>
      ) : null}

      <Card
        title="Fee reminders"
        info="One message per learner, to the guardian who receives SMS and is marked as a fee payer (or the primary guardian). The balance is billed minus paid minus posted credit notes."
        actions={
          <Button onClick={() => void send()} loading={sending} disabled={!sender || sendable.length === 0}>
            Send reminders ({sendable.length})
          </Button>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Class</span>
            <select
              value={className}
              onChange={(event) => {
                setClassName(event.target.value);
                setSelected([]);
              }}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All classes</option>
              {classOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Search</span>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or admission number"
            />
          </label>
          <div className="flex items-end text-sm text-surface-muted-fg">
            {rows.length} learner(s) with a balance; {sendable.length} with a phone in the current selection.
          </div>
        </div>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium text-surface-foreground">Message</span>
          <textarea
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            rows={4}
            className="w-full rounded-md border border-surface-border px-3 py-2 font-mono text-sm"
          />
          <span className="mt-1 block text-xs text-surface-muted-fg">
            Placeholders: {'{{learner}}'}, {'{{admission}}'}, {'{{balance}}'}, {'{{guardian}}'}, {'{{school}}'}.
          </span>
        </label>

        {preview ? (
          <div className="mb-4 rounded-lg border border-surface-border bg-surface-muted p-3 text-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Preview
            </p>
            <p className="whitespace-pre-wrap text-surface-foreground">{preview}</p>
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-surface-muted-fg">
          <span>
            {targets.length} learner(s) in the batch
            {selected.length > 0 ? ' (selection)' : ' (all shown)'}.
          </span>
          <Button size="sm" variant="secondary" onClick={() => setSelected(rows)}>
            Select all shown
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>

        <DataGrid
          columns={columns}
          data={[...rows]}
          sortable
          filterable
          selectable
          onSelectionChange={(selection) => setSelected(selection as FeeReminderRow[])}
          emptyState={{
            title: 'No learner with a balance',
            description: 'Choose another class, or record the payments that settle these balances.',
          }}
        />
      </Card>
    </div>
  );
};

const FeeRemindersPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <FeeRemindersPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FeeRemindersPage;
