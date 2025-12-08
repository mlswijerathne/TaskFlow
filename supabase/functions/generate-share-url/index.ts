// Supabase Edge Function: generate-share-url
// Enterprise Example: Generates secure, time-limited shareable URLs for boards
// Features:
// - JWT token generation for secure access
// - Expiration timestamps
// - Access level controls (view/edit)
// - Audit logging
// Deploy with: supabase functions deploy generate-share-url

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// @ts-expect-error: Deno module
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-expect-error: Deno module  
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShareUrlRequest {
  board_id: string;
  access_level: "view" | "edit";
  expires_in_hours?: number; // Default: 24 hours
  max_uses?: number; // Optional: limit number of uses
}

// Generate a cryptographically secure secret key for JWT signing
async function getSigningKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("JWT_SECRET") || "your-secret-key-change-in-production";
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.split(" ")[1];

    // Create client with user's JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(jwt);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body: ShareUrlRequest = await req.json();
    const { board_id, access_level, expires_in_hours = 24, max_uses } = body;

    if (!board_id || !access_level) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: board_id, access_level" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify board exists and user has permission
    const { data: board, error: boardError } = await supabaseAdmin
      .from("boards")
      .select("id, owner, title")
      .eq("id", board_id)
      .single();

    if (boardError || !board) {
      return new Response(
        JSON.stringify({ error: "Board not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is owner or has admin access
    const { data: membership } = await supabaseAdmin
      .from("board_members")
      .select("role")
      .eq("board_id", board_id)
      .eq("user_id", user.id)
      .single();

    const isOwner = board.owner === user.id;
    const isAdmin = membership?.role === "admin";

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions to share this board" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique share token
    const shareId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);

    // Create JWT token for secure access
    const key = await getSigningKey();
    const shareToken = await create(
      { alg: "HS256", typ: "JWT" },
      {
        share_id: shareId,
        board_id: board_id,
        access_level: access_level,
        created_by: user.id,
        exp: getNumericDate(expiresAt),
        iat: getNumericDate(new Date()),
      },
      key
    );

    // Store share record in database (you'd need to create a 'board_shares' table)
    const { data: shareRecord, error: insertError } = await supabaseAdmin
      .from("board_shares")
      .insert({
        id: shareId,
        board_id: board_id,
        created_by: user.id,
        access_level: access_level,
        expires_at: expiresAt.toISOString(),
        max_uses: max_uses || null,
        current_uses: 0,
        token_hash: await hashToken(shareToken), // Store hash for verification
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create share record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate share URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate the shareable URL
    const baseUrl = Deno.env.get("APP_BASE_URL") || "https://your-app.com";
    const shareUrl = `${baseUrl}/boards/shared/${shareId}?token=${shareToken}`;

    // Log activity
    await supabaseAdmin.from("board_activity").insert({
      board_id: board_id,
      user_id: user.id,
      action: "share_created",
      details: {
        share_id: shareId,
        access_level: access_level,
        expires_at: expiresAt.toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          share_id: shareId,
          share_url: shareUrl,
          access_level: access_level,
          expires_at: expiresAt.toISOString(),
          max_uses: max_uses,
          board_title: board.title,
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

// Helper function to hash tokens for secure storage
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
