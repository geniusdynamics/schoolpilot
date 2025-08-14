import React, { useEffect, useRef } from 'react';
import { TabbedWorkspace } from '../TabbedWorkspace';

/**
 * Debug wrapper to detect render loops in TabbedWorkspace
 * This component tracks renders and effect executions to identify problematic patterns
 */
export const RenderLoopDebugger: React.FC = () => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const renderTimestampsRef = useRef<number[]>([]);
  const rapidRenderThreshold = 100; // milliseconds
  const maxRendersInWindow = 10;
  const timeWindow = 1000; // 1 second

  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    // Track render timestamps
    renderTimestampsRef.current.push(now);
    
    // Keep only timestamps within the time window
    const cutoffTime = now - timeWindow;
    renderTimestampsRef.current = renderTimestampsRef.current.filter(
      timestamp => timestamp > cutoffTime
    );
    
    // Check for rapid consecutive renders
    if (timeSinceLastRender < rapidRenderThreshold) {
      console.warn(
        `⚠️ RAPID RENDER DETECTED: Only ${timeSinceLastRender}ms since last render`,
        {
          renderCount: renderCountRef.current,
          timestamp: new Date().toISOString()
        }
      );
    }
    
    // Check for excessive renders within time window
    if (renderTimestampsRef.current.length > maxRendersInWindow) {
      console.error(
        `🚨 RENDER LOOP DETECTED: ${renderTimestampsRef.current.length} renders in ${timeWindow}ms`,
        {
          renderCount: renderCountRef.current,
          timestamps: renderTimestampsRef.current.map(t => new Date(t).toISOString())
        }
      );
    }
    
    lastRenderTimeRef.current = now;
    
    // Log normal renders in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `✅ TabbedWorkspace render #${renderCountRef.current}`,
        {
          timeSinceLastRender,
          rendersInWindow: renderTimestampsRef.current.length,
          timestamp: new Date().toISOString()
        }
      );
    }
  });
  
  // Test component with various prop changes
  const [userRole, setUserRole] = React.useState('guest');
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [tabChangeCount, setTabChangeCount] = React.useState(0);
  
  const handleTabChange = React.useCallback((tab: any) => {
    console.log('Tab changed:', tab);
    setTabChangeCount(prev => prev + 1);
  }, []);
  
  // Simulate prop changes after mount
  useEffect(() => {
    const timer1 = setTimeout(() => {
      console.log('📝 Changing user role to admin');
      setUserRole('admin');
    }, 1000);
    
    const timer2 = setTimeout(() => {
      console.log('📝 Updating permissions');
      setPermissions(['read', 'write', 'delete']);
    }, 2000);
    
    const timer3 = setTimeout(() => {
      console.log('📝 Adding more permissions');
      setPermissions(prev => [...prev, 'admin']);
    }, 3000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        <h2>Render Loop Debugger</h2>
        <p>Render Count: {renderCountRef.current}</p>
        <p>Tab Changes: {tabChangeCount}</p>
        <p>Current Role: {userRole}</p>
        <p>Permissions: {permissions.join(', ')}</p>
      </div>
      <div style={{ flex: 1 }}>
        <TabbedWorkspace
          userRole={userRole}
          userPermissions={permissions}
          onTabChange={handleTabChange}
          enableTabPersistence={true}
          maxTabs={10}
          theme="default"
        />
      </div>
    </div>
  );
};

export default RenderLoopDebugger;
