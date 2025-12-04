// Supabase Edge Function: create-card
// Handles card creation with rate limiting (100 cards per user)
// Deploy with: supabase functions deploy create-card

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// @ts-ignore: Deno module
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CARD_LIMIT = 100;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.split(" ")[1];

    // Create Supabase client with user's JWT to get user info
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(jwt);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Parse request body
    const body = await req.json();
    const { title, description, column_id, board_id, due_date, position, assignee } = body;

    // Validate required fields
    if (!title || !column_id || !board_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, column_id, board_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to bypass RLS for counting and inserting
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Rate limit check: count cards created by this user
    const { count, error: countError } = await supabaseAdmin
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId);

    if (countError) {
      console.error("Count error:", countError);
      return new Response(
        JSON.stringify({ error: "Failed to check card limit" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (count !== null && count >= CARD_LIMIT) {
      return new Response(
        JSON.stringify({ 
          error: "Card limit reached", 
          message: `You have reached the maximum limit of ${CARD_LIMIT} cards.`,
          current_count: count,
          limit: CARD_LIMIT
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the board exists and user has access
    const { data: board, error: boardError } = await supabaseAdmin
      .from("boards")
      .select("id, owner")
      .eq("id", board_id)
      .single();

    if (boardError || !board) {
      return new Response(
        JSON.stringify({ error: "Board not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the column exists and belongs to the board
    const { data: column, error: columnError } = await supabaseAdmin
      .from("columns")
      .select("id")
      .eq("id", column_id)
      .eq("board_id", board_id)
      .single();

    if (columnError || !column) {
      return new Response(
        JSON.stringify({ error: "Column not found or does not belong to this board" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate position if not provided
    let cardPosition = position;
    if (cardPosition === undefined || cardPosition === null) {
      const { data: maxPosData } = await supabaseAdmin
        .from("cards")
        .select("position")
        .eq("column_id", column_id)
        .order("position", { ascending: false })
        .limit(1)
        .single();
      
      cardPosition = maxPosData ? maxPosData.position + 1 : 0;
    }

    // Insert the card
    const { data: card, error: insertError } = await supabaseAdmin
      .from("cards")
      .insert({
        title,
        description: description || null,
        column_id,
        board_id,
        due_date: due_date || null,
        position: cardPosition,
        created_by: userId,
        assignee: assignee || null,
        metadata: {},
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create card", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: card,
        cards_created: (count || 0) + 1,
        cards_remaining: CARD_LIMIT - (count || 0) - 1,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
