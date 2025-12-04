'use client';

import { BoardActivityWithProfile } from '@/types/database';
import { formatActivityMessage, getActivityIcon } from '@/hooks/useBoardActivity';
import { ActivityAction } from '@/types/database';
import { X, History, Loader2, User } from 'lucide-react';

interface GroupedActivities {
  today: BoardActivityWithProfile[];
  yesterday: BoardActivityWithProfile[];
  lastWeek: BoardActivityWithProfile[];
  older: BoardActivityWithProfile[];
}

interface ActivitySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activities: BoardActivityWithProfile[];
  groupedActivities: GroupedActivities;
  loading?: boolean;
}

export function ActivitySidebar({
  isOpen,
  onClose,
  activities,
  groupedActivities,
  loading = false,
}: ActivitySidebarProps) {
  if (!isOpen) return null;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderActivityItem = (activity: BoardActivityWithProfile) => (
    <div key={activity.id} className="flex gap-3 py-3">
      {/* User Avatar */}
      <div className="flex-shrink-0">
        {activity.user_profile?.avatar_url ? (
          <img
            src={activity.user_profile.avatar_url}
            alt={activity.user_profile.display_name || 'User'}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
        )}
      </div>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">
          <span className="mr-1">{getActivityIcon(activity.action as ActivityAction)}</span>
          {formatActivityMessage(activity)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {formatTime(activity.created_at)}
        </p>
      </div>
    </div>
  );

  const renderActivityGroup = (
    title: string,
    activities: BoardActivityWithProfile[]
  ) => {
    if (activities.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {title}
        </h3>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {activities.map(renderActivityItem)}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm mt-1">
                Actions on this board will appear here
              </p>
            </div>
          ) : (
            <>
              {renderActivityGroup('Today', groupedActivities.today)}
              {renderActivityGroup('Yesterday', groupedActivities.yesterday)}
              {renderActivityGroup('Last 7 Days', groupedActivities.lastWeek)}
              {renderActivityGroup('Older', groupedActivities.older)}
            </>
          )}
        </div>
      </div>
    </>
  );
}
