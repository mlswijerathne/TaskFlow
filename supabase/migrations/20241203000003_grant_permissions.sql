-- Grant permissions for card_dependencies table
GRANT SELECT, INSERT, UPDATE, DELETE ON card_dependencies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON card_dependencies TO anon;

-- Grant permissions for board_templates and related tables
GRANT SELECT ON board_templates TO authenticated;
GRANT SELECT ON template_columns TO authenticated;
GRANT SELECT ON template_labels TO authenticated;
GRANT SELECT ON template_cards TO authenticated;
GRANT INSERT, UPDATE, DELETE ON board_templates TO authenticated;

GRANT SELECT ON board_templates TO anon;
GRANT SELECT ON template_columns TO anon;
GRANT SELECT ON template_labels TO anon;
GRANT SELECT ON template_cards TO anon;

-- Grant permissions for user_view_preferences table - FIX FOR 406 ERROR
GRANT SELECT, INSERT, UPDATE, DELETE ON user_view_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_view_preferences TO anon;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

