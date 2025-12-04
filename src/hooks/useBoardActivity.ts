'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BoardActivity, 
  BoardActivityWithProfile, 
  UserProfile,
  ActivityAction,
  ActivityEntityType 
} from '@/types/database';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseBoardActivityReturn {
  activities: BoardActivityWithProfile[];
  loading: boolean;
  error: string | null;
  logActivity: (
    action: ActivityAction,
    entityType: ActivityEntityType,
    entityId?: string,
    details?: Record<string, unknown>
  ) => Promise<void>;
  refetch: () => Promise<void>;
  groupedActivities: GroupedActivities;
}

interface GroupedActivities {
  today: BoardActivityWithProfile[];
  yesterday: BoardActivityWithProfile[];
  lastWeek: BoardActivityWithProfile[];
  older: BoardActivityWithProfile[];
}

export function useBoardActivity(boardId: string): UseBoardActivityReturn {
  const { user } = useAuth();
  const [activities, setActivities] = useState<BoardActivityWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch activities with user profiles
  const fetchActivities = useCallback(async () => {
    if (!boardId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch recent activities (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: activitiesData, error: activitiesError } = await supabase
        .from('board_activity')
        .select('*')
        .eq('board_id', boardId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (activitiesError) {
        throw activitiesError;
      }

      if (!activitiesData || activitiesData.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // Fetch user profiles for all activity users
      const userIds = [...new Set(activitiesData.map(a => a.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError);
      }

      // Create a map of profiles for quick lookup
      const profilesMap = new Map<string, UserProfile>();
      (profilesData || []).forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Combine activities with profiles
      const activitiesWithProfiles: BoardActivityWithProfile[] = activitiesData.map(activity => ({
        ...activity,
        user_profile: profilesMap.get(activity.user_id) || null,
      }));

      setActivities(activitiesWithProfiles);
    } catch (err) {
      console.error('Error fetching board activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Set up realtime subscription for activity changes
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`board-activity-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'board_activity',
          filter: `board_id=eq.${boardId}`,
        },
        async (payload: RealtimePostgresChangesPayload<BoardActivity>) => {
          const newActivity = payload.new as BoardActivity;
          if (!newActivity) return;

          // Fetch profile for the new activity
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', newActivity.user_id)
            .single();

          const activityWithProfile: BoardActivityWithProfile = {
            ...newActivity,
            user_profile: profile || null,
          };

          setActivities(prev => [activityWithProfile, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId]);

  // Log a new activity (for manual logging from client-side)
  const logActivity = useCallback(async (
    action: ActivityAction,
    entityType: ActivityEntityType,
    entityId?: string,
    details?: Record<string, unknown>
  ) => {
    if (!user || !boardId) return;

    try {
      await supabase.from('board_activity').insert({
        board_id: boardId,
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || {},
      });
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  }, [user, boardId]);

  // Group activities by time period
  const groupedActivities = useCallback((): GroupedActivities => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: GroupedActivities = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: [],
    };

    activities.forEach(activity => {
      const activityDate = new Date(activity.created_at);
      
      if (activityDate >= today) {
        groups.today.push(activity);
      } else if (activityDate >= yesterday) {
        groups.yesterday.push(activity);
      } else if (activityDate >= lastWeek) {
        groups.lastWeek.push(activity);
      } else {
        groups.older.push(activity);
      }
    });

    return groups;
  }, [activities]);

  return {
    activities,
    loading,
    error,
    logActivity,
    refetch: fetchActivities,
    groupedActivities: groupedActivities(),
  };
}

// Helper function to format activity message
export function formatActivityMessage(activity: BoardActivityWithProfile): string {
  const userName = activity.user_profile?.display_name || 'Someone';
  const details = activity.details as Record<string, unknown>;

  switch (activity.action) {
    case 'card_created':
      return `${userName} created card "${details.title || 'Untitled'}"`;
    case 'card_moved':
      return `${userName} moved card "${details.title || 'a card'}"`;
    case 'card_updated':
      return `${userName} updated card "${details.title || 'a card'}"`;
    case 'card_assigned':
      return `${userName} assigned "${details.title || 'a card'}"`;
    case 'card_deleted':
      return `${userName} deleted card "${details.title || 'a card'}"`;
    case 'due_date_changed':
      return `${userName} changed due date for "${details.title || 'a card'}"`;
    case 'column_created':
      return `${userName} created column "${details.title || 'Untitled'}"`;
    case 'column_renamed':
      return `${userName} renamed column to "${details.new_title || 'Untitled'}"`;
    case 'column_deleted':
      return `${userName} deleted column "${details.title || 'a column'}"`;
    case 'member_added':
      return `${userName} added a new member`;
    case 'member_removed':
      return `${userName} removed a member`;
    case 'role_changed':
      return `${userName} changed a member's role to ${details.new_role || 'unknown'}`;
    default:
      return `${userName} performed an action`;
  }
}

// Helper function to get activity icon
export function getActivityIcon(action: ActivityAction): string {
  switch (action) {
    case 'card_created':
      return '➕';
    case 'card_moved':
      return '↔️';
    case 'card_updated':
      return '✏️';
    case 'card_assigned':
      return '👤';
    case 'card_deleted':
      return '🗑️';
    case 'due_date_changed':
      return '📅';
    case 'column_created':
      return '📊';
    case 'column_renamed':
      return '✏️';
    case 'column_deleted':
      return '🗑️';
    case 'member_added':
      return '👥';
    case 'member_removed':
      return '👋';
    case 'role_changed':
      return '🔑';
    default:
      return '📌';
  }
}
