-- Fix RLS policy for user_view_preferences and ensure table is properly exposed
-- This migration ensures the table is accessible via PostgREST API

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "user_view_preferences_own" ON user_view_preferences;

-- Make sure RLS is enabled
ALTER TABLE user_view_preferences ENABLE ROW LEVEL SECURITY;

-- Create permissive SELECT policy for authenticated users
CREATE POLICY "user_view_preferences_select" ON user_view_preferences
  FOR SELECT
  USING (user_id = auth.uid());

-- Create permissive INSERT policy for authenticated users
CREATE POLICY "user_view_preferences_insert" ON user_view_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create permissive UPDATE policy for authenticated users
CREATE POLICY "user_view_preferences_update" ON user_view_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create permissive DELETE policy for authenticated users
CREATE POLICY "user_view_preferences_delete" ON user_view_preferences
  FOR DELETE
  USING (user_id = auth.uid());

-- Grant explicit permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON user_view_preferences TO authenticated;
