-- =====================================================
-- Fix: Board Members RLS Policy & User Profiles Sync
-- =====================================================

-- =====================================================
-- 1. FIX BOARD MEMBERS RLS POLICY
-- Allow board owners to see ALL members of their boards
-- =====================================================

DROP POLICY IF EXISTS "board_members_select" ON board_members;

CREATE POLICY "board_members_select" ON board_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_members.board_id
      AND b.owner = auth.uid()
    )
  );

-- =====================================================
-- 2. SYNC USER PROFILES FROM AUTH.USERS
-- =====================================================

INSERT INTO user_profiles (id, email, display_name, avatar_url)
SELECT 
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'name', 
    split_part(email, '@', 1)
  ) as display_name,
  COALESCE(
    raw_user_meta_data->>'avatar_url', 
    raw_user_meta_data->>'picture'
  ) as avatar_url
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
  updated_at = now();

SELECT 'Board members RLS and user profiles fix applied!' AS status;
