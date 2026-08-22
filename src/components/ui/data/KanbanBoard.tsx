// ABOUTME: Enhanced Kanban Board component with drag-and-drop functionality
// ABOUTME: Modern, interactive kanban cards and columns with mobile-responsive touch support

import React, { useState, useCallback } from 'react';
import { designTokens } from '../../../utils/designTokens';

import { useReducedMotion } from '../../../utils/accessibility';

// Types and interfaces
export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  status?: string;
  progress?: number;
}

export interface KanbanColumn<T extends KanbanCard = KanbanCard> {
  id: string;
  title: string;
  cards: T[];
  color?: string;
  maxCards?: number;
  allowDrop?: boolean;
  count?: number;
}

export interface KanbanBoardProps<T extends KanbanCard = KanbanCard> {
  columns: KanbanColumn<T>[];
  onCardMove?: (cardId: string, fromColumn: string, toColumn: string, newIndex?: number) => void;
  onCardClick?: (card: T) => void;
  onCardSelect?: (cardIds: string[]) => void;
  onColumnUpdate?: (columnId: string, updates: Partial<KanbanColumn<T>>) => void;
  loading?: boolean;
  className?: string;
  allowMultiSelect?: boolean;
  showProgress?: boolean;
  filterText?: string;
  onFilterChange?: (text: string) => void;
}

// Drag and drop state
interface DragState {
  isDragging: boolean;
  draggedCard: KanbanCard | null;
  draggedFrom: string | null;
  dragOverColumn: string | null;
  dragOverIndex: number | null;
}

// Priority colors
const priorityColors = {
  low: designTokens.colors.success[500],
  medium: designTokens.colors.warning[500],
  high: designTokens.colors.error[400],
  urgent: designTokens.colors.error[600],
};

// Priority badges
const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const KanbanBoard = <T extends KanbanCard = KanbanCard>({
  columns,
  onCardMove,
  onCardClick,
  onCardSelect,
  onColumnUpdate,
  loading = false,
  className = '',
  allowMultiSelect = false,
  showProgress = false,
  filterText = '',
  onFilterChange,
}: KanbanBoardProps<T>) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedCard: null,
    draggedFrom: null,
    dragOverColumn: null,
    dragOverIndex: null,
  });
  
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const prefersReducedMotion = useReducedMotion();
  
  // Filter cards based on search text
  const filteredColumns = columns.map(column => ({
    ...column,
    cards: column.cards.filter(card => 
      !filterText || 
      (card.title?.toLowerCase() ?? '').includes(filterText.toLowerCase()) ||
      card.description?.toLowerCase().includes(filterText.toLowerCase()) ||
      card.tags?.some(tag => tag.toLowerCase().includes(filterText.toLowerCase()))
    ),
  }));

  // Handle card selection
  const handleCardSelect = useCallback((cardId: string, isMultiSelect: boolean = false) => {
    if (!allowMultiSelect || !isMultiSelect) {
      const newSelection = selectedCards.has(cardId) ? new Set() : new Set([cardId]);
      setSelectedCards(newSelection);
      onCardSelect?.(Array.from(newSelection));
      return;
    }
    
    const newSelection = new Set(selectedCards);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setSelectedCards(newSelection);
    onCardSelect?.(Array.from(newSelection));
  }, [selectedCards, allowMultiSelect, onCardSelect]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, card: KanbanCard, columnId: string) => {
    setDragState({
      isDragging: true,
      draggedCard: card,
      draggedFrom: columnId,
      dragOverColumn: null,
      dragOverIndex: null,
    });
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    
    // Add drag image styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    
    setDragState({
      isDragging: false,
      draggedCard: null,
      draggedFrom: null,
      dragOverColumn: null,
      dragOverIndex: null,
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    setDragState(prev => ({
      ...prev,
      dragOverColumn: columnId,
      dragOverIndex: index ?? null,
    }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear drag over state if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragState(prev => ({
        ...prev,
        dragOverColumn: null,
        dragOverIndex: null,
      }));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, columnId: string, index?: number) => {
    e.preventDefault();
    
    const { draggedCard, draggedFrom } = dragState;
    if (!draggedCard || !draggedFrom || draggedFrom === columnId) {
      return;
    }
    
    onCardMove?.(draggedCard.id, draggedFrom, columnId, index);
    
    setDragState({
      isDragging: false,
      draggedCard: null,
      draggedFrom: null,
      dragOverColumn: null,
      dragOverIndex: null,
    });
  }, [dragState, onCardMove]);

  // Touch handlers for mobile drag and drop
  const handleTouchStart = useCallback((e: React.TouchEvent, card: KanbanCard) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);
    
    // If significant movement, prevent default to enable custom drag
    if (deltaX > 10 || deltaY > 10) {
      e.preventDefault();
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
  }, []);

  // Render priority badge
  const renderPriorityBadge = (priority: KanbanCard['priority']) => {
    if (!priority) return null;
    
    return (
      <span
        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: `${priorityColors[priority]}20`,
          color: priorityColors[priority],
        }}
      >
        {priorityLabels[priority]}
      </span>
    );
  };

  // Render progress bar
  const renderProgressBar = (progress?: number) => {
    if (!showProgress || progress === undefined) return null;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    );
  };

  // Render assignee avatar
  const renderAssignee = (assignee?: KanbanCard['assignee']) => {
    if (!assignee) return null;
    
    return (
      <div className="flex items-center space-x-2 mt-2">
        {assignee.avatar ? (
          <img
            src={assignee.avatar}
            alt={assignee.name}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <div
            className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600"
          >
            {assignee.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm text-gray-600 truncate">{assignee.name}</span>
      </div>
    );
  };

  // Render tags
  const renderTags = (tags?: string[]) => {
    if (!tags || tags.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {tags.slice(0, 3).map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
          >
            {tag}
          </span>
        ))}
        {tags.length > 3 && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-500">
            +{tags.length - 3}
          </span>
        )}
      </div>
    );
  };

  // Render individual card
  const renderCard = (card: T, columnId: string, index: number) => {
    const isSelected = selectedCards.has(card.id);
    const isDraggedOver = dragState.dragOverColumn === columnId && dragState.dragOverIndex === index;
    
    return (
      <div key={card.id} className="relative">
        {/* Drop indicator */}
        {isDraggedOver && (
          <div className="h-1 bg-blue-500 rounded-full mb-2 opacity-75" />
        )}
        
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, card, columnId)}
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => handleTouchStart(e, card)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            if (allowMultiSelect && (e.ctrlKey || e.metaKey)) {
              handleCardSelect(card.id, true);
            } else if (onCardClick) {
              onCardClick(card);
            } else {
              handleCardSelect(card.id);
            }
          }}
          className={`
            bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer
            transition-all duration-200 hover:shadow-md hover:-translate-y-1
            ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
            ${dragState.isDragging && dragState.draggedCard?.id === card.id ? 'opacity-50' : ''}
            ${!prefersReducedMotion ? 'transform' : ''}
          `}
          style={{
            transition: prefersReducedMotion ? 'none' : transitions.all,
          }}
        >
          {/* Card header */}
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-gray-900 text-sm leading-tight flex-1">
              {card.title}
            </h4>
            {allowMultiSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  handleCardSelect(card.id, true);
                }}
                className="ml-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            )}
          </div>
          
          {/* Card description */}
          {card.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {card.description}
            </p>
          )}
          
          {/* Priority badge */}
          {card.priority && (
            <div className="mb-2">
              {renderPriorityBadge(card.priority)}
            </div>
          )}
          
          {/* Progress bar */}
          {renderProgressBar(card.progress)}
          
          {/* Tags */}
          {renderTags(card.tags)}
          
          {/* Assignee */}
          {renderAssignee(card.assignee)}
          
          {/* Due date */}
          {card.dueDate && (
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {card.dueDate.toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render column
  const renderColumn = (column: KanbanColumn<T>) => {
    const isDraggedOver = dragState.dragOverColumn === column.id;
    const canDrop = column.allowDrop !== false;
    
    return (
      <div
        key={column.id}
        className={`
          flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4
          ${isDraggedOver && canDrop ? 'bg-blue-50 ring-2 ring-blue-200' : ''}
          ${!canDrop ? 'opacity-60' : ''}
        `}
        onDragOver={canDrop ? (e) => handleDragOver(e, column.id) : undefined}
        onDragLeave={handleDragLeave}
        onDrop={canDrop ? (e) => handleDrop(e, column.id) : undefined}
      >
        {/* Column header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {column.color && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: column.color }}
              />
            )}
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
              {column.cards.length}
              {column.maxCards && `/${column.maxCards}`}
            </span>
          </div>
          
          {/* Column actions */}
          <div className="flex items-center space-x-1">
            <button
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              onClick={() => onColumnUpdate?.(column.id, {})}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Cards container */}
        <div className="space-y-3 min-h-[200px]">
          {column.cards.map((card, index) => renderCard(card, column.id, index))}
          
          {/* Drop zone at end of column */}
          {canDrop && dragState.isDragging && (
            <div
              className="h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 text-sm"
              onDragOver={(e) => handleDragOver(e, column.id, column.cards.length)}
              onDrop={(e) => handleDrop(e, column.id, column.cards.length)}
            >
              Drop here
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`flex space-x-6 overflow-x-auto pb-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex space-x-6 overflow-x-auto pb-4 ${className}`}>
      {filteredColumns.map(renderColumn)}
    </div>
  );
};

export default KanbanBoard;