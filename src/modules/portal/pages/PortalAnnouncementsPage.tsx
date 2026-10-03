// ABOUTME: Portal announcements page showing published announcements with priority badges
// ABOUTME: Displays announcements sorted by date with expandable content and color-coded priority

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { usePortalData } from '../data/usePortalData';
import type { PortalAnnouncement } from '../data/types';
import {
  MegaphoneIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserCircleIcon,
  CalendarIcon,
} from '@/components/ui/icons';

type SortOrder = 'newest' | 'oldest' | 'priority';

const priorityConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  urgent: {
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: <BellIcon className="w-3.5 h-3.5" />,
    label: 'Urgent',
  },
  high: {
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: <MegaphoneIcon className="w-3.5 h-3.5" />,
    label: 'High',
  },
  medium: {
    color: 'text-primary-700',
    bg: 'bg-primary-50',
    border: 'border-primary-200',
    icon: <MegaphoneIcon className="w-3.5 h-3.5" />,
    label: 'Medium',
  },
  low: {
    color: 'text-surface-muted-fg',
    bg: 'bg-surface-muted',
    border: 'border-surface-border',
    icon: <MegaphoneIcon className="w-3.5 h-3.5" />,
    label: 'Low',
  },
};

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PortalAnnouncementsContent: React.FC = () => {
  const { t } = useTranslation('portal');
  const {
    announcements,
    loading,
    loadAnnouncements,
    getAnnouncementsForUser,
  } = usePortalData();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [userRole] = useState<string>('student');

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const publishedAnnouncements = useMemo(() => {
    const filtered = getAnnouncementsForUser(userRole);

    switch (sortOrder) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
      case 'priority':
        return filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      default:
        return filtered;
    }
  }, [getAnnouncementsForUser, userRole, sortOrder]);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(publishedAnnouncements.map(a => a.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const isExpired = (announcement: PortalAnnouncement) => {
    if (announcement.expiresAt) {
      return new Date(announcement.expiresAt) < new Date();
    }
    return false;
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
        <span className="ml-3 text-surface-muted-fg">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-surface-foreground">{t('announcements.title')}</h1>
          <p className="text-sm text-surface-muted-fg mt-1">
            {publishedAnnouncements.length} announcement{publishedAnnouncements.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-accent rounded-lg p-1">
            {(['newest', 'oldest', 'priority'] as SortOrder[]).map((order) => (
              <button
                key={order}
                onClick={() => setSortOrder(order)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  sortOrder === order
                    ? 'bg-surface-card text-surface-foreground shadow-sm'
                    : 'text-surface-muted-fg hover:text-surface-foreground'
                }`}
              >
                {order === 'newest' ? 'Newest' : order === 'oldest' ? 'Oldest' : 'Priority'}
              </button>
            ))}
          </div>
          {publishedAnnouncements.length > 1 && (
            <div className="flex gap-1">
              <Button variant="outline" size="xs" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="xs" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Announcements List */}
      {publishedAnnouncements.length === 0 ? (
        <Card className="border-slate-200 bg-surface-card shadow-sm">
          <div className="text-center py-12">
            <MegaphoneIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-surface-foreground">{t('announcements.noAnnouncements')}</h3>
            <p className="text-sm text-surface-muted-fg mt-2">Check back later for new announcements.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {publishedAnnouncements.map((announcement) => {
            const isExpanded = expandedIds.has(announcement.id);
            const expired = isExpired(announcement);
            const config = priorityConfig[announcement.priority];

            return (
              <Card
                key={announcement.id}
                className={`border-slate-200 bg-surface-card shadow-sm transition-all ${
                  expired ? 'opacity-75' : ''
                }`}
              >
                {/* Announcement Header */}
                <button
                  className="w-full flex items-start gap-4 px-6 py-4 hover:bg-surface-muted transition-colors text-left"
                  onClick={() => toggleExpanded(announcement.id)}
                >
                  {/* Priority Badge */}
                  <div className={`flex-shrink-0 rounded-lg p-2.5 ${config.bg}`}>
                    <span className={config.color}>{config.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${config.bg} ${config.color} ${config.border}`}>
                        {config.icon}
                        {config.label}
                      </span>
                      {expired && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-surface-accent text-surface-muted-fg">
                          Expired
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-surface-foreground">{announcement.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-surface-muted-fg">
                      <span className="flex items-center gap-1">
                        <UserCircleIcon className="w-3.5 h-3.5" />
                        {announcement.authorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {new Date(announcement.publishedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {announcement.expiresAt && (
                        <span>
                          Expires: {new Date(announcement.expiresAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 mt-1">
                    {isExpanded ? (
                      <ChevronUpIcon className="w-5 h-5 text-surface-muted-fg" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-surface-muted-fg" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-surface-border px-6 py-4">
                    <div className="prose prose-sm max-w-none text-surface-foreground">
                      <p className="whitespace-pre-line">{announcement.content}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-surface-muted-fg">
                      <span>
                        Audience: <span className="font-medium capitalize">{announcement.audience}</span>
                      </span>
                      <span>
                        Published: {new Date(announcement.publishedAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PortalAnnouncementsPage: React.FC = () => {
  return <PortalAnnouncementsContent />;
};

export default PortalAnnouncementsPage;
