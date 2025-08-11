// ABOUTME: Comprehensive tests for useToast hook and ToastProvider functionality
// ABOUTME: Tests toast management, stacking, progress operations, and helper functions

import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useToast, ToastProvider, useToastHelpers, useProgressToast } from '../hooks/useToast';

// Test component that uses the toast hook
const TestComponent: React.FC = () => {
  const { toasts, showToast, dismissToast, clearAllToasts, updateToast } = useToast();
  const { showSuccess, showError, showWarning, showInfo } = useToastHelpers();
  const { startProgress } = useProgressToast();

  return (
    <div>
      <div data-testid="toast-count">{toasts.length}</div>
      <button onClick={() => showToast({ message: 'Test toast' })}>
        Show Toast
      </button>
      <button onClick={() => showSuccess('Success!')}>
        Show Success
      </button>
      <button onClick={() => showError('Error!')}>
        Show Error
      </button>
      <button onClick={() => showWarning('Warning!')}>
        Show Warning
      </button>
      <button onClick={() => showInfo('Info!')}>
        Show Info
      </button>
      <button onClick={() => {
        const progress = startProgress('Processing...');
        setTimeout(() => progress.updateProgress(50), 100);
        setTimeout(() => progress.completeProgress('Done!'), 200);
      }}>
        Show Progress
      </button>
      <button onClick={clearAllToasts}>
        Clear All
      </button>
      <button onClick={() => {
        if (toasts.length > 0) {
          updateToast(toasts[0].id, { message: 'Updated message' });
        }
      }}>
        Update First Toast
      </button>
      <button onClick={() => {
        if (toasts.length > 0) {
          dismissToast(toasts[0].id);
        }
      }}>
        Dismiss First Toast
      </button>
    </div>
  );
};

const renderWithProvider = (maxToasts = 5, position = 'top-right' as const) => {
  return render(
    <ToastProvider maxToasts={maxToasts} position={position}>
      <TestComponent />
    </ToastProvider>
  );
};

describe('useToast Hook', () => {
  afterEach(() => {
    // Properly cleanup React components and DOM
    cleanup();
  });

  it('throws error when used outside ToastProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  it('shows and manages basic toasts', async () => {
    renderWithProvider();

    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('Show Toast'));
    
    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(screen.getByText('Test toast')).toBeInTheDocument();
    });
  });

  it('shows different toast variants using helper functions', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Warning'));
    fireEvent.click(screen.getByText('Show Info'));

    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('4');
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Warning!')).toBeInTheDocument();
      expect(screen.getByText('Info!')).toBeInTheDocument();
    });
  });

  it('limits number of toasts based on maxToasts prop', async () => {
    renderWithProvider(2); // Limit to 2 toasts

    // Add 3 toasts
    fireEvent.click(screen.getByText('Show Toast'));
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));

    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
      // Should only show the 2 most recent toasts
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.queryByText('Test toast')).not.toBeInTheDocument();
    });
  });

  it('dismisses individual toasts', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Toast'));
    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
    });

    fireEvent.click(screen.getByText('Dismiss First Toast'));

    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });
  });

  it('clears all toasts', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Toast'));
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));

    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
    });

    fireEvent.click(screen.getByText('Clear All'));

    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  it('updates existing toasts', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Toast'));

    await waitFor(() => {
      expect(screen.getByText('Test toast')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update First Toast'));

    await waitFor(() => {
      expect(screen.getByText('Updated message')).toBeInTheDocument();
      expect(screen.queryByText('Test toast')).not.toBeInTheDocument();
    });
  });

  it('handles progress toasts', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Progress'));

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Wait for the progress updates to complete
    await waitFor(() => {
      expect(screen.getByText('Done!')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows toast with dismiss functionality', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    // Test manual dismiss
    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('renders toasts in portal', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Toast'));

    // Toast should be rendered in document.body, not in the component tree
    const toast = document.body.querySelector('[role="alert"]');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent('Test toast');
  });

  it('applies correct positioning classes', () => {
    const { rerender } = render(
      <ToastProvider position="top-right">
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));

    let container = document.body.querySelector('.fixed');
    expect(container).toHaveClass('top-4', 'right-4');

    rerender(
      <ToastProvider position="bottom-left">
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    container = document.body.querySelector('.fixed');
    expect(container).toHaveClass('bottom-4', 'left-4', 'flex-col-reverse');
  });

  it('stacks multiple toasts correctly', async () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Show Toast'));
    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      const toastElements = document.body.querySelectorAll('[role="alert"]');
      expect(toastElements).toHaveLength(2);
      expect(screen.getByText('Test toast')).toBeInTheDocument();
      expect(screen.getByText('Success!')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});

describe('useProgressToast Hook', () => {
  const ProgressTestComponent: React.FC = () => {
    const { startProgress } = useProgressToast();
    const [progressController, setProgressController] = React.useState<any>(null);

    const handleStartProgress = () => {
      const controller = startProgress('Starting operation...');
      setProgressController(controller);
    };

    const handleUpdateProgress = () => {
      if (progressController) {
        progressController.updateProgress(75, 'Almost done...');
      }
    };

    const handleCompleteProgress = () => {
      if (progressController) {
        progressController.completeProgress('Operation completed!');
        setProgressController(null);
      }
    };

    const handleFailProgress = () => {
      if (progressController) {
        progressController.failProgress('Operation failed!');
        setProgressController(null);
      }
    };

    const handleCancelProgress = () => {
      if (progressController) {
        progressController.cancelProgress();
        setProgressController(null);
      }
    };

    return (
      <div>
        <button onClick={handleStartProgress}>Start Progress</button>
        <button onClick={handleUpdateProgress}>Update Progress</button>
        <button onClick={handleCompleteProgress}>Complete Progress</button>
        <button onClick={handleFailProgress}>Fail Progress</button>
        <button onClick={handleCancelProgress}>Cancel Progress</button>
      </div>
    );
  };

  it('manages progress toast lifecycle', async () => {
    render(
      <ToastProvider>
        <ProgressTestComponent />
      </ToastProvider>
    );

    // Start progress
    fireEvent.click(screen.getByText('Start Progress'));
    await waitFor(() => {
      expect(screen.getByText('Starting operation...')).toBeInTheDocument();
    });

    // Update progress
    fireEvent.click(screen.getByText('Update Progress'));
    await waitFor(() => {
      expect(screen.getByText('Almost done...')).toBeInTheDocument();
    });

    // Complete progress
    fireEvent.click(screen.getByText('Complete Progress'));
    await waitFor(() => {
      expect(screen.getByText('Operation completed!')).toBeInTheDocument();
    });
  });

  it('handles failed progress', async () => {
    render(
      <ToastProvider>
        <ProgressTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Start Progress'));
    await waitFor(() => {
      expect(screen.getByText('Starting operation...')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Fail Progress'));
    await waitFor(() => {
      expect(screen.getByText('Operation failed!')).toBeInTheDocument();
    });
  });

  it('handles cancelled progress', async () => {
    render(
      <ToastProvider>
        <ProgressTestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Start Progress'));
    await waitFor(() => {
      expect(screen.getByText('Starting operation...')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel Progress'));
    await waitFor(() => {
      expect(screen.queryByText('Starting operation...')).not.toBeInTheDocument();
    });
  });
});