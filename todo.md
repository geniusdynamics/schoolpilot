# Fix Issues in Academics Module

## Issues Identified
- [ ] Fix `TypeError: Cannot read properties of undefined (reading 'map')` in SchedulingCalendar.tsx (timetablePeriodDefs undefined)
- [ ] Fix `TypeError: Cannot read properties of undefined (reading 'replace')` in EducationSystemsPage.tsx (grading_system_type undefined)

## Steps to Fix

### 1. Fix EducationSystemsPage.tsx grading_system_type issue
- [x] EducationSystemConfiguration interface already has grading_system_type
- [ ] Add grading_system_type field to educationSystemConfigurations mock data
- [ ] Add null safety check in EducationSystemsPage.tsx render function
- [ ] Add null check in EducationSystemsPage.tsx render method

### 2. Fix SchedulingCalendar.tsx timetablePeriodDefs issue  
- [ ] Ensure timetablePeriodDefs is properly loaded in useModularMockData
- [ ] Add null checks in SchedulingCalendar.tsx for timetablePeriodDefs

### 3. Test fixes
- [ ] Verify EducationSystemsPage loads without errors
- [ ] Verify SchedulingCalendar loads without errors
- [ ] Check exam scheduling functionality works