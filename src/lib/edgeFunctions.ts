// TaskFlow Edge Functions Integration
// Provides type-safe functions to call all enterprise Edge Functions

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper to get authenticated session
async function getAuthToken() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }
  
  return session.access_token;
}

// Helper to make function calls
async function callFunction<T>(
  functionName: string,
  payload: any
): Promise<T> {
  const token = await getAuthToken();
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Function call failed: ${response.statusText}`);
  }

  return await response.json();
}

// ==========================================
// 1. GENERATE SHARE URL
// ==========================================

export interface ShareUrlRequest {
  board_id: string;
  access_level: 'view' | 'edit';
  expires_in_hours?: number; // Default: 24
  max_uses?: number; // Optional: limit uses
}

export interface ShareUrlResponse {
  success: boolean;
  data: {
    share_id: string;
    share_url: string;
    access_level: string;
    expires_at: string;
    max_uses?: number;
    board_title: string;
  };
}

export async function generateShareUrl(
  boardId: string,
  accessLevel: 'view' | 'edit' = 'view',
  expiresInHours: number = 24,
  maxUses?: number
): Promise<ShareUrlResponse> {
  return callFunction<ShareUrlResponse>('generate-share-url', {
    board_id: boardId,
    access_level: accessLevel,
    expires_in_hours: expiresInHours,
    max_uses: maxUses,
  });
}

// ==========================================
// 2. GENERATE REPORT
// ==========================================

export interface ReportRequest {
  board_ids: string[];
  report_type: 'summary' | 'detailed' | 'performance' | 'activity';
  date_range: {
    start: string; // ISO date string
    end: string;   // ISO date string
  };
  format: 'json' | 'csv' | 'pdf';
  include_charts?: boolean;
}

export interface ReportResponse {
  total_cards(arg0: string, total_cards: any): unknown;
  success: boolean;
  generated_at: string;
  report_type: string;
  date_range: {
    start: string;
    end: string;
  };
  boards_analyzed: number;
  reports: Array<{
    board_id: string;
    board_title: string;
    metrics: {
      total_cards: number;
      completed_cards: number;
      overdue_cards: number;
      avg_completion_time_hours: number;
      cards_by_priority: Record<string, number>;
      cards_by_assignee: Record<string, number>;
    };
    timeline_data: Array<{
      date: string;
      created: number;
      completed: number;
      in_progress: number;
    }>;
    member_performance: Array<{
      user_id: string;
      user_name: string;
      cards_assigned: number;
      cards_completed: number;
      avg_completion_time_hours: number;
    }>;
  }>;
}

export async function generateReport(
  boardIds: string[],
  reportType: 'summary' | 'detailed' | 'performance' | 'activity' = 'summary',
  dateRange: { start: string; end: string },
  format: 'json' | 'csv' | 'pdf' = 'json'
): Promise<ReportResponse | string> {
  return callFunction('generate-report', {
    board_ids: boardIds,
    report_type: reportType,
    date_range: dateRange,
    format,
  });
}

// ==========================================
// 3. BATCH OPERATIONS
// ==========================================

export interface BatchOperation {
  operation: 'create' | 'update' | 'delete' | 'move';
  card_id?: string;
  data?: {
    title?: string;
    description?: string;
    column_id?: string;
    position?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    assignee?: string;
    due_date?: string;
    [key: string]: any;
  };
}

export interface BatchOperationsRequest {
  board_id: string;
  operations: BatchOperation[];
  transaction_mode?: boolean; // Rollback all on failure
}

export interface BatchOperationsResponse {
  success: boolean;
  message: string;
  results: {
    total: number;
    successful: number;
    failed: number;
    operations: Array<{
      index: number;
      operation: string;
      status: 'success' | 'failed';
      card_id?: string;
      error?: string;
    }>;
  };
}

export async function batchOperations(
  boardId: string,
  operations: BatchOperation[],
  transactionMode: boolean = false
): Promise<BatchOperationsResponse> {
  return callFunction<BatchOperationsResponse>('batch-operations', {
    board_id: boardId,
    operations,
    transaction_mode: transactionMode,
  });
}

// ==========================================
// 4. WEBHOOK INTEGRATION
// ==========================================

export interface WebhookEvent {
  event_type: 'card.created' | 'card.updated' | 'card.deleted' | 'board.created' | 'member.added';
  board_id: string;
  payload: any;
  triggered_by: string;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  results: {
    success: number;
    failed: number;
    errors: string[];
  };
}

export async function triggerWebhook(
  eventType: WebhookEvent['event_type'],
  boardId: string,
  payload: any,
  triggeredBy: string
): Promise<WebhookResponse> {
  return callFunction<WebhookResponse>('webhook-integration', {
    event_type: eventType,
    board_id: boardId,
    payload,
    triggered_by: triggeredBy,
  });
}

// ==========================================
// 5. DATA SYNC
// ==========================================

export interface DataSyncRequest {
  board_id: string;
  external_system: 'jira' | 'asana' | 'trello' | 'custom';
  sync_direction: 'import' | 'export' | 'bidirectional';
  mapping_config?: {
    field_mappings: Record<string, string>;
    status_mappings: Record<string, string>;
  };
  last_sync_timestamp?: string;
}

export interface DataSyncResponse {
  success: boolean;
  message: string;
  results: {
    direction: string;
    started_at: string;
    completed_at: string;
    imported: number;
    exported: number;
    updated: number;
    conflicts: number;
    errors: string[];
  };
}

export async function syncData(
  boardId: string,
  externalSystem: 'jira' | 'asana' | 'trello' | 'custom',
  syncDirection: 'import' | 'export' | 'bidirectional' = 'bidirectional',
  mappingConfig?: DataSyncRequest['mapping_config']
): Promise<DataSyncResponse> {
  return callFunction<DataSyncResponse>('data-sync', {
    board_id: boardId,
    external_system: externalSystem,
    sync_direction: syncDirection,
    mapping_config: mappingConfig,
  });
}

// ==========================================
// CONVENIENCE FUNCTIONS
// ==========================================

/**
 * Share a board with temporary access
 */
export async function shareBoard(
  boardId: string,
  expiresInHours: number = 24
) {
  return generateShareUrl(boardId, 'view', expiresInHours);
}

/**
 * Generate a monthly performance report
 */
export async function generateMonthlyReport(
  boardIds: string[],
  year: number,
  month: number
) {
  const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const end = new Date(year, month, 0).toISOString().split('T')[0];
  
  return generateReport(boardIds, 'performance', { start, end });
}

/**
 * Bulk create cards from an array
 */
export async function bulkCreateCards(
  boardId: string,
  columnId: string,
  cards: Array<{ title: string; description?: string; priority?: string }>
) {
  const operations = cards.map(card => ({
    operation: 'create' as const,
    data: {
      title: card.title,
      description: card.description,
      column_id: columnId,
      priority: card.priority as 'high' | 'medium' | 'low' | 'critical' | undefined,
    },
  }));

  return batchOperations(boardId, operations, true);
}

/**
 * Move multiple cards to a different column
 */
export async function bulkMoveCards(
  boardId: string,
  cardIds: string[],
  targetColumnId: string
) {
  const operations = cardIds.map((cardId, index) => ({
    operation: 'move' as const,
    card_id: cardId,
    data: {
      column_id: targetColumnId,
      position: index,
    },
  }));

  return batchOperations(boardId, operations);
}

/**
 * Delete multiple cards at once
 */
export async function bulkDeleteCards(
  boardId: string,
  cardIds: string[]
) {
  const operations = cardIds.map(cardId => ({
    operation: 'delete' as const,
    card_id: cardId,
  }));

  return batchOperations(boardId, operations);
}
