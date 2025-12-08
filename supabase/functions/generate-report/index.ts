// Supabase Edge Function: generate-report
// Enterprise Example: Generates comprehensive board analytics and exports
// Features:
// - Complex data aggregation
// - PDF/CSV generation
// - Scheduled report generation
// - Multi-board analytics
// - Performance metrics calculation
// Deploy with: supabase functions deploy generate-report

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

interface ReportRequest {
  board_ids: string[];
  report_type: "summary" | "detailed" | "performance" | "activity";
  date_range: {
    start: string;
    end: string;
  };
  format: "json" | "csv" | "pdf";
  include_charts?: boolean;
}

interface CardMetrics {
  total_cards: number;
  completed_cards: number;
  overdue_cards: number;
  avg_completion_time_hours: number;
  cards_by_priority: Record<string, number>;
  cards_by_assignee: Record<string, number>;
}

interface BoardReport {
  board_id: string;
  board_title: string;
  metrics: CardMetrics;
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

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(jwt);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body: ReportRequest = await req.json();
    const { board_ids, report_type, date_range, format } = body;

    if (!board_ids || board_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one board_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for complex queries
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user has access to all requested boards (either as owner or member)
    const { data: ownedBoards } = await supabaseAdmin
      .from("boards")
      .select("id")
      .eq("owner", user.id)
      .in("id", board_ids);

    const { data: memberBoards } = await supabaseAdmin
      .from("board_members")
      .select("board_id")
      .eq("user_id", user.id)
      .in("board_id", board_ids);

    const ownedBoardIds = ownedBoards?.map((b: { id: string }) => b.id) || [];
    const memberBoardIds = memberBoards?.map((b: { board_id: string }) => b.board_id) || [];
    const accessibleBoardIds = [...new Set([...ownedBoardIds, ...memberBoardIds])];
    const unauthorizedBoards = board_ids.filter(id => !accessibleBoardIds.includes(id));

    if (unauthorizedBoards.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "Access denied to some boards",
          unauthorized_boards: unauthorizedBoards 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate reports for each board
    const reports: BoardReport[] = [];

    for (const boardId of board_ids) {
      // Get board info
      const { data: board } = await supabaseAdmin
        .from("boards")
        .select("id, title")
        .eq("id", boardId)
        .single();

      if (!board) continue;

      // Get all cards for the board within date range
      const { data: cards } = await supabaseAdmin
        .from("cards")
        .select("*")
        .eq("board_id", boardId)
        .gte("created_at", date_range.start)
        .lte("created_at", date_range.end);

      if (!cards) continue;

      // Calculate metrics
      const metrics = calculateCardMetrics(cards);

      // Get timeline data (cards created/completed per day)
      const timelineData = generateTimelineData(cards, date_range);

      // Get member performance
      const memberPerformance = await calculateMemberPerformance(
        supabaseAdmin,
        boardId,
        date_range
      );

      reports.push({
        board_id: boardId,
        board_title: board.title,
        metrics,
        timeline_data: timelineData,
        member_performance: memberPerformance,
      });
    }

    // Format output based on requested format
    let responseData: string | object;
    let contentType = "application/json";

    switch (format) {
      case "csv":
        responseData = convertToCSV(reports);
        contentType = "text/csv";
        break;
      case "pdf":
        // For production, integrate with a PDF generation service
        responseData = { 
          message: "PDF generation requires integration with a PDF service",
          pdf_url: "https://example.com/generate-pdf",
          data: reports 
        };
        break;
      default:
        responseData = {
          success: true,
          generated_at: new Date().toISOString(),
          report_type,
          date_range,
          boards_analyzed: board_ids.length,
          reports,
        };
    }

    // Store report generation activity
    await supabaseAdmin.from("report_history").insert({
      user_id: user.id,
      report_type,
      board_ids,
      date_range_start: date_range.start,
      date_range_end: date_range.end,
      format,
      generated_at: new Date().toISOString(),
    });

    return new Response(
      typeof responseData === "string" ? responseData : JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": contentType,
          ...(format === "csv" ? { "Content-Disposition": "attachment; filename=board-report.csv" } : {})
        } 
      }
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

// Helper functions
function calculateCardMetrics(cards: any[]): CardMetrics {
  const now = new Date();
  // Note: TaskFlow doesn't have completed_at column, use metadata or check if in done column
  // For now, we'll consider cards without due_date or future due_date as not completed
  const completed = cards.filter(c => c.metadata?.completed === true || c.metadata?.status === 'done');
  const overdue = cards.filter(c => c.due_date && new Date(c.due_date) < now && !completed.includes(c));

  // Calculate average completion time
  // Use metadata.completed_at if available, otherwise skip completion time calculation
  const completionTimes = completed
    .filter((c: any) => c.metadata?.completed_at)
    .map((c: any) => new Date(c.metadata.completed_at).getTime() - new Date(c.created_at).getTime())
    .filter(t => t > 0);
  
  const avgCompletionTime = completionTimes.length > 0
    ? completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length / (1000 * 60 * 60)
    : 0;

  // Group by priority
  const priorityCounts: Record<string, number> = {};
  cards.forEach(c => {
    const priority = c.priority || "none";
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
  });

  // Group by assignee
  const assigneeCounts: Record<string, number> = {};
  cards.forEach(c => {
    if (c.assignee) {
      assigneeCounts[c.assignee] = (assigneeCounts[c.assignee] || 0) + 1;
    }
  });

  return {
    total_cards: cards.length,
    completed_cards: completed.length,
    overdue_cards: overdue.length,
    avg_completion_time_hours: Math.round(avgCompletionTime * 100) / 100,
    cards_by_priority: priorityCounts,
    cards_by_assignee: assigneeCounts,
  };
}

function generateTimelineData(cards: any[], dateRange: { start: string; end: string }) {
  const timeline: Record<string, { created: number; completed: number; in_progress: number }> = {};
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);

  // Initialize all dates
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split("T")[0];
    timeline[dateKey] = { created: 0, completed: 0, in_progress: 0 };
  }

  // Count cards by date
  cards.forEach(card => {
    const createdDate = new Date(card.created_at).toISOString().split("T")[0];
    if (timeline[createdDate]) {
      timeline[createdDate].created++;
    }

    if (card.metadata?.completed_at) {
      const completedDate = new Date(card.metadata.completed_at).toISOString().split("T")[0];
      if (timeline[completedDate]) {
        timeline[completedDate].completed++;
      }
    }
  });

  return Object.entries(timeline).map(([date, counts]) => ({ date, ...counts }));
}

async function calculateMemberPerformance(supabaseAdmin: any, boardId: string, dateRange: any) {
  const { data: members } = await supabaseAdmin
    .from("board_members")
    .select("user_id")
    .eq("board_id", boardId);

  if (!members) return [];

  const performance = [];

  for (const member of members) {
    const { data: cards } = await supabaseAdmin
      .from("cards")
      .select("*")
      .eq("board_id", boardId)
      .eq("assignee", member.user_id)
      .gte("created_at", dateRange.start)
      .lte("created_at", dateRange.end);

    if (!cards) continue;

    const completed = cards.filter((c: any) => c.metadata?.completed === true || c.metadata?.completed_at);
    const completionTimes = completed
      .filter((c: any) => c.metadata?.completed_at)
      .map((c: any) => new Date(c.metadata.completed_at).getTime() - new Date(c.created_at).getTime())
      .filter((t: number) => t > 0);
    
    const avgTime = completionTimes.length > 0
      ? completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length / (1000 * 60 * 60)
      : 0;

    performance.push({
      user_id: member.user_id,
      user_name: "User Name", // You'd fetch this from auth.users
      cards_assigned: cards.length,
      cards_completed: completed.length,
      avg_completion_time_hours: Math.round(avgTime * 100) / 100,
    });
  }

  return performance;
}

function convertToCSV(reports: BoardReport[]): string {
  let csv = "Board,Total Cards,Completed,Overdue,Avg Completion Time (hrs)\n";
  
  reports.forEach(report => {
    csv += `${report.board_title},${report.metrics.total_cards},${report.metrics.completed_cards},${report.metrics.overdue_cards},${report.metrics.avg_completion_time_hours}\n`;
  });

  return csv;
}
