'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OnlineUser, PresenceState } from '@/types/database';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseBoardPresenceReturn {
  onlineUsers: OnlineUser[];
  typingUsers: OnlineUser[];
  editingUsers: Map<string, OnlineUser>;
  setTyping: (isTyping: boolean) => void;
  setEditingCard: (cardId: string | null) => void;
  isUserOnline: (userId: string) => boolean;
  getUsersEditingCard: (cardId: string) => OnlineUser[];
}

export function useBoardPresence(boardId: string): UseBoardPresenceReturn {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<OnlineUser[]>([]);
  const [editingUsers, setEditingUsers] = useState<Map<string, OnlineUser>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceStateRef = useRef<PresenceState | null>(null);

  // Update online users from presence state - defined first to be used in useEffect
  const updateOnlineUsers = useCallback((state: Record<string, PresenceState[]>) => {
    const users: OnlineUser[] = [];
    const typing: OnlineUser[] = [];
    const editing = new Map<string, OnlineUser>();

    Object.entries(state).forEach(([oderId, presences]) => {
      // Get the most recent presence for this user
      const presence = presences[0];
      if (!presence) return;

      const onlineUser: OnlineUser = {
        userId: oderId,
        displayName: presence.display_name,
        avatarUrl: presence.avatar_url,
        editingCardId: presence.editingCardId,
        isTyping: presence.isTyping,
        lastSeen: presence.lastSeen,
      };

      users.push(onlineUser);

      if (presence.isTyping) {
        typing.push(onlineUser);
      }

      if (presence.editingCardId) {
        editing.set(presence.editingCardId, onlineUser);
      }
    });

    setOnlineUsers(users);
    setTypingUsers(typing);
    setEditingUsers(editing);
  }, []);

  // Initialize presence state
  useEffect(() => {
    if (!user || !boardId) return;

    const channelName = `board-presence-${boardId}`;
    
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create presence channel
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    // Set initial presence state
    presenceStateRef.current = {
      userId: user.id,
      display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      avatar_url: user.user_metadata?.avatar_url || null,
      editingCardId: null,
      isTyping: false,
      lastSeen: new Date().toISOString(),
    };

    // Handle presence sync (initial and subsequent syncs)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceState>();
      updateOnlineUsers(state as unknown as Record<string, PresenceState[]>);
    });

    // Handle join events
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key, newPresences);
    });

    // Handle leave events
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key, leftPresences);
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && presenceStateRef.current) {
        await channel.track(presenceStateRef.current);
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, boardId, updateOnlineUsers]);

  // Set typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !presenceStateRef.current) return;

    presenceStateRef.current = {
      ...presenceStateRef.current,
      isTyping,
      lastSeen: new Date().toISOString(),
    };

    await channelRef.current.track(presenceStateRef.current);
  }, []);

  // Set editing card
  const setEditingCard = useCallback(async (cardId: string | null) => {
    if (!channelRef.current || !presenceStateRef.current) return;

    presenceStateRef.current = {
      ...presenceStateRef.current,
      editingCardId: cardId,
      lastSeen: new Date().toISOString(),
    };

    await channelRef.current.track(presenceStateRef.current);
  }, []);

  // Check if a user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.some(u => u.userId === userId);
  }, [onlineUsers]);

  // Get users editing a specific card
  const getUsersEditingCard = useCallback((cardId: string): OnlineUser[] => {
    return onlineUsers.filter(
      u => u.editingCardId === cardId && u.userId !== user?.id
    );
  }, [onlineUsers, user?.id]);

  return {
    onlineUsers,
    typingUsers,
    editingUsers,
    setTyping,
    setEditingCard,
    isUserOnline,
    getUsersEditingCard,
  };
}
