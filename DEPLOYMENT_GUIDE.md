# Quick Deployment Guide - Enterprise Edge Functions

## Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Supabase project created
- Local environment configured

## Step 1: Apply Database Migrations

```bash
# Navigate to project root
cd kanban-poc

# Apply the enterprise tables migration
supabase db push

# Or if using remote project
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

## Step 2: Set Environment Secrets

```bash
# Set required secrets for edge functions
supabase secrets set JWT_SECRET="your-super-secret-jwt-key-change-this"
supabase secrets set SENDGRID_API_KEY="SG.your-sendgrid-api-key"
supabase secrets set SENDGRID_FROM_EMAIL="noreply@yourapp.com"
supabase secrets set APP_BASE_URL="https://yourapp.com"
supabase secrets set CRON_SECRET="your-cron-secret-for-scheduled-tasks"

# Optional: for external integrations
supabase secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
supabase secrets set JIRA_API_KEY="your-jira-api-key"
supabase secrets set JIRA_API_ENDPOINT="https://your-domain.atlassian.net"
```

## Step 3: Deploy Edge Functions

```bash
# Deploy existing functions
supabase functions deploy create-card
supabase functions deploy send-reminders

# Deploy new enterprise functions
supabase functions deploy generate-share-url
supabase functions deploy generate-report
supabase functions deploy webhook-integration
supabase functions deploy batch-operations
supabase functions deploy data-sync

# Or deploy all at once
supabase functions deploy --project-ref [YOUR-PROJECT-REF]
```

## Step 4: Test Functions Locally (Optional)

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve

# Test in another terminal
curl -X POST http://localhost:54321/functions/v1/generate-share-url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "your-board-uuid",
    "access_level": "view",
    "expires_in_hours": 24
  }'
```

## Step 5: Set Up Scheduled Tasks (Cron)

### Option A: Use External Cron Service (Recommended for Free Tier)

1. Sign up for [cron-job.org](https://cron-job.org) or similar
2. Create a scheduled job:
   - URL: `https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-reminders`
   - Method: POST
   - Headers:
     - `Authorization: Bearer YOUR_CRON_SECRET`
     - `Content-Type: application/json`
   - Schedule: Every hour (or as needed)

### Option B: Use GitHub Actions (Free)

Create `.github/workflows/cron-reminders.yml`:

```yaml
name: Send Reminders Cron

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-reminders
```

### Option C: Supabase Cron (Enterprise Plan)

```sql
-- In Supabase SQL Editor
SELECT cron.schedule(
  'send-reminders-hourly',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url:='https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-reminders',
    headers:='{"Authorization": "Bearer YOUR_CRON_SECRET", "Content-Type": "application/json"}'::jsonb
  ) as request_id;
  $$
);
```

## Step 6: Verify Deployment

```bash
# List deployed functions
supabase functions list

# View function logs
supabase functions logs generate-share-url --tail

# Check function status
curl https://[YOUR-PROJECT-REF].supabase.co/functions/v1/generate-share-url
# Should return CORS or authentication error (expected)
```

## Step 7: Update Client Code

### Generate Share URL
```typescript
// In your Next.js app
export async function generateShareUrl(boardId: string, accessLevel: 'view' | 'edit') {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-share-url`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board_id: boardId,
        access_level: accessLevel,
        expires_in_hours: 24,
      }),
    }
  );

  const result = await response.json();
  return result.data.share_url;
}
```

### Generate Report
```typescript
export async function generateReport(boardIds: string[], reportType: string) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-report`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board_ids: boardIds,
        report_type: reportType,
        date_range: {
          start: '2025-01-01',
          end: '2025-12-31',
        },
        format: 'json',
      }),
    }
  );

  return await response.json();
}
```

### Batch Operations
```typescript
export async function batchCreateCards(boardId: string, cards: any[]) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const operations = cards.map(card => ({
    operation: 'create',
    data: card,
  }));

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/batch-operations`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board_id: boardId,
        operations,
        transaction_mode: true, // Rollback all on failure
      }),
    }
  );

  return await response.json();
}
```

## Monitoring & Troubleshooting

### View Logs
```bash
# Real-time logs
supabase functions logs generate-share-url --tail

# Filter by time
supabase functions logs generate-share-url --since "2025-12-08 10:00:00"

# All functions
supabase functions logs --tail
```

### Check Function Status
- Go to Supabase Dashboard
- Navigate to Edge Functions
- Check deployment status and logs
- View invocations and errors

### Common Issues

1. **CORS Errors**: Make sure CORS headers are included in all responses
2. **Authentication Errors**: Verify JWT token is being sent correctly
3. **Rate Limits**: Check function execution limits on your plan
4. **Environment Variables**: Ensure all secrets are set correctly

## Performance Tips

1. **Use connection pooling**: Functions use Supabase client with pooling
2. **Batch operations**: Use batch-operations function for bulk updates
3. **Caching**: Implement caching for frequently accessed data
4. **Async operations**: Use background jobs for long-running tasks
5. **Error handling**: Implement proper error handling and retries

## Security Checklist

- [ ] All secrets are set using `supabase secrets set`
- [ ] RLS policies are enabled on all tables
- [ ] JWT tokens are verified in all functions
- [ ] Rate limiting is implemented
- [ ] Input validation is in place
- [ ] CORS is properly configured
- [ ] Webhook signatures are verified
- [ ] API keys are never exposed to client

## Cost Optimization

**Free Tier Limits:**
- 500,000 function invocations/month
- 2GB function execution time/month

**Tips:**
- Use batch operations to reduce invocations
- Implement caching where possible
- Use webhooks instead of polling
- Schedule tasks during off-peak hours

## Next Steps

1. ✅ Functions deployed
2. ✅ Database tables created
3. ✅ Secrets configured
4. ⬜ Set up monitoring alerts
5. ⬜ Configure webhooks for your boards
6. ⬜ Test all functions in production
7. ⬜ Document custom integration patterns
8. ⬜ Set up backup and disaster recovery

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Community Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

---

**Deployment Complete!** 🎉

Your Supabase project now has enterprise-grade Edge Functions for:
- Secure URL sharing
- Advanced analytics and reporting
- External system integrations (Slack, Teams, webhooks)
- Bulk operations with transaction support
- Two-way data synchronization

Test thoroughly and monitor the logs for any issues!
