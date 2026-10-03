// ABOUTME: Daily bulletin widget showing news and announcements
// ABOUTME: Displays posts with author info, tags, and content preview

import React from 'react';
import { useTranslation } from 'react-i18next';
import PortalWidgetCard from './PortalWidgetCard';
import { PrinterIcon, ArrowDownTrayIcon, PlusIcon, CogIcon, UserCircleIcon, ClipboardDocumentListIcon } from '@/components/ui/icons';

export interface BulletinPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorAvatar?: string;
  postedAt: string;
  tags: Array<{ label: string; color: 'drama' | 'staff' | 'exams' | 'important' | 'general' }>;
}

export interface DailyBulletinProps {
  posts?: BulletinPost[];
  date?: string;
  onDateChange?: (direction: 'prev' | 'next') => void;
  onPrint?: () => void;
  onExport?: () => void;
  onCreate?: () => void;
  onManage?: () => void;
  onTagClick?: (tag: string) => void;
}

const defaultPosts: BulletinPost[] = [
  {
    id: '1',
    title: 'Imagine If...',
    content: 'The Imagine If... exhibition is at the Royal College of Art on 12-14th September.',
    authorName: 'Mr. Smith',
    postedAt: '2 days ago',
    tags: [
      { label: 'Drama', color: 'drama' },
      { label: 'Staff Only', color: 'staff' },
    ],
  },
  {
    id: '2',
    title: 'Scenes of Childhood Cast',
    content: 'Due to the A Level examinations there will be no rehearsals on Tuesday this week.',
    authorName: 'Mrs. Ronin',
    postedAt: '3 days ago',
    tags: [
      { label: 'Exams', color: 'exams' },
      { label: 'Important', color: 'important' },
    ],
  },
  {
    id: '3',
    title: 'LAMDA',
    content: 'LAMDA commences again on Monday 11th September.',
    authorName: 'Mr. Mclnnes',
    postedAt: '4 days ago',
    tags: [
      { label: 'Drama', color: 'drama' },
      { label: 'Important', color: 'important' },
    ],
  },
];

const tagColors: Record<string, string> = {
  drama: 'bg-purple-100 text-purple-700 border-purple-200',
  staff: 'bg-surface-accent text-surface-foreground border-surface-border',
  exams: 'bg-amber-100 text-amber-700 border-amber-200',
  important: 'bg-rose-100 text-rose-700 border-rose-200',
  general: 'bg-primary-100 text-primary-700 border-primary-200',
};

// Quick filter tags - translation keys will be resolved in component
const quickTagKeys = [
  { key: 'bulletin.title', active: true },
  { key: 'bulletin.detention', active: false },
  { key: 'bulletin.registerAbsence', active: false },
  { key: 'bulletin.outOfSchool', active: false },
  { key: 'bulletin.offGames', active: false },
];

export const DailyBulletin: React.FC<DailyBulletinProps> = ({
  posts = defaultPosts,
  date,
  onDateChange,
  onPrint,
  onExport,
  onCreate,
  onManage,
  onTagClick,
}) => {
  const { t } = useTranslation('portal');

  const actions = [
    { label: t('portal.bulletin.print'), icon: <PrinterIcon className="w-3.5 h-3.5" />, onClick: onPrint || (() => {}), variant: 'ghost' as const },
    { label: t('portal.bulletin.export'), icon: <ArrowDownTrayIcon className="w-3.5 h-3.5" />, onClick: onExport || (() => {}), variant: 'ghost' as const },
    { label: t('portal.bulletin.create'), icon: <PlusIcon className="w-3.5 h-3.5" />, onClick: onCreate || (() => {}), variant: 'ghost' as const },
    { label: t('portal.bulletin.manage'), icon: <CogIcon className="w-3.5 h-3.5" />, onClick: onManage || (() => {}), variant: 'ghost' as const },
  ];

  return (
    <PortalWidgetCard
      title={t('portal.bulletin.title')}
      date={date}
      onDateChange={onDateChange}
      actions={actions}
    >
      {/* Quick Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        {quickTagKeys.map((tag) => (
          <button
            key={tag.key}
            onClick={() => onTagClick?.(tag.key)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              tag.active
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-surface-muted-fg hover:bg-surface-accent'
            }`}
          >
            {t(tag.key)}
          </button>
        ))}
        <div className="flex-1"></div>
        <div className="flex items-center gap-1 text-xs">
          <button className="text-surface-muted-fg hover:text-surface-foreground px-2">{t('portal.bulletin.expand')}</button>
          <button className="text-surface-muted-fg hover:text-surface-foreground px-2">{t('portal.bulletin.collapse')}</button>
          <button className="text-rose-600 hover:text-rose-700 px-2">{t('portal.bulletin.delete')}</button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="flex gap-3">
            {/* Author Avatar */}
            <div className="flex-shrink-0">
              {post.authorAvatar ? (
                <img
                  src={post.authorAvatar}
                  alt={post.authorName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                  <UserCircleIcon className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h4 className="text-sm font-semibold text-primary-600 mb-0.5">{post.title}</h4>

              {/* Meta */}
              <p className="text-xs text-surface-muted-fg mb-1">
                {t('portal.bulletin.postedAt', { time: post.postedAt, author: post.authorName })}
              </p>

              {/* Content */}
              <p className="text-sm text-surface-foreground mb-2 line-clamp-2">{post.content}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${
                      tagColors[tag.color]
                    }`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-6 text-surface-muted-fg">
          <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">{t('portal.announcements.noAnnouncements')}</p>
        </div>
      )}
    </PortalWidgetCard>
  );
};

export default DailyBulletin;
