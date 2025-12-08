# Supabase Edge Functions - Enterprise Examples

## Overview

This document demonstrates Supabase's capability for **enterprise-level systems** using Edge Functions. These examples showcase advanced logic beyond basic CRUD operations, including URL generation, data processing, external integrations, and complex business logic.

## ✅ Can Supabase Be Used for Enterprise Systems?

**YES!** Supabase is production-ready and used by enterprise companies. Here's why:

### Enterprise Features
- **Scalability**: Built on PostgreSQL, handles millions of rows efficiently
- **Security**: Row Level Security (RLS), JWT authentication, API key management
- **Performance**: Global CDN, connection pooling, caching strategies
- **Compliance**: SOC 2 Type 2 certified, GDPR compliant, HIPAA configurable
- **High Availability**: 99.9% uptime SLA on Pro/Enterprise plans
- **Monitoring**: Built-in analytics, logging, and alerting
- **Backups**: Automated daily backups with point-in-time recovery

### Edge Functions Capabilities
Edge Functions run on Deno runtime at the edge (close to users), providing:
- **Low Latency**: Execute near users globally
- **Custom Logic**: Implement any business logic in TypeScript/JavaScript
- **Security**: Server-side operations, API key protection
- **Integrations**: Connect to any external service (Stripe, SendGrid, Slack, etc.)
- **Scheduling**: Trigger via cron jobs or webhooks
- **Isolated**: Each function runs in isolation for security

---

## 📁 Edge Functions in Your Codebase

### 1. **create-card** (Existing)
**Location**: `supabase/functions/create-card/index.ts`

**Purpose**: Advanced card creation with rate limiting

**Features**:
- ✅ Rate limiting (100 cards per user)
- ✅ JWT authentication validation
- ✅ Permission checking (board owner/member)
- ✅ Transaction-like behavior with validation
- ✅ Position calculation for ordering
- ✅ Service role key for admin operations

**Enterprise Use Case**: Prevents abuse, ensures data integrity, enforces business rules

**Key Code Patterns**:
```typescript
// Rate limiting check
const { count } = await supabaseAdmin
  .from("cards")
  .select("id", { count: "exact", head: true })
  .eq("created_by", userId);

if (count >= CARD_LIMIT) {
  return new Response(JSON.stringify({ error: "Card limit reached" }), { status: 429 });
}

// Verify board and column exist
const { data: board } = await supabaseAdmin
  .from("boards")
  .select("id, owner")
  .eq("id", board_id)
  .single();
```

### 2. **send-reminders** (Existing)
**Location**: `supabase/functions/send-reminders/index.ts`

**Purpose**: Scheduled notification processing and email delivery

**Features**:
- ✅ Scheduled execution (via cron)
- ✅ Email integration (SendGrid)
- ✅ Batch processing (100 notifications at a time)
- ✅ Error handling and logging
- ✅ Secure cron authentication

**Enterprise Use Case**: Automated notifications, scheduled tasks, email campaigns

**Key Code Patterns**:
```typescript
// Cron authentication
const expectedSecret = Deno.env.get("CRON_SECRET");
if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}

// Fetch pending reminders
const { data: notifications } = await supabaseAdmin
  .from("notifications")
  .select("*")
  .eq("type", "reminder")
  .eq("read", false)
  .lte("send_at", now)
  .limit(100);

// Send email via SendGrid
await fetch("https://api.sendgrid.com/v3/mail/send", {
  method: "POST",
  headers: { "Authorization": `Bearer ${sendGridApiKey}` },
  body: JSON.stringify({ /* email data */ }),
});
```

---

## 🆕 Advanced Enterprise Examples

### 3. **generate-share-url** (New)
**Location**: `supabase/functions/generate-share-url/index.ts`

**Purpose**: Generate secure, time-limited shareable URLs for boards

**Advanced Features**:
- ✅ JWT token generation for secure access
- ✅ Expiration timestamps
- ✅ Access level controls (view/edit)
- ✅ Usage limits (max number of uses)
- ✅ Token hashing for security
- ✅ Audit logging

**Enterprise Use Case**: Share sensitive data securely, temporary access grants, partner portals

**Key Code Patterns**:
```typescript
// Generate JWT token
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const shareToken = await create(
  { alg: "HS256", typ: "JWT" },
  {
    share_id: shareId,
    board_id: board_id,
    access_level: access_level,
    exp: getNumericDate(expiresAt),
  },
  key
);

// Generate shareable URL
const shareUrl = `${baseUrl}/boards/shared/${shareId}?token=${shareToken}`;

// Hash token for secure storage
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
```

**Usage Example**:
```typescript
// Client-side call
const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-share-url`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    board_id: 'board-uuid',
    access_level: 'view',
    expires_in_hours: 24,
    max_uses: 10
  })
});

const { data } = await response.json();
// data.share_url = "https://your-app.com/boards/shared/uuid?token=jwt..."
```

### 4. **generate-report** (New)
**Location**: `supabase/functions/generate-report/index.ts`

**Purpose**: Generate comprehensive analytics and export data

**Advanced Features**:
- ✅ Complex data aggregation
- ✅ Multi-board analytics
- ✅ Performance metrics calculation
- ✅ Timeline data generation
- ✅ Member performance tracking
- ✅ Multiple export formats (JSON, CSV, PDF)
- ✅ Scheduled report generation

**Enterprise Use Case**: Business intelligence, KPI tracking, management dashboards, data exports

**Key Code Patterns**:
```typescript
// Calculate complex metrics
function calculateCardMetrics(cards: any[]): CardMetrics {
  const completed = cards.filter(c => c.completed_at);
  const overdue = cards.filter(c => 
    c.due_date && new Date(c.due_date) < new Date() && !c.completed_at
  );

  // Average completion time
  const completionTimes = completed
    .map(c => new Date(c.completed_at).getTime() - new Date(c.created_at).getTime())
    .filter(t => t > 0);
  
  const avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) 
    / completionTimes.length / (1000 * 60 * 60);

  return {
    total_cards: cards.length,
    completed_cards: completed.length,
    overdue_cards: overdue.length,
    avg_completion_time_hours: Math.round(avgCompletionTime * 100) / 100,
  };
}

// Generate timeline data
function generateTimelineData(cards: any[], dateRange: any) {
  const timeline: Record<string, { created: number; completed: number }> = {};
  
  cards.forEach(card => {
    const date = new Date(card.created_at).toISOString().split("T")[0];
    timeline[date] = timeline[date] || { created: 0, completed: 0 };
    timeline[date].created++;
  });

  return timeline;
}

// CSV export
function convertToCSV(reports: BoardReport[]): string {
  let csv = "Board,Total Cards,Completed,Overdue,Avg Completion Time\n";
  reports.forEach(r => {
    csv += `${r.board_title},${r.metrics.total_cards},${r.metrics.completed_cards},...\n`;
  });
  return csv;
}
```

**Usage Example**:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-report`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    board_ids: ['board-1', 'board-2'],
    report_type: 'detailed',
    date_range: {
      start: '2025-01-01',
      end: '2025-12-31'
    },
    format: 'csv'
  })
});
```

### 5. **webhook-integration** (New)
**Location**: `supabase/functions/webhook-integration/index.ts`

**Purpose**: Integrate with external services (Slack, Teams, custom webhooks)

**Advanced Features**:
- ✅ Outbound webhook notifications
- ✅ Slack/Microsoft Teams formatting
- ✅ Retry logic with exponential backoff
- ✅ HMAC signature generation
- ✅ Event filtering
- ✅ Delivery tracking and logging

**Enterprise Use Case**: Real-time notifications, system integrations, event streaming

**Key Code Patterns**:
```typescript
// Retry with exponential backoff
async function sendWebhook(webhook: WebhookConfig, ...): Promise<boolean> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) return true;

      // Retry on 5xx errors
      if (response.status >= 500) {
        retryCount++;
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, retryCount) * 1000)
        );
        continue;
      }

      return false;
    } catch (err) {
      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, retryCount) * 1000)
        );
      }
    }
  }

  return false;
}

// Format for Slack
function formatSlackMessage(eventType: string, payload: any) {
  return {
    text: `✨ New card created: *${payload.title}*`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `✨ ${text}` }
      }
    ]
  };
}

// HMAC signature for security
async function generateSignature(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, 
    new TextEncoder().encode(payload)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
```

### 6. **batch-operations** (New)
**Location**: `supabase/functions/batch-operations/index.ts`

**Purpose**: Handle bulk operations efficiently with transaction-like behavior

**Advanced Features**:
- ✅ Bulk create/update/delete/move operations
- ✅ Transaction mode with rollback
- ✅ Progress tracking
- ✅ Rate limiting (max 100 operations)
- ✅ Detailed operation results
- ✅ Error handling per operation

**Enterprise Use Case**: Data migration, bulk imports, mass updates, data cleanup

**Key Code Patterns**:
```typescript
// Process batch with rollback capability
const createdCardIds: string[] = [];

for (let i = 0; i < operations.length; i++) {
  try {
    const result = await executeOperation(operations[i]);
    
    if (result.success) {
      createdCardIds.push(result.card_id);
      results.successful++;
    }
  } catch (err) {
    results.failed++;
    
    // Transaction mode: rollback all changes
    if (transaction_mode) {
      await supabaseAdmin
        .from("cards")
        .delete()
        .in("id", createdCardIds);
      
      return new Response(JSON.stringify({
        success: false,
        error: "Batch operation failed, all changes rolled back"
      }));
    }
  }
}

// Operation handlers
async function createCard(supabaseAdmin, boardId, userId, data) {
  const { data: card, error } = await supabaseAdmin
    .from("cards")
    .insert({ board_id: boardId, created_by: userId, ...data })
    .select()
    .single();

  if (error) throw error;
  return { success: true, card_id: card.id };
}
```

**Usage Example**:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/batch-operations`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    board_id: 'board-uuid',
    transaction_mode: true, // Rollback all on failure
    operations: [
      { operation: 'create', data: { title: 'Card 1', column_id: 'col-1' } },
      { operation: 'create', data: { title: 'Card 2', column_id: 'col-2' } },
      { operation: 'update', card_id: 'card-3', data: { title: 'Updated' } },
      { operation: 'delete', card_id: 'card-4' },
    ]
  })
});
```

### 7. **data-sync** (New)
**Location**: `supabase/functions/data-sync/index.ts`

**Purpose**: Synchronize data with external systems (Jira, Asana, Trello)

**Advanced Features**:
- ✅ Two-way data synchronization
- ✅ Conflict detection and resolution
- ✅ Change tracking
- ✅ Delta sync (only changed records)
- ✅ Field mapping configuration
- ✅ Sync history and audit trail

**Enterprise Use Case**: System integration, data consolidation, multi-platform support

**Key Code Patterns**:
```typescript
// Import from external system
async function importFromExternalSystem(
  supabaseAdmin,
  boardId,
  externalSystem,
  config,
  lastSync
) {
  // Fetch only changed records
  const externalCards = await fetchExternalCards(externalSystem, config, lastSync);

  for (const externalCard of externalCards) {
    const existingMapping = mappingMap.get(externalCard.external_id);

    if (existingMapping) {
      // Conflict detection
      const lastExternalUpdate = new Date(externalCard.updated_at);
      const lastKnownUpdate = new Date(existingMapping.last_external_update);

      if (lastExternalUpdate > lastKnownUpdate) {
        // Check for local changes
        const internalCard = await getInternalCard(existingMapping.internal_card_id);
        const internalUpdate = new Date(internalCard.updated_at);

        // Both updated since last sync = conflict
        if (internalUpdate > lastKnownUpdate) {
          results.conflicts++;
          // Apply conflict resolution (external wins, manual, etc.)
        }

        // Update existing card
        await updateCard(existingMapping.internal_card_id, mapExternalToInternal(externalCard));
        results.updated++;
      }
    } else {
      // Create new card
      const newCard = await createCard(boardId, mapExternalToInternal(externalCard));
      
      // Create sync mapping
      await createMapping(newCard.id, externalCard.external_id);
      results.imported++;
    }
  }

  return results;
}

// Field mapping
function mapExternalToInternal(externalCard: ExternalCard, mappingConfig?: any): any {
  return {
    title: externalCard.title,
    description: externalCard.description,
    metadata: {
      external_status: externalCard.status,
      synced_from: externalSystem,
      ...externalCard.custom_fields,
    },
  };
}
```

---

## 🔐 Security Best Practices

### 1. **Authentication**
```typescript
// Always verify JWT token
const { data: { user }, error } = await supabaseUser.auth.getUser(jwt);
if (userError || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

### 2. **Authorization**
```typescript
// Check permissions
const { data: membership } = await supabaseAdmin
  .from("board_members")
  .select("role")
  .eq("board_id", board_id)
  .eq("user_id", user.id)
  .single();

if (!membership || membership.role !== "admin") {
  return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403 });
}
```

### 3. **Rate Limiting**
```typescript
// Enforce limits
if (count >= CARD_LIMIT) {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded" }),
    { status: 429 }
  );
}
```

### 4. **Input Validation**
```typescript
// Validate required fields
if (!board_id || !title) {
  return new Response(
    JSON.stringify({ error: "Missing required fields" }),
    { status: 400 }
  );
}
```

### 5. **Secret Management**
```typescript
// Use environment variables
const apiKey = Deno.env.get("EXTERNAL_API_KEY");
const secret = Deno.env.get("JWT_SECRET");

// Never hardcode secrets!
```

---

## 🚀 Deployment

### Deploy All Functions
```bash
# Deploy individual function
supabase functions deploy generate-share-url

# Deploy all functions
supabase functions deploy create-card
supabase functions deploy send-reminders
supabase functions deploy generate-share-url
supabase functions deploy generate-report
supabase functions deploy webhook-integration
supabase functions deploy batch-operations
supabase functions deploy data-sync
```

### Set Environment Variables
```bash
supabase secrets set JWT_SECRET=your-secret-key
supabase secrets set SENDGRID_API_KEY=your-sendgrid-key
supabase secrets set APP_BASE_URL=https://your-app.com
supabase secrets set CRON_SECRET=your-cron-secret
```

### Test Functions Locally
```bash
# Start local functions
supabase functions serve

# Test with curl
curl -X POST http://localhost:54321/functions/v1/generate-share-url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"board_id": "uuid", "access_level": "view"}'
```

---

## 📊 Required Database Tables

Some functions require additional tables. Add these migrations:

```sql
-- Board shares for secure URL sharing
CREATE TABLE board_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  access_level TEXT CHECK (access_level IN ('view', 'edit')),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  token_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook configurations
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  secret TEXT,
  integration_type TEXT CHECK (integration_type IN ('webhook', 'slack', 'teams')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT CHECK (status IN ('delivered', 'failed')),
  delivered_at TIMESTAMPTZ,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB
);

-- Sync configurations
CREATE TABLE sync_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  external_system TEXT NOT NULL,
  api_key TEXT,
  api_endpoint TEXT,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync mappings
CREATE TABLE card_sync_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  internal_card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  external_card_id TEXT NOT NULL,
  external_system TEXT NOT NULL,
  last_external_update TIMESTAMPTZ,
  last_internal_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report history
CREATE TABLE report_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  report_type TEXT NOT NULL,
  board_ids UUID[],
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  format TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync history
CREATE TABLE sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  external_system TEXT NOT NULL,
  sync_direction TEXT CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  imported_count INTEGER DEFAULT 0,
  exported_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  conflict_count INTEGER DEFAULT 0,
  status TEXT
);
```

---

## 🎯 Conclusion

**Yes, Supabase can absolutely handle enterprise-level systems!** The Edge Functions examples demonstrate:

✅ **Advanced Business Logic**: Rate limiting, validation, complex calculations  
✅ **Secure URL Generation**: JWT tokens, expiration, access controls  
✅ **External Integrations**: Slack, Teams, webhooks, third-party APIs  
✅ **Data Processing**: Batch operations, reporting, analytics  
✅ **Data Synchronization**: Two-way sync, conflict resolution  
✅ **Security**: Authentication, authorization, encryption  
✅ **Scalability**: Batch processing, efficient queries, caching  
✅ **Monitoring**: Logging, error tracking, audit trails  

These are just examples - Edge Functions can do **anything** you can code in TypeScript/JavaScript!

### Next Steps
1. Deploy these functions to your Supabase project
2. Create the required database tables
3. Set up environment variables
4. Test with your application
5. Monitor performance and logs
6. Scale as needed!

**Supabase = PostgreSQL + Real-time + Auth + Storage + Edge Functions = Complete Backend Platform for Enterprise!**
