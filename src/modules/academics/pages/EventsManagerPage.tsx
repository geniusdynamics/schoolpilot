// GAP(P1-E02): the registry models no school-event entity, so this page stays on the legacy collection.
import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { CalendarIcon, PlusIcon, EditIcon, TrashIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { DataGrid } from '@/components/ui/data';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import type { SchoolEvent, EventType, EventStatus } from '../data/types';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';

export const EventsManagerPageContent: React.FC = () => {
  const { loading } = useAppData();

  const eventsCollection = useDatabaseCollection<SchoolEvent>('school_events');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const initialFormData: Partial<SchoolEvent> = {
    title: '',
    description: '',
    event_type: 'Function',
    start_date: '',
    end_date: '',
    location: '',
    status: 'Upcoming',
    organizer: '',
    participants: ''
  };
  const [formData, setFormData] = useState<Partial<SchoolEvent>>(initialFormData);

  // Live collection data from school_events
  const mockEvents: SchoolEvent[] = useMemo(() => {
    let filtered = eventsCollection.data;

    if (selectedType) {
      filtered = filtered.filter(e => e.event_type === selectedType);
    }

    if (selectedStatus) {
      filtered = filtered.filter(e => e.status === selectedStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(e => 
        (e.title?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (e.description?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (e.location?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [eventsCollection.data, selectedType, selectedStatus, searchTerm]);

  const openModal = (event?: SchoolEvent) => {
    setEditingEvent(event || null);
    setFormData(event ? {
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date,
      location: event.location,
      status: event.status,
      organizer: event.organizer,
      participants: event.participants
    } : initialFormData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.title || !formData.start_date) {
      toast.showWarning('Title and start date are required.');
      return;
    }

    try {
      if (editingEvent) {
        await eventsCollection.update(editingEvent.id, {
          title: formData.title,
          description: formData.description,
          event_type: formData.event_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          location: formData.location,
          status: formData.status,
          organizer: formData.organizer,
          participants: formData.participants
        });
        toast.showSuccess('Event updated.');
      } else {
        await eventsCollection.insert({
          title: formData.title!,
          description: formData.description ?? '',
          event_type: formData.event_type ?? 'Other',
          start_date: formData.start_date!,
          end_date: formData.end_date ?? formData.start_date!,
          location: formData.location ?? '',
          status: formData.status ?? 'Upcoming',
          organizer: formData.organizer ?? '',
          participants: formData.participants || undefined,
          created_at: new Date().toISOString()
        });
        toast.showSuccess('Event added.');
      }
      logger.info('Saved event:', formData);
    } catch (err) {
      logger.error('Failed to save event:', err);
      toast.showError('Failed to save event.');
    }
    closeModal();
  };

  const deleteEvent = async (event: SchoolEvent) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsCollection.remove(event.id);
        toast.showSuccess('Event deleted.');
        logger.info('Deleted event:', event.id);
      } catch (err) {
        logger.error('Failed to delete event:', err);
        toast.showError('Failed to delete event.');
      }
    }
  };

  const getTypeBadge = (type: EventType) => {
    const styles = {
      'Exam': 'bg-purple-100 text-purple-800',
      'Holiday': 'bg-green-100 text-green-800',
      'Function': 'bg-primary-100 text-primary-800',
      'Meeting': 'bg-yellow-100 text-yellow-800',
      'Sports': 'bg-orange-100 text-orange-800',
      'Other': 'bg-surface-accent text-surface-foreground'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type]}`}>
        {type}
      </span>
    );
  };

  const getStatusBadge = (status: EventStatus) => {
    const styles = {
      'Upcoming': 'bg-primary-100 text-primary-800',
      'Ongoing': 'bg-green-100 text-green-800',
      'Completed': 'bg-surface-accent text-surface-foreground',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const eventTypes: EventType[] = ['Exam', 'Holiday', 'Function', 'Meeting', 'Sports', 'Other'];
  const eventStatuses: EventStatus[] = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

  const totals = useMemo(() => {
    return {
      total: mockEvents.length,
      upcoming: mockEvents.filter(e => e.status === 'Upcoming').length,
      ongoing: mockEvents.filter(e => e.status === 'Ongoing').length,
      completed: mockEvents.filter(e => e.status === 'Completed').length
    };
  }, [mockEvents]);

  if ((loading?.all || eventsCollection.loading) && mockEvents.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading events...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-surface-foreground">Events Manager</h1>
        <Button onClick={() => openModal()} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>
      <Card>
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-800">School Events Calendar</h3>
              <p className="text-sm text-purple-700 mt-1">
                Manage school events including exams, holidays, functions, meetings, and sports activities. 
                Track event schedules, locations, and participants.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Events</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">
              {totals.total}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CalendarIcon className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium">Upcoming</span>
            </div>
            <p className="text-2xl font-bold text-primary-600 mt-2">
              {totals.upcoming}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CalendarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Ongoing</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {totals.ongoing}
            </p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CalendarIcon className="w-5 h-5 text-surface-muted-fg" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold text-surface-muted-fg mt-2">
              {totals.completed}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Event Type</label>
            <Select
              value={selectedType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value)}
              className="w-full"
            >
              <option value="">All Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Status</label>
            <Select
              value={selectedStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatus(e.target.value)}
              className="w-full"
            >
              <option value="">All Statuses</option>
              {eventStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Event, location..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockEvents}
          columns={[
            {
              key: 'title',
              header: 'Event Title',
              sortable: true,
              filterable: true
            },
            {
              key: 'event_type',
              header: 'Type',
              sortable: true,
              render: (value: any) => getTypeBadge(value)
            },
            {
              key: 'start_date',
              header: 'Start Date',
              sortable: true,
              render: (value: any) => value ? new Date(value).toLocaleDateString() : '-'
            },
            {
              key: 'end_date',
              header: 'End Date',
              sortable: true,
              render: (value: any) => value ? new Date(value).toLocaleDateString() : '-'
            },
            {
              key: 'location',
              header: 'Location',
              sortable: true,
              render: (value: any) => value
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (value: any) => getStatusBadge(value)
            },
            {
              key: 'organizer',
              header: 'Organizer',
              sortable: true,
              render: (value: any) => value
            },
            {
              key: 'actions',
              header: 'Actions',
              sortable: false,
              render: (_: any, record: SchoolEvent) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openModal(record)}>
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => deleteEvent(record)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Add/Edit Event Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingEvent ? 'Edit Event' : 'Add Event'}
      >
        <FormSection>
          <FormField label="Event Title" required>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Event title"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Event description"
              rows={3}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Event Type" required>
            <Select
              name="event_type"
              value={formData.event_type}
              onChange={handleInputChange}
              className="w-full"
            >
              {eventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Start Date" required>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="End Date">
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Location" required>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Event location"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Status" required>
            <Select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full"
            >
              {eventStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Organizer" required>
            <input
              type="text"
              name="organizer"
              value={formData.organizer}
              onChange={handleInputChange}
              placeholder="Event organizer"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>

          <FormField label="Participants">
            <input
              type="text"
              name="participants"
              value={formData.participants}
              onChange={handleInputChange}
              placeholder="Participants"
              className="w-full border border-surface-border rounded-md px-3 py-2"
            />
          </FormField>
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary">
            {editingEvent ? 'Update' : 'Add'}
          </Button>
        </div>
      </DialogForm>
    </div>
  );
};
const EventsManagerPage: React.FC = () => (
  <div className="space-y-6">
    <EventsManagerPageContent />
  </div>
);

export default EventsManagerPage;
