-- =====================================================
-- Phase 2: Card Enhancements Schema
-- Labels, Checklists, Card Priority, Visual Indicators
-- =====================================================

-- =====================================================
-- 1. ADD PRIORITY COLUMN TO CARDS TABLE
-- =====================================================

-- Add priority column to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- Create index for priority filtering/sorting
CREATE INDEX IF NOT EXISTS idx_cards_priority ON cards(board_id, priority);

-- =====================================================
-- 2. CREATE LABELS TABLE
-- =====================================================

-- Labels table (board-level label library)
CREATE TABLE IF NOT EXISTS labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6', -- Default blue color
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(board_id, name)
);

-- Indexes for labels
CREATE INDEX IF NOT EXISTS idx_labels_board_id ON labels(board_id);

-- =====================================================
-- 3. CREATE CARD_LABELS JUNCTION TABLE
-- =====================================================

-- Card labels junction table (many-to-many)
CREATE TABLE IF NOT EXISTS card_labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(card_id, label_id)
);

-- Indexes for card_labels
CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_label_id ON card_labels(label_id);

-- =====================================================
-- 4. CREATE CHECKLISTS TABLE
-- =====================================================

-- Checklists table
CREATE TABLE IF NOT EXISTS checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Checklist',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for checklists
CREATE INDEX IF NOT EXISTS idx_checklists_card_id ON checklists(card_id);

-- =====================================================
-- 5. CREATE CHECKLIST_ITEMS TABLE
-- =====================================================

-- Checklist items table
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes for checklist_items
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_completed ON checklist_items(checklist_id, completed);

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. RLS POLICIES FOR LABELS
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "labels_select" ON labels;
DROP POLICY IF EXISTS "labels_insert" ON labels;
DROP POLICY IF EXISTS "labels_update" ON labels;
DROP POLICY IF EXISTS "labels_delete" ON labels;

-- Board members can view labels (via board ownership or membership)
CREATE POLICY "labels_select" ON labels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = labels.board_id
      AND b.owner = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = labels.board_id
      AND bm.user_id = auth.uid()
    )
  );

-- Board owners and editors can insert labels
CREATE POLICY "labels_insert" ON labels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = labels.board_id
      AND b.owner = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = labels.board_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'editor')
    )
  );

-- Board owners and editors can update labels
CREATE POLICY "labels_update" ON labels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = labels.board_id
      AND b.owner = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = labels.board_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'editor')
    )
  );

-- Board owners can delete labels
CREATE POLICY "labels_delete" ON labels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = labels.board_id
      AND b.owner = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = labels.board_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'owner'
    )
  );

-- =====================================================
-- 8. RLS POLICIES FOR CARD_LABELS
-- =====================================================

DROP POLICY IF EXISTS "card_labels_select" ON card_labels;
DROP POLICY IF EXISTS "card_labels_insert" ON card_labels;
DROP POLICY IF EXISTS "card_labels_delete" ON card_labels;

-- Board members can view card labels
CREATE POLICY "card_labels_select" ON card_labels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = card_labels.card_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
        )
      )
    )
  );

-- Board owners and editors can assign labels
CREATE POLICY "card_labels_insert" ON card_labels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = card_labels.card_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Board owners and editors can remove labels from cards
CREATE POLICY "card_labels_delete" ON card_labels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = card_labels.card_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- =====================================================
-- 9. RLS POLICIES FOR CHECKLISTS
-- =====================================================

DROP POLICY IF EXISTS "checklists_select" ON checklists;
DROP POLICY IF EXISTS "checklists_insert" ON checklists;
DROP POLICY IF EXISTS "checklists_update" ON checklists;
DROP POLICY IF EXISTS "checklists_delete" ON checklists;

-- Board members can view checklists
CREATE POLICY "checklists_select" ON checklists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = checklists.card_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
        )
      )
    )
  );

-- Board owners and editors can create checklists
CREATE POLICY "checklists_insert" ON checklists
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = checklists.card_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Board owners and editors can update checklists
CREATE POLICY "checklists_update" ON checklists
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = checklists.card_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Board owners and editors can delete checklists
CREATE POLICY "checklists_delete" ON checklists
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON b.id = c.board_id
      WHERE c.id = checklists.card_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- =====================================================
-- 10. RLS POLICIES FOR CHECKLIST_ITEMS
-- =====================================================

DROP POLICY IF EXISTS "checklist_items_select" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_insert" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_update" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_delete" ON checklist_items;

-- Board members can view checklist items
CREATE POLICY "checklist_items_select" ON checklist_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM checklists cl
      JOIN cards c ON c.id = cl.card_id
      JOIN boards b ON b.id = c.board_id
      WHERE cl.id = checklist_items.checklist_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
        )
      )
    )
  );

-- Board owners and editors can create checklist items
CREATE POLICY "checklist_items_insert" ON checklist_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists cl
      JOIN cards c ON c.id = cl.card_id
      JOIN boards b ON b.id = c.board_id
      WHERE cl.id = checklist_items.checklist_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Board owners and editors can update checklist items
CREATE POLICY "checklist_items_update" ON checklist_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM checklists cl
      JOIN cards c ON c.id = cl.card_id
      JOIN boards b ON b.id = c.board_id
      WHERE cl.id = checklist_items.checklist_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Board owners and editors can delete checklist items
CREATE POLICY "checklist_items_delete" ON checklist_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM checklists cl
      JOIN cards c ON c.id = cl.card_id
      JOIN boards b ON b.id = c.board_id
      WHERE cl.id = checklist_items.checklist_id
      AND (
        b.owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- =====================================================
-- 11. CREATE DEFAULT LABELS FOR NEW BOARDS (TRIGGER)
-- =====================================================

-- Function to create default labels when a board is created
CREATE OR REPLACE FUNCTION create_default_labels()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO labels (board_id, name, color) VALUES
    (NEW.id, 'Bug', '#ef4444'),
    (NEW.id, 'Feature', '#22c55e'),
    (NEW.id, 'Enhancement', '#3b82f6'),
    (NEW.id, 'Documentation', '#a855f7'),
    (NEW.id, 'Help Wanted', '#f97316');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create
DROP TRIGGER IF EXISTS create_default_labels_trigger ON boards;
CREATE TRIGGER create_default_labels_trigger
  AFTER INSERT ON boards
  FOR EACH ROW
  EXECUTE FUNCTION create_default_labels();

-- =====================================================
-- 12. ENABLE REALTIME FOR NEW TABLES
-- =====================================================

-- Enable realtime for labels
ALTER PUBLICATION supabase_realtime ADD TABLE labels;
ALTER PUBLICATION supabase_realtime ADD TABLE card_labels;
ALTER PUBLICATION supabase_realtime ADD TABLE checklists;
ALTER PUBLICATION supabase_realtime ADD TABLE checklist_items;

-- =====================================================
-- 13. UPDATE ACTIVITY TYPES (Add new activity types)
-- =====================================================

-- Update board_activity check constraint to include new activity types
-- (The check is done at application level, so no SQL change needed)

-- =====================================================
-- End of Phase 2 Migration
-- =====================================================
