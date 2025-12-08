# TaskFlow Enterprise Features - Integration Guide

## ✅ Setup Complete!

All enterprise Edge Functions are deployed and ready to use!

## 📁 Files Created

### 1. Integration Library
**File**: `src/lib/edgeFunctions.ts`

Type-safe functions to call all Edge Functions with full TypeScript support.

### 2. React Components
**Directory**: `src/components/enterprise/`

- `ShareBoardButton.tsx` - Share boards with temporary URLs
- `GenerateReportButton.tsx` - Generate and view analytics reports
- `BulkOperations.tsx` - Bulk import/move/delete cards
- `index.ts` - Export all components

## 🚀 Quick Start

### 1. Add to Your Board View

```typescript
// app/boards/[id]/page.tsx
import { ShareBoardButton, GenerateReportButton, BulkOperations } from '@/components/enterprise';

export default function BoardPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* Your existing board UI */}
      
      <div className="flex gap-2 mt-4">
        <ShareBoardButton 
          boardId={params.id}
          boardTitle="My Board"
        />
        
        <GenerateReportButton 
          boardIds={[params.id]}
        />
        
        <BulkOperations 
          boardId={params.id}
          columnId="your-column-id"
        />
      </div>
    </div>
  );
}
```

### 2. Use the Functions Directly

```typescript
import { 
  generateShareUrl, 
  generateReport, 
  batchOperations,
  bulkCreateCards 
} from '@/lib/edgeFunctions';

// Share a board
const shareResult = await generateShareUrl(boardId, 'view', 24);
console.log('Share URL:', shareResult.data.share_url);

// Generate a report
const report = await generateReport(
  [boardId],
  'performance',
  { start: '2025-01-01', end: '2025-12-31' }
);

// Bulk create cards
const cards = [
  { title: 'Task 1', description: 'Description 1', priority: 'high' },
  { title: 'Task 2', description: 'Description 2', priority: 'medium' },
];
await bulkCreateCards(boardId, columnId, cards);
```

## 📋 Available Functions

### 1. Share Board
```typescript
const result = await generateShareUrl(
  boardId,
  'view',        // 'view' or 'edit'
  24,            // expires in 24 hours
  10             // optional: max 10 uses
);
```

### 2. Generate Reports
```typescript
const report = await generateReport(
  ['board-1', 'board-2'],
  'performance',  // 'summary' | 'detailed' | 'performance' | 'activity'
  { start: '2025-01-01', end: '2025-12-31' },
  'json'         // 'json' | 'csv' | 'pdf'
);
```

### 3. Batch Operations
```typescript
const result = await batchOperations(
  boardId,
  [
    { operation: 'create', data: { title: 'New Card', column_id: columnId } },
    { operation: 'update', card_id: cardId, data: { title: 'Updated' } },
    { operation: 'delete', card_id: cardId2 },
    { operation: 'move', card_id: cardId3, data: { column_id: newColumnId } }
  ],
  true  // transaction mode: rollback all on failure
);
```

### 4. Bulk Helpers
```typescript
// Create multiple cards
await bulkCreateCards(boardId, columnId, [
  { title: 'Task 1', priority: 'high' },
  { title: 'Task 2', priority: 'low' }
]);

// Move multiple cards
await bulkMoveCards(boardId, [card1, card2, card3], targetColumnId);

// Delete multiple cards
await bulkDeleteCards(boardId, [card1, card2, card3]);
```

### 5. Data Sync
```typescript
const result = await syncData(
  boardId,
  'jira',            // 'jira' | 'asana' | 'trello' | 'custom'
  'bidirectional',   // 'import' | 'export' | 'bidirectional'
  {
    field_mappings: { title: 'summary', description: 'description' },
    status_mappings: { 'To Do': 'todo-column-id', 'Done': 'done-column-id' }
  }
);
```

## 🎨 Styling

All components use Tailwind CSS classes. Customize by:

1. **Modify the component files** directly
2. **Override with custom classes**
3. **Use your own component library** (shadcn/ui, etc.)

Example with shadcn/ui Button:
```typescript
import { Button } from '@/components/ui/button';

<Button onClick={() => handleShare('view', 24)}>
  Share Board
</Button>
```

## 🔒 Security

All functions require authentication:

```typescript
// Functions automatically get the user's JWT token
const { data: { session } } = await supabase.auth.getSession();
// Token is sent with every request
```

**RLS Policies ensure**:
- Users can only share boards they own or have admin access to
- Reports only include boards the user has access to
- Batch operations respect board permissions

## 📊 Use Cases

### 1. Client Collaboration
```typescript
// Share a sprint board with client (read-only, 7 days)
const share = await generateShareUrl(sprintBoardId, 'view', 168);
// Send share.data.share_url to client via email
```

### 2. Monthly Reports
```typescript
// Generate team performance report
const report = await generateMonthlyReport(
  [devBoardId, qaBoard
Id],
  2025,
  12  // December
);
```

### 3. Sprint Planning
```typescript
// Import 50 tasks from planning spreadsheet
const tasks = parseSpreadsheet(csvData); // Your parser
await bulkCreateCards(boardId, backlogColumnId, tasks);
```

### 4. Board Cleanup
```typescript
// Move all overdue tasks to a cleanup column
const overdueTasks = getOverdueTasks(); // Your function
await bulkMoveCards(boardId, overdueTasks, cleanupColumnId);
```

### 5. Jira Integration
```typescript
// Sync TaskFlow board with company Jira
await syncData(boardId, 'jira', 'bidirectional', {
  field_mappings: { title: 'summary', description: 'description' },
  status_mappings: {
    'To Do': todoColumnId,
    'In Progress': inProgressColumnId,
    'Done': doneColumnId
  }
});
```

## 🧪 Testing

### Test in Browser Console
```javascript
// Generate share URL
const share = await fetch('https://ygfearxmisoabqrkgxvb.supabase.co/functions/v1/generate-share-url', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    board_id: 'your-board-uuid',
    access_level: 'view',
    expires_in_hours: 24
  })
}).then(r => r.json());

console.log(share);
```

### Test with curl
```bash
curl -X POST https://ygfearxmisoabqrkgxvb.supabase.co/functions/v1/generate-report \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "board_ids": ["board-uuid"],
    "report_type": "summary",
    "date_range": {"start": "2025-01-01", "end": "2025-12-31"},
    "format": "json"
  }'
```

## 📈 Monitoring

View function logs:
```bash
supabase functions logs generate-share-url --tail
supabase functions logs generate-report --tail
supabase functions logs batch-operations --tail
```

View in dashboard:
🔗 https://supabase.com/dashboard/project/ygfearxmisoabqrkgxvb/functions

## ⚡ Performance Tips

1. **Batch operations**: Create 100 cards in one call instead of 100 separate calls
2. **Cache reports**: Store report results, regenerate daily/weekly
3. **Lazy load**: Only call functions when needed
4. **Error handling**: Always wrap in try-catch
5. **Loading states**: Show spinners during operations

## 🐛 Troubleshooting

### "User not authenticated"
```typescript
// Check if user is logged in
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Redirect to login
}
```

### "Board not found"
```typescript
// Verify board exists and user has access
const { data: board } = await supabase
  .from('boards')
  .select('*')
  .eq('id', boardId)
  .single();
```

### Function timeout
```typescript
// For large batch operations, split into smaller batches
const batchSize = 50;
for (let i = 0; i < operations.length; i += batchSize) {
  const batch = operations.slice(i, i + batchSize);
  await batchOperations(boardId, batch);
}
```

## 🎉 What's Next?

1. ✅ Functions deployed
2. ✅ Integration library created
3. ✅ React components ready
4. ⬜ Add to your board UI
5. ⬜ Test each feature
6. ⬜ Customize styling
7. ⬜ Set up webhooks (Slack integration)
8. ⬜ Configure data sync (if needed)

## 📚 Additional Resources

- [Full API Documentation](./ENTERPRISE_EDGE_FUNCTIONS.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Compatibility Info](./TASKFLOW_COMPATIBILITY.md)
- [Supabase Dashboard](https://supabase.com/dashboard/project/ygfearxmisoabqrkgxvb)

---

**You're all set!** Start using enterprise features in your TaskFlow application! 🚀
