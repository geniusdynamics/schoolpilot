# Main Dashboard Style Guide and Component Library

## Purpose
This guide defines visual, interaction, accessibility, and component standards for the redesigned SchoolPilot main dashboard.

## Design Principles
- Prioritize decision-ready information above decorative content.
- Keep the first viewport focused on high-signal metrics and urgent actions.
- Use role-specific information surfaces to reduce cognitive load.
- Preserve consistency across desktop, tablet, and mobile breakpoints.

## Color and Visual System

### Core Palette
- Primary Blue: `#1D4ED8` (navigation emphasis, key chart lines, primary accents)
- Secondary Blue: `#2563EB` (interactive hover states)
- Support Green: `#047857` (healthy status, collected finance values)
- Support Teal: `#0F766E` (attendance and operational trends)
- Neutral Slate 900/700/600/200/50 (`text`, borders, surfaces, subtle backgrounds)

### Usage Rules
- Use one primary color family per widget.
- Reserve amber backgrounds for warning/high-severity alerts.
- Do not rely on color only; pair status with clear labels and iconography.
- Maintain AA contrast ratios for all text and interactive controls.

## Typography
- Primary heading: `text-2xl` to `text-3xl`, `font-semibold`, tight tracking.
- Section heading: `text-base` to `text-lg`, `font-semibold`.
- KPI value: `text-3xl`, `font-semibold`.
- Supporting text: `text-xs` to `text-sm`, slate-500/slate-600.

## Layout and Spacing
- Use card-based composition with `rounded-xl` to `rounded-2xl` containers.
- Dashboard stack spacing: `space-y-6`.
- Grid strategy:
  - Metrics: `1/2/5` columns (mobile/tablet/desktop-xl)
  - Main content: `1` column on mobile, `3` columns on xl
- Keep tap targets and buttons at accessible touch dimensions via shared button sizing.

## Information Architecture
- Primary sections:
  - Student Management
  - Attendance Tracking
  - Grade Books
  - Scheduling
  - Analytics
- Critical insight zones:
  - Key Metrics
  - Navigation Hub
  - Quick Actions
  - Trend Charts
  - Events, Announcements, Notifications

## Role-Based Dashboard Model
- Administrator: enrollment, staffing, finance, reporting actions.
- Teacher: attendance capture, assignment workflows, grading.
- Student: timetable, results, notices.
- Parent/Guardian: attendance visibility, fee statement, communication.
- General fallback role receives neutral overview actions.

## Component Library Contract

### 1) Hero Banner
- Purpose: user greeting, context, and freshness timestamp.
- Required fields: user display name, subtitle, last-updated time.

### 2) Metric Card
- Inputs: title, value, subtext, icon.
- Must display one KPI and one contextual line.

### 3) Navigation Hub Card
- Inputs: section label, description, route path, icon.
- Interaction: full-card keyboard and pointer activation.

### 4) Quick Action Button Set
- Inputs: role-scoped action list.
- Action style: outline buttons with clear verb labels.

### 5) Chart Widgets
- Enrollment: line chart (new + cumulative).
- Performance: distribution bar chart.
- Finance: area chart (billed vs collected).
- Shared rules: responsive container, visible legend, labeled axes.

### 6) Event and Announcement Lists
- Show latest/highest-priority items first.
- Keep list item density readable on mobile.

### 7) Real-Time Notification Feed
- Must expose status updates in an ARIA live region.
- Severity styles:
  - High: amber surface
  - Normal: green surface

## Accessibility Standard (WCAG 2.1+)
- Use semantic sectioning and heading hierarchy.
- Preserve keyboard navigation for all quick actions and nav cards.
- Ensure visible focus states on interactive elements.
- Expose live updates via `aria-live="polite"` and status role.
- Provide non-color cues (text labels + icons) for statuses.

## Responsiveness Standard
- Mobile-first stacking with single-column priority.
- Tablet: two-column metrics and balanced content flow.
- Desktop: multi-column insights without horizontal overflow.
- Validate at 320px, 768px, and 1440px viewport widths.

## Performance Budget and Validation
- Target main dashboard interactive load under 3 seconds on standard broadband.
- Use memoized derived data for metrics and chart datasets.
- Keep chart counts bounded (last 6 months, top 4 notices/events).
- Avoid unnecessary re-renders by grouping derived calculations in `useMemo`.

## Usability Testing Plan With School Staff

### Participants
- Minimum 8 participants:
  - 2 administrators
  - 2 teachers
  - 2 students
  - 2 parents/guardians

### Scenario Tasks
- Locate attendance alerts and identify at-risk trend.
- Open relevant module from navigation hub.
- Perform one role-appropriate quick action.
- Interpret one chart insight and state next decision.

### Success Metrics
- Task completion rate by role.
- Time-to-first-action.
- Navigation error rate.
- System Usability Scale (SUS) score target: 80+.

### Evidence Collection
- Session recordings or observer notes.
- Post-test survey by role.
- Issue severity matrix (critical/high/medium/low).

### Exit Criteria
- No critical blockers.
- High-severity issues resolved or accepted with workaround.
- Role-specific completion rate above 90%.
