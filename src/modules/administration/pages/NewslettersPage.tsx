// ABOUTME: Newsletter composer over the portal announcements collection: draft, edit, preview, personalised print and publish.
// ABOUTME: A newsletter is an announcement with kind 'newsletter'; published rows appear on the parent and student portals.

import React, { useMemo, useState } from 'react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { CalendarIcon, EditIcon, EyeIcon, NewspaperIcon, PlusIcon, PrinterIcon } from '@/components/ui/icons';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useToast } from '@/hooks/useToast';

import { useCanonicalLearners } from '../data/useCanonicalLearners';

interface NewsletterRow {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  audience: 'all' | 'students' | 'parents' | 'staff' | 'specific_class';
  authorId: string;
  authorName: string;
  publishedAt: string;
  expiresAt?: string | null;
  isPublished: boolean;
  kind?: 'announcement' | 'newsletter';
  eventId?: string | null;
  alumniRelated?: boolean;
  createdAt: string;
  updatedAt: string;
  readBy?: string[];
}

interface SchoolEventRow {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  event_type?: string;
  status?: string;
}

interface Draft {
  id: string | null;
  title: string;
  content: string;
  priority: NewsletterRow['priority'];
  audience: NewsletterRow['audience'];
  eventId: string;
  alumniRelated: boolean;
  expiresAt: string;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  title: '',
  content: '',
  priority: 'medium',
  audience: 'all',
  eventId: '',
  alumniRelated: false,
  expiresAt: '',
};

const PLACEHOLDER_HELP =
  'Placeholders: {{student_name}}, {{admission_number}}, {{class_name}}, {{stream_name}}, {{guardian_name}}, {{date}}';

function renderForStudent(template: string, learner: {
  display_name: string;
  admission_no: string;
  current_class_name: string;
  current_class_stream_name: string;
  primary_guardian: string;
}): string {
  return template
    .replaceAll('{{student_name}}', learner.display_name)
    .replaceAll('{{admission_number}}', learner.admission_no)
    .replaceAll('{{class_name}}', learner.current_class_name)
    .replaceAll('{{stream_name}}', learner.current_class_stream_name)
    .replaceAll('{{guardian_name}}', learner.primary_guardian)
    .replaceAll('{{date}}', new Date().toLocaleDateString());
}

export const NewslettersContent: React.FC = () => {
  const announcements = useDatabaseCollection<NewsletterRow>('announcements');
  const eventsCollection = useDatabaseCollection<SchoolEventRow>('school_events');
  const { learners } = useCanonicalLearners();
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'newsletters' | 'events'>('newsletters');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewing, setViewing] = useState<NewsletterRow | null>(null);
  const [printing, setPrinting] = useState<NewsletterRow | null>(null);
  const [printClass, setPrintClass] = useState('');
  const [printStream, setPrintStream] = useState('');
  const [saving, setSaving] = useState(false);

  const newsletters = useMemo(
    () =>
      announcements.data
        .filter((row) => row.kind === 'newsletter')
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [announcements.data]
  );

  const events = useMemo(
    () => [...eventsCollection.data].sort((left, right) => (left.start_date ?? '').localeCompare(right.start_date ?? '')),
    [eventsCollection.data]
  );

  const eventTitle = (id: string | null | undefined): string =>
    events.find((event) => event.id === id)?.title ?? '—';

  const classOptions = useMemo(
    () => [...new Set(learners.map((learner) => learner.current_class_name).filter(Boolean))].sort(),
    [learners]
  );

  const streamOptions = useMemo(() => {
    const scoped = printClass
      ? learners.filter((learner) => learner.current_class_name === printClass)
      : learners;
    return [...new Set(scoped.map((learner) => learner.current_class_stream_name).filter(Boolean))].sort();
  }, [learners, printClass]);

  const printRecipients = useMemo(() => {
    if (!printing) return [];
    return learners.filter(
      (learner) =>
        (!printClass || learner.current_class_name === printClass) &&
        (!printStream || learner.current_class_stream_name === printStream)
    );
  }, [learners, printing, printClass, printStream]);

  const openComposer = (row?: NewsletterRow) => {
    setDraft(
      row
        ? {
            id: row.id,
            title: row.title,
            content: row.content,
            priority: row.priority,
            audience: row.audience,
            eventId: row.eventId ?? '',
            alumniRelated: row.alumniRelated === true,
            expiresAt: row.expiresAt ? row.expiresAt.slice(0, 10) : '',
          }
        : { ...EMPTY_DRAFT }
    );
  };

  const save = async (publish: boolean) => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.content.trim()) {
      toast.showWarning('A title and body are required.');
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    try {
      const payload = {
        title: draft.title.trim(),
        content: draft.content,
        priority: draft.priority,
        audience: draft.audience,
        kind: 'newsletter' as const,
        eventId: draft.eventId || null,
        alumniRelated: draft.alumniRelated,
        ...(draft.expiresAt ? { expiresAt: draft.expiresAt } : {}),
        isPublished: publish,
        publishedAt: now,
        updatedAt: now,
      };
      if (draft.id) {
        await announcements.update(draft.id, payload);
      } else {
        await announcements.insert({
          ...payload,
          authorId: 'administration',
          authorName: 'Administration',
          createdAt: now,
        } as Omit<NewsletterRow, 'id'>);
      }
      toast.showSuccess(publish ? 'Newsletter published to the portals.' : 'Newsletter saved as a draft.');
      setDraft(null);
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Could not save the newsletter.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: NewsletterRow) => {
    if (!(await confirm({ variant: 'danger', message: `Delete “${row.title}”?` }))) return;
    try {
      await announcements.remove(row.id);
      toast.showSuccess('Newsletter deleted.');
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Could not delete the newsletter.');
    }
  };

  const print = () => {
    if (!printing || printRecipients.length === 0) {
      toast.showWarning('Choose a class or stream with at least one learner.');
      return;
    }
    document.body.classList.add('newsletter-printing');
    window.print();
    window.setTimeout(() => document.body.classList.remove('newsletter-printing'), 0);
  };

  const columns: DataGridColumn<NewsletterRow>[] = [
    {
      key: 'title',
      header: 'Newsletter',
      render: (value, row) => (
        <div>
          <p className="font-medium text-surface-foreground">{value}</p>
          <p className="text-xs text-surface-muted-fg">
            {row.isPublished ? 'Published' : 'Draft'} · updated {row.updatedAt.slice(0, 10)}
          </p>
        </div>
      ),
    },
    { key: 'eventId', header: 'Event', render: (_value, row) => eventTitle(row.eventId) },
    {
      key: 'alumniRelated',
      header: 'Alumni',
      render: (_value, row) => (row.alumniRelated ? <Badge variant="info">Alumni</Badge> : '—'),
    },
    {
      key: 'audience',
      header: 'Audience',
      render: (value) => value.replace(/_/g, ' '),
    },
    {
      key: 'isPublished',
      header: 'Status',
      render: (_value, row) => (
        <Badge variant={row.isPublished ? 'success' : 'warning'}>
          {row.isPublished ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_value, row) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setViewing(row)} title="View">
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => openComposer(row)} title="Edit">
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setPrinting(row); setPrintClass(''); setPrintStream(''); }} title="Print">
            <PrinterIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void remove(row)} title="Delete">
            ×
          </Button>
        </div>
      ),
    },
  ];

  const eventColumns: DataGridColumn<SchoolEventRow>[] = [
    { key: 'title', header: 'Event', sortable: true },
    { key: 'start_date', header: 'Date', sortable: true },
    { key: 'event_type', header: 'Type', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    {
      key: 'id',
      header: 'Alumni newsletter',
      sortable: false,
      render: (_value, row) => {
        const linked = newsletters.filter((newsletter) => newsletter.eventId === row.id && newsletter.alumniRelated);
        return linked.length > 0 ? <Badge variant="info">{linked.length} linked</Badge> : '—';
      },
    },
  ];

  return (
    <div className="space-y-3 pb-8">
      <style>{`
        @media print {
          body.newsletter-printing *:not(#newsletter-print):not(#newsletter-print *) { visibility: hidden; }
          #newsletter-print { display: block !important; position: absolute; inset: 0; background: white; }
          #newsletter-print .newsletter-copy { break-after: page; }
        }
      `}</style>

      <div className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-card px-4 py-3">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'newsletters' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('newsletters')}
            leftIcon={<NewspaperIcon className="h-4 w-4" />}
          >
            Newsletters
          </Button>
          <Button
            variant={activeTab === 'events' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('events')}
            leftIcon={<CalendarIcon className="h-4 w-4" />}
          >
            Manage Events
          </Button>
        </div>
        {activeTab === 'newsletters' ? (
          <Button onClick={() => openComposer()} leftIcon={<PlusIcon className="h-4 w-4" />}>
            Add Newsletter
          </Button>
        ) : null}
      </div>

      {activeTab === 'newsletters' ? (
        <Card
          title="Newsletter(s)"
          info="Compose once, print one personalised copy per learner, and publish the same text to the parent and student portals."
        >
          <DataGrid
            data={newsletters}
            columns={columns}
            pagination={{ pageSize: 10 }}
            emptyState={{
              title: 'No newsletters yet',
              description: 'Click Add Newsletter to compose the first one.',
            }}
          />
        </Card>
      ) : (
        <Card
          title="Manage Events"
          info="School events a newsletter can be attached to. A newsletter marked alumni-related is flagged here."
        >
          <DataGrid
            data={events}
            columns={eventColumns}
            pagination={{ pageSize: 10 }}
            emptyState={{
              title: 'No school events yet',
              description: 'Create events in the academic calendar, then attach a newsletter here.',
            }}
          />
        </Card>
      )}

      <Modal
        isOpen={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit Newsletter' : 'New Newsletter'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => void save(false)} loading={saving}>
              Save Draft
            </Button>
            <Button onClick={() => void save(true)} loading={saving}>
              Publish
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <Input
              label="Title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              required
            />
            <div>
              <Textarea
                label="Body"
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                rows={12}
                required
              />
              <p className="mt-1 text-xs text-surface-muted-fg">{PLACEHOLDER_HELP}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Select
                label="Audience"
                value={draft.audience}
                onValueChange={(value) =>
                  setDraft({ ...draft, audience: value as NewsletterRow['audience'] })
                }
                options={[
                  { label: 'Everyone', value: 'all' },
                  { label: 'Parents', value: 'parents' },
                  { label: 'Students', value: 'students' },
                ]}
              />
              <Select
                label="Priority"
                value={draft.priority}
                onValueChange={(value) =>
                  setDraft({ ...draft, priority: value as NewsletterRow['priority'] })
                }
                options={[
                  { label: 'Low', value: 'low' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'High', value: 'high' },
                  { label: 'Urgent', value: 'urgent' },
                ]}
              />
              <Select
                label="Event"
                value={draft.eventId}
                onValueChange={(value) => setDraft({ ...draft, eventId: String(value) })}
                options={[
                  { label: 'No event', value: '' },
                  ...events.map((event) => ({ label: event.title, value: event.id })),
                ]}
              />
            </div>
            <Input
              label="Expires"
              type="date"
              value={draft.expiresAt}
              onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-surface-foreground">
              <input
                type="checkbox"
                checked={draft.alumniRelated}
                onChange={(event) => setDraft({ ...draft, alumniRelated: event.target.checked })}
                className="h-4 w-4 rounded border-surface-border text-primary-600 focus:ring-primary-500"
              />
              This newsletter concerns alumni
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? 'Newsletter'}
        size="lg"
        footer={
          <Button onClick={() => { if (viewing) { setPrinting(viewing); setViewing(null); } }}>
            Print copies
          </Button>
        }
      >
        {viewing ? (
          <div className="space-y-3">
            <p className="text-xs text-surface-muted-fg">
              {eventTitle(viewing.eventId)} · {viewing.audience.replace(/_/g, ' ')} ·{' '}
              {viewing.isPublished ? 'Published' : 'Draft'}
            </p>
            <div className="whitespace-pre-line text-sm text-surface-foreground">{viewing.content}</div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={printing !== null}
        onClose={() => setPrinting(null)}
        title="Print personalised copies"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPrinting(null)}>
              Cancel
            </Button>
            <Button onClick={print} disabled={printRecipients.length === 0}>
              Print {printRecipients.length} copies
            </Button>
          </>
        }
      >
        {printing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Class"
                value={printClass}
                onValueChange={(value) => {
                  setPrintClass(String(value));
                  setPrintStream('');
                }}
                options={[
                  { label: 'All classes', value: '' },
                  ...classOptions.map((className) => ({ label: className, value: className })),
                ]}
              />
              <Select
                label="Stream"
                value={printStream}
                onValueChange={(value) => setPrintStream(String(value))}
                options={[
                  { label: 'All streams', value: '' },
                  ...streamOptions.map((stream) => ({ label: stream, value: stream })),
                ]}
              />
            </div>
            <p className="text-sm text-surface-muted-fg">
              One copy per learner, with the name, admission number, class, stream and guardian filled in.
            </p>
            <div className="max-h-48 overflow-y-auto rounded-md border border-surface-border p-3 text-sm">
              {printRecipients.slice(0, 10).map((learner) => (
                <p key={learner.id}>{learner.display_name} · {learner.admission_no}</p>
              ))}
              {printRecipients.length > 10 ? <p>…and {printRecipients.length - 10} more</p> : null}
            </div>
          </div>
        ) : null}
      </Modal>

      {printing ? (
        <div id="newsletter-print" className="hidden">
          {printRecipients.map((learner) => (
            <article key={learner.id} className="newsletter-copy" style={{ padding: '24px', pageBreakAfter: 'always' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{printing.title}</h1>
              <p style={{ fontSize: '12px', marginBottom: '16px' }}>
                {learner.display_name} · {learner.admission_no} · {learner.current_class_name}{' '}
                {learner.current_class_stream_name}
              </p>
              <div style={{ whiteSpace: 'pre-line', fontSize: '14px', lineHeight: 1.5 }}>
                {renderForStudent(printing.content, learner)}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
};
