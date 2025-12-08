-- Migration: Enterprise Edge Functions Support
-- Creates tables required for advanced edge functions
-- Run with: supabase db push

-- Board shares for secure URL sharing (generate-share-url function)
CREATE TABLE IF NOT EXISTS board_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  access_level TEXT NOT NULL CHECK (access_level IN ('view', 'edit')),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  token_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_board_shares_board_id ON board_shares(board_id);
CREATE INDEX IF NOT EXISTS idx_board_shares_expires_at ON board_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_board_shares_token_hash ON board_shares(token_hash);

-- RLS policies for board_shares
ALTER TABLE board_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their board shares"
  ON board_shares FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create board shares for their boards"
  ON board_shares FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_shares.board_id
      AND (boards.owner = auth.uid() OR EXISTS (
        SELECT 1 FROM board_members
        WHERE board_members.board_id = boards.id
        AND board_members.user_id = auth.uid()
        AND board_members.role = 'admin'
      ))
    )
  );

-- Webhook configurations (webhook-integration function)
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  secret TEXT,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('webhook', 'slack', 'teams')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_board_id ON webhooks(board_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active) WHERE active = TRUE;

-- RLS for webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage webhooks for their boards"
  ON webhooks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = webhooks.board_id
      AND (boards.owner = auth.uid() OR EXISTS (
        SELECT 1 FROM board_members
        WHERE board_members.board_id = boards.id
        AND board_members.user_id = auth.uid()
        AND board_members.role IN ('admin', 'editor')
      ))
    )
  );

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'failed', 'pending')),
  delivered_at TIMESTAMPTZ,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  response_code INTEGER,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_attempted_at ON webhook_deliveries(attempted_at);

-- Sync configurations (data-sync function)
CREATE TABLE IF NOT EXISTS sync_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  external_system TEXT NOT NULL CHECK (external_system IN ('jira', 'asana', 'trello', 'custom')),
  api_key TEXT,
  api_endpoint TEXT,
  api_user TEXT,
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'completed_with_errors')),
  sync_enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, external_system)
);

CREATE INDEX IF NOT EXISTS idx_sync_configurations_board_id ON sync_configurations(board_id);
CREATE INDEX IF NOT EXISTS idx_sync_configurations_external_system ON sync_configurations(external_system);

-- RLS for sync_configurations
ALTER TABLE sync_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sync configs for their boards"
  ON sync_configurations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = sync_configurations.board_id
      AND (boards.owner = auth.uid() OR EXISTS (
        SELECT 1 FROM board_members
        WHERE board_members.board_id = boards.id
        AND board_members.user_id = auth.uid()
        AND board_members.role = 'admin'
      ))
    )
  );

-- Card sync mappings
CREATE TABLE IF NOT EXISTS card_sync_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  internal_card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  external_card_id TEXT NOT NULL,
  external_system TEXT NOT NULL,
  last_external_update TIMESTAMPTZ,
  last_internal_update TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('synced', 'conflict', 'pending')),
  conflict_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(internal_card_id, external_system),
  UNIQUE(external_card_id, external_system, board_id)
);

CREATE INDEX IF NOT EXISTS idx_card_sync_mappings_internal_card ON card_sync_mappings(internal_card_id);
CREATE INDEX IF NOT EXISTS idx_card_sync_mappings_external_card ON card_sync_mappings(external_card_id, external_system);
CREATE INDEX IF NOT EXISTS idx_card_sync_mappings_board_id ON card_sync_mappings(board_id);

-- Report history (generate-report function)
CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('summary', 'detailed', 'performance', 'activity')),
  board_ids UUID[],
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  format TEXT CHECK (format IN ('json', 'csv', 'pdf')),
  report_data JSONB,
  file_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_history_user_id ON report_history(user_id);
CREATE INDEX IF NOT EXISTS idx_report_history_generated_at ON report_history(generated_at);

-- RLS for report_history
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
  ON report_history FOR SELECT
  USING (user_id = auth.uid());

-- Sync history
CREATE TABLE IF NOT EXISTS sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  external_system TEXT NOT NULL,
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  imported_count INTEGER DEFAULT 0,
  exported_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  conflict_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('success', 'failed', 'completed_with_errors', 'in_progress')),
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_history_board_id ON sync_history(board_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_user_id ON sync_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at);

-- RLS for sync_history
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync history for their boards"
  ON sync_history FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = sync_history.board_id
      AND (boards.owner = auth.uid() OR EXISTS (
        SELECT 1 FROM board_members
        WHERE board_members.board_id = boards.id
        AND board_members.user_id = auth.uid()
      ))
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_board_shares_updated_at
  BEFORE UPDATE ON board_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_configurations_updated_at
  BEFORE UPDATE ON sync_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_sync_mappings_updated_at
  BEFORE UPDATE ON card_sync_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE board_shares IS 'Stores secure shareable links for boards with expiration and access control';
COMMENT ON TABLE webhooks IS 'Webhook configurations for external integrations (Slack, Teams, etc.)';
COMMENT ON TABLE webhook_deliveries IS 'Logs of webhook delivery attempts and their status';
COMMENT ON TABLE sync_configurations IS 'Configuration for syncing with external project management systems';
COMMENT ON TABLE card_sync_mappings IS 'Maps internal cards to external system cards for bidirectional sync';
COMMENT ON TABLE report_history IS 'Audit trail of generated reports';
COMMENT ON TABLE sync_history IS 'History of synchronization operations with external systems';
