'use client';

import { OnlineUser } from '@/types/database';

interface TypingIndicatorProps {
  typingUsers: OnlineUser[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) {
    return null;
  }

  const names = typingUsers
    .slice(0, 3)
    .map(u => u.displayName || 'Someone')
    .join(', ');

  const suffix = typingUsers.length > 3 
    ? ` and ${typingUsers.length - 3} more`
    : '';

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {names}{suffix} {typingUsers.length === 1 ? 'is' : 'are'} typing...
      </span>
    </div>
  );
}
