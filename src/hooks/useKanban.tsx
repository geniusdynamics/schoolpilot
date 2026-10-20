// ABOUTME: Custom hook for managing Kanban board state and operations
// ABOUTME: Provides drag-and-drop functionality, filtering, and bulk operations

import { useState, useCallback } from 'react';
import { KanbanCard, KanbanColumn } from '@/components/ui/data/KanbanBoard';

export interface UseKanbanOptions<T extends KanbanCard = KanbanCard> {
  initialColumns: KanbanColumn<T>[];
  onCardMove?: (cardId: string, fromColumn: string, toColumn: string, newIndex?: number) => void;
  onCardUpdate?: (cardId: string, updates: Partial<T>) => void;
  onColumnUpdate?: (columnId: string, updates: Partial<KanbanColumn<T>>) => void;
}

export interface KanbanState<T extends KanbanCard = KanbanCard> {
  columns: KanbanColumn<T>[];
  selectedCards: string[];
  filterText: string;
  isLoading: boolean;
}

export interface KanbanActions<T extends KanbanCard = KanbanCard> {
  // Card operations
  moveCard: (cardId: string, fromColumn: string, toColumn: string, newIndex?: number) => void;
  updateCard: (cardId: string, updates: Partial<T>) => void;
  deleteCard: (cardId: string) => void;
  duplicateCard: (cardId: string) => void;
  
  // Column operations
  updateColumn: (columnId: string, updates: Partial<KanbanColumn<T>>) => void;
  addColumn: (column: Omit<KanbanColumn<T>, 'cards'>) => void;
  deleteColumn: (columnId: string) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  
  // Selection operations
  selectCard: (cardId: string, isMultiSelect?: boolean) => void;
  selectAllCards: (columnId?: string) => void;
  clearSelection: () => void;
  bulkMoveCards: (cardIds: string[], toColumn: string) => void;
  bulkUpdateCards: (cardIds: string[], updates: Partial<T>) => void;
  bulkDeleteCards: (cardIds: string[]) => void;
  
  // Filter operations
  setFilter: (text: string) => void;
  clearFilter: () => void;
  
  // Loading state
  setLoading: (loading: boolean) => void;
  
  // Utility functions
  getCard: (cardId: string) => T | undefined;
  getColumn: (columnId: string) => KanbanColumn<T> | undefined;
  getCardColumn: (cardId: string) => string | undefined;
  getFilteredColumns: () => KanbanColumn<T>[];
  getColumnStats: (columnId: string) => { total: number; filtered: number; selected: number };
  getBoardStats: () => { totalCards: number; totalColumns: number; selectedCards: number };
}

export const useKanban = <T extends KanbanCard = KanbanCard>({
  initialColumns,
  onCardMove,
  onCardUpdate,
  onColumnUpdate,
}: UseKanbanOptions<T>): [KanbanState<T>, KanbanActions<T>] => {
  const [columns, setColumns] = useState<KanbanColumn<T>[]>(initialColumns);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Card operations
  const moveCard = useCallback((cardId: string, fromColumn: string, toColumn: string, newIndex?: number) => {
    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const fromColIndex = newColumns.findIndex(col => col.id === fromColumn);
      const toColIndex = newColumns.findIndex(col => col.id === toColumn);

      if (fromColIndex === -1 || toColIndex === -1) return prevColumns;

      const fromCol = newColumns[fromColIndex];
      const toCol = newColumns[toColIndex];

      const cardIndex = fromCol.cards.findIndex(card => card.id === cardId);
      if (cardIndex === -1) return prevColumns;

      // Copy the card arrays before splicing — the previous implementation
      // spliced `fromCol.cards`/`toCol.cards` through a shallow column copy,
      // which mutated the caller's (and React's) original column state.
      const fromCards = [...fromCol.cards];
      const [card] = fromCards.splice(cardIndex, 1);

      const toCards = [...toCol.cards];
      // Insert at specific index or at the end
      const insertIndex = newIndex !== undefined ? Math.min(newIndex, toCards.length) : toCards.length;
      toCards.splice(insertIndex, 0, card);

      newColumns[fromColIndex] = { ...fromCol, cards: fromCards };
      newColumns[toColIndex] = { ...toCol, cards: toCards };

      return newColumns;
    });
    
    onCardMove?.(cardId, fromColumn, toColumn, newIndex);
  }, [onCardMove]);

  const updateCard = useCallback((cardId: string, updates: Partial<T>) => {
    setColumns(prevColumns => {
      return prevColumns.map(column => ({
        ...column,
        cards: column.cards.map(card => 
          card.id === cardId ? { ...card, ...updates } : card
        ),
      }));
    });
    
    onCardUpdate?.(cardId, updates);
  }, [onCardUpdate]);

  const deleteCard = useCallback((cardId: string) => {
    setColumns(prevColumns => {
      return prevColumns.map(column => ({
        ...column,
        cards: column.cards.filter(card => card.id !== cardId),
      }));
    });
    
    // Remove from selection if selected
    setSelectedCards(prev => prev.filter(id => id !== cardId));
  }, []);

  const duplicateCard = useCallback((cardId: string) => {
    setColumns(prevColumns => {
      return prevColumns.map(column => {
        const cardIndex = column.cards.findIndex(card => card.id === cardId);
        if (cardIndex === -1) return column;
        
        const originalCard = column.cards[cardIndex];
        const duplicatedCard = {
          ...originalCard,
          id: `${originalCard.id}-copy-${Date.now()}`,
          title: `${originalCard.title} (Copy)`,
        };
        
        const newCards = [...column.cards];
        newCards.splice(cardIndex + 1, 0, duplicatedCard);
        
        return { ...column, cards: newCards };
      });
    });
  }, []);

  // Column operations
  const updateColumn = useCallback((columnId: string, updates: Partial<KanbanColumn<T>>) => {
    setColumns(prevColumns => {
      return prevColumns.map(column => 
        column.id === columnId ? { ...column, ...updates } : column
      );
    });
    
    onColumnUpdate?.(columnId, updates);
  }, [onColumnUpdate]);

  const addColumn = useCallback((column: Omit<KanbanColumn<T>, 'cards'>) => {
    const newColumn: KanbanColumn<T> = { ...column, cards: [] };
    setColumns(prevColumns => [...prevColumns, newColumn]);
  }, []);

  const deleteColumn = useCallback((columnId: string) => {
    setColumns(prevColumns => prevColumns.filter(column => column.id !== columnId));
    
    // Remove cards from this column from selection
    const columnCards = columns.find(col => col.id === columnId)?.cards.map(card => card.id) || [];
    setSelectedCards(prev => prev.filter(id => !columnCards.includes(id)));
  }, [columns]);

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const [movedColumn] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, movedColumn);
      return newColumns;
    });
  }, []);

  // Selection operations
  const selectCard = useCallback((cardId: string, isMultiSelect: boolean = false) => {
    setSelectedCards(prev => {
      if (!isMultiSelect) {
        return prev.includes(cardId) ? [] : [cardId];
      }
      
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  }, []);

  const selectAllCards = useCallback((columnId?: string) => {
    if (columnId) {
      const column = columns.find(col => col.id === columnId);
      if (column) {
        const columnCardIds = column.cards.map(card => card.id);
        setSelectedCards(prev => {
          const newSelection = new Set([...prev, ...columnCardIds]);
          return Array.from(newSelection);
        });
      }
    } else {
      const allCardIds = columns.flatMap(column => column.cards.map(card => card.id));
      setSelectedCards(allCardIds);
    }
  }, [columns]);

  const clearSelection = useCallback(() => {
    setSelectedCards([]);
  }, []);

  const bulkMoveCards = useCallback((cardIds: string[], toColumn: string) => {
    cardIds.forEach(cardId => {
      // Find the column containing this card
      let fromColumn: string | undefined;
      for (const column of columns) {
        if (column.cards.some(card => card.id === cardId)) {
          fromColumn = column.id;
          break;
        }
      }
      
      if (fromColumn && fromColumn !== toColumn) {
        moveCard(cardId, fromColumn, toColumn);
      }
    });
  }, [moveCard, columns]);

  const bulkUpdateCards = useCallback((cardIds: string[], updates: Partial<T>) => {
    cardIds.forEach(cardId => {
      updateCard(cardId, updates);
    });
  }, [updateCard]);

  const bulkDeleteCards = useCallback((cardIds: string[]) => {
    cardIds.forEach(cardId => {
      deleteCard(cardId);
    });
  }, [deleteCard]);

  // Filter operations
  const setFilter = useCallback((text: string) => {
    setFilterText(text);
  }, []);

  const clearFilter = useCallback(() => {
    setFilterText('');
  }, []);

  // Loading state
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // Utility functions
  const getCard = useCallback((cardId: string): T | undefined => {
    for (const column of columns) {
      const card = column.cards.find(c => c.id === cardId);
      if (card) return card;
    }
    return undefined;
  }, [columns]);

  const getColumn = useCallback((columnId: string): KanbanColumn<T> | undefined => {
    return columns.find(col => col.id === columnId);
  }, [columns]);

  const getCardColumn = useCallback((cardId: string): string | undefined => {
    for (const column of columns) {
      if (column.cards.some(card => card.id === cardId)) {
        return column.id;
      }
    }
    return undefined;
  }, [columns]);

  const getFilteredColumns = useCallback((): KanbanColumn<T>[] => {
    if (!filterText) return columns;
    
    return columns.map(column => ({
      ...column,
      cards: column.cards.filter(card => 
        card.title.toLowerCase().includes(filterText.toLowerCase()) ||
        card.description?.toLowerCase().includes(filterText.toLowerCase()) ||
        card.tags?.some(tag => tag.toLowerCase().includes(filterText.toLowerCase()))
      ),
    }));
  }, [columns, filterText]);

  const getColumnStats = useCallback((columnId: string) => {
    const column = getColumn(columnId);
    if (!column) return { total: 0, filtered: 0, selected: 0 };
    
    const filteredColumn = getFilteredColumns().find(col => col.id === columnId);
    const selectedInColumn = column.cards.filter(card => selectedCards.includes(card.id)).length;
    
    return {
      total: column.cards.length,
      filtered: filteredColumn?.cards.length || 0,
      selected: selectedInColumn,
    };
  }, [getColumn, getFilteredColumns, selectedCards]);

  const getBoardStats = useCallback(() => {
    const totalCards = columns.reduce((sum, column) => sum + column.cards.length, 0);
    const totalColumns = columns.length;
    const selectedCardsCount = selectedCards.length;
    
    return {
      totalCards,
      totalColumns,
      selectedCards: selectedCardsCount,
    };
  }, [columns, selectedCards]);

  // State object
  const state: KanbanState<T> = {
    columns,
    selectedCards,
    filterText,
    isLoading,
  };

  // Actions object
  const actions: KanbanActions<T> = {
    // Card operations
    moveCard,
    updateCard,
    deleteCard,
    duplicateCard,
    
    // Column operations
    updateColumn,
    addColumn,
    deleteColumn,
    reorderColumns,
    
    // Selection operations
    selectCard,
    selectAllCards,
    clearSelection,
    bulkMoveCards,
    bulkUpdateCards,
    bulkDeleteCards,
    
    // Filter operations
    setFilter,
    clearFilter,
    
    // Loading state
    setLoading,
    
    // Utility functions
    getCard,
    getColumn,
    getCardColumn,
    getFilteredColumns,
    getColumnStats,
    getBoardStats,
  };

  return [state, actions];
};

export default useKanban;