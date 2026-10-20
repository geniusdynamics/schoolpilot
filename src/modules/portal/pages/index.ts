// ABOUTME: Portal pages barrel export
// ABOUTME: Centralizes all portal page exports for the module definition

export { default as PortalDashboardPage } from './PortalDashboardPage';
export { default as PortalAttendancePage } from './PortalAttendancePage';
export { default as PortalResultsPage } from './PortalResultsPage';
export { default as PortalFeesPage } from './PortalFeesPage';
export { default as PortalAnnouncementsPage } from './PortalAnnouncementsPage';
export { default as PortalProfilePage } from './PortalProfilePage';

// Named content exports — useful for embedding a portal section inside a
// custom layout (e.g. a parent dashboard with multiple panels).
export { PortalDashboardContent } from './PortalDashboardPage';
export { PortalAttendanceContent } from './PortalAttendancePage';
export { PortalResultsContent } from './PortalResultsPage';
export { PortalFeesContent } from './PortalFeesPage';
export { PortalAnnouncementsContent } from './PortalAnnouncementsPage';
export { PortalProfileContent } from './PortalProfilePage';
