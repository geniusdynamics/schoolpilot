// ABOUTME: Demo component showcasing toast notification system functionality
// ABOUTME: Demonstrates all toast variants, progress toasts, and stacking behavior

import React, { useState } from 'react';
import { Button } from '../ui';
import { useToast, useToastHelpers, useProgressToast, ToastProvider } from '../../hooks/useToast';

const ToastDemoContent: React.FC = () => {
  const { showToast, clearAllToasts } = useToast();
  const { showSuccess, showError, showWarning, showInfo } = useToastHelpers();
  const { startProgress } = useProgressToast();
  const [progressDemo, setProgressDemo] = useState<any>(null);

  const handleBasicToasts = () => {
    showSuccess('Operation completed successfully!');
    setTimeout(() => showInfo('This is an informational message'), 500);
    setTimeout(() => showWarning('Please review your settings'), 1000);
    setTimeout(() => showError('Something went wrong'), 1500);
  };

  const handleToastWithAction = () => {
    showError('Failed to save changes', {
      title: 'Save Error',
      action: {
        label: 'Retry',
        onClick: () => showSuccess('Retry successful!'),
      },
      duration: 0, // Don't auto-dismiss
    });
  };

  const handleProgressToast = () => {
    const progress = startProgress('Processing your request...', {
      title: 'File Upload',
    });

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      progress.updateProgress(currentProgress, `Processing... ${currentProgress}%`);

      if (currentProgress >= 100) {
        clearInterval(interval);
        progress.completeProgress('Upload completed successfully!');
      }
    }, 500);

    setProgressDemo({ progress, interval });
  };

  const handleFailedProgress = () => {
    const progress = startProgress('Attempting to connect...', {
      title: 'Network Operation',
    });

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 15;
      progress.updateProgress(currentProgress);

      if (currentProgress >= 60) {
        clearInterval(interval);
        progress.failProgress('Connection failed. Please try again.');
      }
    }, 300);
  };

  const handleCustomToast = () => {
    showToast({
      title: 'Custom Toast',
      message: 'This toast has custom duration and progress bar',
      variant: 'info',
      duration: 8000,
      showProgress: true,
      action: {
        label: 'Learn More',
        onClick: () => showInfo('You clicked the action button!'),
      },
    });
  };

  const handleStressTest = () => {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const variants = ['success', 'error', 'warning', 'info'] as const;
        const variant = variants[i % variants.length];
        showToast({
          message: `Toast ${i + 1} - Testing stacking behavior`,
          variant,
          title: `Test ${i + 1}`,
        });
      }, i * 200);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Toast Notification System</h1>
        <p className="text-gray-600">
          Comprehensive toast notification system with multiple variants, progress indicators, and accessibility features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Basic Toasts</h3>
          <Button onClick={() => showSuccess('Success message!')} variant="success" size="sm" className="w-full">
            Success Toast
          </Button>
          <Button onClick={() => showError('Error message!')} variant="danger" size="sm" className="w-full">
            Error Toast
          </Button>
          <Button onClick={() => showWarning('Warning message!')} variant="warning" size="sm" className="w-full">
            Warning Toast
          </Button>
          <Button onClick={() => showInfo('Info message!')} variant="secondary" size="sm" className="w-full">
            Info Toast
          </Button>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Advanced Features</h3>
          <Button onClick={handleToastWithAction} variant="outline" size="sm" className="w-full">
            Toast with Action
          </Button>
          <Button onClick={handleProgressToast} variant="primary" size="sm" className="w-full">
            Progress Toast
          </Button>
          <Button onClick={handleFailedProgress} variant="outline" size="sm" className="w-full">
            Failed Progress
          </Button>
          <Button onClick={handleCustomToast} variant="secondary" size="sm" className="w-full">
            Custom Duration
          </Button>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Testing</h3>
          <Button onClick={handleBasicToasts} variant="outline" size="sm" className="w-full">
            Multiple Toasts
          </Button>
          <Button onClick={handleStressTest} variant="outline" size="sm" className="w-full">
            Stress Test (8 toasts)
          </Button>
          <Button onClick={clearAllToasts} variant="danger" size="sm" className="w-full">
            Clear All Toasts
          </Button>
          {progressDemo && (
            <Button 
              onClick={() => {
                clearInterval(progressDemo.interval);
                progressDemo.progress.cancelProgress();
                setProgressDemo(null);
              }} 
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              Cancel Progress
            </Button>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Features Demonstrated</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <ul className="space-y-2">
            <li>✅ Multiple toast variants (success, error, warning, info, progress)</li>
            <li>✅ Auto-dismiss with configurable timing</li>
            <li>✅ Progress indicators for long-running operations</li>
            <li>✅ Toast stacking with proper spacing</li>
          </ul>
          <ul className="space-y-2">
            <li>✅ Screen reader announcements (aria-live)</li>
            <li>✅ Action buttons with custom handlers</li>
            <li>✅ Manual dismiss functionality</li>
            <li>✅ Smooth entrance and exit animations</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Accessibility Features</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Screen reader announcements with appropriate aria-live regions</li>
          <li>• Keyboard navigation support for dismiss and action buttons</li>
          <li>• High contrast colors for all variants</li>
          <li>• Focus management and visual indicators</li>
          <li>• Semantic HTML structure with proper ARIA attributes</li>
        </ul>
      </div>
    </div>
  );
};

const ToastDemo: React.FC = () => {
  return (
    <ToastProvider maxToasts={6} position="top-right">
      <ToastDemoContent />
    </ToastProvider>
  );
};

export default ToastDemo;