-- =====================================================
-- Phase 1: Team Collaboration Schema
-- Board Members, Role-Based Permissions, Activity Logging
-- =====================================================

-- =====================================================
-- 1. CREATE BOARD_MEMBERS TABLE
-- =====================================================

-- Board members table for team collaboration
CREATE TABLE IF NOT EXISTS board_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);
CREATE INDEX IF NOT EXISTS idx_board_members_role ON board_members(board_id, role);

-- =====================================================
-- 2. CREATE BOARD_ACTIVITY TABLE
-- =====================================================

-- Activity log table for tracking all board events
CREATE TABLE IF NOT EXISTS board_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'card', 'column', 'member', 'board'
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for activity queries
CREATE INDEX IF NOT EXISTS idx_board_activity_board_id ON board_activity(board_id);
CREATE INDEX IF NOT EXISTS idx_board_activity_created_at ON board_activity(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_activity_user_id ON board_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_board_activity_entity ON board_activity(entity_type, entity_id);

-- =====================================================
-- 3. CREATE USER_PROFILES TABLE FOR EMAIL LOOKUP
-- =====================================================

-- User profiles table for storing user display info (synced from auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY, -- same as auth.users.id
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. BOARD MEMBERS RLS POLICIES (NO SELF-REFERENCE TO AVOID RECURSION)
-- =====================================================

-- Drop all existing board_members policies
DROP POLICY IF EXISTS "board_members_read_own" ON board_members;
DROP POLICY IF EXISTS "board_members_read_board" ON board_members;
DROP POLICY IF EXISTS "board_members_insert_owner" ON board_members;
DROP POLICY IF EXISTS "board_members_update_owner" ON board_members;
DROP POLICY IF EXISTS "board_members_delete_owner" ON board_members;
DROP POLICY IF EXISTS "board_members_select" ON board_members;
DROP POLICY IF EXISTS "board_members_insert" ON board_members;
DROP POLICY IF EXISTS "board_members_update" ON board_members;
DROP POLICY IF EXISTS "board_members_delete" ON board_members;

-- Users can see their own memberships (no self-reference, avoids recursion)
CREATE POLICY "board_members_select" ON board_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Board owners can add members (check via boards table, not board_members)
CREATE POLICY "board_members_insert" ON board_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_members.board_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can update members (check via boards table)
CREATE POLICY "board_members_update" ON board_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_members.board_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can delete, or users can leave (delete their own membership)
CREATE POLICY "board_members_delete" ON board_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_members.board_id
      AND b.owner = auth.uid()
    )
  );

-- =====================================================
-- 6. ACTIVITY LOG RLS POLICIES
-- =====================================================

-- Users can read activity for boards they own (check via boards table to avoid recursion)
DROP POLICY IF EXISTS "board_activity_read_members" ON board_activity;
CREATE POLICY "board_activity_read" ON board_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_activity.board_id
      AND b.owner = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Users can insert activity for their own actions
DROP POLICY IF EXISTS "board_activity_insert_members" ON board_activity;
CREATE POLICY "board_activity_insert" ON board_activity
  FOR INSERT
  WITH CHECK (
    board_activity.user_id = auth.uid()
  );

-- =====================================================
-- 7. USER PROFILES RLS POLICIES
-- =====================================================

-- Anyone can read user profiles
DROP POLICY IF EXISTS "user_profiles_read_all" ON user_profiles;
CREATE POLICY "user_profiles_read_all" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
CREATE POLICY "user_profiles_insert_own" ON user_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================================================
-- 8. UPDATE EXISTING TABLE RLS POLICIES (AVOID RECURSION)
-- =====================================================

-- Update boards policy - ONLY check owner to avoid recursion with board_members
DROP POLICY IF EXISTS "boards_owner_policy" ON boards;
DROP POLICY IF EXISTS "boards_member_read" ON boards;
DROP POLICY IF EXISTS "boards_owner_write" ON boards;
DROP POLICY IF EXISTS "boards_owner_insert" ON boards;
DROP POLICY IF EXISTS "boards_owner_update" ON boards;
DROP POLICY IF EXISTS "boards_owner_delete" ON boards;
DROP POLICY IF EXISTS "boards_select" ON boards;
DROP POLICY IF EXISTS "boards_insert" ON boards;
DROP POLICY IF EXISTS "boards_update" ON boards;
DROP POLICY IF EXISTS "boards_delete" ON boards;

-- Users can read boards they own
CREATE POLICY "boards_select" ON boards
  FOR SELECT
  USING (owner = auth.uid());

-- Users can insert boards they own
CREATE POLICY "boards_insert" ON boards
  FOR INSERT
  WITH CHECK (owner = auth.uid());

-- Users can update boards they own
CREATE POLICY "boards_update" ON boards
  FOR UPDATE
  USING (owner = auth.uid())
  WITH CHECK (owner = auth.uid());

-- Users can delete boards they own
CREATE POLICY "boards_delete" ON boards
  FOR DELETE
  USING (owner = auth.uid());

-- Update columns policy - use boards.owner to avoid recursion
DROP POLICY IF EXISTS "columns_owner_policy" ON columns;
DROP POLICY IF EXISTS "columns_member_read" ON columns;
DROP POLICY IF EXISTS "columns_editor_write" ON columns;
DROP POLICY IF EXISTS "columns_editor_insert" ON columns;
DROP POLICY IF EXISTS "columns_editor_update" ON columns;
DROP POLICY IF EXISTS "columns_editor_delete" ON columns;
DROP POLICY IF EXISTS "columns_select" ON columns;
DROP POLICY IF EXISTS "columns_insert" ON columns;
DROP POLICY IF EXISTS "columns_update" ON columns;
DROP POLICY IF EXISTS "columns_delete" ON columns;

-- Board owners can read columns
CREATE POLICY "columns_select" ON columns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = columns.board_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can insert columns
CREATE POLICY "columns_insert" ON columns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = columns.board_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can update columns
CREATE POLICY "columns_update" ON columns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = columns.board_id
      AND b.owner = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = columns.board_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can delete columns
CREATE POLICY "columns_delete" ON columns
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = columns.board_id
      AND b.owner = auth.uid()
    )
  );

-- Update cards policy - use boards.owner to avoid recursion
DROP POLICY IF EXISTS "cards_owner_or_assignee" ON cards;
DROP POLICY IF EXISTS "cards_member_read" ON cards;
DROP POLICY IF EXISTS "cards_editor_write" ON cards;
DROP POLICY IF EXISTS "cards_editor_insert" ON cards;
DROP POLICY IF EXISTS "cards_editor_update" ON cards;
DROP POLICY IF EXISTS "cards_editor_delete" ON cards;
DROP POLICY IF EXISTS "cards_select" ON cards;
DROP POLICY IF EXISTS "cards_insert" ON cards;
DROP POLICY IF EXISTS "cards_update" ON cards;
DROP POLICY IF EXISTS "cards_delete" ON cards;

-- Board owners can read cards
CREATE POLICY "cards_select" ON cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = cards.board_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can insert cards
CREATE POLICY "cards_insert" ON cards
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = cards.board_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can update cards
CREATE POLICY "cards_update" ON cards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = cards.board_id
      AND b.owner = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = cards.board_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can delete cards
CREATE POLICY "cards_delete" ON cards
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = cards.board_id
      AND b.owner = auth.uid()
    )
  );

-- Update attachments policy - use boards.owner to avoid recursion
DROP POLICY IF EXISTS "attachments_card_access" ON attachments;
DROP POLICY IF EXISTS "attachments_member_read" ON attachments;
DROP POLICY IF EXISTS "attachments_editor_write" ON attachments;
DROP POLICY IF EXISTS "attachments_editor_insert" ON attachments;
DROP POLICY IF EXISTS "attachments_editor_update" ON attachments;
DROP POLICY IF EXISTS "attachments_editor_delete" ON attachments;
DROP POLICY IF EXISTS "attachments_select" ON attachments;
DROP POLICY IF EXISTS "attachments_insert" ON attachments;
DROP POLICY IF EXISTS "attachments_update" ON attachments;
DROP POLICY IF EXISTS "attachments_delete" ON attachments;

-- Board owners can read attachments
CREATE POLICY "attachments_select" ON attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = attachments.card_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can insert attachments
CREATE POLICY "attachments_insert" ON attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = attachments.card_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can update attachments
CREATE POLICY "attachments_update" ON attachments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = attachments.card_id
      AND b.owner = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = attachments.card_id
      AND b.owner = auth.uid()
    )
  );

-- Board owners can delete attachments
CREATE POLICY "attachments_delete" ON attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = attachments.card_id
      AND b.owner = auth.uid()
    )
  );

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Function to get user role for a board
CREATE OR REPLACE FUNCTION get_user_board_role(p_board_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM board_members
  WHERE board_id = p_board_id AND user_id = p_user_id
  LIMIT 1;
$$;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION check_board_permission(
  p_board_id UUID, 
  p_user_id UUID, 
  p_required_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM board_members
    WHERE board_id = p_board_id 
    AND user_id = p_user_id
    AND role = ANY(p_required_roles)
  );
$$;

-- Function to get user by email
CREATE OR REPLACE FUNCTION get_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, email TEXT, display_name TEXT, avatar_url TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT up.id, up.email, up.display_name, up.avatar_url
  FROM user_profiles up
  WHERE LOWER(up.email) = LOWER(p_email)
  LIMIT 1;
$$;

-- =====================================================
-- 10. TRIGGERS FOR AUTO-CREATING BOARD MEMBERS
-- =====================================================

-- Function to auto-create owner membership when board is created
CREATE OR REPLACE FUNCTION create_board_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO board_members (board_id, user_id, role)
  VALUES (NEW.id, NEW.owner, 'owner')
  ON CONFLICT (board_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_board_owner ON boards;
CREATE TRIGGER trigger_create_board_owner
  AFTER INSERT ON boards
  FOR EACH ROW
  EXECUTE FUNCTION create_board_owner_membership();

-- =====================================================
-- 11. TRIGGERS FOR ACTIVITY LOGGING
-- =====================================================

-- Function to log card activity
CREATE OR REPLACE FUNCTION log_card_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_details JSONB;
  v_user_id UUID;
BEGIN
  -- Get the user ID, fallback to created_by if auth.uid() is null
  v_user_id := COALESCE(auth.uid(), NEW.created_by, OLD.created_by);
  
  -- Skip logging if we still don't have a user ID
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'card_created';
    v_details := jsonb_build_object(
      'title', NEW.title,
      'column_id', NEW.column_id
    );
    
    INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
    VALUES (NEW.board_id, v_user_id, v_action, 'card', NEW.id, v_details);
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log specific changes
    IF OLD.column_id != NEW.column_id THEN
      v_action := 'card_moved';
      v_details := jsonb_build_object(
        'title', NEW.title,
        'from_column', OLD.column_id,
        'to_column', NEW.column_id
      );
      INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
      VALUES (NEW.board_id, v_user_id, v_action, 'card', NEW.id, v_details);
    END IF;
    
    IF OLD.assignee IS DISTINCT FROM NEW.assignee THEN
      v_action := 'card_assigned';
      v_details := jsonb_build_object(
        'title', NEW.title,
        'from_assignee', OLD.assignee,
        'to_assignee', NEW.assignee
      );
      INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
      VALUES (NEW.board_id, v_user_id, v_action, 'card', NEW.id, v_details);
    END IF;
    
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      v_action := 'due_date_changed';
      v_details := jsonb_build_object(
        'title', NEW.title,
        'from_date', OLD.due_date,
        'to_date', NEW.due_date
      );
      INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
      VALUES (NEW.board_id, v_user_id, v_action, 'card', NEW.id, v_details);
    END IF;
    
    IF OLD.title != NEW.title OR OLD.description IS DISTINCT FROM NEW.description THEN
      v_action := 'card_updated';
      v_details := jsonb_build_object(
        'title', NEW.title,
        'old_title', OLD.title
      );
      INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
      VALUES (NEW.board_id, v_user_id, v_action, 'card', NEW.id, v_details);
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'card_deleted';
    v_details := jsonb_build_object('title', OLD.title);
    
    INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
    VALUES (OLD.board_id, v_user_id, v_action, 'card', OLD.id, v_details);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_card_activity ON cards;
CREATE TRIGGER trigger_log_card_activity
  AFTER INSERT OR UPDATE OR DELETE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION log_card_activity();

-- Function to log column activity
CREATE OR REPLACE FUNCTION log_column_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_details JSONB;
  v_user_id UUID;
  v_board_owner UUID;
BEGIN
  -- Try to get user ID from auth context, fallback to board owner
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    -- Get board owner as fallback
    SELECT owner INTO v_user_id
    FROM boards
    WHERE id = COALESCE(NEW.board_id, OLD.board_id)
    LIMIT 1;
  END IF;
  
  -- Skip logging if we still don't have a user ID
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'column_created';
    v_details := jsonb_build_object('title', NEW.title);
    
    INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
    VALUES (NEW.board_id, v_user_id, v_action, 'column', NEW.id, v_details);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.title != NEW.title THEN
      v_action := 'column_renamed';
      v_details := jsonb_build_object(
        'old_title', OLD.title,
        'new_title', NEW.title
      );
      INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
      VALUES (NEW.board_id, v_user_id, v_action, 'column', NEW.id, v_details);
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'column_deleted';
    v_details := jsonb_build_object('title', OLD.title);
    
    INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
    VALUES (OLD.board_id, v_user_id, v_action, 'column', OLD.id, v_details);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_column_activity ON columns;
CREATE TRIGGER trigger_log_column_activity
  AFTER INSERT OR UPDATE OR DELETE ON columns
  FOR EACH ROW
  EXECUTE FUNCTION log_column_activity();

-- Function to log member activity
CREATE OR REPLACE FUNCTION log_member_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_details JSONB;
  v_user_id UUID;
BEGIN
  -- Get the user ID, fallback to the member being added/modified if auth.uid() is null
  v_user_id := COALESCE(auth.uid(), NEW.user_id, OLD.user_id);
  
  -- Skip logging if we still don't have a user ID
  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'member_added';
    v_details := jsonb_build_object(
      'member_id', NEW.user_id,
      'role', NEW.role
    );
    
    INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
    VALUES (NEW.board_id, v_user_id, v_action, 'member', NEW.id, v_details);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      v_action := 'role_changed';
      v_details := jsonb_build_object(
        'member_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role
      );
      INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
      VALUES (NEW.board_id, v_user_id, v_action, 'member', NEW.id, v_details);
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'member_removed';
    v_details := jsonb_build_object(
      'member_id', OLD.user_id,
      'role', OLD.role
    );
    
    INSERT INTO board_activity (board_id, user_id, action, entity_type, entity_id, details)
    VALUES (OLD.board_id, v_user_id, v_action, 'member', OLD.id, v_details);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_member_activity ON board_members;
CREATE TRIGGER trigger_log_member_activity
  AFTER INSERT OR UPDATE OR DELETE ON board_members
  FOR EACH ROW
  EXECUTE FUNCTION log_member_activity();

-- =====================================================
-- 12. TRIGGER FOR AUTO-CREATING USER PROFILE
-- =====================================================

-- Function to auto-create user profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- This trigger needs to be created on auth.users (run with superuser privileges)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT OR UPDATE ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 13. ENABLE REALTIME FOR NEW TABLES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'board_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE board_members;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'board_activity'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE board_activity;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- =====================================================
-- 14. MIGRATE EXISTING DATA
-- =====================================================

-- Create board_members entries for existing boards
INSERT INTO board_members (board_id, user_id, role)
SELECT id, owner, 'owner'
FROM boards
WHERE NOT EXISTS (
  SELECT 1 FROM board_members bm
  WHERE bm.board_id = boards.id AND bm.user_id = boards.owner
)
ON CONFLICT (board_id, user_id) DO NOTHING;

-- Create user_profiles for existing users (if auth.users accessible)
-- This should be run manually or via a function with elevated privileges:
-- INSERT INTO user_profiles (id, email, display_name)
-- SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
-- FROM auth.users
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Team Collaboration schema created successfully!' AS status;
