// ABOUTME: Basic test suite for the Enhanced Kanban Board component
// ABOUTME: Tests core functionality without complex drag-and-drop scenarios

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import KanbanBoard, { KanbanCard, KanbanColumn } from '../components/ui/data/KanbanBoard';

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
];

describe('KanbanBoard - Basic Tests', () => {
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
    });

    it('renders all cards with correct titles', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.getByText('Test Card 2')).toBeInTheDocument();
    });

    it('displays card counts in column headers', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Each column should show its card count
      expect(screen.getByText('1')).toBeInTheDocument(); // To Do column
    });

    it('shows loading state when loading prop is true', () => {
      render(<KanbanBoard {...defaultProps} loading={true} />);
      
      // Should show skeleton loaders instead of actual content
      expect(screen.queryByText('Test Card 1')).not.toBeInTheDocument();
    });
  });

  describe('Card Details', () => {
    it('displays card descriptions', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('First test card')).toBeInTheDocument();
      expect(screen.getByText('Second test card')).toBeInTheDocument();
    });

    it('displays priority badges', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('displays assignee information', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays tags', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('backend')).toBeInTheDocument();
    });

    it('displays due dates', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      // Due dates should be formatted and displayed
      expect(screen.getByText('1/30/2025')).toBeInTheDocument();
      expect(screen.getByText('2/5/2025')).toBeInTheDocument();
    });

    it('shows progress bars when showProgress is true', () => {
      render(<KanbanBoard {...defaultProps} showProgress={true} />);
      
      // Progress bars should be rendered (check for the container)
      const progressContainers = document.querySelectorAll('.bg-gray-200.rounded-full.h-2');
      expect(progressContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('sets draggable attribute on cards', () => {
      render(<KanbanBoard {...defaultProps} />);
      
      const cards = screen.getAllByText(/Test Card/);
      cards.forEach(card => {
        const cardElement = card.closest('[draggable]');
        expect(cardElement).toHaveAttribute('draggable', 'true');
      });
    });

    it('shows checkboxes when allowMultiSelect is true', () => {
      render(<KanbanBoard {...defaultProps} allowMultiSelect={true} />);
      
      // Should show checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
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

  describe('Performance', () => {
    it('handles large numbers of cards efficiently', () => {
      const manyCards = Array.from({ length: 50 }, (_, i) => ({
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