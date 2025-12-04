// Supabase Edge Function: send-reminders
// Scheduled function to process and send reminder notifications
// Can be triggered by external cron (cron-job.org, GitHub Actions, etc.)
// Deploy with: supabase functions deploy send-reminders

// Declare Deno global for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// @ts-ignore: Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Notification {
  id: string;
  user_id: string;
  card_id: string | null;
  type: string;
  payload: {
    card_title?: string;
    board_id?: string;
    due_date?: string;
  };
  read: boolean;
  send_at: string | null;
}

// Optional: SendGrid email sending
async function sendEmailViaSendGrid(
  to: string,
  subject: string,
  content: string
): Promise<boolean> {
  const sendGridApiKey = Deno.env.get("SENDGRID_API_KEY");
  
  if (!sendGridApiKey) {
    console.log("SendGrid API key not configured, skipping email");
    return false;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendGridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@kanban-poc.com" },
        subject,
        content: [{ type: "text/plain", value: content }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("SendGrid error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Optional: Verify this is called with a secret key for security
    const authHeader = req.headers.get("authorization");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      // If CRON_SECRET is set, require it for authentication
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find notifications that need to be sent
    const now = new Date().toISOString();
    const { data: notifications, error: fetchError } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("type", "reminder")
      .eq("read", false)
      .lte("send_at", now)
      .limit(100); // Process in batches

    if (fetchError) {
      console.error("Failed to fetch notifications:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notifications" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending reminders", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      processed: 0,
      emailsSent: 0,
      errors: [] as string[],
    };

    // Process each notification
    for (const notification of notifications as Notification[]) {
      try {
        // Get user email for sending reminder
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
          notification.user_id
        );

        if (userError || !userData.user) {
          console.error(`User not found: ${notification.user_id}`);
          results.errors.push(`User not found: ${notification.user_id}`);
          continue;
        }

        const userEmail = userData.user.email;
        const payload = notification.payload;

        // Send email reminder if email is available
        if (userEmail && payload.card_title) {
          const subject = `Reminder: ${payload.card_title} is due soon`;
          const content = `
Hello,

This is a reminder that your task "${payload.card_title}" is due on ${
            payload.due_date ? new Date(payload.due_date).toLocaleString() : "soon"
          }.

Please log in to your Kanban board to view and manage this task.

Best regards,
Kanban POC
          `.trim();

          const emailSent = await sendEmailViaSendGrid(userEmail, subject, content);
          if (emailSent) {
            results.emailsSent++;
          }
        }

        // Mark notification as read/sent
        const { error: updateError } = await supabaseAdmin
          .from("notifications")
          .update({ 
            read: true,
            payload: {
              ...notification.payload,
              sent_at: new Date().toISOString(),
              email_sent: results.emailsSent > 0,
            }
          })
          .eq("id", notification.id);

        if (updateError) {
          console.error(`Failed to update notification ${notification.id}:`, updateError);
          results.errors.push(`Failed to update notification ${notification.id}`);
        } else {
          results.processed++;
        }

      } catch (err) {
        console.error(`Error processing notification ${notification.id}:`, err);
        results.errors.push(`Error processing ${notification.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} reminders`,
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
