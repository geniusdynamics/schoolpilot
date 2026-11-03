// ABOUTME: The school events page, read from the canonical calendar: a calendar per school, the
// ABOUTME: academic year it covers, and its calendar events shown by start date with past and
// ABOUTME: upcoming told apart. Writes go through the canonical repository; the model stores an
// ABOUTME: event's kind and dates, so the page shows those rather than inventing a title.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import Spinner from '@/components/ui/Spinner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DeleteIcon, EditIcon, PlusIcon } from '@/components/ui/icons';
import { DateField } from '@/components/ui/forms/DateField';
import { SchemaEntityForm, type EntityFormFieldMeta } from '@/components/ui/forms';
import { useCan } from '@/data/auth/useCan';
import { useEntityQuery } from '@/data/query';
import { MAX_LIMIT, toWritableValues, type CreateInput, type RepositoryRow, type UpdateInput } from '@/data/repository';
import { asId } from '@/domain/ids';
import { useToast } from '@/hooks/useToast';

import {
  eventKindLabel,
  eventPhase,
  formatCalendarDate,
  todayIso,
  type EventPhase,
} from '../data/calendarEvents';
import {
  CanonicalRepositoryProvider,
  createFormSchema,
  updateFormSchema,
  useWritableRepository,
} from '../data/canonicalRepository';
import { messageOf } from '../data/errors';

type CalendarRow = RepositoryRow<'calendar'>;
type CalendarEventRow = RepositoryRow<'calendar_event'>;
type AcademicYearRow = RepositoryRow<'academic_year'>;

/** The whole collection: a school calendar is an administrative list, read in full. */
const ALL = { limit: MAX_LIMIT } as const;
/** A school keeps years of events, so the grid must not stop at the first page of 500. */
const EVERY_PAGE = { allPages: true } as const;

const PHASE_LABELS: Readonly<Record<EventPhase, string>> = {
  upcoming: 'Upcoming',
  current: 'In progress',
  past: 'Past',
};

const PHASE_STYLES: Readonly<Record<EventPhase, string>> = {
  upcoming: 'bg-primary-100 text-primary-800',
  current: 'bg-green-100 text-green-800',
  past: 'bg-surface-accent text-surface-muted-fg',
};

const EVENT_FIELDS: readonly EntityFormFieldMeta[] = [
  {
    path: 'kind',
    label: 'Kind',
    order: 1,
    widget: 'select',
    required: true,
    help: 'The kind names the event; the calendar model stores no free-text title.',
  },
  { path: 'start_date', label: 'Start date', order: 2, widget: 'date', required: true },
  { path: 'end_date', label: 'End date', order: 3, widget: 'date', required: true },
  {
    path: 'affects_attendance',
    label: 'Affects attendance',
    order: 4,
    widget: 'checkbox',
    required: true,
    help: 'Tick when teaching does not happen on these days, as for a holiday or an exam window.',
  },
];

interface CalendarDraft {
  readonly calendarName: string;
  readonly yearName: string;
  readonly yearStart: string;
  readonly yearEnd: string;
}

const EMPTY_DRAFT: CalendarDraft = {
  calendarName: '',
  yearName: '',
  yearStart: '',
  yearEnd: '',
};

const EventsManagerPageContent: React.FC = () => {
  const repository = useWritableRepository();
  const canWrite = useCan('reference.write');
  const toast = useToast();
  const confirm = useConfirm();

  const institutions = useEntityQuery(repository, 'institution', ALL);
  const calendars = useEntityQuery(repository, 'calendar', ALL);
  const academicYears = useEntityQuery(repository, 'academic_year', ALL);
  const events = useEntityQuery(repository, 'calendar_event', ALL, EVERY_PAGE);

  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [calendarDraft, setCalendarDraft] = useState<CalendarDraft | null>(null);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<'create' | 'edit' | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventRow | null>(null);

  const queries = [institutions, calendars, academicYears, events];
  const isLoading = queries.some((query) => query.status === 'loading');
  const failed = queries.find((query) => query.status === 'error');

  const institutionId = institutions.data?.items[0]?.id ?? null;

  const calendarRows = useMemo<readonly CalendarRow[]>(
    () => [...(calendars.data?.items ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [calendars.data]
  );

  const calendar: CalendarRow | undefined =
    calendarRows.find((row) => row.id === selectedCalendarId) ?? calendarRows[0];

  const calendarEvents = useMemo<readonly CalendarEventRow[]>(
    () =>
      [...(events.data?.items ?? [])]
        .filter((row) => row.calendar_id === calendar?.id)
        .sort(
          (left, right) =>
            left.start_date.localeCompare(right.start_date) ||
            left.kind.localeCompare(right.kind)
        ),
    [events.data, calendar?.id]
  );

  const today = todayIso();
  const years: readonly AcademicYearRow[] = useMemo(
    () =>
      [...(academicYears.data?.items ?? [])]
        .filter((row) => row.calendar_id === calendar?.id)
        .sort((left, right) => left.start_date.localeCompare(right.start_date)),
    [academicYears.data, calendar?.id]
  );

  const counts = useMemo(() => {
    const result: Record<EventPhase, number> = { upcoming: 0, current: 0, past: 0 };
    for (const row of calendarEvents) {
      result[eventPhase(row.start_date, row.end_date, today)] += 1;
    }
    return result;
  }, [calendarEvents, today]);

  const closeEventForm = () => {
    setEventForm(null);
    setEditingEvent(null);
  };

  const startCreate = () => {
    setEditingEvent(null);
    setEventForm('create');
  };

  const startEdit = (row: CalendarEventRow) => {
    setEditingEvent(row);
    setEventForm('edit');
  };

  const initialCreate = useMemo<Partial<CreateInput<'calendar_event'>>>(
    () => ({
      institution_id: institutionId ?? undefined,
      calendar_id: calendar?.id,
      kind: 'event',
      start_date: '',
      end_date: '',
      affects_attendance: false,
    }),
    [institutionId, calendar?.id]
  );

  const createEvent = async (values: CreateInput<'calendar_event'>) => {
    try {
      await repository.create('calendar_event', values);
      closeEventForm();
      toast.showSuccess('Event added to the calendar.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const updateEvent = async (values: UpdateInput<'calendar_event'>) => {
    if (!editingEvent) return;
    try {
      await repository.update(
        'calendar_event',
        asId<'calendar_event'>(editingEvent.id),
        {
          kind: values.kind,
          start_date: values.start_date,
          end_date: values.end_date,
          affects_attendance: values.affects_attendance,
        },
        { expectedVersion: editingEvent.rowVersion }
      );
      closeEventForm();
      toast.showSuccess('Event saved.');
    } catch (error) {
      throw new Error(messageOf(error));
    }
  };

  const removeEvent = async (row: CalendarEventRow) => {
    const confirmed = await confirm({
      variant: 'danger',
      message: `Remove the ${eventKindLabel(row.kind)} from ${formatCalendarDate(row.start_date)}?`,
    });
    if (!confirmed) return;
    try {
      await repository.remove('calendar_event', asId<'calendar_event'>(row.id), {
        expectedVersion: row.rowVersion,
      });
      toast.showSuccess('Event removed from the calendar.');
    } catch (error) {
      toast.showError(messageOf(error));
    }
  };

  const startCalendar = () => {
    setCalendarError(null);
    setCalendarDraft({ ...EMPTY_DRAFT });
  };

  const createCalendar = async () => {
    if (!calendarDraft) return;
    const calendarName = calendarDraft.calendarName.trim();
    const yearName = calendarDraft.yearName.trim();

    if (!calendarName || !yearName || !calendarDraft.yearStart || !calendarDraft.yearEnd) {
      setCalendarError('The calendar name, the academic year name and both dates are required.');
      return;
    }
    if (calendarDraft.yearEnd < calendarDraft.yearStart) {
      setCalendarError('The academic year must end on or after it starts.');
      return;
    }
    if (institutionId === null) {
      setCalendarError(
        'The canonical database holds no institution row, so a school calendar cannot be saved yet.'
      );
      return;
    }

    setSavingCalendar(true);
    setCalendarError(null);
    try {
      const created = await repository.create('calendar', {
        institution_id: institutionId,
        name: calendarName,
        programme_ids: [],
      });
      setSelectedCalendarId(created.id);
      try {
        await repository.create('academic_year', {
          institution_id: institutionId,
          calendar_id: created.id,
          name: yearName,
          start_date: calendarDraft.yearStart,
          end_date: calendarDraft.yearEnd,
          status: 'planned',
        });
      } catch (error) {
        // The calendar exists; say so rather than offering to create it a second time.
        setCalendarDraft(null);
        setPageError(
          `The calendar ${calendarName} was created, but its academic year was not saved: ${messageOf(error)}`
        );
        return;
      }
      setCalendarDraft(null);
      toast.showSuccess('School calendar created.');
    } catch (error) {
      setCalendarError(messageOf(error));
    } finally {
      setSavingCalendar(false);
    }
  };

  const columns: DataGridColumn<CalendarEventRow>[] = [
    {
      key: 'kind',
      header: 'Kind',
      sortable: true,
      filterable: true,
      render: (_value: unknown, row: CalendarEventRow) => eventKindLabel(row.kind),
    },
    {
      key: 'start_date',
      header: 'Start date',
      sortable: true,
      render: (_value: unknown, row: CalendarEventRow) => formatCalendarDate(row.start_date),
    },
    {
      key: 'end_date',
      header: 'End date',
      sortable: true,
      render: (_value: unknown, row: CalendarEventRow) => formatCalendarDate(row.end_date),
    },
    {
      key: 'affects_attendance',
      header: 'Affects attendance',
      render: (_value: unknown, row: CalendarEventRow) =>
        row.affects_attendance ? 'Yes' : 'No',
    },
    {
      key: 'phase',
      header: 'When',
      render: (_value: unknown, row: CalendarEventRow) => {
        const phase = eventPhase(row.start_date, row.end_date, today);
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${PHASE_STYLES[phase]}`}
          >
            {PHASE_LABELS[phase]}
          </span>
        );
      },
    },
  ];

  if (canWrite) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      render: (_value: unknown, row: CalendarEventRow) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => startEdit(row)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => void removeEvent(row)}
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      ),
    });
  }

  if (isLoading && calendarRows.length === 0 && institutionId === null) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  const reload = () => {
    setPageError(null);
    for (const query of queries) void query.refetch();
  };

  const coverage = years.length
    ? `Covers ${formatCalendarDate(years[0].start_date)} to ${formatCalendarDate(years[years.length - 1].end_date)}`
    : 'No academic year is recorded for this calendar yet.';

  const headerAction =
    canWrite && calendar && institutionId !== null && !calendarDraft ? (
      <Button onClick={startCreate} leftIcon={<PlusIcon className="w-4 h-4" />}>
        Add event
      </Button>
    ) : undefined;

  return (
    <div className="space-y-3">
      <PageHeaderWithTabs
        title="Events Manager"
        info="The school calendar: its events, ordered by start date, with the academic year the calendar covers."
        action={headerAction}
      />

      <p className="text-sm text-surface-muted-fg">
        The calendar records an event by its kind and dates. It has no free-text title.
      </p>

      {failed && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          <span>The school calendar could not be read: {messageOf(failed.error)}</span>
          <Button size="sm" variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {pageError && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {pageError}
        </p>
      )}

      {institutionId === null && !isLoading && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          The canonical database holds no institution row, so a school calendar cannot be saved
          yet.
        </p>
      )}

      {!failed && !calendar && (
        <Card title="This school has no calendar yet.">
          <p className="text-sm text-surface-muted-fg">
            A calendar groups the school's events and records the academic year it covers. Events
            belong to a calendar, so one has to exist first.
          </p>
          <div className="mt-4">
            {canWrite && institutionId !== null ? (
              <Button onClick={startCalendar} leftIcon={<PlusIcon className="w-4 h-4" />}>
                Create the school calendar
              </Button>
            ) : (
              <p className="text-sm text-surface-muted-fg">
                Ask an administrator or a head teacher to create the school calendar.
              </p>
            )}
          </div>
        </Card>
      )}

      {!failed && calendar && (
        <Card title={calendar.name} bodyClassName="p-0">
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-surface-border p-4">
            {calendarRows.length > 1 ? (
              <label className="text-sm font-medium text-surface-foreground">
                Calendar
                <select
                  className="mt-1.5 block w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
                  value={calendar.id}
                  onChange={(event) => {
                    setSelectedCalendarId(event.target.value);
                    closeEventForm();
                  }}
                >
                  {calendarRows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm text-surface-muted-fg">{coverage}</p>
            )}
            {calendarRows.length > 1 && (
              <p className="text-sm text-surface-muted-fg">{coverage}</p>
            )}
          </div>

          <div className="border-t border-surface-border">
            <DataGrid
              columns={columns}
              data={[...calendarEvents]}
              sortable
              filterable
              pagination
              emptyState="No events in this calendar yet."
            />
          </div>

          <p className="border-t border-surface-border p-4 text-sm text-surface-muted-fg">
            {counts.upcoming} upcoming, {counts.current} in progress, {counts.past} past.
          </p>
        </Card>
      )}

      {calendarDraft && (
        <Card title="New school calendar">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Calendar name"
                name="calendar_name"
                value={calendarDraft.calendarName}
                onChange={(event) =>
                  setCalendarDraft((current) =>
                    current ? { ...current, calendarName: event.target.value } : current
                  )
                }
                placeholder="e.g. School calendar"
                required
              />
              <Input
                label="Academic year name"
                name="year_name"
                value={calendarDraft.yearName}
                onChange={(event) =>
                  setCalendarDraft((current) =>
                    current ? { ...current, yearName: event.target.value } : current
                  )
                }
                placeholder="e.g. 2026"
                required
              />
              <DateField
                label="Year starts"
                value={calendarDraft.yearStart}
                onChange={(value) =>
                  setCalendarDraft((current) =>
                    current ? { ...current, yearStart: value } : current
                  )
                }
              />
              <DateField
                label="Year ends"
                value={calendarDraft.yearEnd}
                onChange={(value) =>
                  setCalendarDraft((current) =>
                    current ? { ...current, yearEnd: value } : current
                  )
                }
              />
            </div>

            <p className="text-sm text-surface-muted-fg">
              The calendar itself holds the school's name for it; the academic year it covers is
              kept as an academic year of that calendar, which is where the model stores dates.
            </p>

            {calendarError && (
              <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                {calendarError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setCalendarDraft(null);
                  setCalendarError(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void createCalendar()} loading={savingCalendar}>
                Create calendar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {eventForm && calendar && (
        <Card title={eventForm === 'edit' ? 'Edit event' : 'New event'}>
          {eventForm === 'edit' && editingEvent ? (
            <SchemaEntityForm
              schema={updateFormSchema('calendar_event')}
              fields={EVENT_FIELDS}
              recordKey={editingEvent.id}
              initialValues={toWritableValues(editingEvent)}
              submitLabel="Save event"
              onCancel={closeEventForm}
              onSubmit={updateEvent}
            />
          ) : (
            <SchemaEntityForm
              schema={createFormSchema('calendar_event')}
              fields={EVENT_FIELDS}
              recordKey={`new-event-${calendar.id}`}
              initialValues={initialCreate}
              submitLabel="Create event"
              onCancel={closeEventForm}
              onSubmit={createEvent}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export const EventsManagerContent: React.FC = () => (
  <CanonicalRepositoryProvider>
    <EventsManagerPageContent />
  </CanonicalRepositoryProvider>
);

const EventsManagerPage: React.FC = () => (
  <div className="space-y-3">
    <EventsManagerContent />
  </div>
);

export default EventsManagerPage;
