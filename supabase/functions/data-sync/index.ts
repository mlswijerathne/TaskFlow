// Supabase Edge Function: data-sync
// Enterprise Example: Synchronizes data with external systems
// Features:
// - Two-way data synchronization
// - Conflict resolution
// - Change tracking
// - Delta sync for efficiency
// - Integration with external APIs (Jira, Asana, etc.)
// Deploy with: supabase functions deploy data-sync

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

interface SyncRequest {
  board_id: string;
  external_system: "jira" | "asana" | "trello" | "custom";
  sync_direction: "import" | "export" | "bidirectional";
  mapping_config?: {
    field_mappings: Record<string, string>;
    status_mappings: Record<string, string>;
  };
  last_sync_timestamp?: string;
}

interface ExternalCard {
  external_id: string;
  title: string;
  description?: string;
  status: string;
  assignee?: string;
  updated_at: string;
  custom_fields?: Record<string, any>;
}

interface CardSyncMapping {
  id: string;
  internal_card_id: string;
  external_card_id: string;
  external_system: string;
  last_external_update: string;
  last_internal_update?: string;
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
    const body: SyncRequest = await req.json();
    const { 
      board_id, 
      external_system, 
      sync_direction, 
      mapping_config,
      last_sync_timestamp 
    } = body;

    if (!board_id || !external_system || !sync_direction) {
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

    // Verify board access
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

    // Get sync configuration (API keys, endpoints, etc.)
    const { data: syncConfig } = await supabaseAdmin
      .from("sync_configurations")
      .select("*")
      .eq("board_id", board_id)
      .eq("external_system", external_system)
      .single();

    if (!syncConfig) {
      return new Response(
        JSON.stringify({ error: "Sync configuration not found for this board" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const syncResults = {
      direction: sync_direction,
      started_at: new Date().toISOString(),
      imported: 0,
      exported: 0,
      updated: 0,
      conflicts: 0,
      errors: [] as string[],
    };

    // Get last sync timestamp
    const lastSync = last_sync_timestamp || syncConfig.last_sync_at || new Date(0).toISOString();

    // Perform sync based on direction
    if (sync_direction === "import" || sync_direction === "bidirectional") {
      const importResult = await importFromExternalSystem(
        supabaseAdmin,
        board_id,
        external_system,
        syncConfig,
        lastSync,
        mapping_config
      );
      
      syncResults.imported = importResult.imported;
      syncResults.updated += importResult.updated;
      syncResults.conflicts += importResult.conflicts;
      syncResults.errors.push(...importResult.errors);
    }

    if (sync_direction === "export" || sync_direction === "bidirectional") {
      const exportResult = await exportToExternalSystem(
        supabaseAdmin,
        board_id,
        external_system,
        syncConfig,
        lastSync,
        mapping_config
      );
      
      syncResults.exported = exportResult.exported;
      syncResults.updated += exportResult.updated;
      syncResults.errors.push(...exportResult.errors);
    }

    // Update sync timestamp
    await supabaseAdmin
      .from("sync_configurations")
      .update({ 
        last_sync_at: new Date().toISOString(),
        last_sync_status: syncResults.errors.length > 0 ? "completed_with_errors" : "success",
      })
      .eq("id", syncConfig.id);

    // Log sync activity
    await supabaseAdmin.from("sync_history").insert({
      board_id: board_id,
      user_id: user.id,
      external_system,
      sync_direction,
      started_at: syncResults.started_at,
      completed_at: new Date().toISOString(),
      imported_count: syncResults.imported,
      exported_count: syncResults.exported,
      updated_count: syncResults.updated,
      conflict_count: syncResults.conflicts,
      status: syncResults.errors.length > 0 ? "completed_with_errors" : "success",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sync completed",
        results: {
          ...syncResults,
          completed_at: new Date().toISOString(),
        },
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

// Import cards from external system
async function importFromExternalSystem(
  supabaseAdmin: any,
  boardId: string,
  externalSystem: string,
  config: any,
  lastSync: string,
  mappingConfig?: any
) {
  const results = {
    imported: 0,
    updated: 0,
    conflicts: 0,
    errors: [] as string[],
  };

  try {
    // Get existing sync mappings
    const { data: existingMappings } = await supabaseAdmin
      .from("card_sync_mappings")
      .select("id, internal_card_id, external_card_id, last_external_update")
      .eq("board_id", boardId)
      .eq("external_system", externalSystem) as { data: CardSyncMapping[] | null };

    const mappingMap = new Map(
      existingMappings?.map((m: CardSyncMapping) => [m.external_card_id, m]) || []
    );

    // Get external cards to sync
    const externalCards = await fetchExternalCards(externalSystem, config, lastSync);

    for (const externalCard of externalCards) {
      try {
        const existingMapping = mappingMap.get(externalCard.external_id);

        if (existingMapping) {
          // Check for conflicts
          const lastExternalUpdate = new Date(externalCard.updated_at);
          const lastKnownUpdate = new Date(existingMapping.last_external_update);

          if (lastExternalUpdate <= lastKnownUpdate) {
            continue; // No changes
          }

          // Get internal card
          // Note: TaskFlow cards table doesn't have updated_at, use created_at or metadata
          const { data: internalCard } = await supabaseAdmin
            .from("cards")
            .select("created_at, metadata")
            .eq("id", existingMapping.internal_card_id)
            .single();

          if (internalCard) {
            // Use metadata.updated_at if available, otherwise use created_at
            const internalUpdate = new Date(internalCard.metadata?.updated_at || internalCard.created_at);
            
            // Conflict detection: both updated since last sync
            if (internalUpdate > lastKnownUpdate && lastExternalUpdate > lastKnownUpdate) {
              results.conflicts++;
              console.log(`Conflict detected for card ${externalCard.external_id}`);
              // Apply conflict resolution strategy (e.g., external wins, manual, etc.)
              // For this example, external changes win
            }

            // Update existing card
            const mappedData = mapExternalToInternal(externalCard, mappingConfig);
            await supabaseAdmin
              .from("cards")
              .update(mappedData)
              .eq("id", existingMapping.internal_card_id);

            // Update mapping
            await supabaseAdmin
              .from("card_sync_mappings")
              .update({ last_external_update: externalCard.updated_at })
              .eq("id", existingMapping.id);

            results.updated++;
          }
        } else {
          // Create new card
          const mappedData = mapExternalToInternal(externalCard, mappingConfig);
          
          // Get a default column for new cards
          const { data: defaultColumn } = await supabaseAdmin
            .from("columns")
            .select("id")
            .eq("board_id", boardId)
            .order("position", { ascending: true })
            .limit(1)
            .single();

          if (!defaultColumn) {
            results.errors.push(`No columns found for board ${boardId}`);
            continue;
          }

          const { data: newCard } = await supabaseAdmin
            .from("cards")
            .insert({
              board_id: boardId,
              column_id: defaultColumn.id,
              created_by: config.created_by || '00000000-0000-0000-0000-000000000000',
              position: 0,
              ...mappedData,
              metadata: {
                ...mappedData.metadata,
                synced_from: externalSystem,
                external_id: externalCard.external_id,
                updated_at: new Date().toISOString(),
              },
            })
            .select()
            .single();

          if (newCard) {
            // Create mapping
            await supabaseAdmin
              .from("card_sync_mappings")
              .insert({
                board_id: boardId,
                internal_card_id: newCard.id,
                external_card_id: externalCard.external_id,
                external_system: externalSystem,
                last_external_update: externalCard.updated_at,
              });

            results.imported++;
          }
        }
      } catch (err) {
        results.errors.push(`Failed to import card ${externalCard.external_id}: ${err}`);
      }
    }

  } catch (err) {
    results.errors.push(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return results;
}

// Export cards to external system
async function exportToExternalSystem(
  supabaseAdmin: any,
  boardId: string,
  externalSystem: string,
  config: any,
  lastSync: string,
  mappingConfig?: any
) {
  const results = {
    exported: 0,
    updated: 0,
    errors: [] as string[],
  };

  try {
    // Get cards updated since last sync
    // Note: Cards table doesn't have updated_at, use created_at or filter by metadata
    const { data: cards } = await supabaseAdmin
      .from("cards")
      .select("*")
      .eq("board_id", boardId)
      .gte("created_at", lastSync);

    if (!cards) return results;

    // Get existing mappings
    const { data: existingMappings } = await supabaseAdmin
      .from("card_sync_mappings")
      .select("*")
      .eq("board_id", boardId)
      .in("internal_card_id", cards.map((c: any) => c.id)) as { data: CardSyncMapping[] | null };

    const mappingMap = new Map(
      existingMappings?.map((m: CardSyncMapping) => [m.internal_card_id, m]) || []
    );

    for (const card of cards) {
      try {
        const existingMapping = mappingMap.get(card.id);
        const mappedData = mapInternalToExternal(card, mappingConfig);

        if (existingMapping) {
          // Update in external system
          await updateExternalCard(
            externalSystem,
            config,
            existingMapping.external_card_id,
            mappedData
          );
          results.updated++;
        } else {
          // Create in external system
          const externalId = await createExternalCard(externalSystem, config, mappedData);
          
          // Create mapping
          await supabaseAdmin
            .from("card_sync_mappings")
            .insert({
              board_id: boardId,
              internal_card_id: card.id,
              external_card_id: externalId,
              external_system: externalSystem,
              last_internal_update: card.metadata?.updated_at || card.created_at,
            });

          results.exported++;
        }
      } catch (err) {
        results.errors.push(`Failed to export card ${card.id}: ${err}`);
      }
    }

  } catch (err) {
    results.errors.push(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return results;
}

// Mock functions for external system integration
async function fetchExternalCards(system: string, config: any, since: string): Promise<ExternalCard[]> {
  // In production, this would call actual external APIs
  console.log(`Fetching cards from ${system} since ${since}`);
  return [];
}

async function createExternalCard(system: string, config: any, data: any): Promise<string> {
  console.log(`Creating card in ${system}:`, data);
  return crypto.randomUUID();
}

async function updateExternalCard(system: string, config: any, externalId: string, data: any): Promise<void> {
  console.log(`Updating card ${externalId} in ${system}:`, data);
}

function mapExternalToInternal(externalCard: ExternalCard, mappingConfig?: any): any {
  // Apply field mappings
  return {
    title: externalCard.title,
    description: externalCard.description,
    metadata: {
      external_status: externalCard.status,
      ...externalCard.custom_fields,
    },
  };
}

function mapInternalToExternal(internalCard: any, mappingConfig?: any): any {
  // Apply field mappings
  return {
    title: internalCard.title,
    description: internalCard.description,
    status: internalCard.metadata?.external_status || "open",
  };
}
