// ABOUTME: Main entry point of the React application.
// ABOUTME: Initializes React DOM and renders the root App component with providers.

import React, { Suspense } from 'react'; 
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Import Tailwind CSS
import './i18n/i18n'; // Import your i18n configuration, this initializes i18next

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading translations...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);