// ABOUTME: Basic test suite for the useKanban custom hook
// ABOUTME: Tests core state management and operations

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import useKanban from '@/hooks/useKanban';
import { KanbanCard, KanbanColumn } from '@/components/ui/data/KanbanBoard';

// Sample test data
const sampleCards: KanbanCard[] = [
  {
    id: '1',
    title: 'Test Card 1',
    description: 'First test card',
    tags: ['ui', 'frontend'],
    priority: 'high',
    assignee: { id: '1', name: 'John Doe' },
    progress: 75,
  },
  {
    id: '2',
    title: 'Test Card 2',
    description: 'Second test card',
    tags: ['api', 'backend'],
    priority: 'medium',
    assignee: { id: '2', name: 'Jane Smith' },
    progress: 30,
  },
];

const initialColumns: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [sampleCards[0], sampleCards[1]],
  },
  {
    id: 'done',
    title: 'Done',
    cards: [],
  },
];

describe('useKanban - Basic Tests', () => {
  const mockCallbacks = {
    onCardMove: vi.fn(),
    onCardUpdate: vi.fn(),
    onColumnUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('initializes with provided columns', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [state] = result.current;
      
      expect(state.columns).toEqual(initialColumns);
      expect(state.selectedCards).toEqual([]);
      expect(state.filterText).toBe('');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Card Operations', () => {
    it('moves card between columns', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.moveCard('1', 'todo', 'done');
      });
      
      const [newState] = result.current;
      
      // Card should be moved from todo to done
      expect(newState.columns[0].cards).toHaveLength(1); // todo: 2 -> 1
      expect(newState.columns[1].cards).toHaveLength(1); // done: 0 -> 1
      expect(newState.columns[1].cards[0].id).toBe('1');
      
      expect(mockCallbacks.onCardMove).toHaveBeenCalledWith('1', 'todo', 'done', undefined);
    });

    it('updates card properties', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      const updates = { title: 'Updated Title', priority: 'urgent' as const };
      
      act(() => {
        actions.updateCard('1', updates);
      });
      
      const [newState] = result.current;
      // Find the card in any column since it might have been moved by previous tests
      let updatedCard;
      for (const column of newState.columns) {
        updatedCard = column.cards.find(card => card.id === '1');
        if (updatedCard) break;
      }
      
      expect(updatedCard?.title).toBe('Updated Title');
      expect(updatedCard?.priority).toBe('urgent');
      
      expect(mockCallbacks.onCardUpdate).toHaveBeenCalledWith('1', updates);
    });

    it('deletes card from column', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.deleteCard('1');
      });
      
      const [newState] = result.current;
      
      // Card should be removed from todo column
      expect(newState.columns[0].cards).toHaveLength(1);
      expect(newState.columns[0].cards.find(card => card.id === '1')).toBeUndefined();
    });
  });

  describe('Column Operations', () => {
    it('updates column properties', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      const updates = { title: 'Updated Column', color: '#ff0000' };
      
      act(() => {
        actions.updateColumn('todo', updates);
      });
      
      const [newState] = result.current;
      const updatedColumn = newState.columns.find(col => col.id === 'todo');
      
      expect(updatedColumn?.title).toBe('Updated Column');
      expect(updatedColumn?.color).toBe('#ff0000');
      
      expect(mockCallbacks.onColumnUpdate).toHaveBeenCalledWith('todo', updates);
    });

    it('adds new column', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      const newColumn = { id: 'review', title: 'Review', color: '#0000ff' };
      
      act(() => {
        actions.addColumn(newColumn);
      });
      
      const [newState] = result.current;
      
      expect(newState.columns).toHaveLength(3);
      const addedColumn = newState.columns.find(col => col.id === 'review');
      expect(addedColumn?.title).toBe('Review');
      expect(addedColumn?.cards).toEqual([]);
    });
  });

  describe('Selection Operations', () => {
    it('selects single card', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.selectCard('1');
      });
      
      const [newState] = result.current;
      expect(newState.selectedCards).toEqual(['1']);
    });

    it('toggles card selection', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      // Select card
      act(() => {
        actions.selectCard('1');
      });
      
      // Toggle same card (should deselect)
      act(() => {
        actions.selectCard('1');
      });
      
      const [newState] = result.current;
      expect(newState.selectedCards).toEqual([]);
    });

    it('handles multi-selection', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.selectCard('1', true); // Multi-select
        actions.selectCard('2', true); // Multi-select
      });
      
      const [newState] = result.current;
      expect(newState.selectedCards).toEqual(['1', '2']);
    });

    it('clears selection', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      // First select some cards
      act(() => {
        actions.selectCard('1', true);
        actions.selectCard('2', true);
      });
      
      // Then clear selection
      act(() => {
        actions.clearSelection();
      });
      
      const [newState] = result.current;
      expect(newState.selectedCards).toEqual([]);
    });
  });

  describe('Filter Operations', () => {
    it('sets filter text', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.setFilter('test');
      });
      
      const [newState] = result.current;
      expect(newState.filterText).toBe('test');
    });

    it('clears filter', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      // Set filter first
      act(() => {
        actions.setFilter('test');
      });
      
      // Then clear it
      act(() => {
        actions.clearFilter();
      });
      
      const [newState] = result.current;
      expect(newState.filterText).toBe('');
    });

    it('returns filtered columns', () => {
      // Use fresh columns for this test to avoid interference from previous tests
      const freshColumns: KanbanColumn[] = [
        {
          id: 'todo',
          title: 'To Do',
          cards: [sampleCards[0], sampleCards[1]], // Both cards start in todo
        },
        {
          id: 'done',
          title: 'Done',
          cards: [],
        },
      ];
      
      const { result } = renderHook(() => 
        useKanban({ initialColumns: freshColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.setFilter('ui'); // Filter by 'ui' tag which only card 1 has
      });
      
      const filteredColumns = actions.getFilteredColumns();
      
      // Should only include cards with 'ui' tag (only card 1 has this)
      expect(filteredColumns[0].cards).toHaveLength(1);
      expect(filteredColumns[0].cards[0].id).toBe('1');
      expect(filteredColumns[1].cards).toHaveLength(0);
    });
  });

  describe('Utility Functions', () => {
    it('gets card by id', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      const card = actions.getCard('1');
      expect(card?.title).toBe('Test Card 1');
    });

    it('gets column by id', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      const column = actions.getColumn('todo');
      expect(column?.title).toBe('To Do');
    });

    it('gets card column', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      const columnId = actions.getCardColumn('2'); // Use card 2 which should still be in todo
      expect(columnId).toBe('todo');
    });

    it('gets board statistics', () => {
      // Use fresh columns for this test
      const freshColumns: KanbanColumn[] = [
        {
          id: 'todo',
          title: 'To Do',
          cards: [sampleCards[0], sampleCards[1]],
        },
        {
          id: 'done',
          title: 'Done',
          cards: [],
        },
      ];
      
      const { result } = renderHook(() => 
        useKanban({ initialColumns: freshColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      // First check initial stats
      let stats = actions.getBoardStats();
      expect(stats.totalCards).toBe(2);
      expect(stats.totalColumns).toBe(2);
      expect(stats.selectedCards).toBe(0);
      
      // Select some cards
      act(() => {
        actions.selectCard('1', true);
      });
      
      let [currentState] = result.current;
      expect(currentState.selectedCards).toEqual(['1']);
      
      act(() => {
        actions.selectCard('2', true);
      });
      
      [currentState] = result.current;
      expect(currentState.selectedCards).toEqual(['1', '2']);
      
      stats = actions.getBoardStats();
      expect(stats.selectedCards).toBe(2);
    });
  });

  describe('Loading State', () => {
    it('manages loading state', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.setLoading(true);
      });
      
      const [newState] = result.current;
      expect(newState.isLoading).toBe(true);
      
      act(() => {
        actions.setLoading(false);
      });
      
      const [finalState] = result.current;
      expect(finalState.isLoading).toBe(false);
    });
  });
});