-- =====================================================
-- Kanban POC - Complete Database Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  owner UUID NOT NULL, -- references auth.users.id
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Columns table
CREATE TABLE IF NOT EXISTS columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cards table (tasks)
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee UUID, -- references auth.users.id
  due_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  position INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Attachments table (for file storage)
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications table (for reminders or UI notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'reminder', 'mention', 'assignment', etc
  payload JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_boards_owner ON boards(owner);
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_columns_position ON columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_board_id ON cards(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_created_by ON cards(created_by);
CREATE INDEX IF NOT EXISTS idx_cards_assignee ON cards(assignee);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);
CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_attachments_card_id ON attachments(card_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_send_at ON notifications(send_at) WHERE read = false;

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Boards: owner can perform all operations
DROP POLICY IF EXISTS "boards_owner_policy" ON boards;
CREATE POLICY "boards_owner_policy" ON boards
  FOR ALL
  USING (owner = auth.uid())
  WITH CHECK (owner = auth.uid());

-- Columns: only if parent board is owned by user
DROP POLICY IF EXISTS "columns_owner_policy" ON columns;
CREATE POLICY "columns_owner_policy" ON columns
  FOR ALL
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

-- Cards: user can modify cards if they own the board, are assignee, or created the card
DROP POLICY IF EXISTS "cards_owner_or_assignee" ON cards;
CREATE POLICY "cards_owner_or_assignee" ON cards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM boards b 
      WHERE b.id = cards.board_id 
      AND b.owner = auth.uid()
    )
    OR cards.assignee = auth.uid()
    OR cards.created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b 
      WHERE b.id = cards.board_id 
      AND b.owner = auth.uid()
    )
    OR cards.created_by = auth.uid()
    OR cards.assignee = auth.uid()
  );

-- Attachments: user can manage attachments if they have access to the card
DROP POLICY IF EXISTS "attachments_card_access" ON attachments;
CREATE POLICY "attachments_card_access" ON attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = attachments.card_id
      AND (b.owner = auth.uid() OR c.assignee = auth.uid() OR c.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = attachments.card_id
      AND (b.owner = auth.uid() OR c.assignee = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Notifications: only for the user they belong to
DROP POLICY IF EXISTS "notifications_owner" ON notifications;
CREATE POLICY "notifications_owner" ON notifications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 5. ENABLE REALTIME FOR TABLES
-- =====================================================

-- Enable realtime for boards, columns, cards tables
-- Run these commands in Supabase Dashboard or via API:
-- ALTER PUBLICATION supabase_realtime ADD TABLE boards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE columns;
-- ALTER PUBLICATION supabase_realtime ADD TABLE cards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Or via SQL (if publication exists):
DO $$
BEGIN
  -- Add tables to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'boards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE boards;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'columns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE columns;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'cards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cards;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Publication doesn't exist, skip
    NULL;
END $$;

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get the next position for a new column in a board
CREATE OR REPLACE FUNCTION get_next_column_position(p_board_id UUID)
RETURNS INT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(MAX(position), -1) + 1
  FROM columns
  WHERE board_id = p_board_id;
$$;

-- Function to get the next position for a new card in a column
CREATE OR REPLACE FUNCTION get_next_card_position(p_column_id UUID)
RETURNS INT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(MAX(position), -1) + 1
  FROM cards
  WHERE column_id = p_column_id;
$$;

-- Function to count cards created by a user (for rate limiting check)
CREATE OR REPLACE FUNCTION count_user_cards(p_user_id UUID)
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM cards
  WHERE created_by = p_user_id;
$$;

-- =====================================================
-- 7. TRIGGER FOR AUTO-CREATING REMINDER NOTIFICATIONS
-- =====================================================

-- Function to create a reminder notification when a card with due_date is created
CREATE OR REPLACE FUNCTION create_card_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If the card has a due_date, create a reminder notification
  -- Set send_at to 24 hours before due_date
  IF NEW.due_date IS NOT NULL THEN
    INSERT INTO notifications (user_id, card_id, type, payload, send_at)
    VALUES (
      COALESCE(NEW.assignee, NEW.created_by),
      NEW.id,
      'reminder',
      jsonb_build_object(
        'card_title', NEW.title,
        'board_id', NEW.board_id,
        'due_date', NEW.due_date
      ),
      NEW.due_date - INTERVAL '24 hours'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for card creation
DROP TRIGGER IF EXISTS trigger_create_card_reminder ON cards;
CREATE TRIGGER trigger_create_card_reminder
  AFTER INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION create_card_reminder();

-- Trigger to update reminder when card due_date changes
CREATE OR REPLACE FUNCTION update_card_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If due_date changed
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    -- Delete old reminder if exists
    DELETE FROM notifications 
    WHERE card_id = NEW.id 
    AND type = 'reminder' 
    AND read = false;
    
    -- Create new reminder if new due_date exists
    IF NEW.due_date IS NOT NULL THEN
      INSERT INTO notifications (user_id, card_id, type, payload, send_at)
      VALUES (
        COALESCE(NEW.assignee, NEW.created_by),
        NEW.id,
        'reminder',
        jsonb_build_object(
          'card_title', NEW.title,
          'board_id', NEW.board_id,
          'due_date', NEW.due_date
        ),
        NEW.due_date - INTERVAL '24 hours'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_card_reminder ON cards;
CREATE TRIGGER trigger_update_card_reminder
  AFTER UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_card_reminder();

-- =====================================================
-- 8. TRIGGER FOR ASSIGNMENT NOTIFICATIONS
-- =====================================================

-- Function to create a notification when a card is assigned to a user
CREATE OR REPLACE FUNCTION create_assignment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If assignee changed and new assignee is not null and different from creator
  IF OLD.assignee IS DISTINCT FROM NEW.assignee 
     AND NEW.assignee IS NOT NULL 
     AND NEW.assignee != NEW.created_by THEN
    INSERT INTO notifications (user_id, card_id, type, payload)
    VALUES (
      NEW.assignee,
      NEW.id,
      'assignment',
      jsonb_build_object(
        'card_title', NEW.title,
        'board_id', NEW.board_id,
        'assigned_by', NEW.created_by,
        'message', 'You have been assigned to a task'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assignment_notification ON cards;
CREATE TRIGGER trigger_assignment_notification
  AFTER UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION create_assignment_notification();

-- Also trigger on insert if assignee is set during creation
CREATE OR REPLACE FUNCTION create_assignment_notification_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If assignee is set and different from creator
  IF NEW.assignee IS NOT NULL AND NEW.assignee != NEW.created_by THEN
    INSERT INTO notifications (user_id, card_id, type, payload)
    VALUES (
      NEW.assignee,
      NEW.id,
      'assignment',
      jsonb_build_object(
        'card_title', NEW.title,
        'board_id', NEW.board_id,
        'assigned_by', NEW.created_by,
        'message', 'You have been assigned to a task'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assignment_notification_insert ON cards;
CREATE TRIGGER trigger_assignment_notification_insert
  AFTER INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION create_assignment_notification_on_insert();

-- =====================================================
-- 9. STORAGE BUCKET SETUP
-- =====================================================

-- Note: Storage buckets need to be created via Supabase Dashboard or API
-- Run the following in the Supabase SQL Editor after creating the bucket:

-- Create storage bucket for card attachments (run in Supabase Dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('card-attachments', 'card-attachments', false);

-- Storage policies for card-attachments bucket
-- These need to be run after the bucket is created

-- Policy: Allow authenticated users to upload files
-- CREATE POLICY "Allow authenticated uploads"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'card-attachments');

-- Policy: Allow users to read files from cards they have access to
-- CREATE POLICY "Allow authenticated reads"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'card-attachments');

-- Policy: Allow users to delete their own uploaded files
-- CREATE POLICY "Allow authenticated deletes"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'card-attachments');

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Database schema created successfully!' AS status;
