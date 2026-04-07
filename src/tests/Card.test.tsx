// ABOUTME: Comprehensive tests for the enhanced Card component
// ABOUTME: Tests variants, interactions, accessibility, and responsive behavior

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Card from '@/components/ui/Card';

import { vi } from 'vitest';

// Mock the animation utilities
vi.mock('../utils/animations', () => ({
  useTransition: vi.fn(() => ({})),
}));

vi.mock('../utils/accessibility', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('Card Component', () => {
  describe('Basic Rendering', () => {
    it('renders with basic props', () => {
      render(
        <Card title="Test Card">
          <p>Card content</p>
        </Card>
      );

      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('renders without title', () => {
      render(
        <Card>
          <p>Card content only</p>
        </Card>
      );

      expect(screen.getByText('Card content only')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders with icon and actions', () => {
      const mockAction = <button>Action</button>;
      const mockIcon = <span data-testid="card-icon">🎯</span>;

      render(
        <Card title="Test Card" icon={mockIcon} actions={mockAction}>
          <p>Card content</p>
        </Card>
      );

      expect(screen.getByTestId('card-icon')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies default variant styles', () => {
      const { container } = render(
        <Card variant="default">
          <p>Default card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-white', 'border', 'shadow-lg');
    });

    it('applies elevated variant styles', () => {
      const { container } = render(
        <Card variant="elevated">
          <p>Elevated card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('shadow-lg', 'hover:shadow-xl');
    });

    it('applies interactive variant styles', () => {
      const { container } = render(
        <Card variant="interactive">
          <p>Interactive card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('cursor-pointer', 'hover:shadow-lg');
    });

    it('applies outlined variant styles', () => {
      const { container } = render(
        <Card variant="outlined">
          <p>Outlined card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-gray-300', 'shadow-none');
    });

    it('applies filled variant styles', () => {
      const { container } = render(
        <Card variant="filled">
          <p>Filled card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-gray-50', 'shadow-sm');
    });

    it('applies compact variant styles', () => {
      const { container } = render(
        <Card variant="compact">
          <p>Compact card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('shadow-sm', 'hover:shadow-md');
    });
  });

  describe('Sizes', () => {
    it('applies small size styles', () => {
      const { container } = render(
        <Card size="sm" title="Small Card">
          <p>Small card content</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-lg');
    });

    it('applies medium size styles (default)', () => {
      const { container } = render(
        <Card size="md" title="Medium Card">
          <p>Medium card content</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-xl');
    });

    it('applies large size styles', () => {
      const { container } = render(
        <Card size="lg" title="Large Card">
          <p>Large card content</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-2xl');
    });

    it('applies extra large size styles', () => {
      const { container } = render(
        <Card size="xl" title="XL Card">
          <p>XL card content</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-3xl');
    });
  });

  describe('Interactive Behavior', () => {
    it('handles click events', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Card onClick={handleClick} interactive>
          <p>Clickable card</p>
        </Card>
      );

      const card = screen.getByRole('button');
      await user.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard events (Enter)', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Card onClick={handleClick} interactive>
          <p>Keyboard accessible card</p>
        </Card>
      );

      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard events (Space)', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Card onClick={handleClick} interactive>
          <p>Keyboard accessible card</p>
        </Card>
      );

      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard(' ');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not handle clicks when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      const { container } = render(
        <Card onClick={handleClick} disabled interactive>
          <p>Disabled card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      await user.click(card);

      expect(handleClick).not.toHaveBeenCalled();
      expect(card).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not handle clicks when loading', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      const { container } = render(
        <Card onClick={handleClick} loading interactive>
          <p>Loading card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      await user.click(card);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading overlay when loading', () => {
      render(
        <Card loading>
          <p>Card content</p>
        </Card>
      );

      const loadingOverlay = document.querySelector('.absolute.inset-0');
      expect(loadingOverlay).toBeInTheDocument();
      expect(loadingOverlay).toHaveClass('z-10');
    });

    it('hides content behind loading overlay', () => {
      render(
        <Card loading>
          <p>Hidden content</p>
        </Card>
      );

      const loadingOverlay = document.querySelector('.absolute.inset-0');
      expect(loadingOverlay).toBeInTheDocument();
      expect(loadingOverlay).toHaveClass('z-10');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for interactive cards', () => {
      render(
        <Card onClick={() => {}} interactive aria-label="Interactive card">
          <p>Interactive content</p>
        </Card>
      );

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', 'Interactive card');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('has proper ARIA attributes for disabled cards', () => {
      const { container } = render(
        <Card onClick={() => {}} disabled interactive>
          <p>Disabled content</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('aria-disabled', 'true');
      expect(card).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('does not have button role for non-interactive cards', () => {
      render(
        <Card>
          <p>Static content</p>
        </Card>
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('supports custom role attribute', () => {
      render(
        <Card role="region" aria-label="Custom region">
          <p>Region content</p>
        </Card>
      );

      expect(screen.getByRole('region')).toBeInTheDocument();
      expect(screen.getByLabelText('Custom region')).toBeInTheDocument();
    });

    it('has proper focus indicators', () => {
      const { container } = render(
        <Card onClick={() => {}} interactive>
          <p>Focusable card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Custom Classes and Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Card className="custom-class">
          <p>Custom styled card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-class');
    });

    it('applies custom bodyClassName', () => {
      render(
        <Card bodyClassName="custom-body-class">
          <p>Custom body content</p>
        </Card>
      );

      const bodyElement = document.querySelector('.custom-body-class');
      expect(bodyElement).toBeInTheDocument();
    });

    it('applies custom headerClassName', () => {
      render(
        <Card title="Test" headerClassName="custom-header-class">
          <p>Content</p>
        </Card>
      );

      const headerElement = document.querySelector('.custom-header-class');
      expect(headerElement).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('applies responsive padding classes', () => {
      const { container } = render(
        <Card title="Responsive Card">
          <p>Responsive content</p>
        </Card>
      );

      // Check for responsive padding classes - the Card component uses different class structure
      // Header uses: px-4 py-3 sm:px-6 (from getSizeStyles)
      // Body uses: px-4 py-3 sm:p-6 (from getSizeStyles)
      const headerElement = container.querySelector('[class*="px-4"][class*="py-3"][class*="sm:px-6"]');
      const bodyElement = container.querySelector('[class*="px-4"][class*="py-3"][class*="sm:p-6"]');
      
      expect(headerElement).toBeInTheDocument();
      expect(bodyElement).toBeInTheDocument();
    });
  });

  describe('Group Hover Effects', () => {
    it('applies group class for hover effects', () => {
      const { container } = render(
        <Card>
          <p>Group hover card</p>
        </Card>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('group');
    });
  });

  describe('Forward Ref', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      
      render(
        <Card ref={ref}>
          <p>Ref forwarded card</p>
        </Card>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Custom Props', () => {
    it('passes through additional HTML attributes', () => {
      render(
        <Card data-testid="custom-card" id="card-id">
          <p>Custom props card</p>
        </Card>
      );

      const card = screen.getByTestId('custom-card');
      expect(card).toHaveAttribute('id', 'card-id');
    });

    it('handles custom onKeyDown handler', async () => {
      const handleKeyDown = vi.fn();
      const user = userEvent.setup();

      render(
        <Card onKeyDown={handleKeyDown} interactive>
          <p>Custom keydown card</p>
        </Card>
      );

      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Tab}');

      expect(handleKeyDown).toHaveBeenCalled();
    });
  });
});