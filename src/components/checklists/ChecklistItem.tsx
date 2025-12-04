'use client';

import { useState } from 'react';
import { ChecklistItem as ChecklistItemType } from '@/types/database';
import { Check, Trash2, GripVertical, Edit2, X } from 'lucide-react';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: (completed: boolean) => Promise<boolean>;
  onUpdate: (title: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  disabled?: boolean;
}

export function ChecklistItemComponent({
  item,
  onToggle,
  onUpdate,
  onDelete,
  disabled = false,
}: ChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (disabled || isLoading) return;
    setIsLoading(true);
    try {
      await onToggle(!item.completed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editTitle.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const success = await onUpdate(editTitle.trim());
      if (success) {
        setIsEditing(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onDelete();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(item.title);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 py-1">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          autoFocus
          disabled={isLoading}
        />
        <button
          onClick={handleSave}
          disabled={!editTitle.trim() || isLoading}
          className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setEditTitle(item.title);
            setIsEditing(false);
          }}
          className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1 group">
      {!disabled && (
        <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab" />
      )}
      <button
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
          item.completed
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {item.completed && <Check className="w-3 h-3" />}
      </button>
      <span
        className={`flex-1 text-sm ${
          item.completed
            ? 'text-gray-400 dark:text-gray-500 line-through'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {item.title}
      </span>
      {!disabled && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
}
