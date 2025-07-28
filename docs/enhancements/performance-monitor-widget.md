# Performance Monitor Widget

## Overview

The Performance Monitor Widget is a floating UI component that provides real-time performance metrics for the application. It's designed to help developers and administrators monitor application health and identify performance issues.

## Features

### Visual Design
- **Collapsible Interface**: Shows as a small colored indicator when collapsed
- **Expandable Details**: Click to expand and see detailed metrics
- **Color-Coded Status**: 
  - 🟢 Green: Good performance
  - 🟡 Yellow: Moderate performance 
  - 🔴 Red: Poor performance

### Metrics Displayed
- **Startup Time**: How long the application took to initialize
- **Memory Usage**: Current memory consumption
- **Module Count**: Number of loaded modules
- **Performance Status**: Overall health indicator

### Interactive Controls
- **Manual Refresh**: Update metrics on demand
- **Expand/Collapse**: Toggle between minimal and detailed views
- **Hide Widget**: Completely hide the widget
- **Auto-refresh**: Optional automatic updates (disabled by default)

## Configuration

### Feature Flag Control
The widget is controlled by the `performanceMonitorWidget` feature flag in `src/config/appConfig.ts`:

```typescript
features: {
  performanceMonitorWidget: true, // Enable the widget
  // ... other flags
}
```

### Widget Props
```typescript
interface PerformanceMonitorWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  refreshInterval?: number; // milliseconds
  showDetails?: boolean;
}
```

### Default Settings
- **Position**: `bottom-right`
- **Refresh Interval**: `15000ms` (15 seconds)
- **Show Details**: `true`
- **Auto-refresh**: `false` (user must enable)

## Usage

### Enabling the Widget

#### Method 1: Using the Script
```bash
npm run enable-performance-widget
```

#### Method 2: Using the UI
1. Navigate to Settings → Features tab
2. Click "Fix Missing Flags" button
3. Toggle the "Performance Monitor Widget" switch

#### Method 3: Manual Configuration
1. Edit `src/config/appConfig.ts`
2. Set `performanceMonitorWidget: true`
3. Refresh the application

### Using the Widget

1. **Initial State**: Look for a small colored indicator in the bottom-right corner
2. **Expand**: Click the indicator to see detailed metrics
3. **Refresh**: Use the 🔄 button to update data manually
4. **Auto-refresh**: Check the checkbox to enable automatic updates
5. **Collapse**: Click ➖ to minimize back to indicator
6. **Hide**: Click × to completely hide the widget

## Performance Thresholds

The widget uses the following thresholds to determine status colors:

### Startup Time
- **Good** (Green): < 2 seconds
- **Moderate** (Yellow): 2-5 seconds  
- **Poor** (Red): > 5 seconds

### Memory Usage
- **Good** (Green): < 50 MB
- **Moderate** (Yellow): 50-100 MB
- **Poor** (Red): > 100 MB

## Technical Implementation

### Components
- `PerformanceMonitorWidget.tsx`: Main widget component
- `performanceMonitor.ts`: Performance data service
- `usePerformanceMonitoring.ts`: React hook for tracking

### Integration Points
- Renders at the App level when feature flag is enabled
- Uses the existing performance monitoring infrastructure
- Integrates with the app's theme and styling system

### Error Handling
- Gracefully handles missing performance data
- Provides fallback values when services are unavailable
- Non-blocking - won't crash the application if it fails

## Development Notes

### Memory Considerations
- Widget updates are throttled to prevent UI flickering
- Auto-refresh is disabled by default to reduce overhead
- Manual refresh recommended for detailed analysis

### Browser Compatibility
- Uses standard React patterns for maximum compatibility
- CSS uses Tailwind classes for consistent styling
- No external dependencies beyond existing app infrastructure

## Troubleshooting

### Widget Not Appearing
1. Check that the feature flag is enabled
2. Clear localStorage and refresh
3. Verify no JavaScript errors in console
4. Check that performance monitoring services are available

### Inaccurate Data
1. Use manual refresh to get latest metrics
2. Check browser's performance monitoring capabilities
3. Verify that the app has been running long enough to collect data

### Performance Impact
- Widget is designed to be lightweight
- Refresh only when visible and user-requested
- Consider disabling auto-refresh on slower devices

## Future Enhancements

- Historical performance charts
- Export metrics data
- Configurable alert thresholds  
- Integration with monitoring services
- Mobile-responsive design optimizations