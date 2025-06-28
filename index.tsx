
import React from 'react'; // Explicit import for non-build environments
import ReactDOM from 'react-dom/client';
import App from './src/App'; // Ensure this path is correct relative to where your `index.html` will load this `index.tsx`

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
