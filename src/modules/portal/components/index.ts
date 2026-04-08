// ABOUTME: Portal components index file
// ABOUTME: Exports all portal dashboard components

export { default as PortalWidgetCard } from './PortalWidgetCard';
export type { PortalWidgetCardProps, WidgetAction } from './PortalWidgetCard';

export { default as TimetableWidget } from './TimetableWidget';
export type { TimetableWidgetProps, Period } from './TimetableWidget';

export { default as SchoolCalendarWidget } from './SchoolCalendarWidget';
export type { SchoolCalendarWidgetProps, CalendarEvent } from './SchoolCalendarWidget';

export { default as DailyBulletin } from './DailyBulletin';
export type { DailyBulletinProps, BulletinPost } from './DailyBulletin';

export { default as WhosOnline } from './WhosOnline';
export type { WhosOnlineProps, OnlineUser } from './WhosOnline';

export { default as SchoolStatistics } from './SchoolStatistics';
export type { SchoolStatisticsProps, YearGroupStats } from './SchoolStatistics';

export { default as SchoolBlogFeed } from './SchoolBlogFeed';
export type { SchoolBlogFeedProps, BlogPost } from './SchoolBlogFeed';

export { default as QuickActionBar } from './QuickActionBar';
export type { QuickActionBarProps, QuickAction } from './QuickActionBar';
