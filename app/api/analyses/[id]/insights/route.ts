import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid analysis ID" }, { status: 400 });
  }

  try {
    const db = createAdminClient();

    // Load the run
    const { data: run, error: runError } = await db
      .from("analysis_runs")
      .select("id, status, period_start, period_end, created_at, completed_at, error_message")
      .eq("id", id)
      .single();

    if (runError || !run) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // Load accounts
    const { data: accountRows, error: accountsError } = await db
      .from("analysis_run_accounts")
      .select("account_id, role, accounts(username, niche)")
      .eq("run_id", id);

    if (accountsError) throw accountsError;

    const accounts = (accountRows ?? []).map((a) => ({
      account_id: a.account_id,
      role: a.role as "client" | "competitor",
      username: (a.accounts as any)?.username ?? a.account_id,
      niche: (a.accounts as any)?.niche ?? null,
    }));

    // Load insights if available in analysis_results
    let insights = null;
    let scripts: any[] = [];
    let currentStatus = run.status;

    const { data: results } = await db
      .from("analysis_results")
      .select("id, competitor_patterns, client_differences, recommendations, created_at")
      .eq("run_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (results) {
      insights = {
        competitor_patterns: results.competitor_patterns,
        client_differences: results.client_differences,
        recommendations: results.recommendations,
      };

      const { data: scriptRows } = await db
        .from("generated_scripts")
        .select("id, script_number, title, hook, body, cta")
        .eq("result_id", results.id)
        .order("script_number", { ascending: true });

      scripts = scriptRows ?? [];
      currentStatus = "completed";

      // If run record was still marked pending/running, auto-sync it to completed
      if (run.status !== "completed") {
        await db
          .from("analysis_runs")
          .update({
            status: "completed",
            completed_at: results.created_at || new Date().toISOString(),
          })
          .eq("id", id);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        run_id: run.id,
        status: currentStatus,
        period_start: run.period_start,
        period_end: run.period_end,
        created_at: run.created_at,
        completed_at: run.completed_at || (results ? results.created_at : null),
        error_message: run.error_message,
        accounts,
        insights,
        scripts,
      },
    });
  } catch (error) {
    console.error("Get insights failed:", error);
    return NextResponse.json({ error: "Failed to load analysis insights" }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!process.env.ALLOW_ANALYSIS && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Endpoint disabled" }, { status: 403 });
  }

  const { id } = await context.params;

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid analysis ID" }, { status: 400 });
  }

  try {
    const { generateInsightsForRun } = await import(
      "@/server/services/insights.service"
    );
    const result = await generateInsightsForRun(id);

    return NextResponse.json({
      success: true,
      message: "Insights generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Generate insights failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate insights",
      },
      { status: 500 }
    );
  }
}
