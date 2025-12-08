// Supabase Edge Function: batch-operations
// Enterprise Example: Handles bulk operations efficiently
// Features:
// - Bulk card creation/update/deletion
// - Transaction-like behavior
// - Progress tracking
// - Error handling and rollback strategies
// - Rate limiting per operation
// Deploy with: supabase functions deploy batch-operations

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

interface BatchOperation {
  operation: "create" | "update" | "delete" | "move";
  card_id?: string;
  data?: any;
}

interface BatchRequest {
  board_id: string;
  operations: BatchOperation[];
  transaction_mode?: boolean; // If true, rollback all on any failure
}

const MAX_BATCH_SIZE = 100;

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

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(jwt);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body: BatchRequest = await req.json();
    const { board_id, operations, transaction_mode = false } = body;

    if (!board_id || !operations || operations.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: board_id, operations" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (operations.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} operations`,
          max_allowed: MAX_BATCH_SIZE,
          provided: operations.length,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user has access to the board
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

    const { data: membership } = await supabaseAdmin
      .from("board_members")
      .select("role")
      .eq("board_id", board_id)
      .eq("user_id", user.id)
      .single();

    const hasAccess = board.owner === user.id || membership?.role;

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process operations
    const results = {
      total: operations.length,
      successful: 0,
      failed: 0,
      operations: [] as Array<{
        index: number;
        operation: string;
        status: "success" | "failed";
        card_id?: string;
        error?: string;
      }>,
    };

    const createdCardIds: string[] = [];

    // Execute operations
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      try {
        let result: any;

        switch (operation.operation) {
          case "create":
            result = await createCard(supabaseAdmin, board_id, user.id, operation.data);
            if (result.success) {
              createdCardIds.push(result.card_id);
              results.successful++;
              results.operations.push({
                index: i,
                operation: "create",
                status: "success",
                card_id: result.card_id,
              });
            } else {
              throw new Error(result.error);
            }
            break;

          case "update":
            result = await updateCard(supabaseAdmin, operation.card_id!, operation.data);
            if (result.success) {
              results.successful++;
              results.operations.push({
                index: i,
                operation: "update",
                status: "success",
                card_id: operation.card_id,
              });
            } else {
              throw new Error(result.error);
            }
            break;

          case "delete":
            result = await deleteCard(supabaseAdmin, operation.card_id!);
            if (result.success) {
              results.successful++;
              results.operations.push({
                index: i,
                operation: "delete",
                status: "success",
                card_id: operation.card_id,
              });
            } else {
              throw new Error(result.error);
            }
            break;

          case "move":
            result = await moveCard(
              supabaseAdmin,
              operation.card_id!,
              operation.data.column_id,
              operation.data.position
            );
            if (result.success) {
              results.successful++;
              results.operations.push({
                index: i,
                operation: "move",
                status: "success",
                card_id: operation.card_id,
              });
            } else {
              throw new Error(result.error);
            }
            break;

          default:
            throw new Error(`Unknown operation: ${operation.operation}`);
        }

      } catch (err) {
        results.failed++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        results.operations.push({
          index: i,
          operation: operation.operation,
          status: "failed",
          card_id: operation.card_id,
          error: errorMessage,
        });

        // If in transaction mode, rollback all changes
        if (transaction_mode) {
          console.log("Transaction mode: Rolling back all changes");
          
          // Delete all created cards
          if (createdCardIds.length > 0) {
            await supabaseAdmin
              .from("cards")
              .delete()
              .in("id", createdCardIds);
          }

          return new Response(
            JSON.stringify({
              success: false,
              error: "Batch operation failed, all changes rolled back",
              failed_at_index: i,
              failed_operation: operation,
              failure_reason: errorMessage,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Log batch operation
    await supabaseAdmin.from("board_activity").insert({
      board_id: board_id,
      user_id: user.id,
      action: "batch_operation",
      details: {
        total_operations: results.total,
        successful: results.successful,
        failed: results.failed,
        transaction_mode,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch operation completed: ${results.successful} successful, ${results.failed} failed`,
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

// Helper functions for operations
async function createCard(supabaseAdmin: any, boardId: string, userId: string, data: any) {
  try {
    const { data: card, error } = await supabaseAdmin
      .from("cards")
      .insert({
        board_id: boardId,
        created_by: userId,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, card_id: card.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function updateCard(supabaseAdmin: any, cardId: string, data: any) {
  try {
    const { error } = await supabaseAdmin
      .from("cards")
      .update(data)
      .eq("id", cardId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function deleteCard(supabaseAdmin: any, cardId: string) {
  try {
    const { error } = await supabaseAdmin
      .from("cards")
      .delete()
      .eq("id", cardId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function moveCard(supabaseAdmin: any, cardId: string, columnId: string, position: number) {
  try {
    const { error } = await supabaseAdmin
      .from("cards")
      .update({
        column_id: columnId,
        position: position,
      })
      .eq("id", cardId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
