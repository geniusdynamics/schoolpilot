// ABOUTME: The portal notices page: school notices the viewer's role may read, with the unread ones
// ABOUTME: marked and a way to mark one read.

import { withPortalRepository } from '../data/withPortalRepository';

import React from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { BellIcon } from '@/components/ui/icons';

import { PortalShell } from '../components/PortalShell';
import { usePortalNotices } from '../data/usePortalSession';

const PRIORITY_CLASS: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-800',
  high: 'bg-amber-100 text-amber-800',
  medium: 'bg-primary-100 text-primary-800',
  low: 'bg-surface-accent text-surface-muted-fg',
};

export const PortalAnnouncementsContent: React.FC = () => {
  const { t } = useTranslation('portal');
  const { session, notices, loading, error, markRead } = usePortalNotices();

  return (
    <PortalShell session={session} title={t('announcements.title', 'Notices')}>
      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        </Card>
      ) : null}

      {loading && notices.length === 0 ? (
        <div className="flex items-center justify-center py-10" role="status">
          <Spinner />
          <span className="ml-3 text-surface-muted-fg">{t('common.loading', 'Loading…')}</span>
        </div>
      ) : null}

      {!loading && notices.length === 0 ? (
        <Card className="border-slate-200 bg-surface-card">
          <div className="py-10 text-center">
            <BellIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <h2 className="text-base font-medium text-surface-foreground">
              {t('announcements.noAnnouncements', 'No notices at this time')}
            </h2>
            <p className="mt-1 text-sm text-surface-muted-fg">
              {t('announcements.emptyHelp', 'Notices from the school appear here.')}
            </p>
          </div>
        </Card>
      ) : null}

      <ul className="space-y-3">
        {notices.map((notice) => (
          <li key={notice.id}>
            <Card className={`border-slate-200 bg-surface-card ${notice.read ? '' : 'border-l-4 border-l-primary-500'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-medium text-surface-foreground">{notice.title}</h2>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    PRIORITY_CLASS[notice.priority] ?? PRIORITY_CLASS.low
                  }`}
                >
                  {notice.priority}
                </span>
                {!notice.read ? (
                  <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                    {t('announcements.unread', 'Unread')}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-surface-muted-fg">
                {notice.authorName} · {notice.publishedAt.slice(0, 10)}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-surface-foreground">
                {notice.content}
              </p>
              {!notice.read ? (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => void markRead(notice.id)}>
                    {t('announcements.read', 'Mark as read')}
                  </Button>
                </div>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </PortalShell>
  );
};

const PortalAnnouncementsPage: React.FC = withPortalRepository(() => <PortalAnnouncementsContent />);

export default PortalAnnouncementsPage;
