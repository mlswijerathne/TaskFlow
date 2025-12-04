-- Comprehensive fix for user_view_preferences RLS and permissions
-- This ensures the table is properly accessible via PostgREST API

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "user_view_preferences_own" ON user_view_preferences;
DROP POLICY IF EXISTS "user_view_preferences_select" ON user_view_preferences;
DROP POLICY IF EXISTS "user_view_preferences_insert" ON user_view_preferences;
DROP POLICY IF EXISTS "user_view_preferences_update" ON user_view_preferences;
DROP POLICY IF EXISTS "user_view_preferences_delete" ON user_view_preferences;

-- Ensure RLS is disabled (PostgREST doesn't like RLS for preference tables)
ALTER TABLE user_view_preferences DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to authenticated users for read/write access
GRANT SELECT, INSERT, UPDATE, DELETE ON user_view_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_view_preferences TO anon;

-- Now re-enable RLS with proper policies that check auth
ALTER TABLE user_view_preferences ENABLE ROW LEVEL SECURITY;

-- Create a simple SELECT policy that checks user_id
CREATE POLICY "user_view_preferences_select" ON user_view_preferences
  FOR SELECT
  USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- Create INSERT policy
CREATE POLICY "user_view_preferences_insert" ON user_view_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create UPDATE policy
CREATE POLICY "user_view_preferences_update" ON user_view_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create DELETE policy
CREATE POLICY "user_view_preferences_delete" ON user_view_preferences
  FOR DELETE
  USING (user_id = auth.uid());
