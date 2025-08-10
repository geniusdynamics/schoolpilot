// ABOUTME: Main entry point of the React application.
// ABOUTME: Initializes React DOM and renders the root App component with providers.

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n/i18n'; // Import your i18n configuration, this initializes i18next
import { initializeUnifiedConfig } from './config/unifiedConfig';

// Initialize unified configuration
initializeUnifiedConfig();

// Add global debug helpers
if (typeof window !== 'undefined') {
  (window as any).debugAuth = async () => {
    const { authService } = await import('./services/authService');
    return {
      initialized: authService.isInitialized(),
      authenticated: authService.isAuthenticated(),
      session: authService.getCurrentSession(),
      user: await authService.getCurrentUser()
    };
  };
  
  (window as any).testLogin = async (username: string = 'admin', password: string = 'admin123') => {
    const { authService } = await import('./services/authService');
    const result = await authService.login({ username, password });
    console.log('Login result:', result);
    if (result.success) {
      console.log('Login successful! Refreshing page...');
      setTimeout(() => location.reload(), 1000);
    }
    return result;
  };
  
  console.log('🎉 Debug helpers available:');
  console.log('  - window.debugAuth() - Check auth status');
  console.log('  - window.testLogin(username, password) - Test login');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] w-12 h-12 border-4 text-indigo-600" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Loading...
            </span>
          </div>
          <p className="mt-4 text-gray-600">Loading translations...</p>
        </div>
      </div>
    }>
      <App />
    </Suspense>
  </React.StrictMode>
);