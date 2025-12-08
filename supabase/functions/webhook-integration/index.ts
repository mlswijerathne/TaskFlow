// Supabase Edge Function: webhook-integration
// Enterprise Example: Integrates with external services (Slack, Teams, Webhooks)
// Features:
// - Outbound webhook notifications
// - Slack/Microsoft Teams integration
// - Retry logic with exponential backoff
// - Webhook signature verification
// - Event filtering and transformation
// Deploy with: supabase functions deploy webhook-integration

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// @ts-expect-error: Deno module
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookEvent {
  event_type: "card.created" | "card.updated" | "card.deleted" | "board.created" | "member.added";
  board_id: string;
  payload: any;
  triggered_by: string;
}

interface WebhookConfig {
  id: string;
  board_id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  integration_type: "webhook" | "slack" | "teams";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // This function can be triggered by database triggers or manually
    const body: WebhookEvent = await req.json();
    const { event_type, board_id, payload, triggered_by } = body;

    if (!event_type || !board_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all active webhooks for this board that listen to this event
    const { data: webhooks, error: webhooksError } = await supabaseAdmin
      .from("webhooks")
      .select("*")
      .eq("board_id", board_id)
      .eq("active", true)
      .contains("events", [event_type]);

    if (webhooksError) {
      console.error("Failed to fetch webhooks:", webhooksError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch webhooks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active webhooks for this event" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each webhook
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const webhook of webhooks as WebhookConfig[]) {
      try {
        const success = await sendWebhook(webhook, event_type, payload, triggered_by);
        
        if (success) {
          results.success++;
          
          // Log successful delivery
          await supabaseAdmin.from("webhook_deliveries").insert({
            webhook_id: webhook.id,
            event_type,
            status: "delivered",
            delivered_at: new Date().toISOString(),
            payload,
          });
        } else {
          results.failed++;
          results.errors.push(`Failed to deliver to ${webhook.id}`);
          
          // Log failed delivery
          await supabaseAdmin.from("webhook_deliveries").insert({
            webhook_id: webhook.id,
            event_type,
            status: "failed",
            attempted_at: new Date().toISOString(),
            payload,
          });
        }

      } catch (err) {
        console.error(`Error sending webhook ${webhook.id}:`, err);
        results.failed++;
        results.errors.push(`Error with webhook ${webhook.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${webhooks.length} webhooks`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: err instanceof Error ? err.message : String(err) 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Send webhook with retry logic
async function sendWebhook(
  webhook: WebhookConfig,
  eventType: string,
  payload: any,
  triggeredBy: string
): Promise<boolean> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      let requestBody: any;
      let headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Format payload based on integration type
      switch (webhook.integration_type) {
        case "slack":
          requestBody = formatSlackMessage(eventType, payload);
          break;
        case "teams":
          requestBody = formatTeamsMessage(eventType, payload);
          break;
        default:
          requestBody = {
            event: eventType,
            timestamp: new Date().toISOString(),
            triggered_by: triggeredBy,
            data: payload,
          };
          
          // Add signature if secret is provided
          if (webhook.secret) {
            const signature = await generateSignature(webhook.secret, JSON.stringify(requestBody));
            headers["X-Webhook-Signature"] = signature;
          }
      }

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        return true;
      }

      // If not successful, check if we should retry
      if (response.status >= 500) {
        retryCount++;
        if (retryCount < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          continue;
        }
      }

      console.error(`Webhook delivery failed with status ${response.status}`);
      return false;

    } catch (err) {
      console.error(`Webhook delivery error (attempt ${retryCount + 1}):`, err);
      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  }

  return false;
}

// Format message for Slack
function formatSlackMessage(eventType: string, payload: any) {
  const emoji = {
    "card.created": "✨",
    "card.updated": "📝",
    "card.deleted": "🗑️",
    "board.created": "📋",
    "member.added": "👥",
  }[eventType] || "📢";

  let text = "";
  switch (eventType) {
    case "card.created":
      text = `New card created: *${payload.title}*`;
      break;
    case "card.updated":
      text = `Card updated: *${payload.title}*`;
      break;
    case "card.deleted":
      text = `Card deleted: *${payload.title}*`;
      break;
    case "board.created":
      text = `New board created: *${payload.title}*`;
      break;
    case "member.added":
      text = `New member added to board`;
      break;
  }

  return {
    text: `${emoji} ${text}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} ${text}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Event: \`${eventType}\` | Time: ${new Date().toISOString()}`,
          },
        ],
      },
    ],
  };
}

// Format message for Microsoft Teams
function formatTeamsMessage(eventType: string, payload: any) {
  return {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: `Board Event: ${eventType}`,
    themeColor: "0078D4",
    title: `Board Event: ${eventType}`,
    sections: [
      {
        activityTitle: payload.title || "Board Activity",
        activitySubtitle: new Date().toISOString(),
        facts: [
          {
            name: "Event Type",
            value: eventType,
          },
          {
            name: "Board",
            value: payload.board_title || "Unknown",
          },
        ],
      },
    ],
  };
}

// Generate HMAC signature for webhook verification
async function generateSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
