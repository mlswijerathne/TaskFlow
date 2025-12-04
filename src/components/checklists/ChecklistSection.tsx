'use client';

import { useState } from 'react';
import { ChecklistWithItems } from '@/types/database';
import { ChecklistItemComponent } from './ChecklistItem';
import { ChecklistProgress } from './ChecklistProgress';
import { ChevronDown, ChevronRight, Trash2, Edit2, Plus, X, Check, Loader2 } from 'lucide-react';

interface ChecklistSectionProps {
  checklist: ChecklistWithItems;
  onUpdateTitle: (title: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onAddItem: (title: string) => Promise<boolean>;
  onToggleItem: (itemId: string, completed: boolean) => Promise<boolean>;
  onUpdateItem: (itemId: string, title: string) => Promise<boolean>;
  onDeleteItem: (itemId: string) => Promise<boolean>;
  disabled?: boolean;
}

export function ChecklistSection({
  checklist,
  onUpdateTitle,
  onDelete,
  onAddItem,
  onToggleItem,
  onUpdateItem,
  onDeleteItem,
  disabled = false,
}: ChecklistSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(checklist.title);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const completedCount = checklist.items.filter(item => item.completed).length;
  const totalCount = checklist.items.length;

  const handleSaveTitle = async () => {
    if (!editTitle.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const success = await onUpdateTitle(editTitle.trim());
      if (success) {
        setIsEditingTitle(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this checklist and all its items?')) return;
    setIsLoading(true);
    try {
      await onDelete();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const success = await onAddItem(newItemTitle.trim());
      if (success) {
        setNewItemTitle('');
        // Keep the add item form open for convenience
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: 'title' | 'item') => {
    if (e.key === 'Enter') {
      if (action === 'title') {
        handleSaveTitle();
      } else {
        handleAddItem();
      }
    } else if (e.key === 'Escape') {
      if (action === 'title') {
        setEditTitle(checklist.title);
        setIsEditingTitle(false);
      } else {
        setNewItemTitle('');
        setShowAddItem(false);
      }
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {isEditingTitle ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'title')}
              className="flex-1 px-2 py-1 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              autoFocus
              disabled={isLoading}
            />
            <button
              onClick={handleSaveTitle}
              disabled={!editTitle.trim() || isLoading}
              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setEditTitle(checklist.title);
                setIsEditingTitle(false);
              }}
              className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
              {checklist.title}
            </span>
            {totalCount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {completedCount}/{totalCount}
              </span>
            )}
            {!disabled && (
              <div className="flex gap-1">
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100"
                  title="Edit title"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Delete checklist"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Progress Bar */}
      {isExpanded && totalCount > 0 && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <ChecklistProgress completed={completedCount} total={totalCount} />
        </div>
      )}

      {/* Items */}
      {isExpanded && (
        <div className="p-3 space-y-1">
          {checklist.items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
              No items yet
            </p>
          ) : (
            checklist.items.map((item) => (
              <ChecklistItemComponent
                key={item.id}
                item={item}
                onToggle={(completed) => onToggleItem(item.id, completed)}
                onUpdate={(title) => onUpdateItem(item.id, title)}
                onDelete={() => onDeleteItem(item.id)}
                disabled={disabled}
              />
            ))
          )}

          {/* Add Item */}
          {!disabled && (
            <div className="pt-2">
              {showAddItem ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'item')}
                    placeholder="Add an item..."
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemTitle.trim() || isLoading}
                    className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setNewItemTitle('');
                      setShowAddItem(false);
                    }}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <Plus className="w-4 h-4" />
                  Add item
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
