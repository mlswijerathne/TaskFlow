-- =====================================================
-- Fix: User Lookup, Profile Creation, and Board Members RLS
-- This migration fixes:
-- 1. Users can't be found by email (profile doesn't exist)
-- 2. Board owners can't see all board members (RLS too restrictive)
-- =====================================================

-- =====================================================
-- 1. CREATE USER PROFILES FOR EXISTING AUTH USERS
-- This should be run with admin/service role privileges
-- =====================================================

-- Note: This requires admin access to auth.users table
-- Run this in Supabase SQL Editor with admin privileges:

-- INSERT INTO user_profiles (id, email, display_name, avatar_url)
-- SELECT 
--   id,
--   email,
--   COALESCE(
--     raw_user_meta_data->>'full_name', 
--     raw_user_meta_data->>'name', 
--     split_part(email, '@', 1)
--   ) as display_name,
--   COALESCE(
--     raw_user_meta_data->>'avatar_url', 
--     raw_user_meta_data->>'picture'
--   ) as avatar_url
-- FROM auth.users
-- ON CONFLICT (id) DO UPDATE SET
--   email = EXCLUDED.email,
--   display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
--   avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
--   updated_at = now();

-- =====================================================
-- 2. UPDATE get_user_by_email FUNCTION
-- Allow lookup from auth.users as fallback
-- =====================================================

-- Drop the old function first
DROP FUNCTION IF EXISTS get_user_by_email(TEXT);

-- Create improved function that checks user_profiles first,
-- then falls back to auth.users if needed
CREATE OR REPLACE FUNCTION get_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, email TEXT, display_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- First try to find in user_profiles
  SELECT up.id, up.email, up.display_name, up.avatar_url
  INTO v_user_id, v_email, v_display_name, v_avatar_url
  FROM user_profiles up
  WHERE LOWER(up.email) = LOWER(p_email)
  LIMIT 1;
  
  -- If found in user_profiles, return it
  IF v_user_id IS NOT NULL THEN
    RETURN QUERY SELECT v_user_id, v_email, v_display_name, v_avatar_url;
    RETURN;
  END IF;
  
  -- Fallback: Try to find in auth.users and create profile
  SELECT au.id, au.email, 
         COALESCE(au.raw_user_meta_data->>'full_name', 
                  au.raw_user_meta_data->>'name', 
                  split_part(au.email, '@', 1)),
         COALESCE(au.raw_user_meta_data->>'avatar_url', 
                  au.raw_user_meta_data->>'picture')
  INTO v_user_id, v_email, v_display_name, v_avatar_url
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(p_email)
  LIMIT 1;
  
  -- If found in auth.users, create the profile and return
  IF v_user_id IS NOT NULL THEN
    -- Create the missing profile
    INSERT INTO user_profiles (id, email, display_name, avatar_url)
    VALUES (v_user_id, v_email, v_display_name, v_avatar_url)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
      updated_at = now();
    
    RETURN QUERY SELECT v_user_id, v_email, v_display_name, v_avatar_url;
    RETURN;
  END IF;
  
  -- User not found anywhere
  RETURN;
END;
$$;

-- =====================================================
-- 3. ENABLE THE TRIGGER ON auth.users
-- This ensures new users get profiles automatically
-- Note: This requires admin privileges
-- =====================================================

-- Run this in Supabase SQL Editor with admin privileges:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT OR UPDATE ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'User lookup fix applied successfully!' AS status;

-- =====================================================
-- 4. FIX BOARD MEMBERS RLS POLICY
-- Allow board owners to see ALL members of their boards
-- =====================================================

-- Drop the restrictive select policy
DROP POLICY IF EXISTS "board_members_select" ON board_members;

-- Create new policy: Users can see members of boards they own OR their own memberships
CREATE POLICY "board_members_select" ON board_members
  FOR SELECT
  USING (
    -- User can see their own membership
    user_id = auth.uid()
    OR
    -- Board owner can see all members of their boards
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_members.board_id
      AND b.owner = auth.uid()
    )
  );

SELECT 'Board members RLS fix applied!' AS status;
