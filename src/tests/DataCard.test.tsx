// ABOUTME: Tests for the DataCard component with metrics, fields, and data visualization
// ABOUTME: Covers data formatting, interactive states, and accessibility features

import React from 'react';

import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import DataCard from '@/components/ui/data/DataCard';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { screen } from '@testing-library/react';

// Mock the Card component
vi.mock('../components/ui/Card', () => ({
  default: React.forwardRef<HTMLDivElement, any>(({ children, interactive, loading, variant, size, className, ...props }, ref) => (
    <div 
      ref={ref} 
      data-testid="mock-card" 
      data-interactive={interactive}
      data-loading={loading}
      data-variant={variant}
      data-size={size}
      data-classname={className}
      {...props}
    >
      {children}
    </div>
  ))
}));

describe('DataCard Component', () => {
  describe('Basic Rendering', () => {
    it('renders with title and subtitle', () => {
      render(
        <DataCard
          title="Test Data Card"
          subtitle="Test Subtitle"
        >
          <p>Custom content</p>
        </DataCard>
      );

      expect(screen.getByText('Test Data Card')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
      expect(screen.getByText('Custom content')).toBeInTheDocument();
    });

    it('renders without title and subtitle', () => {
      render(
        <DataCard>
          <p>Content only</p>
        </DataCard>
      );

      expect(screen.getByText('Content only')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders with actions', () => {
      const actions = <button>Action Button</button>;
      
      render(
        <DataCard
          title="Card with Actions"
          actions={actions}
        >
          <p>Content</p>
        </DataCard>
      );

      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });
  });

  describe('Metric Display', () => {
    it('renders metric with basic information', () => {
      const metric = {
        label: 'Total Revenue',
        value: 125000,
        icon: <span data-testid="metric-icon">ðŸ’°</span>,
        color: 'green' as const
      };

      render(
        <DataCard metric={metric}>
          <p>Content</p>
        </DataCard>
      );

      expect(screen.getByText('125,000')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByTestId('metric-icon')).toBeInTheDocument();
    });

    it('renders metric with change indicator (increase)', () => {
      const metric = {
        label: 'Users',
        value: 1000,
        change: {
          value: 12.5,
          type: 'increase' as const,
          period: 'vs last month'
        }
      };

      render(<DataCard metric={metric} />);

      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('12.5%')).toBeInTheDocument();
      expect(screen.getByText('vs last month')).toBeInTheDocument();
      expect(screen.getByText('â†—')).toBeInTheDocument();
    });

    it('renders metric with change indicator (decrease)', () => {
      const metric = {
        label: 'Errors',
        value: 50,
        change: {
          value: 25,
          type: 'decrease' as const
        }
      };

      render(<DataCard metric={metric} />);

      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('â†˜')).toBeInTheDocument();
    });

    it('renders metric with change indicator (neutral)', () => {
      const metric = {
        label: 'Status',
        value: 100,
        change: {
          value: 0,
          type: 'neutral' as const
        }
      };

      render(<DataCard metric={metric} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('â†’')).toBeInTheDocument();
    });

    it('formats string values correctly', () => {
      const metric = {
        label: 'Status',
        value: 'Active'
      };

      render(<DataCard metric={metric} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Data Fields', () => {
    it('renders text fields', () => {
      const fields = [
        { label: 'Name', value: 'John Doe', type: 'text' as const },
        { label: 'Description', value: 'Test description' }
      ];

      render(<DataCard fields={fields} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('renders number fields with formatting', () => {
      const fields = [
        { label: 'Count', value: '1234', type: 'number' as const }
      ];

      render(<DataCard fields={fields} />);

      expect(screen.getByText('Count')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('renders currency fields with formatting', () => {
      const fields = [
        { label: 'Price', value: '99.99', type: 'currency' as const }
      ];

      render(<DataCard fields={fields} />);

      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('$99.99')).toBeInTheDocument();
    });

    it('renders percentage fields with formatting', () => {
      const fields = [
        { label: 'Growth', value: '15.5', type: 'percentage' as const }
      ];

      render(<DataCard fields={fields} />);

      expect(screen.getByText('Growth')).toBeInTheDocument();
      expect(screen.getByText('15.5%')).toBeInTheDocument();
    });

    it('renders date fields with formatting', () => {
      const testDate = '2023-12-25T00:00:00.000Z';
      const fields = [
        { label: 'Created', value: testDate, type: 'date' as const }
      ];

      render(<DataCard fields={fields} />);

      expect(screen.getByText('Created')).toBeInTheDocument();
      // Date formatting may vary by locale, so just check that it's formatted
      const dateElement = screen.getByText(/\d+\/\d+\/\d+/);
      expect(dateElement).toBeInTheDocument();
    });

    it('renders status fields with styling', () => {
      const fields = [
        { label: 'Status', value: 'Active', type: 'status' as const },
        { label: 'State', value: 'Inactive', type: 'status' as const },
        { label: 'Process', value: 'Pending', type: 'status' as const }
      ];

      render(<DataCard fields={fields} />);

      // Check for status badges
      const activeStatus = screen.getByText('Active');
      const inactiveStatus = screen.getByText('Inactive');
      const pendingStatus = screen.getByText('Pending');

      expect(activeStatus).toHaveClass('bg-green-100', 'text-green-800');
      expect(inactiveStatus).toHaveClass('bg-red-100', 'text-red-800');
      expect(pendingStatus).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('renders React element values', () => {
      const customElement = <span data-testid="custom-element">Custom Content</span>;
      const fields = [
        { label: 'Custom', value: customElement }
      ];

      render(<DataCard fields={fields} />);

      expect(screen.getByText('Custom')).toBeInTheDocument();
      expect(screen.getByTestId('custom-element')).toBeInTheDocument();
    });
  });

  describe('Metric Colors', () => {
    it('applies blue color (default)', () => {
      const metric = {
        label: 'Default',
        value: 100,
        color: 'blue' as const
      };

      render(<DataCard metric={metric} />);

      const valueElement = screen.getByText('100');
      expect(valueElement).toHaveClass('text-primary-600');
    });

    it('applies green color', () => {
      const metric = {
        label: 'Success',
        value: 100,
        color: 'green' as const
      };

      render(<DataCard metric={metric} />);

      const valueElement = screen.getByText('100');
      expect(valueElement).toHaveClass('text-green-600');
    });

    it('applies red color', () => {
      const metric = {
        label: 'Error',
        value: 100,
        color: 'red' as const
      };

      render(<DataCard metric={metric} />);

      const valueElement = screen.getByText('100');
      expect(valueElement).toHaveClass('text-red-600');
    });

    it('applies other colors', () => {
      const colors = ['yellow', 'purple', 'gray'] as const;
      
      colors.forEach(color => {
        const metric = {
          label: `${color} metric`,
          value: 100,
          color
        };

        const { unmount } = render(<DataCard metric={metric} />);
        
        const valueElement = screen.getByText('100');
        expect(valueElement).toHaveClass(`text-${color}-600`);
        
        unmount();
      });
    });
  });

  describe('Interactive Behavior', () => {
    it('handles click events', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <DataCard
          title="Clickable Card"
          onClick={handleClick}
        >
          <p>Content</p>
        </DataCard>
      );

      const card = screen.getByTestId('mock-card');
      await user.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('passes interactive prop to Card component', () => {
      render(
        <DataCard
          title="Interactive Card"
          onClick={() => {}}
        >
          <p>Content</p>
        </DataCard>
      );

      const card = screen.getByTestId('mock-card');
      expect(card).toHaveAttribute('data-interactive', 'true');
    });
  });

  describe('Loading State', () => {
    it('passes loading prop to Card component', () => {
      render(
        <DataCard
          title="Loading Card"
          loading={true}
        >
          <p>Content</p>
        </DataCard>
      );

      const card = screen.getByTestId('mock-card');
      expect(card).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Card Props Forwarding', () => {
    it('forwards variant prop', () => {
      render(
        <DataCard
          title="Elevated Card"
          variant="elevated"
        >
          <p>Content</p>
        </DataCard>
      );

      const card = screen.getByTestId('mock-card');
      expect(card).toHaveAttribute('data-variant', 'elevated');
    });

    it('forwards size prop', () => {
      render(
        <DataCard
          title="Large Card"
          size="lg"
        >
          <p>Content</p>
        </DataCard>
      );

      const card = screen.getByTestId('mock-card');
      expect(card).toHaveAttribute('data-size', 'lg');
    });

    it('forwards className prop', () => {
      render(
        <DataCard
          title="Custom Card"
          className="custom-class"
        >
          <p>Content</p>
        </DataCard>
      );

      const card = screen.getByTestId('mock-card');
      expect(card).toHaveAttribute('data-classname', 'custom-class');
    });
  });

  describe('Content Layout', () => {
    it('renders metric and fields together', () => {
      const metric = {
        label: 'Revenue',
        value: 1000
      };

      const fields = [
        { label: 'Orders', value: '50', type: 'number' as const }
      ];

      render(
        <DataCard
          title="Combined Data"
          metric={metric}
          fields={fields}
        />
      );

      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('renders custom children with other content', () => {
      const metric = {
        label: 'Users',
        value: 500
      };

      render(
        <DataCard
          title="Mixed Content"
          metric={metric}
        >
          <div data-testid="custom-content">
            Custom child content
          </div>
        </DataCard>
      );

      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('applies proper spacing between sections', () => {
      const metric = {
        label: 'Metric',
        value: 100
      };

      const fields = [
        { label: 'Field', value: 'Value' }
      ];

      render(
        <DataCard
          metric={metric}
          fields={fields}
        >
          <p>Children content</p>
        </DataCard>
      );

      // Check that metric section has bottom margin
      const metricSection = screen.getByText('100').closest('.mb-6');
      expect(metricSection).toBeInTheDocument();

      // Check that children section has top margin when fields exist
      const childrenSection = screen.getByText('Children content').closest('.mt-6');
      expect(childrenSection).toBeInTheDocument();
    });
  });
});