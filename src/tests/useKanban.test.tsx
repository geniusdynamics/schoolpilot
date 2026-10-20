// ABOUTME: Test suite for the useKanban custom hook
// ABOUTME: Tests state management, card operations, filtering, and bulk actions

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
    tags: ['test', 'frontend'],
    priority: 'high',
    assignee: { id: '1', name: 'John Doe' },
    progress: 75,
  },
  {
    id: '2',
    title: 'Test Card 2',
    description: 'Second test card',
    tags: ['test', 'backend'],
    priority: 'medium',
    assignee: { id: '2', name: 'Jane Smith' },
    progress: 30,
  },
  {
    id: '3',
    title: 'Test Card 3',
    description: 'Third test card',
    tags: ['design'],
    priority: 'low',
    progress: 90,
  },
];

const initialColumns: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [sampleCards[0], sampleCards[1]],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    cards: [],
  },
  {
    id: 'done',
    title: 'Done',
    cards: [sampleCards[2]],
  },
];

describe('useKanban', () => {
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
        actions.moveCard('1', 'todo', 'in-progress');
      });
      
      const [newState] = result.current;
      
      // Card should be moved from todo to in-progress
      expect(newState.columns[0].cards).toHaveLength(1); // todo: 2 -> 1
      expect(newState.columns[1].cards).toHaveLength(1); // in-progress: 0 -> 1
      expect(newState.columns[1].cards[0].id).toBe('1');
      
      expect(mockCallbacks.onCardMove).toHaveBeenCalledWith('1', 'todo', 'in-progress', undefined);
    });

    it('moves card to specific index', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.moveCard('2', 'todo', 'done', 0); // Insert at beginning
      });
      
      const [newState] = result.current;
      
      // Card should be at the beginning of done column
      expect(newState.columns[2].cards[0].id).toBe('2');
      expect(newState.columns[2].cards[1].id).toBe('3');
      
      expect(mockCallbacks.onCardMove).toHaveBeenCalledWith('2', 'todo', 'done', 0);
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
      const updatedCard = newState.columns[0].cards.find(card => card.id === '1');
      
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

    it('duplicates card in same column', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.duplicateCard('1');
      });
      
      const [newState] = result.current;
      
      // Should have one more card in todo column
      expect(newState.columns[0].cards).toHaveLength(3);
      
      // Find the duplicated card
      const duplicatedCard = newState.columns[0].cards.find(card => 
        card.title === 'Test Card 1 (Copy)'
      );
      expect(duplicatedCard).toBeDefined();
      expect(duplicatedCard?.id).toContain('copy');
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
      
      expect(newState.columns).toHaveLength(4);
      const addedColumn = newState.columns.find(col => col.id === 'review');
      expect(addedColumn?.title).toBe('Review');
      expect(addedColumn?.cards).toEqual([]);
    });

    it('deletes column and removes its cards from selection', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      // First select a card from the column to be deleted
      act(() => {
        actions.selectCard('3'); // Card in 'done' column
      });
      
      // Then delete the column
      act(() => {
        actions.deleteColumn('done');
      });
      
      const [newState] = result.current;
      
      expect(newState.columns).toHaveLength(2);
      expect(newState.columns.find(col => col.id === 'done')).toBeUndefined();
      expect(newState.selectedCards).toEqual([]); // Card removed from selection
    });

    it('reorders columns', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.reorderColumns(0, 2); // Move first column to last
      });
      
      const [newState] = result.current;
      
      expect(newState.columns[0].id).toBe('in-progress');
      expect(newState.columns[1].id).toBe('done');
      expect(newState.columns[2].id).toBe('todo');
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

    it('selects all cards in column', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.selectAllCards('todo');
      });
      
      const [newState] = result.current;
      expect(newState.selectedCards).toEqual(['1', '2']);
    });

    it('selects all cards in board', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.selectAllCards();
      });
      
      const [newState] = result.current;
      expect(newState.selectedCards).toEqual(['1', '2', '3']);
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

  describe('Bulk Operations', () => {
    it('bulk moves cards to different column', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.bulkMoveCards(['1', '2'], 'done');
      });
      
      const [newState] = result.current;
      
      // Cards should be moved to done column
      expect(newState.columns[2].cards).toHaveLength(3); // Was 1, now 3
      expect(newState.columns[0].cards).toHaveLength(0); // Was 2, now 0
    });

    it('bulk updates card properties', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      const updates = { priority: 'urgent' as const };
      
      act(() => {
        actions.bulkUpdateCards(['1', '2'], updates);
      });
      
      const [newState] = result.current;
      
      // Both cards should have updated priority
      const card1 = newState.columns[0].cards.find(card => card.id === '1');
      const card2 = newState.columns[0].cards.find(card => card.id === '2');
      
      expect(card1?.priority).toBe('urgent');
      expect(card2?.priority).toBe('urgent');
    });

    it('bulk deletes cards', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.bulkDeleteCards(['1', '3']);
      });
      
      const [newState] = result.current;
      
      // Cards should be removed
      expect(newState.columns[0].cards).toHaveLength(1); // Was 2, now 1
      expect(newState.columns[2].cards).toHaveLength(0); // Was 1, now 0
      expect(newState.selectedCards).toEqual([]); // Deleted cards removed from selection
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
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.setFilter('frontend');
      });

      // Re-read actions after the state update: the `actions` destructured
      // above is a stale closure (getFilteredColumns captured filterText='')
      const [, freshActions] = result.current;
      const filteredColumns = freshActions.getFilteredColumns();
      
      // Should only include cards with 'frontend' tag
      expect(filteredColumns[0].cards).toHaveLength(1);
      expect(filteredColumns[0].cards[0].id).toBe('1');
      expect(filteredColumns[1].cards).toHaveLength(0);
      expect(filteredColumns[2].cards).toHaveLength(0);
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
      
      const columnId = actions.getCardColumn('1');
      expect(columnId).toBe('todo');
    });

    it('gets column statistics', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      // Select one card from todo column
      act(() => {
        actions.selectCard('1');
      });

      // Re-read actions after the state update (stale closure otherwise)
      const [, statsActions] = result.current;
      const stats = statsActions.getColumnStats('todo');
      expect(stats.total).toBe(2);
      expect(stats.filtered).toBe(2); // No filter applied
      expect(stats.selected).toBe(1);
    });

    it('gets board statistics', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      // Select some cards
      act(() => {
        actions.selectCard('1', true);
        actions.selectCard('2', true);
      });

      // Re-read actions after the state update (stale closure otherwise)
      const [, statsActions] = result.current;
      const stats = statsActions.getBoardStats();
      expect(stats.totalCards).toBe(3);
      expect(stats.totalColumns).toBe(3);
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

  describe('Edge Cases', () => {
    it('handles moving non-existent card', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.moveCard('non-existent', 'todo', 'done');
      });
      
      const [newState] = result.current;
      
      // State should remain unchanged
      expect(newState.columns).toEqual(initialColumns);
    });

    it('handles moving card to non-existent column', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.moveCard('1', 'todo', 'non-existent');
      });
      
      const [newState] = result.current;
      
      // State should remain unchanged
      expect(newState.columns).toEqual(initialColumns);
    });

    it('handles updating non-existent card', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      act(() => {
        actions.updateCard('non-existent', { title: 'Updated' });
      });
      
      const [newState] = result.current;
      
      // State should remain unchanged
      expect(newState.columns).toEqual(initialColumns);
    });

    it('handles empty filter gracefully', () => {
      const { result } = renderHook(() => 
        useKanban({ initialColumns, ...mockCallbacks })
      );
      
      const [, actions] = result.current;
      
      const filteredColumns = actions.getFilteredColumns();
      
      // Should return all columns when no filter is applied
      expect(filteredColumns).toEqual(initialColumns);
    });
  });
});