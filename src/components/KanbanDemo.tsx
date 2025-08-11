// ABOUTME: Demo component showcasing the Enhanced Kanban Board functionality
// ABOUTME: Demonstrates drag-and-drop, filtering, bulk operations, and mobile responsiveness

import React, { useState } from 'react';
import KanbanBoard, { KanbanCard, KanbanColumn } from './ui/data/KanbanBoard';
import useKanban from '../hooks/useKanban';
import Button from './ui/Button';
import Input from './ui/Input';

// Sample data
const sampleCards: KanbanCard[] = [
  {
    id: '1',
    title: 'Design System Updates',
    description: 'Update color palette and typography for better accessibility',
    tags: ['Design', 'Accessibility'],
    priority: 'high',
    assignee: { id: '1', name: 'Alice Johnson' },
    dueDate: new Date('2025-01-30'),
    progress: 75,
  },
  {
    id: '2',
    title: 'API Integration',
    description: 'Integrate with new payment gateway API',
    tags: ['Backend', 'API'],
    priority: 'urgent',
    assignee: { id: '2', name: 'Bob Smith' },
    dueDate: new Date('2025-01-25'),
    progress: 30,
  },
  {
    id: '3',
    title: 'User Testing',
    description: 'Conduct usability testing for the new dashboard',
    tags: ['UX', 'Testing'],
    priority: 'medium',
    assignee: { id: '3', name: 'Carol Davis' },
    dueDate: new Date('2025-02-05'),
    progress: 0,
  },
  {
    id: '4',
    title: 'Mobile Optimization',
    description: 'Optimize mobile experience for better performance',
    tags: ['Mobile', 'Performance'],
    priority: 'low',
    assignee: { id: '1', name: 'Alice Johnson' },
    dueDate: new Date('2025-02-10'),
    progress: 50,
  },
  {
    id: '5',
    title: 'Database Migration',
    description: 'Migrate legacy database to new schema',
    tags: ['Database', 'Migration'],
    priority: 'high',
    assignee: { id: '2', name: 'Bob Smith' },
    dueDate: new Date('2025-01-28'),
    progress: 90,
  },
  {
    id: '6',
    title: 'Security Audit',
    description: 'Perform comprehensive security audit',
    tags: ['Security', 'Audit'],
    priority: 'urgent',
    assignee: { id: '4', name: 'David Wilson' },
    dueDate: new Date('2025-01-26'),
    progress: 60,
  },
];

const initialColumns: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [sampleCards[0], sampleCards[1]],
    color: '#ef4444',
    maxCards: 10,
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    cards: [sampleCards[2], sampleCards[3]],
    color: '#f59e0b',
    maxCards: 5,
  },
  {
    id: 'review',
    title: 'Review',
    cards: [sampleCards[4]],
    color: '#3b82f6',
    maxCards: 3,
  },
  {
    id: 'done',
    title: 'Done',
    cards: [sampleCards[5]],
    color: '#22c55e',
  },
];

const KanbanDemo: React.FC = () => {
  const [state, actions] = useKanban({
    initialColumns,
    onCardMove: (cardId, fromColumn, toColumn, newIndex) => {
      console.log(`Moved card ${cardId} from ${fromColumn} to ${toColumn} at index ${newIndex}`);
    },
    onCardUpdate: (cardId, updates) => {
      console.log(`Updated card ${cardId}:`, updates);
    },
    onColumnUpdate: (columnId, updates) => {
      console.log(`Updated column ${columnId}:`, updates);
    },
  });

  const [showBulkActions, setShowBulkActions] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('todo');

  const handleCardClick = (card: KanbanCard) => {
    console.log('Card clicked:', card);
    // In a real app, this would open a card detail modal
  };

  const handleCardSelect = (cardIds: string[]) => {
    console.log('Selected cards:', cardIds);
    setShowBulkActions(cardIds.length > 0);
  };

  const addNewCard = () => {
    if (!newCardTitle.trim()) return;
    
    const newCard: KanbanCard = {
      id: `card-${Date.now()}`,
      title: newCardTitle,
      description: 'New card description',
      tags: ['New'],
      priority: 'medium',
      assignee: { id: '1', name: 'Current User' },
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      progress: 0,
    };

    // Add card to selected column
    const column = actions.getColumn(selectedColumn);
    if (column) {
      actions.updateColumn(selectedColumn, {
        cards: [...column.cards, newCard],
      });
    }

    setNewCardTitle('');
  };

  const boardStats = actions.getBoardStats();
  const filteredColumns = actions.getFilteredColumns();

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Kanban Board Demo
          </h1>
          <p className="text-gray-600">
            Drag and drop cards between columns, use bulk operations, and filter cards
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search/Filter */}
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Filter cards..."
                value={state.filterText}
                onChange={(e) => actions.setFilter(e.target.value)}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            {/* Add new card */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="New card title..."
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addNewCard()}
                className="w-48"
              />
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {state.columns.map(column => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
              <Button onClick={addNewCard} disabled={!newCardTitle.trim()}>
                Add Card
              </Button>
            </div>

            {/* Clear filter */}
            {state.filterText && (
              <Button variant="outline" onClick={actions.clearFilter}>
                Clear Filter
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
            <span>Total Cards: {boardStats.totalCards}</span>
            <span>Columns: {boardStats.totalColumns}</span>
            <span>Selected: {boardStats.selectedCards}</span>
            {state.filterText && (
              <span>
                Filtered: {filteredColumns.reduce((sum, col) => sum + col.cards.length, 0)}
              </span>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {state.selectedCards.length} card(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => actions.bulkUpdateCards(state.selectedCards, { priority: 'high' })}
                >
                  Set High Priority
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => actions.bulkMoveCards(state.selectedCards, 'done')}
                >
                  Move to Done
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => actions.bulkDeleteCards(state.selectedCards)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={actions.clearSelection}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <KanbanBoard
            columns={filteredColumns}
            onCardMove={actions.moveCard}
            onCardClick={handleCardClick}
            onCardSelect={handleCardSelect}
            onColumnUpdate={actions.updateColumn}
            loading={state.isLoading}
            allowMultiSelect={true}
            showProgress={true}
            filterText={state.filterText}
            onFilterChange={actions.setFilter}
          />
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            How to Use
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Drag & Drop</h4>
              <ul className="space-y-1">
                <li>• Drag cards between columns to change status</li>
                <li>• Drop cards at specific positions within columns</li>
                <li>• Mobile: Long press and drag on touch devices</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Selection & Bulk Actions</h4>
              <ul className="space-y-1">
                <li>• Click checkboxes or Ctrl+Click to select multiple cards</li>
                <li>• Use bulk actions to update multiple cards at once</li>
                <li>• Filter cards using the search box</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanDemo;