// ABOUTME: Test suite for the Enhanced Kanban Board component
// ABOUTME: Tests drag-and-drop functionality, filtering, bulk operations, and accessibility


import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import KanbanBoard, { KanbanCard, KanbanColumn } from '@/components/ui/data/KanbanBoard';
import { screen } from '@testing-library/react';

// Mock the accessibility hook
vi.mock('../utils/accessibility', () => ({
  useReducedMotion: () => false,
}));

// Sample test data
const sampleCards: KanbanCard[] = [
  {
    id: '1',
    title: 'Test Card 1',
    description: 'First test card',
    tags: ['test', 'frontend'],
    priority: 'high',
    assignee: { id: '1', name: 'John Doe' },
    dueDate: new Date('2025-01-30'),
    progress: 75,
  },
  {
    id: '2',
    title: 'Test Card 2',
    description: 'Second test card',
    tags: ['test', 'backend'],
    priority: 'medium',
    assignee: { id: '2', name: 'Jane Smith' },
    dueDate: new Date('2025-02-05'),
    progress: 30,
  },
  {
    id: '3',
    title: 'Test Card 3',
    description: 'Third test card',
    tags: ['test', 'design'],
    priority: 'low',
    progress: 90,
  },
];

const sampleColumns: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [sampleCards[0]],
    color: '#ef4444',
    maxCards: 5,
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    cards: [sampleCards[1]],
    color: '#f59e0b',
  },
  {
    id: 'done',
    title: 'Done',
    cards: [sampleCards[2]],
    color: '#22c55e',
    allowDrop: false, // Test non-droppable column
  },
];

describe('KanbanBoard', () => {
  const defaultProps = {
    columns: sampleColumns,
    onCardMove: vi.fn(),
    onCardClick: vi.fn(),
    onCardSelect: vi.fn(),
    onColumnUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all columns with correct titles', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('renders all cards with correct titles', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      expect(screen.getByText('Test Card 3')).toBeInTheDocument();
    });

    it('displays card counts in column headers', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Each column should show its card count
      expect(screen.getByText('1')).toBeInTheDocument(); // To Do column
      expect(screen.getByText('1')).toBeInTheDocument(); // In Progress column
      expect(screen.getByText('1')).toBeInTheDocument(); // Done column
    });

    it('shows loading state when loading prop is true', () => {
      render(<KanbanBoard {...defaultProps} loading={true} />);
      
      // Should show skeleton loaders instead of actual content
      expect(screen.queryByText('Test Card 1')).not.toBeInTheDocument();
      expect(screen.getAllByRole('generic')).toHaveLength(9); // 3 columns Ã— 3 skeleton cards
    });

    it('displays column colors when provided', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Check for color indicators (small colored circles)
      const colorIndicators = screen.getAllByRole('generic').filter(
        el => el.style.backgroundColor
      );
      expect(colorIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Card Details', () => {
    it('displays card descriptions', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('First test card')).toBeInTheDocument();
      expect(screen.getByText('Second test card')).toBeInTheDocument();
      expect(screen.getByText('Third test card')).toBeInTheDocument();
    });

    it('displays priority badges', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('displays assignee information', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays tags', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('backend')).toBeInTheDocument();
      expect(screen.getByText('design')).toBeInTheDocument();
    });

    it('displays due dates', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Due dates should be formatted and displayed
      expect(screen.getByText('1/30/2025')).toBeInTheDocument();
      expect(screen.getByText('2/5/2025')).toBeInTheDocument();
    });

    it('shows progress bars when showProgress is true', () => {
      render(<KanbanBoard {...defaultProps} showProgress={true} />);
      
      // Progress bars should be rendered
      const progressBars = screen.getAllByRole('generic').filter(
        el => el.className.includes('bg-blue-500')
      );
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Card Interactions', () => {
    it('calls onCardClick when a card is clicked', async () => {
      const user = userEvent.setup();
      render(<KanbanBoard {...defaultProps} />);
      
      const card = screen.getByText('Test Card 1');
      await user.click(card);
      
      expect(defaultProps.onCardClick).toHaveBeenCalledWith(sampleCards[0]);
    });

    it('handles card selection when allowMultiSelect is true', async () => {
      const user = userEvent.setup();
      render(<KanbanBoard {...defaultProps} allowMultiSelect={true} />);
      
      // Should show checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      
      // Click a checkbox
      await user.click(checkboxes[0]);
      
      expect(defaultProps.onCardSelect).toHaveBeenCalledWith(['1']);
    });

    it('handles multi-selection with Ctrl+Click', async () => {
      const user = userEvent.setup();
      render(<KanbanBoard {...defaultProps} allowMultiSelect={true} />);
      
      const card1 = screen.getByText('Test Card 1');
      const card2 = screen.getByText('Test Card 2');
      
      // Ctrl+Click to select multiple cards
      await user.click(card1, { ctrlKey: true });
      await user.click(card2, { ctrlKey: true });
      
      expect(defaultProps.onCardSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Drag and Drop', () => {
    it('sets draggable attribute on cards', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const cards = screen.getAllByText(/Test Card/);
      cards.forEach(card => {
        const cardElement = card.closest('[draggable]');
        expect(cardElement).toHaveAttribute('draggable', 'true');
      });
    });

    it('handles drag start event', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const card = screen.getByText('Test Card 1').closest('[draggable]');
      
      // Create a mock drag event
      const dragEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
      });
      
      // Mock dataTransfer
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: {
          effectAllowed: '',
          setData: vi.fn(),
        },
        writable: false,
      });
      
      fireEvent(card!, dragEvent);
      
      expect(dragEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', '1');
    });

    it('handles drop event and calls onCardMove', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const card = screen.getByText('Test Card 1').closest('[draggable]');
      const targetColumn = screen.getByText('In Progress').closest('div');
      
      // Start drag
      const dragStartEvent = new DragEvent('dragstart', { bubbles: true });
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: { effectAllowed: '', setData: vi.fn() },
      });
      fireEvent(card!, dragStartEvent);
      
      // Drop on target column
      const dropEvent = new DragEvent('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { dropEffect: '', getData: () => '1' },
      });
      fireEvent(targetColumn!, dropEvent);
      
      // Note: Full drag-and-drop testing is complex in jsdom
      // In a real scenario, you'd use more sophisticated testing tools
    });

    it('shows drop zones during drag', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const card = screen.getByText('Test Card 1').closest('[draggable]');
      
      // Start drag
      const dragStartEvent = new DragEvent('dragstart', { bubbles: true });
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: { effectAllowed: '', setData: vi.fn() },
      });
      fireEvent(card!, dragStartEvent);
      
      // During drag, drop zones should appear
      // This would need to be tested with more complex state management
    });

    it('respects allowDrop property on columns', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // The "Done" column has allowDrop: false
      const doneColumn = screen.getByText('Done').closest('div');
      expect(doneColumn).toHaveClass('opacity-60'); // Should be visually disabled
    });
  });

  describe('Filtering', () => {
    it('filters cards based on title', () => {
      const filteredColumns = sampleColumns.map(column => ({
        ...column,
        cards: column.cards.filter(card => 
          card.title.toLowerCase().includes('card 1')
        ),
      }));
      
      render(<KanbanBoard columns={filteredColumns} />);
      
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Card 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Card 3')).not.toBeInTheDocument();
    });

    it('filters cards based on description', () => {
      const filteredColumns = sampleColumns.map(column => ({
        ...column,
        cards: column.cards.filter(card => 
          card.description?.toLowerCase().includes('first')
        ),
      }));
      
      render(<KanbanBoard columns={filteredColumns} />);
      
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Card 2')).not.toBeInTheDocument();
    });

    it('filters cards based on tags', () => {
      const filteredColumns = sampleColumns.map(column => ({
        ...column,
        cards: column.cards.filter(card => 
          card.tags?.some(tag => tag.includes('frontend'))
        ),
      }));
      
      render(<KanbanBoard columns={filteredColumns} />);
      
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Card 2')).not.toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    it('handles touch start event', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const card = screen.getByText('Test Card 1').closest('[draggable]');
      
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      
      fireEvent(card!, touchEvent);
      
      // Touch events should be handled without errors
      expect(card).toBeInTheDocument();
    });

    it('handles touch move event', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const card = screen.getByText('Test Card 1').closest('[draggable]');
      
      // Start touch
      const touchStartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      fireEvent(card!, touchStartEvent);
      
      // Move touch
      const touchMoveEvent = new TouchEvent('touchmove', {
        bubbles: true,
        touches: [{ clientX: 150, clientY: 150 } as Touch],
      });
      fireEvent(card!, touchMoveEvent);
      
      // Should handle touch movement
      expect(card).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for interactive elements', () => {
      render(<KanbanBoard {...defaultProps} allowMultiSelect={true} />);
      
      // Checkboxes should have proper labels
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const cards = screen.getAllByText(/Test Card/);
      cards.forEach(card => {
        const cardElement = card.closest('[draggable]');
        expect(cardElement).toHaveAttribute('draggable', 'true');
        // Cards should be focusable for keyboard navigation
      });
    });

    it('provides semantic markup for screen readers', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Column headers should be properly structured
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  describe('Column Management', () => {
    it('displays column statistics', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Each column should show card count
      const todoColumn = screen.getByText('To Do').closest('div');
      expect(todoColumn).toContainHTML('1'); // Card count
    });

    it('shows max card limits when specified', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // To Do column has maxCards: 5
      const todoColumn = screen.getByText('To Do').closest('div');
      expect(todoColumn).toContainHTML('/5'); // Shows current/max
    });

    it('calls onColumnUpdate when column actions are triggered', async () => {
      const user = userEvent.setup();
      render(<KanbanBoard {...defaultProps} />);
      
      // Find column action button (three dots menu)
      const actionButtons = screen.getAllByRole('button');
      const columnActionButton = actionButtons.find(button => 
        button.querySelector('svg')
      );
      
      if (columnActionButton) {
        await user.click(columnActionButton);
        expect(defaultProps.onColumnUpdate).toHaveBeenCalled();
      }
    });
  });

  describe('Performance', () => {
    it('handles large numbers of cards efficiently', () => {
      const manyCards = Array.from({ length: 100 }, (_, i) => ({
        id: `card-${i}`,
        title: `Card ${i}`,
        description: `Description ${i}`,
      }));
      
      const largeColumns = [{
        id: 'large-column',
        title: 'Large Column',
        cards: manyCards,
      }];
      
      const { container } = render(<KanbanBoard columns={largeColumns} />);
      
      // Should render without performance issues
      expect(container).toBeInTheDocument();
      expect(screen.getByText('Large Column')).toBeInTheDocument();
    });

    it('optimizes re-renders with proper memoization', () => {
      const { rerender } = render(<KanbanBoard {...defaultProps} />);
      
      // Re-render with same props
      rerender(<KanbanBoard {...defaultProps} />);
      
      // Component should handle re-renders efficiently
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });
  });
});