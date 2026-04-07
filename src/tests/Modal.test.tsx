// ABOUTME: Tests for the enhanced Modal component
// ABOUTME: Testing basic functionality, keyboard navigation, and accessibility

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Modal from '@/components/ui/Modal';

// Mock the hooks
vi.mock('../utils/responsive', () => ({
  useBreakpoint: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  }),
}));

vi.mock('../utils/accessibility', () => ({
  useReducedMotion: () => false,
}));

// Mock ReactDOM.createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    document.body.style.overflow = 'unset';
  });

  describe('Basic Functionality', () => {
    it('renders modal when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close modal');
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('prevents body scroll when modal is open', () => {
      render(<Modal {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes modal when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close modal when Escape key is pressed and closeOnEscape is false', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} closeOnEscape={false} />);
      
      await user.keyboard('{Escape}');
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('does not close modal when preventClose is true', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} preventClose={true} />);
      
      await user.keyboard('{Escape}');
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Modal Sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl', 'full'] as const;

    sizes.forEach((size) => {
      it(`renders with ${size} size`, () => {
        render(<Modal {...defaultProps} size={size} />);
        
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
      });
    });
  });

  describe('Modal Variants', () => {
    it('renders default variant correctly', () => {
      render(<Modal {...defaultProps} variant="default" />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('rounded-lg');
    });

    it('renders drawer variant correctly', () => {
      render(<Modal {...defaultProps} variant="drawer" />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('fixed', 'right-0', 'top-0', 'h-full');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading is true', () => {
      render(<Modal {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('disables close button when loading', () => {
      render(<Modal {...defaultProps} loading={true} />);
      
      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeDisabled();
    });

    it('shows children when not loading', () => {
      render(<Modal {...defaultProps} loading={false} />);
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('renders footer when provided', () => {
      const footer = <button>Footer Button</button>;
      render(<Modal {...defaultProps} footer={footer} />);
      
      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });

    it('does not render footer when not provided', () => {
      render(<Modal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal.querySelector('.bg-gray-50')).not.toBeInTheDocument();
    });
  });

  describe('Close Button Visibility', () => {
    it('shows close button by default', () => {
      render(<Modal {...defaultProps} />);
      
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);
      
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('hides close button when preventClose is true', () => {
      render(<Modal {...defaultProps} preventClose={true} />);
      
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Modal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('has proper heading structure', () => {
      render(<Modal {...defaultProps} />);
      
      const title = screen.getByText('Test Modal');
      expect(title).toHaveAttribute('id', 'modal-title');
      expect(title.tagName).toBe('H2');
    });
  });
});