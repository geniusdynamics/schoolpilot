// Enhanced main App component with backend integration
import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { EnhancedAppDataProvider, useAppData } from './contexts/EnhancedAppDataContext';
import { NetworkStatusIndicator, SyncStatusComponent } from './components/OfflineCapability';
import Spinner from './components/ui/Spinner';
import { APP_MODE } from './config';

// Lazy load components for better performance
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const TeachersPage = lazy(() => import('./pages/TeachersPage'));
const ClassesPage = lazy(() => import('./pages/ClassesPage'));
const SubjectsPage = lazy(() => import('./pages/SubjectsPage'));
const FeesPage = lazy(() => import('./pages/FeesPage'));
const ExamsPage = lazy(() => import('./pages/ExamsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Enhanced navigation with offline awareness
const EnhancedNavigation: React.FC = () => {
  const { isOnline, backendAvailable, dataSource, syncStatus } = useAppData();
  
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">SchoolPilot3</h1>
            </div>
            <div className="ml-4 text-sm text-gray-500">
              {APP_MODE === 'demo' && '(Demo Mode)'}
              {APP_MODE === 'production' && `(${dataSource})`}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <NetworkStatusIndicator showDetails={true} />
            
            {/* Sync indicator */}
            {syncStatus.state === 'syncing' && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Syncing...</span>
              </div>
            )}
            
            {syncStatus.state === 'error' && (
              <div className="flex items-center space-x-2 text-red-600">
                <span className="text-sm">Sync Error</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Enhanced sidebar with feature availability indicators
const EnhancedSidebar: React.FC = () => {
  const { disabledFeatures } = useAppData();
  
  const navigationItems = [
    { path: '/', label: 'Dashboard', feature: 'dashboard' },
    { path: '/students', label: 'Students', feature: 'student-management' },
    { path: '/teachers', label: 'Teachers', feature: 'teacher-management' },
    { path: '/classes', label: 'Classes', feature: 'class-management' },
    { path: '/subjects', label: 'Subjects', feature: 'subject-management' },
    { path: '/fees', label: 'Fees', feature: 'fee-management' },
    { path: '/exams', label: 'Exams', feature: 'exam-management' },
    { path: '/reports', label: 'Reports', feature: 'reports' },
    { path: '/settings', label: 'Settings', feature: 'settings' }
  ];
  
  return (
    <aside className="w-64 bg-gray-50 min-h-screen border-r">
      <div className="p-4">
        <nav className="space-y-2">
          {navigationItems.map(({ path, label, feature }) => {
            const isDisabled = disabledFeatures.includes(feature);
            
            return (
              <a
                key={path}
                href={path}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  isDisabled
                    ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
                onClick={isDisabled ? (e) => e.preventDefault() : undefined}
              >
                <div className="flex items-center justify-between">
                  <span>{label}</span>
                  {isDisabled && (
                    <span className="text-xs text-red-500">Offline</span>
                  )}
                </div>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

// Main app content with enhanced error boundaries
const AppContent: React.FC = () => {
  const { 
    isOnline, 
    backendAvailable, 
    syncStatus, 
    pendingSyncCount,
    dataSource 
  } = useAppData();
  
  // Show sync status in development mode
  const showSyncStatus = APP_MODE !== 'demo' && (
    syncStatus.state !== 'idle' || 
    pendingSyncCount > 0 || 
    !isOnline || 
    !backendAvailable
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      <EnhancedNavigation />
      
      <div className="flex">
        <EnhancedSidebar />
        
        <main className="flex-1 p-6">
          {/* Sync status panel */}
          {showSyncStatus && (
            <div className="mb-6">
              <SyncStatusComponent />
            </div>
          )}
          
          {/* Main content */}
          <Suspense 
            fallback={
              <div className="flex justify-center items-center h-64">
                <Spinner />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/teachers" element={<TeachersPage />} />
              <Route path="/classes" element={<ClassesPage />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/fees" element={<FeesPage />} />
              <Route path="/exams" element={<ExamsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      
      {/* Global notifications */}
      <GlobalNotifications />
    </div>
  );
};

// Global notification system
const GlobalNotifications: React.FC = () => {
  const { 
    isOnline, 
    backendAvailable, 
    syncStatus, 
    pendingSyncCount 
  } = useAppData();
  
  const [notifications, setNotifications] = React.useState<Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    persistent?: boolean;
  }>>([]);
  
  // Manage notifications based on app state
  useEffect(() => {
    const newNotifications: typeof notifications = [];
    
    // Offline notification
    if (!isOnline) {
      newNotifications.push({
        id: 'offline',
        type: 'warning',
        message: 'You are currently offline. Some features may be limited.',
        persistent: true
      });
    }
    
    // Backend unavailable notification
    if (isOnline && !backendAvailable) {
      newNotifications.push({
        id: 'backend-unavailable',
        type: 'info',
        message: 'Backend server is unavailable. Working with local data.',
        persistent: true
      });
    }
    
    // Sync error notification
    if (syncStatus.state === 'error') {
      newNotifications.push({
        id: 'sync-error',
        type: 'error',
        message: `Sync failed: ${syncStatus.lastError?.message || 'Unknown error'}`,
        persistent: false
      });
    }
    
    // Pending sync notification
    if (pendingSyncCount > 5) {
      newNotifications.push({
        id: 'pending-sync',
        type: 'info',
        message: `${pendingSyncCount} items waiting to sync`,
        persistent: false
      });
    }
    
    setNotifications(newNotifications);
  }, [isOnline, backendAvailable, syncStatus, pendingSyncCount]);
  
  // Auto-dismiss non-persistent notifications
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.persistent));
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [notifications]);
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {notifications.map(({ id, type, message, persistent }) => (
        <div
          key={id}
          className={`max-w-sm p-4 rounded-lg shadow-lg ${
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            type === 'warning' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium">{message}</p>
            {!persistent && (
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== id))}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Error boundary for the entire app
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Application Error
              </h1>
              <p className="text-gray-600 mb-4">
                Something went wrong. Please refresh the page to try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Refresh Page
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Main App component
const App: React.FC = () => {
  return (
    <AppErrorBoundary>
      <EnhancedAppDataProvider>
        <Router>
          <AppContent />
        </Router>
      </EnhancedAppDataProvider>
    </AppErrorBoundary>
  );
};

export default App;