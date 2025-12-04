'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Column, Card, ColumnWithCards, Label, BoardMember, BoardViewType, CardPriority } from '@/types/database';
import { KanbanColumn } from './KanbanColumn';
import { BoardSettingsModal } from './BoardSettingsModal';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus, Loader2, ArrowLeft, Settings, History, Lock } from 'lucide-react';
import Link from 'next/link';
import { KanbanCard } from './KanbanCard';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useBoardMembers, useBoardPresence, useBoardActivity, useViewState } from '@/hooks';
import { OnlineUsersBar, TypingIndicator } from '@/components/presence';
import { ActivitySidebar } from '@/components/activity';
import { BoardViewToolbar, CalendarView, GanttView, TableView } from '@/components/views';

interface BoardViewProps {
  boardId: string;
}

// Extended member type with user profile info
interface BoardMemberWithProfile extends BoardMember {
  user_profiles?: {
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function BoardView({ boardId }: BoardViewProps) {
  const { user, session } = useAuth();
  const [boardTitle, setBoardTitle] = useState('');
  const [columns, setColumns] = useState<ColumnWithCards[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [members, setMembers] = useState<BoardMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnWithCards | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showActivitySidebar, setShowActivitySidebar] = useState(false);

  // View state hook for multi-view support
  const { viewState, currentView, setCurrentView, setFilters } = useViewState(boardId);

  // Team collaboration hooks
  const { permissions, currentUserRole } = useBoardMembers(boardId);
  const { onlineUsers, typingUsers, setTyping, setEditingCard, getUsersEditingCard } = useBoardPresence(boardId);
  const { activities, groupedActivities, loading: activityLoading } = useBoardActivity(boardId);

  // Filter columns based on active filters
  const filteredColumns = useMemo(() => {
    const filters = viewState?.filters;
    if (!filters) return columns;
    
    const hasActiveFilters = 
      (filters.labels?.length || 0) > 0 ||
      (filters.assignees?.length || 0) > 0 ||
      (filters.priorities?.length || 0) > 0 ||
      (filters.search || '').trim() !== '' ||
      filters.dateRange?.start !== null ||
      filters.dateRange?.end !== null;
    
    if (!hasActiveFilters) return columns;
    
    return columns.map(column => ({
      ...column,
      cards: column.cards.filter(card => {
        // Filter by labels
        if (filters.labels && filters.labels.length > 0) {
          const cardLabels = card.label_ids || [];
          if (!filters.labels.some(labelId => cardLabels.includes(labelId))) {
            return false;
          }
        }
        
        // Filter by assignees
        if (filters.assignees && filters.assignees.length > 0) {
          if (!card.assignee_id || !filters.assignees.includes(card.assignee_id)) {
            return false;
          }
        }
        
        // Filter by priorities
        if (filters.priorities && filters.priorities.length > 0) {
          if (!card.priority || !filters.priorities.includes(card.priority)) {
            return false;
          }
        }
        
        // Filter by search term
        if (filters.search && filters.search.trim() !== '') {
          const searchLower = filters.search.toLowerCase();
          const titleMatch = card.title?.toLowerCase().includes(searchLower);
          const descMatch = card.description?.toLowerCase().includes(searchLower);
          if (!titleMatch && !descMatch) {
            return false;
          }
        }
        
        // Filter by date range (due_date)
        if (filters.dateRange) {
          const cardDueDate = card.due_date ? new Date(card.due_date) : null;
          
          // If card has no due date, exclude it when filtering by date
          if (!cardDueDate) {
            return false;
          }
          
          if (filters.dateRange.start) {
            const startDate = new Date(filters.dateRange.start);
            startDate.setHours(0, 0, 0, 0);
            if (cardDueDate < startDate) {
              return false;
            }
          }
          
          if (filters.dateRange.end) {
            const endDate = new Date(filters.dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            if (cardDueDate > endDate) {
              return false;
            }
          }
        }
        
        return true;
      })
    }));
  }, [columns, viewState?.filters]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Fetch board data
  const fetchBoardData = useCallback(async () => {
    try {
      // Fetch board
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError) throw boardError;
      setBoardTitle(board.title);

      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position');

      if (columnsError) throw columnsError;

      // Fetch cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('board_id', boardId)
        .order('position');

      if (cardsError) throw cardsError;

      // Fetch labels
      const { data: labelsData } = await supabase
        .from('labels')
        .select('*')
        .eq('board_id', boardId)
        .order('name');

      if (labelsData) setLabels(labelsData);

      // Fetch members with user profile info (email, display_name)
      const { data: membersData } = await supabase
        .from('board_members')
        .select(`
          *,
          user_profiles (
            email,
            display_name,
            avatar_url
          )
        `)
        .eq('board_id', boardId);

      if (membersData) setMembers(membersData as BoardMemberWithProfile[]);

      // Combine columns with their cards
      const columnsWithCards: ColumnWithCards[] = (columnsData || []).map((col) => ({
        ...col,
        cards: (cardsData || []).filter((card) => card.column_id === col.id),
      }));

      setColumns(columnsWithCards);
    } catch (err) {
      console.error('Error fetching board data:', err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`board-${boardId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'cards', 
          filter: `board_id=eq.${boardId}` 
        },
        (payload: RealtimePostgresChangesPayload<Card>) => {
          handleCardChange(payload);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'columns', 
          filter: `board_id=eq.${boardId}` 
        },
        (payload: RealtimePostgresChangesPayload<Column>) => {
          handleColumnChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId]);

  const handleCardChange = (payload: RealtimePostgresChangesPayload<Card>) => {
    const { eventType, new: newCard, old: oldCard } = payload;

    setColumns((prev) => {
      const updated = [...prev];

      if (eventType === 'INSERT' && newCard) {
        const colIndex = updated.findIndex((c) => c.id === (newCard as Card).column_id);
        if (colIndex !== -1) {
          updated[colIndex] = {
            ...updated[colIndex],
            cards: [...updated[colIndex].cards, newCard as Card].sort((a, b) => a.position - b.position),
          };
        }
      } else if (eventType === 'UPDATE' && newCard) {
        // Remove from old column and add to new column
        updated.forEach((col, colIndex) => {
          const cardIndex = col.cards.findIndex((c) => c.id === (newCard as Card).id);
          if (cardIndex !== -1) {
            updated[colIndex] = {
              ...updated[colIndex],
              cards: updated[colIndex].cards.filter((c) => c.id !== (newCard as Card).id),
            };
          }
        });
        const newColIndex = updated.findIndex((c) => c.id === (newCard as Card).column_id);
        if (newColIndex !== -1) {
          updated[newColIndex] = {
            ...updated[newColIndex],
            cards: [...updated[newColIndex].cards, newCard as Card].sort((a, b) => a.position - b.position),
          };
        }
      } else if (eventType === 'DELETE' && oldCard) {
        updated.forEach((col, colIndex) => {
          updated[colIndex] = {
            ...updated[colIndex],
            cards: updated[colIndex].cards.filter((c) => c.id !== (oldCard as Card).id),
          };
        });
      }

      return updated;
    });
  };

  const handleColumnChange = (payload: RealtimePostgresChangesPayload<Column>) => {
    const { eventType, new: newColumn, old: oldColumn } = payload;

    setColumns((prev) => {
      if (eventType === 'INSERT' && newColumn) {
        return [...prev, { ...(newColumn as Column), cards: [] }].sort((a, b) => a.position - b.position);
      } else if (eventType === 'UPDATE' && newColumn) {
        return prev
          .map((col) => (col.id === (newColumn as Column).id ? { ...col, ...(newColumn as Column) } : col))
          .sort((a, b) => a.position - b.position);
      } else if (eventType === 'DELETE' && oldColumn) {
        return prev.filter((col) => col.id !== (oldColumn as Column).id);
      }
      return prev;
    });
  };

  // Create a new card - direct insert to Supabase PostgreSQL
  const createCard = async (columnId: string, title: string, description?: string, dueDate?: string) => {
    if (!user) return null;

    try {
      // Get the max position in the column
      const { data: existingCards } = await supabase
        .from('cards')
        .select('position')
        .eq('column_id', columnId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existingCards && existingCards.length > 0 
        ? (existingCards[0] as { position: number }).position + 1 
        : 0;

      // Insert the card directly into Supabase PostgreSQL
      const { data, error } = await supabase
        .from('cards')
        .insert({
          title,
          description: description || null,
          column_id: columnId,
          board_id: boardId,
          due_date: dueDate || null,
          created_by: user.id,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating card:', error);
        alert(`Error creating card: ${error.message}`);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error creating card:', err);
      alert('Failed to create card. Please try again.');
      return null;
    }
  };

  // Add a new column
  const addColumn = async () => {
    if (!newColumnTitle.trim()) return;

    const { error } = await supabase
      .from('columns')
      .insert({
        board_id: boardId,
        title: newColumnTitle.trim(),
        position: columns.length,
      });

    if (error) {
      console.error('Error adding column:', error);
      return;
    }

    setNewColumnTitle('');
    setShowAddColumn(false);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    // Check if dragging a column
    const column = columns.find((col) => col.id === activeId);
    if (column) {
      setActiveColumn(column);
      return;
    }

    // Find the card being dragged
    for (const col of columns) {
      const card = col.cards.find((c) => c.id === activeId);
      if (card) {
        setActiveCard(card);
        break;
      }
    }
  };

  // Handle drag over (for moving between columns)
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Skip if dragging a column
    if (columns.some((col) => col.id === activeId)) {
      return;
    }

    // Find source column
    const sourceColumn = columns.find((col) =>
      col.cards.some((card) => card.id === activeId)
    );

    // Find destination column (either the column itself or a card in the column)
    let destColumn = columns.find((col) => col.id === overId);
    if (!destColumn) {
      destColumn = columns.find((col) =>
        col.cards.some((card) => card.id === overId)
      );
    }

    if (!sourceColumn || !destColumn || sourceColumn.id === destColumn.id) {
      return;
    }

    // Move card between columns (optimistic update)
    setColumns((prev) => {
      const sourceCards = [...sourceColumn.cards];
      const destCards = [...destColumn!.cards];

      const cardIndex = sourceCards.findIndex((c) => c.id === activeId);
      const [movedCard] = sourceCards.splice(cardIndex, 1);

      // Add to destination
      destCards.push({ ...movedCard, column_id: destColumn!.id });

      return prev.map((col) => {
        if (col.id === sourceColumn.id) {
          return { ...col, cards: sourceCards };
        }
        if (col.id === destColumn!.id) {
          return { ...col, cards: destCards };
        }
        return col;
      });
    });
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setActiveColumn(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dragging a column
    const activeColumnIndex = columns.findIndex((col) => col.id === activeId);
    const overColumnIndex = columns.findIndex((col) => col.id === overId);

    if (activeColumnIndex !== -1 && overColumnIndex !== -1 && activeColumnIndex !== overColumnIndex) {
      // Reordering columns
      const reorderedColumns = arrayMove(columns, activeColumnIndex, overColumnIndex);
      setColumns(reorderedColumns);

      // Update positions in database
      try {
        const updates = reorderedColumns.map((col, index) => 
          supabase
            .from('columns')
            .update({ position: index })
            .eq('id', col.id)
        );
        await Promise.all(updates);
      } catch (err) {
        console.error('Error updating column positions:', err);
        fetchBoardData();
      }
      return;
    }

    // Handle card drag
    // Find the card and its current column
    let currentColumn: ColumnWithCards | undefined;
    let card: Card | undefined;

    for (const col of columns) {
      const foundCard = col.cards.find((c) => c.id === activeId);
      if (foundCard) {
        currentColumn = col;
        card = foundCard;
        break;
      }
    }

    if (!currentColumn || !card) return;

    // Determine target column
    let targetColumn = columns.find((col) => col.id === overId);
    if (!targetColumn) {
      targetColumn = columns.find((col) =>
        col.cards.some((c) => c.id === overId)
      );
    }

    if (!targetColumn) {
      targetColumn = currentColumn;
    }

    // Calculate new position
    const targetCards = targetColumn.cards;
    const overCardIndex = targetCards.findIndex((c) => c.id === overId);
    let newPosition = 0;

    if (overCardIndex !== -1) {
      newPosition = overCardIndex;
    } else if (targetColumn.id === overId) {
      newPosition = targetCards.length;
    }

    // Update in database
    const { error } = await supabase
      .from('cards')
      .update({
        column_id: targetColumn.id,
        position: newPosition,
      })
      .eq('id', activeId);

    if (error) {
      console.error('Error updating card position:', error);
      // Refetch to sync state
      fetchBoardData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Check if user has access (is a member)
  const hasAccess = currentUserRole !== null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {boardTitle}
            </h1>
            {/* Role Badge */}
            {currentUserRole && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                currentUserRole === 'owner' 
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : currentUserRole === 'editor'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
              </span>
            )}
            {/* Read-only indicator for viewers */}
            {currentUserRole === 'viewer' && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                Read-only
              </span>
            )}
          </div>
        </div>

        {/* Right side: Online users, settings, activity */}
        <div className="flex items-center gap-4">
          {/* Online Users */}
          <OnlineUsersBar onlineUsers={onlineUsers} />

          {/* Activity Button */}
          <button
            onClick={() => setShowActivitySidebar(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Activity Log"
          >
            <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Board Settings"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <TypingIndicator typingUsers={typingUsers} />
        </div>
      )}

      {/* View Toolbar */}
      <BoardViewToolbar
        currentView={currentView === 'board' ? 'kanban' : currentView}
        onViewChange={(view) => setCurrentView(view === 'kanban' ? 'board' : view)}
        filters={{
          labels: viewState?.filters?.labels || [],
          assignees: viewState?.filters?.assignees || [],
          priority: viewState?.filters?.priorities || [],
          search: viewState?.filters?.search || '',
          dateRange: viewState?.filters?.dateRange ? {
            start: viewState.filters.dateRange.start instanceof Date 
              ? viewState.filters.dateRange.start.toISOString().split('T')[0]
              : viewState.filters.dateRange.start || undefined,
            end: viewState.filters.dateRange.end instanceof Date
              ? viewState.filters.dateRange.end.toISOString().split('T')[0]
              : viewState.filters.dateRange.end || undefined,
          } : undefined,
        }}
        onFiltersChange={(f) => setFilters({
          labels: f.labels,
          assignees: f.assignees,
          priorities: f.priority as CardPriority[] | undefined,
          search: f.search,
          dateRange: f.dateRange ? {
            start: f.dateRange.start ? new Date(f.dateRange.start) : null,
            end: f.dateRange.end ? new Date(f.dateRange.end) : null,
          } : null,
        })}
        labels={labels}
        members={members.map(m => ({ 
          ...m, 
          user_email: m.user_profiles?.email || m.user_profiles?.display_name || m.user_id 
        }))}
      />

      {/* Render active view */}
      {currentView === 'board' && (
        <div className="flex-1 overflow-x-auto p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full">
              <SortableContext
                items={filteredColumns.map((c) => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                {filteredColumns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    onCreateCard={permissions.canEditCards ? createCard : async () => null}
                    onDeleteColumn={permissions.canEditColumns ? async (columnId: string) => {
                      await supabase.from('columns').delete().eq('id', columnId);
                    } : async () => {}}
                    onUpdateColumn={permissions.canEditColumns ? async (columnId: string, title: string) => {
                      await supabase
                        .from('columns')
                        .update({ title })
                        .eq('id', columnId);
                    } : async () => {}}
                    canEdit={permissions.canEditCards}
                    onTyping={setTyping}
                    onEditingCard={setEditingCard}
                    getUsersEditingCard={getUsersEditingCard}
                  />
                ))}
              </SortableContext>

              {/* Add Column Button - Only for users with edit permission */}
              {permissions.canEditColumns && (
                showAddColumn ? (
                  <div className="w-72 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                    <input
                      type="text"
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      placeholder="Column title..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addColumn();
                        if (e.key === 'Escape') setShowAddColumn(false);
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addColumn}
                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddColumn(false)}
                        className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddColumn(true)}
                    className="w-72 flex-shrink-0 h-fit flex items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-400"
                  >
                    <Plus className="w-5 h-5" />
                    Add Column
                  </button>
                )
              )}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeCard && (
                <KanbanCard card={activeCard} isDragging boardId={boardId} />
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {currentView === 'calendar' && (
        <div className="flex-1 overflow-hidden">
          <CalendarView
            boardId={boardId}
            columns={columns.map(c => ({ id: c.id, board_id: boardId, title: c.title, position: c.position, created_at: '' }))}
            labels={labels}
            members={members}
          />
        </div>
      )}

      {currentView === 'gantt' && (
        <div className="flex-1 overflow-hidden">
          <GanttView
            boardId={boardId}
            columns={columns.map(c => ({ id: c.id, board_id: boardId, title: c.title, position: c.position, created_at: '' }))}
            labels={labels}
            members={members}
          />
        </div>
      )}

      {currentView === 'table' && (
        <div className="flex-1 overflow-hidden">
          <TableView
            boardId={boardId}
            columns={columns.map(c => ({ id: c.id, board_id: boardId, title: c.title, position: c.position, created_at: '' }))}
            labels={labels}
            members={members}
          />
        </div>
      )}

      {/* Board Settings Modal */}
      <BoardSettingsModal
        boardId={boardId}
        boardTitle={boardTitle}
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Activity Sidebar */}
      <ActivitySidebar
        isOpen={showActivitySidebar}
        onClose={() => setShowActivitySidebar(false)}
        activities={activities}
        groupedActivities={groupedActivities}
        loading={activityLoading}
      />
    </div>
  );
}
