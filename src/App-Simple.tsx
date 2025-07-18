// ABOUTME: Simplified application entry point to resolve loading issues
// ABOUTME: Minimal implementation to get to login screen and dashboard

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import Spinner from './components/ui/Spinner';
import ApplicationErrorBoundary from './components/ApplicationErrorBoundary';

// Lazy load essential pages
const LoginPage = lazy(() => import('./modules/core/pages/LoginPage'));
const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage'));

// Simple loading fallback
const LoadingFallback = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <Spinner size="lg" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  </div>
);

// Simple app content without complex module loading
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingFallback message="Checking authentication..." />;
  }

  // If not authenticated, show login
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingFallback message="Loading login..." />}>
        <LoginPage />
      </Suspense>
    );
  }

  // If authenticated, show dashboard
  return (
    <Suspense fallback={<LoadingFallback message="Loading dashboard..." />}>
      <DashboardPage />
    </Suspense>
  );
};

// Simple routing
const SimpleRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<AppContent />} />
      <Route path="/dashboard" element={<AppContent />} />
      <Route path="*" element={<AppContent />} />
    </Routes>
  );
};

// Main simplified App component
const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simple initialization with short delay
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <LoadingFallback message="Initializing application..." />;
  }

  return (
    <ApplicationErrorBoundary maxRetries={3}>
      <HashRouter>
        <AuthProvider>
          <UserProvider>
            <SimpleRoutes />
          </UserProvider>
        </AuthProvider>
      </HashRouter>
    </ApplicationErrorBoundary>
  );
};

export default App;