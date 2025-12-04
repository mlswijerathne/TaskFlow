'use client';

import { OnlineUser } from '@/types/database';
import { User, Edit3 } from 'lucide-react';

interface CardEditingIndicatorProps {
  editingUsers: OnlineUser[];
}

export function CardEditingIndicator({ editingUsers }: CardEditingIndicatorProps) {
  if (editingUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs">
      <Edit3 className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
      <div className="flex items-center -space-x-1">
        {editingUsers.slice(0, 3).map((user) => (
          user.avatarUrl ? (
            <img
              key={user.userId}
              src={user.avatarUrl}
              alt={user.displayName || 'User'}
              className="w-4 h-4 rounded-full border border-white dark:border-gray-800"
            />
          ) : (
            <div
              key={user.userId}
              className="w-4 h-4 rounded-full border border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600 flex items-center justify-center"
            >
              <User className="w-2 h-2 text-gray-500" />
            </div>
          )
        ))}
      </div>
      <span className="text-yellow-700 dark:text-yellow-300">
        {editingUsers.length === 1
          ? `${editingUsers[0].displayName || 'Someone'} is editing`
          : `${editingUsers.length} editing`}
      </span>
    </div>
  );
}
