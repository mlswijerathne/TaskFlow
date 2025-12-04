-- =====================================================
-- FIX: Remove duplicate board member insertion from instantiate_template
-- The trigger_create_board_owner already handles this automatically
-- Also handle duplicate labels since create_default_labels_trigger creates default labels
-- =====================================================

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
  v_existing_label_id UUID;
BEGIN
  -- Create the new board
  -- NOTE: The trigger_create_board_owner will automatically add the owner as a board member
  -- NOTE: The create_default_labels_trigger will automatically create default labels
  INSERT INTO boards (title, owner)
  VALUES (p_board_title, p_user_id)
  RETURNING id INTO v_board_id;

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

  -- Create labels from template (handle duplicates from default labels trigger)
  FOR v_template_label IN
    SELECT * FROM template_labels
    WHERE template_id = p_template_id
  LOOP
    -- Check if label with same name already exists (created by trigger)
    SELECT id INTO v_existing_label_id
    FROM labels
    WHERE board_id = v_board_id AND name = v_template_label.name;
    
    IF v_existing_label_id IS NOT NULL THEN
      -- Label already exists, update color to match template and use existing ID
      UPDATE labels SET color = v_template_label.color WHERE id = v_existing_label_id;
      v_new_label_id := v_existing_label_id;
    ELSE
      -- Create new label
      INSERT INTO labels (board_id, name, color)
      VALUES (v_board_id, v_template_label.name, v_template_label.color)
      RETURNING id INTO v_new_label_id;
    END IF;
    
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

-- Ensure the function is accessible
GRANT EXECUTE ON FUNCTION instantiate_template TO authenticated;
