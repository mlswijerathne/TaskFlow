'use client';

import { useState, useRef, useEffect } from 'react';
import { ColumnWithCards, OnlineUser } from '@/types/database';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { Plus, MoreHorizontal, Trash2, Edit2, X, GripVertical, Calendar, Lock } from 'lucide-react';

interface KanbanColumnProps {
  column: ColumnWithCards;
  onCreateCard: (columnId: string, title: string, description?: string, dueDate?: string) => Promise<unknown>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onUpdateColumn: (columnId: string, title: string) => Promise<void>;
  canEdit?: boolean;
  onTyping?: (isTyping: boolean) => void;
  onEditingCard?: (cardId: string | null) => void;
  getUsersEditingCard?: (cardId: string) => OnlineUser[];
}

export function KanbanColumn({ column, onCreateCard, onDeleteColumn, onUpdateColumn, canEdit = true, onTyping, onEditingCard, getUsersEditingCard }: KanbanColumnProps) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');
  const [newCardDueDate, setNewCardDueDate] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDroppableRef(node);
    setSortableRef(node);
  };

  // Handle typing indicator with debounce
  const handleTypingChange = () => {
    if (onTyping) {
      onTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to clear typing status
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (onTyping) {
        onTyping(false);
      }
    };
  }, [onTyping]);

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    if (onTyping) onTyping(false); // Clear typing status
    await onCreateCard(column.id, newCardTitle.trim(), newCardDescription.trim() || undefined, newCardDueDate || undefined);
    setNewCardTitle('');
    setNewCardDescription('');
    setNewCardDueDate('');
    setShowAddCard(false);
  };

  const handleUpdateTitle = async () => {
    if (!editTitle.trim() || editTitle === column.title) {
      setEditTitle(column.title);
      setIsEditing(false);
      return;
    }
    await onUpdateColumn(column.id, editTitle.trim());
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-72 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-xl flex flex-col max-h-full ${
        isOver ? 'ring-2 ring-blue-500' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded mr-1"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleUpdateTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdateTitle();
              if (e.key === 'Escape') {
                setEditTitle(column.title);
                setIsEditing(false);
              }
            }}
            className="flex-1 px-2 py-1 text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            autoFocus
          />
        ) : (
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {column.title}
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
              ({column.cards.length})
            </span>
          </h3>
        )}

        <div className="relative">
          {canEdit ? (
            <>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    <Edit2 className="w-4 h-4" />
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      onDeleteColumn(column.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-1" title="Read-only">
              <Lock className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              canEdit={canEdit}
              boardId={column.board_id}
              onEditingCard={onEditingCard}
              getUsersEditingCard={getUsersEditingCard}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add Card Section */}
      {canEdit && (
        <div className="p-3 pt-0">
          {showAddCard ? (
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm">
              <input
                type="text"
                value={newCardTitle}
                onChange={(e) => {
                  setNewCardTitle(e.target.value);
                  handleTypingChange();
                }}
                placeholder="Card title..."
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) handleAddCard();
                  if (e.key === 'Escape') setShowAddCard(false);
                }}
              />
              <textarea
                value={newCardDescription}
                onChange={(e) => {
                  setNewCardDescription(e.target.value);
                  handleTypingChange();
                }}
                placeholder="Description (optional)..."
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-2 resize-none"
                rows={2}
              />
              <div className="mb-2">
                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Calendar className="w-3 h-3" />
                  Due Date (optional)
                </label>
                <input
                  type="datetime-local"
                  value={newCardDueDate}
                  onChange={(e) => setNewCardDueDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCard}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Add Card
                </button>
                <button
                  onClick={() => {
                    setShowAddCard(false);
                    setNewCardTitle('');
                    setNewCardDescription('');
                    setNewCardDueDate('');
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddCard(true)}
              className="w-full flex items-center justify-center gap-1 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Card
            </button>
          )}
        </div>
      )}
    </div>
  );
}