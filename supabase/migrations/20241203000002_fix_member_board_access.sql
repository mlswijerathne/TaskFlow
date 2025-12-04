-- =====================================================
-- Fix: Allow Board Members to Access Boards
-- Uses SECURITY DEFINER functions to avoid RLS recursion
-- =====================================================

-- =====================================================
-- 0. CREATE HELPER FUNCTIONS FIRST (SECURITY DEFINER)
-- These bypass RLS to check membership without recursion
-- =====================================================

CREATE OR REPLACE FUNCTION is_board_member(p_board_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM board_members
    WHERE board_id = p_board_id 
    AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_board_editor_or_owner(p_board_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM board_members
    WHERE board_id = p_board_id 
    AND user_id = p_user_id
    AND role IN ('owner', 'editor')
  );
$$;

-- =====================================================
-- 1. UPDATE BOARDS RLS POLICIES
-- Allow board members to read boards they belong to
-- =====================================================

DROP POLICY IF EXISTS "boards_select" ON boards;

CREATE POLICY "boards_select" ON boards
  FOR SELECT
  USING (
    owner = auth.uid()
    OR
    is_board_member(id, auth.uid())
  );

-- =====================================================
-- 2. UPDATE COLUMNS RLS POLICIES
-- Allow board members to read/write columns
-- =====================================================

DROP POLICY IF EXISTS "columns_select" ON columns;
DROP POLICY IF EXISTS "columns_insert" ON columns;
DROP POLICY IF EXISTS "columns_update" ON columns;
DROP POLICY IF EXISTS "columns_delete" ON columns;

-- Members can read columns
CREATE POLICY "columns_select" ON columns
  FOR SELECT
  USING (is_board_member(board_id, auth.uid()));

-- Owners and editors can insert columns
CREATE POLICY "columns_insert" ON columns
  FOR INSERT
  WITH CHECK (is_board_editor_or_owner(board_id, auth.uid()));

-- Owners and editors can update columns
CREATE POLICY "columns_update" ON columns
  FOR UPDATE
  USING (is_board_editor_or_owner(board_id, auth.uid()));

-- Owners and editors can delete columns
CREATE POLICY "columns_delete" ON columns
  FOR DELETE
  USING (is_board_editor_or_owner(board_id, auth.uid()));

-- =====================================================
-- 3. UPDATE CARDS RLS POLICIES
-- Allow board members to read/write cards based on role
-- =====================================================

DROP POLICY IF EXISTS "cards_select" ON cards;
DROP POLICY IF EXISTS "cards_insert" ON cards;
DROP POLICY IF EXISTS "cards_update" ON cards;
DROP POLICY IF EXISTS "cards_delete" ON cards;

-- All members can read cards
CREATE POLICY "cards_select" ON cards
  FOR SELECT
  USING (is_board_member(board_id, auth.uid()));

-- Owners and editors can insert cards
CREATE POLICY "cards_insert" ON cards
  FOR INSERT
  WITH CHECK (is_board_editor_or_owner(board_id, auth.uid()));

-- Owners and editors can update cards
CREATE POLICY "cards_update" ON cards
  FOR UPDATE
  USING (is_board_editor_or_owner(board_id, auth.uid()));

-- Owners and editors can delete cards
CREATE POLICY "cards_delete" ON cards
  FOR DELETE
  USING (is_board_editor_or_owner(board_id, auth.uid()));

-- =====================================================
-- 4. UPDATE BOARD_ACTIVITY RLS POLICIES
-- Allow board members to read activity
-- =====================================================

DROP POLICY IF EXISTS "board_activity_read" ON board_activity;

CREATE POLICY "board_activity_read" ON board_activity
  FOR SELECT
  USING (is_board_member(board_id, auth.uid()));

-- =====================================================
-- 5. UPDATE BOARD_MEMBERS RLS
-- Users can see their own membership + board owners see all
-- =====================================================

DROP POLICY IF EXISTS "board_members_select" ON board_members;

CREATE POLICY "board_members_select" ON board_members
  FOR SELECT
  USING (
    -- User can always see their own membership
    user_id = auth.uid()
    OR
    -- Board owner can see all members
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_members.board_id
      AND b.owner = auth.uid()
    )
    OR
    -- Any member can see other members (use function to avoid recursion)
    is_board_member(board_id, auth.uid())
  );

SELECT 'Board member access policies applied!' AS status;
