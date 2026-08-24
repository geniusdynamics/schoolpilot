import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TabNavigation } from '@/components/ui';
import { NewsletterCard } from '../components';
import Button from '@/components/ui/Button';
import { logger } from '@/utils/logging';

import { 
  CalendarIcon, 
  NewspaperIcon,
  PlusIcon
} from '@/components/ui/icons';

import { useConfirm } from '@/components/ui/ConfirmDialog';

// Mock newsletter data
const mockNewsletters = [
  {
    id: '1',
    title: 'Career Day',
    createdBy: 'Dean',
    createdOn: 'Jun 2, 2022',
    documentType: 'word' as const,
  },
  {
    id: '2',
    title: 'NEWSLETTER',
    createdBy: "Zacch M'copondo",
    createdOn: 'May 16, 2022',
    documentType: 'pdf' as const,
  },
  {
    id: '3',
    title: 'NEWSLETTER',
    createdBy: "Zacch M'copondo",
    createdOn: 'May 16, 2022',
    documentType: 'word' as const,
  },
];

// Mock events data
const mockEvents = [
  {
    id: '1',
    title: 'Annual Sports Day',
    date: 'Jun 15, 2022',
    type: 'sports',
  },
  {
    id: '2',
    title: 'Parent-Teacher Meeting',
    date: 'Jun 20, 2022',
    type: 'meeting',
  },
  {
    id: '3',
    title: 'Mid Term Examinations',
    date: 'Jul 4, 2022',
    type: 'exam',
  },
];

export const NewslettersContent: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useTranslation('administration');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('newsletters');

  const tabs = [
    { 
      id: 'manage-events', 
      label: 'Manage Events', 
      icon: <CalendarIcon className="h-4 w-4" />,
      onClick: () => setActiveTab('manage-events')
    },
    { 
      id: 'newsletters', 
      label: 'Newsletters', 
      icon: <NewspaperIcon className="h-4 w-4" />,
      onClick: () => setActiveTab('newsletters')
    },
  ];

  const handleViewNewsletter = (id: string) => {
    logger.info('View newsletter:', id);
    // navigate(`/administration/newsletters/${id}`);
  };

  const handleEditNewsletter = (id: string) => {
    logger.info('Edit newsletter:', id);
    // navigate(`/administration/newsletters/${id}/edit`);
  };

  const confirm = useConfirm();
  const handleDeleteNewsletter = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this newsletter?' }))) {
      logger.info('Delete newsletter:', id);
    }
  };

  const handleAddNewsletter = () => {
    logger.info('Add new newsletter');
    // navigate('/administration/newsletters/new');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Tab Navigation */}
      <TabNavigation 
        tabs={tabs} 
        variant="sidebar"
        activeTabId={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Content based on active tab */}
      {activeTab === 'newsletters' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Newsletter(s)</h2>
            <Button
              onClick={handleAddNewsletter}
              leftIcon={<PlusIcon className="h-4 w-4" />}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Add Newsletter
            </Button>
          </div>

          {/* Newsletter List */}
          <div className="p-6 space-y-4">
            {mockNewsletters.map((newsletter) => (
              <NewsletterCard
                key={newsletter.id}
                newsletter={newsletter}
                onView={() => handleViewNewsletter(newsletter.id)}
                onEdit={() => handleEditNewsletter(newsletter.id)}
                onDelete={() => handleDeleteNewsletter(newsletter.id)}
              />
            ))}

            {mockNewsletters.length === 0 && (
              <div className="text-center py-12">
                <NewspaperIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No newsletters found.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Click "Add Newsletter" to create your first newsletter.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'manage-events' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Manage Events</h2>
            <Button
              onClick={() => logger.info('Add event')}
              leftIcon={<PlusIcon className="h-4 w-4" />}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Add Event
            </Button>
          </div>

          {/* Events List */}
          <div className="p-6">
            <div className="space-y-3">
              {mockEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white text-emerald-600 shadow-sm">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-500">{event.date}</p>
                  </div>
                  <span className={`
                    px-3 py-1 rounded-full text-xs font-medium capitalize
                    ${event.type === 'sports' ? 'bg-blue-100 text-blue-700' :
                      event.type === 'exam' ? 'bg-amber-100 text-amber-700' :
                      'bg-purple-100 text-purple-700'}
                  `}>
                    {event.type}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logger.info('Edit event:', event.id)}
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </div>

            {mockEvents.length === 0 && (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No events found.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Click "Add Event" to create your first event.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const NewslettersPage: React.FC = () => (
  <div className="space-y-6">
    <NewslettersContent />
  </div>
);

export default NewslettersPage;
