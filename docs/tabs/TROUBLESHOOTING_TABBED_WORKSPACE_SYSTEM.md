# 🛠️ Tabbed Workspace System - Troubleshooting Guide

## Overview
This guide helps diagnose and resolve common issues with the Tabbed Workspace System.

## 🔍 Common Issues and Solutions

### 1. Module Navigation Opens Traditional Pages Instead of Tabs

**Symptoms**:
- Clicking on modules opens traditional pages (breadcrumbs, no tabs)
- No new tabs are created when navigating
- Tabbed interface doesn't appear

**Causes and Solutions**:

#### Cause: Tabbed Mode Not Enabled for Module
**Solution**:
1. Navigate to **Settings** → **Tabbed Mode**
2. Ensure **Global Enable** is toggled ON
3. Ensure **Per-Module Control** is toggled ON
4. Find your module in the list and toggle it ON
5. Refresh the page

#### Cause: Feature Flag Configuration Error
**Solution**:
1. Check browser console for errors (F12 → Console)
2. Look for messages like "Access denied" or "Permission denied"
3. Verify module has proper RBAC permissions
4. Contact administrator if permissions are missing

#### Cause: Module Definition Missing Tabbed Mode Entry
**Solution**:
1. Check `src/modules/[module]/moduleDefinition.tsx`
2. Ensure module navigation includes tabbed mode pages
3. Verify `TabbedModeSettingsPage` is registered in navigation
4. Restart development server after changes

### 2. Tabs Are Not Creating Properly

**Symptoms**:
- Clicking navigation items doesn't create new tabs
- Existing tabs don't activate when revisiting pages
- Tab content appears blank or broken

**Causes and Solutions**:

#### Cause: Route-to-Tab Mapping Issue
**Solution**:
1. Check browser console for route mapping errors
2. Verify `TabbedWorkspaceManager` is properly handling route changes
3. Ensure `getPageComponent` function resolves components correctly
4. Check that page components exist at expected paths

#### Cause: Tab State Management Problem
**Solution**:
1. Open browser DevTools → Application → LocalStorage
2. Check for `tabbed-workspace-storage` entry
3. Clear localStorage if corrupted data is suspected
4. Refresh the page to reset tab state

#### Cause: Component Import Failure
**Solution**:
1. Check browser console for import errors
2. Verify all page components are properly exported
3. Ensure component files exist at expected locations
4. Check for circular dependencies in imports

### 3. Performance Issues with Many Tabs

**Symptoms**:
- Slow tab switching or creation
- High memory usage with multiple tabs
- Browser freezing or crashing
- Laggy interface response

**Causes and Solutions**:

#### Cause: Memory Leaks in Tab Content
**Solution**:
1. Monitor browser memory usage in DevTools
2. Check for componentWillUnmount cleanup in tab components
3. Ensure useEffect cleanup functions are properly implemented
4. Optimize heavy components with React.memo and useMemo

#### Cause: Excessive Tab Count
**Solution**:
1. Implement tab limit enforcement (currently 20 max tabs)
2. Encourage users to close unused tabs regularly
3. Add "Close Other Tabs" and "Close All Tabs" functionality
4. Consider tab grouping for better organization

#### Cause: Heavy Component Rendering
**Solution**:
1. Implement lazy loading for tab content
2. Use virtualization for large data lists
3. Optimize images and media in tab content
4. Defer non-critical operations until tab is active

### 4. Configuration and Settings Issues

**Symptoms**:
- Changes to tabbed mode settings don't persist
- Feature flag toggles don't work
- Module overrides are ignored
- Settings page shows errors

**Causes and Solutions**:

#### Cause: LocalStorage Corruption
**Solution**:
1. Open browser DevTools → Application → LocalStorage
2. Look for `app-config` and `tabbed-workspace-storage` entries
3. Delete corrupted entries if found
4. Refresh page to restore default configuration

#### Cause: Configuration Service Not Initialized
**Solution**:
1. Check browser console for initialization errors
2. Verify `UnifiedConfigProvider` is properly wrapping the app
3. Ensure `tabbedModeFeatureFlag` service initializes correctly
4. Check for network issues preventing config loading

#### Cause: Permission Issues
**Solution**:
1. Verify user has `settings.manage` permission
2. Check RBAC configuration for settings module
3. Ensure user is logged in as administrator
4. Contact system administrator for permission adjustments

## 🧪 Diagnostic Tools

### Browser Console Logging
Enable verbose logging to diagnose issues:
```javascript
// In browser console
localStorage.setItem('debug', 'tabbed:*');
window.location.reload();
```

### Debugging Scripts
Run verification script to check system health:
```bash
node verify-tabbed-mode-setup.js
```

### Performance Monitoring
Monitor tab performance in browser DevTools:
1. Open DevTools → Performance tab
2. Record while creating/switching tabs
3. Analyze for bottlenecks and memory leaks
4. Check for excessive re-renders

## 🛡️ Emergency Procedures

### Immediate Rollback
If tabbed mode causes critical issues:
1. Navigate to **Settings** → **Tabbed Mode**
2. Toggle **Global Enable** to OFF
3. All modules revert to traditional navigation immediately
4. No restart required

### Force Reset Configuration
If configuration becomes corrupted:
1. Open browser DevTools → Application → LocalStorage
2. Delete `app-config` and `tabbed-workspace-storage` entries
3. Refresh the page to restore defaults
4. Reconfigure tabbed mode settings as needed

### Component Recovery
If specific components fail:
1. Check browser console for component-specific errors
2. Verify component file exists and exports correctly
3. Restart development server
4. Clear browser cache if needed

## 📊 Monitoring and Analytics

### Key Metrics to Track
1. **Tab Creation Success Rate**: Percentage of successful tab creations
2. **User Engagement**: Number of tabs created per session
3. **Error Rate**: Frequency of tab-related errors
4. **Performance**: Load times and resource consumption
5. **User Satisfaction**: Feedback and support tickets

### Health Checks
1. **Daily Configuration Audits**: Verify feature flag settings
2. **Service Availability Monitoring**: Ensure all services running
3. **Error Rate Tracking**: Monitor for unusual error patterns
4. **Resource Utilization**: Check memory and CPU usage

## 📞 Support Resources

### Documentation
- **Technical Implementation**: `docs/TABBED_WORKSPACE_SYSTEM_COMPLETE_SUMMARY.md`
- **Feature Flag System**: `docs/TABBED_MODE_FEATURE_FLAG_IMPLEMENTATION.md`
- **User Guide**: `docs/TABDED_MODE_USER_GUIDE.md`

### Contact Support
- **Issues**: Create GitHub issue with label "tabbed-mode-bug"
- **Questions**: Contact development team
- **Emergency**: Disable problematic module in Settings → Tabbed Mode

## 🔁 Common Resolution Steps

### When Nothing Else Works
1. **Clear Browser Cache**: Ctrl+Shift+Delete → Clear cache
2. **Restart Development Server**: `npm run dev`
3. **Reset Configuration**: Delete localStorage entries
4. **Check Latest Commits**: Ensure all fixes are pulled
5. **Contact Support**: If issue persists, get expert help

### Quick Diagnostic Checklist
- [ ] **Global Enable** is ON in Settings → Tabbed Mode
- [ ] **Per-Module Control** is ON in Settings → Tabbed Mode
- [ ] Target module is enabled in module overrides
- [ ] No JavaScript errors in browser console
- [ ] Page components exist and export correctly
- [ ] Route-to-tab mapping working properly
- [ ] Tab state management functioning
- [ ] User has proper RBAC permissions
- [ ] Configuration persisted in localStorage
- [ ] No network issues preventing module loading

## 🎯 Best Practices for Maintainers

### Code Maintenance
1. **Consistent Imports**: Use standardized relative paths
2. **Error Handling**: Implement comprehensive try/catch blocks
3. **Performance**: Optimize components with React.memo and useMemo
4. **Testing**: Write unit tests for critical functionality
5. **Documentation**: Keep documentation updated with code changes

### Feature Development
1. **Incremental Changes**: Small, focused improvements
2. **Backward Compatibility**: Maintain traditional navigation support
3. **User Feedback**: Gather input during development
4. **Performance Monitoring**: Track impact of new features
5. **Security**: Follow RBAC principles for all new functionality

### Issue Resolution
1. **Reproduce Locally**: Confirm issue in development environment
2. **Check Recent Changes**: Identify potential regression sources
3. **Isolate Problem**: Create minimal reproduction case
4. **Fix Root Cause**: Address underlying issue, not symptoms
5. **Verify Solution**: Test fix thoroughly before deployment

---

*This troubleshooting guide provides comprehensive coverage of common issues and their solutions. Always start with the most likely causes and work your way through the diagnostic steps methodically.*