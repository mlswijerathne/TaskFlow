'use client';

import { OnlineUser } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { User, Users } from 'lucide-react';

interface OnlineUsersBarProps {
  onlineUsers: OnlineUser[];
  maxDisplayed?: number;
}

export function OnlineUsersBar({ onlineUsers, maxDisplayed = 5 }: OnlineUsersBarProps) {
  const { user } = useAuth();

  // Filter out current user for display
  const otherUsers = onlineUsers.filter(u => u.userId !== user?.id);
  const displayedUsers = otherUsers.slice(0, maxDisplayed);
  const remainingCount = otherUsers.length - maxDisplayed;

  if (otherUsers.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
        <Users className="w-4 h-4" />
        <span>Only you</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-2">
        {displayedUsers.map((onlineUser) => (
          <div
            key={onlineUser.userId}
            className="relative group"
          >
            {onlineUser.avatarUrl ? (
              <img
                src={onlineUser.avatarUrl}
                alt={onlineUser.displayName || 'User'}
                className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
            )}
            
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {onlineUser.displayName || 'Anonymous'}
              {onlineUser.isTyping && <span className="ml-1">(typing...)</span>}
            </div>
          </div>
        ))}

        {remainingCount > 0 && (
          <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
            +{remainingCount}
          </div>
        )}
      </div>

      <span className="text-sm text-gray-500 dark:text-gray-400">
        {otherUsers.length} online
      </span>
    </div>
  );
}
