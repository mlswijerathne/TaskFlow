-- =====================================================
-- Phase 4: Multi-View Boards & Templates Migration
-- =====================================================

-- =====================================================
-- 1. ADD NEW COLUMNS TO CARDS TABLE
-- =====================================================

-- Add start_date for Gantt/Timeline view
ALTER TABLE cards ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;

-- Add color for visual customization
ALTER TABLE cards ADD COLUMN IF NOT EXISTS color TEXT;

-- Add estimated_hours for timeline calculations
ALTER TABLE cards ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2);

-- =====================================================
-- 2. CREATE CARD DEPENDENCIES TABLE (for Gantt)
-- =====================================================

CREATE TABLE IF NOT EXISTS card_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  predecessor_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start', -- 'finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'
  lag_days INT DEFAULT 0, -- delay between tasks
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(predecessor_id, successor_id)
);

-- =====================================================
-- 3. CREATE BOARD TEMPLATES TABLES
-- =====================================================

-- Template categories
CREATE TYPE template_category AS ENUM (
  'agile',
  'marketing',
  'product',
  'engineering',
  'sales',
  'hr',
  'custom'
);

-- Main templates table
CREATE TABLE IF NOT EXISTS board_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category template_category NOT NULL DEFAULT 'custom',
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false, -- system templates are public
  created_by UUID, -- NULL for system templates
  preview_image_url TEXT,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Template columns
CREATE TABLE IF NOT EXISTS template_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES board_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Template labels
CREATE TABLE IF NOT EXISTS template_labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES board_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Template sample cards (lightweight, just structure)
CREATE TABLE IF NOT EXISTS template_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES board_templates(id) ON DELETE CASCADE,
  template_column_id UUID NOT NULL REFERENCES template_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  position INT NOT NULL DEFAULT 0,
  estimated_days INT, -- relative duration placeholder
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. USER VIEW PREFERENCES TABLE
-- =====================================================

CREATE TYPE board_view_type AS ENUM (
  'board',
  'calendar',
  'gantt',
  'table'
);

CREATE TABLE IF NOT EXISTS user_view_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  default_view board_view_type DEFAULT 'board',
  calendar_settings JSONB DEFAULT '{}'::jsonb,
  gantt_settings JSONB DEFAULT '{}'::jsonb,
  table_settings JSONB DEFAULT '{}'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb, -- saved filter state
  hidden_columns TEXT[], -- for table view
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, board_id)
);

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Card date indexes for calendar/gantt queries
CREATE INDEX IF NOT EXISTS idx_cards_start_date ON cards(board_id, start_date) WHERE start_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_due_date_board ON cards(board_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_date_range ON cards(board_id, start_date, due_date);

-- Dependencies indexes
CREATE INDEX IF NOT EXISTS idx_card_dependencies_predecessor ON card_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_card_dependencies_successor ON card_dependencies(successor_id);

-- Template indexes
CREATE INDEX IF NOT EXISTS idx_board_templates_category ON board_templates(category);
CREATE INDEX IF NOT EXISTS idx_board_templates_public ON board_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_board_templates_created_by ON board_templates(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_columns_template ON template_columns(template_id);
CREATE INDEX IF NOT EXISTS idx_template_cards_template ON template_cards(template_id);
CREATE INDEX IF NOT EXISTS idx_template_cards_column ON template_cards(template_column_id);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_view_preferences_user ON user_view_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_view_preferences_board ON user_view_preferences(board_id);

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE card_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_view_preferences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. RLS POLICIES FOR CARD DEPENDENCIES
-- =====================================================

-- Card dependencies: user can manage if they have access to the card's board
DROP POLICY IF EXISTS "card_dependencies_board_access" ON card_dependencies;
CREATE POLICY "card_dependencies_board_access" ON card_dependencies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN board_members bm ON bm.board_id = c.board_id
      WHERE c.id = card_dependencies.predecessor_id
      AND bm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN board_members bm ON bm.board_id = c.board_id
      WHERE c.id = card_dependencies.predecessor_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'editor')
    )
  );

-- =====================================================
-- 8. RLS POLICIES FOR TEMPLATES
-- =====================================================

-- Board templates: anyone can read public templates, users can manage their own
DROP POLICY IF EXISTS "board_templates_select" ON board_templates;
CREATE POLICY "board_templates_select" ON board_templates
  FOR SELECT
  USING (
    is_public = true OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "board_templates_insert" ON board_templates;
CREATE POLICY "board_templates_insert" ON board_templates
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "board_templates_update" ON board_templates;
CREATE POLICY "board_templates_update" ON board_templates
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "board_templates_delete" ON board_templates;
CREATE POLICY "board_templates_delete" ON board_templates
  FOR DELETE
  USING (created_by = auth.uid());

-- Template columns: follow parent template access
DROP POLICY IF EXISTS "template_columns_access" ON template_columns;
CREATE POLICY "template_columns_access" ON template_columns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM board_templates bt
      WHERE bt.id = template_columns.template_id
      AND (bt.is_public = true OR bt.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM board_templates bt
      WHERE bt.id = template_columns.template_id
      AND bt.created_by = auth.uid()
    )
  );

-- Template labels: follow parent template access
DROP POLICY IF EXISTS "template_labels_access" ON template_labels;
CREATE POLICY "template_labels_access" ON template_labels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM board_templates bt
      WHERE bt.id = template_labels.template_id
      AND (bt.is_public = true OR bt.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM board_templates bt
      WHERE bt.id = template_labels.template_id
      AND bt.created_by = auth.uid()
    )
  );

-- Template cards: follow parent template access
DROP POLICY IF EXISTS "template_cards_access" ON template_cards;
CREATE POLICY "template_cards_access" ON template_cards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM board_templates bt
      WHERE bt.id = template_cards.template_id
      AND (bt.is_public = true OR bt.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM board_templates bt
      WHERE bt.id = template_cards.template_id
      AND bt.created_by = auth.uid()
    )
  );

-- =====================================================
-- 9. RLS POLICIES FOR USER VIEW PREFERENCES
-- =====================================================

DROP POLICY IF EXISTS "user_view_preferences_own" ON user_view_preferences;
CREATE POLICY "user_view_preferences_own" ON user_view_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 10. GRANT PERMISSIONS FOR POSTG REST API
-- =====================================================

-- Grant permissions for card_dependencies table
GRANT SELECT, INSERT, UPDATE, DELETE ON card_dependencies TO authenticated;

-- Grant permissions for board_templates and related tables
GRANT SELECT ON board_templates TO authenticated;
GRANT SELECT ON template_columns TO authenticated;
GRANT SELECT ON template_labels TO authenticated;
GRANT SELECT ON template_cards TO authenticated;
GRANT INSERT, UPDATE, DELETE ON board_templates TO authenticated;

-- Grant permissions for user_view_preferences table - FIX FOR 406 ERROR
GRANT SELECT, INSERT, UPDATE, DELETE ON user_view_preferences TO authenticated;

-- =====================================================
-- 11. ENABLE REALTIME FOR NEW TABLES
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE card_dependencies;
ALTER PUBLICATION supabase_realtime ADD TABLE user_view_preferences;

-- =====================================================
-- 12. INSERT DEFAULT SYSTEM TEMPLATES
-- =====================================================

-- Scrum Board Template
INSERT INTO board_templates (id, name, description, category, is_public, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Scrum Board', 'A standard Scrum board with Backlog, Sprint, In Progress, Review, and Done columns', 'agile', true, NULL),
  ('00000000-0000-0000-0000-000000000002', 'Bug Tracker', 'Track and manage bugs with New, Triaged, In Progress, Testing, and Resolved columns', 'engineering', true, NULL),
  ('00000000-0000-0000-0000-000000000003', 'Product Roadmap', 'Plan your product with Now, Next, Later, and Done columns', 'product', true, NULL),
  ('00000000-0000-0000-0000-000000000004', 'Marketing Campaign', 'Manage marketing campaigns with Ideas, Planning, In Progress, Review, and Published columns', 'marketing', true, NULL),
  ('00000000-0000-0000-0000-000000000005', 'Sales Pipeline', 'Track sales opportunities through Lead, Qualified, Proposal, Negotiation, and Closed stages', 'sales', true, NULL);

-- Scrum Board Columns
INSERT INTO template_columns (template_id, title, position) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Backlog', 0),
  ('00000000-0000-0000-0000-000000000001', 'Sprint', 1),
  ('00000000-0000-0000-0000-000000000001', 'In Progress', 2),
  ('00000000-0000-0000-0000-000000000001', 'Review', 3),
  ('00000000-0000-0000-0000-000000000001', 'Done', 4);

-- Bug Tracker Columns
INSERT INTO template_columns (template_id, title, position) VALUES
  ('00000000-0000-0000-0000-000000000002', 'New', 0),
  ('00000000-0000-0000-0000-000000000002', 'Triaged', 1),
  ('00000000-0000-0000-0000-000000000002', 'In Progress', 2),
  ('00000000-0000-0000-0000-000000000002', 'Testing', 3),
  ('00000000-0000-0000-0000-000000000002', 'Resolved', 4);

-- Product Roadmap Columns
INSERT INTO template_columns (template_id, title, position) VALUES
  ('00000000-0000-0000-0000-000000000003', 'Now', 0),
  ('00000000-0000-0000-0000-000000000003', 'Next', 1),
  ('00000000-0000-0000-0000-000000000003', 'Later', 2),
  ('00000000-0000-0000-0000-000000000003', 'Done', 3);

-- Marketing Campaign Columns
INSERT INTO template_columns (template_id, title, position) VALUES
  ('00000000-0000-0000-0000-000000000004', 'Ideas', 0),
  ('00000000-0000-0000-0000-000000000004', 'Planning', 1),
  ('00000000-0000-0000-0000-000000000004', 'In Progress', 2),
  ('00000000-0000-0000-0000-000000000004', 'Review', 3),
  ('00000000-0000-0000-0000-000000000004', 'Published', 4);

-- Sales Pipeline Columns
INSERT INTO template_columns (template_id, title, position) VALUES
  ('00000000-0000-0000-0000-000000000005', 'Lead', 0),
  ('00000000-0000-0000-0000-000000000005', 'Qualified', 1),
  ('00000000-0000-0000-0000-000000000005', 'Proposal', 2),
  ('00000000-0000-0000-0000-000000000005', 'Negotiation', 3),
  ('00000000-0000-0000-0000-000000000005', 'Closed', 4);

-- Template Labels for Scrum
INSERT INTO template_labels (template_id, name, color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Feature', '#22c55e'),
  ('00000000-0000-0000-0000-000000000001', 'Bug', '#ef4444'),
  ('00000000-0000-0000-0000-000000000001', 'Tech Debt', '#f59e0b'),
  ('00000000-0000-0000-0000-000000000001', 'Documentation', '#3b82f6'),
  ('00000000-0000-0000-0000-000000000001', 'Blocked', '#dc2626');

-- Template Labels for Bug Tracker
INSERT INTO template_labels (template_id, name, color) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Critical', '#dc2626'),
  ('00000000-0000-0000-0000-000000000002', 'High', '#f97316'),
  ('00000000-0000-0000-0000-000000000002', 'Medium', '#eab308'),
  ('00000000-0000-0000-0000-000000000002', 'Low', '#22c55e'),
  ('00000000-0000-0000-0000-000000000002', 'UI', '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000002', 'Backend', '#3b82f6'),
  ('00000000-0000-0000-0000-000000000002', 'Database', '#06b6d4');

-- Template Labels for Product Roadmap
INSERT INTO template_labels (template_id, name, color) VALUES
  ('00000000-0000-0000-0000-000000000003', 'MVP', '#22c55e'),
  ('00000000-0000-0000-0000-000000000003', 'Nice to Have', '#3b82f6'),
  ('00000000-0000-0000-0000-000000000003', 'Research', '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000003', 'Customer Request', '#f59e0b');

-- Template Labels for Marketing
INSERT INTO template_labels (template_id, name, color) VALUES
  ('00000000-0000-0000-0000-000000000004', 'Social Media', '#3b82f6'),
  ('00000000-0000-0000-0000-000000000004', 'Email', '#22c55e'),
  ('00000000-0000-0000-0000-000000000004', 'Blog', '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000004', 'Video', '#ef4444'),
  ('00000000-0000-0000-0000-000000000004', 'Paid Ads', '#f59e0b');

-- Template Labels for Sales
INSERT INTO template_labels (template_id, name, color) VALUES
  ('00000000-0000-0000-0000-000000000005', 'Hot', '#ef4444'),
  ('00000000-0000-0000-0000-000000000005', 'Warm', '#f59e0b'),
  ('00000000-0000-0000-0000-000000000005', 'Cold', '#3b82f6'),
  ('00000000-0000-0000-0000-000000000005', 'Enterprise', '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000005', 'SMB', '#22c55e');

-- =====================================================
-- 13. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to instantiate a template into a new board
CREATE OR REPLACE FUNCTION instantiate_template(
  p_template_id UUID,
  p_board_title TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_board_id UUID;
  v_column_map JSONB := '{}';
  v_label_map JSONB := '{}';
  v_template_column RECORD;
  v_template_label RECORD;
  v_template_card RECORD;
  v_new_column_id UUID;
  v_new_label_id UUID;
  v_new_card_id UUID;
BEGIN
  -- Create the new board
  INSERT INTO boards (title, owner)
  VALUES (p_board_title, p_user_id)
  RETURNING id INTO v_board_id;

  -- Add owner as board member
  INSERT INTO board_members (board_id, user_id, role)
  VALUES (v_board_id, p_user_id, 'owner');

  -- Create columns from template
  FOR v_template_column IN
    SELECT * FROM template_columns
    WHERE template_id = p_template_id
    ORDER BY position
  LOOP
    INSERT INTO columns (board_id, title, position)
    VALUES (v_board_id, v_template_column.title, v_template_column.position)
    RETURNING id INTO v_new_column_id;
    
    -- Map old column ID to new column ID
    v_column_map := v_column_map || jsonb_build_object(v_template_column.id::text, v_new_column_id::text);
  END LOOP;

  -- Create labels from template
  FOR v_template_label IN
    SELECT * FROM template_labels
    WHERE template_id = p_template_id
  LOOP
    INSERT INTO labels (board_id, name, color)
    VALUES (v_board_id, v_template_label.name, v_template_label.color)
    RETURNING id INTO v_new_label_id;
    
    -- Map old label ID to new label ID
    v_label_map := v_label_map || jsonb_build_object(v_template_label.id::text, v_new_label_id::text);
  END LOOP;

  -- Create sample cards from template (if any)
  FOR v_template_card IN
    SELECT * FROM template_cards
    WHERE template_id = p_template_id
    ORDER BY position
  LOOP
    INSERT INTO cards (
      board_id,
      column_id,
      title,
      description,
      priority,
      position,
      created_by
    )
    VALUES (
      v_board_id,
      (v_column_map ->> v_template_card.template_column_id::text)::UUID,
      v_template_card.title,
      v_template_card.description,
      COALESCE(v_template_card.priority, 'medium')::text,
      v_template_card.position,
      p_user_id
    );
  END LOOP;

  -- Increment template usage count
  UPDATE board_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;

  RETURN v_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save board as template
CREATE OR REPLACE FUNCTION save_board_as_template(
  p_board_id UUID,
  p_template_name TEXT,
  p_template_description TEXT,
  p_category template_category,
  p_user_id UUID,
  p_include_cards BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
  v_template_id UUID;
  v_column_map JSONB := '{}';
  v_board_column RECORD;
  v_board_label RECORD;
  v_board_card RECORD;
  v_new_template_column_id UUID;
BEGIN
  -- Verify user has access to board
  IF NOT EXISTS (
    SELECT 1 FROM board_members
    WHERE board_id = p_board_id
    AND user_id = p_user_id
    AND role IN ('owner', 'editor')
  ) THEN
    RAISE EXCEPTION 'User does not have permission to create template from this board';
  END IF;

  -- Create template
  INSERT INTO board_templates (name, description, category, created_by)
  VALUES (p_template_name, p_template_description, p_category, p_user_id)
  RETURNING id INTO v_template_id;

  -- Copy columns
  FOR v_board_column IN
    SELECT * FROM columns
    WHERE board_id = p_board_id
    ORDER BY position
  LOOP
    INSERT INTO template_columns (template_id, title, position)
    VALUES (v_template_id, v_board_column.title, v_board_column.position)
    RETURNING id INTO v_new_template_column_id;
    
    v_column_map := v_column_map || jsonb_build_object(v_board_column.id::text, v_new_template_column_id::text);
  END LOOP;

  -- Copy labels
  FOR v_board_label IN
    SELECT * FROM labels
    WHERE board_id = p_board_id
  LOOP
    INSERT INTO template_labels (template_id, name, color)
    VALUES (v_template_id, v_board_label.name, v_board_label.color);
  END LOOP;

  -- Optionally copy cards (without user-specific data)
  IF p_include_cards THEN
    FOR v_board_card IN
      SELECT * FROM cards
      WHERE board_id = p_board_id
      ORDER BY position
      LIMIT 20 -- Limit sample cards
    LOOP
      INSERT INTO template_cards (
        template_id,
        template_column_id,
        title,
        description,
        priority,
        position
      )
      VALUES (
        v_template_id,
        (v_column_map ->> v_board_card.column_id::text)::UUID,
        v_board_card.title,
        v_board_card.description,
        v_board_card.priority,
        v_board_card.position
      );
    END LOOP;
  END IF;

  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update card dates (for calendar/gantt drag)
CREATE OR REPLACE FUNCTION update_card_dates(
  p_card_id UUID,
  p_start_date TIMESTAMPTZ,
  p_due_date TIMESTAMPTZ,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_board_id UUID;
BEGIN
  -- Get the card's board
  SELECT board_id INTO v_board_id
  FROM cards
  WHERE id = p_card_id;

  IF v_board_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check permission
  IF NOT EXISTS (
    SELECT 1 FROM board_members
    WHERE board_id = v_board_id
    AND user_id = p_user_id
    AND role IN ('owner', 'editor')
  ) THEN
    RETURN false;
  END IF;

  -- Update dates
  UPDATE cards
  SET 
    start_date = p_start_date,
    due_date = p_due_date
  WHERE id = p_card_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION instantiate_template TO authenticated;
GRANT EXECUTE ON FUNCTION save_board_as_template TO authenticated;
GRANT EXECUTE ON FUNCTION update_card_dates TO authenticated;
