
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { startAnalysis } from "@/server/services/analysis.service";

export async function GET() {
    if (!process.env.ALLOW_ANALYSIS && process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Endpoint disabled" }, { status: 403 });
    }
    try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const db = createAdminClient();
        const { data, error } = await db
            .from("analysis_runs")
            .select(`
        id, status, period_start, period_end, created_at, completed_at, error_message,
        analysis_run_accounts(account_id, role, accounts(username))
      `)
            .order("created_at", { ascending: false })
            .limit(10);
        if (error) throw error;
        return NextResponse.json({ success: true, data: data ?? [] });
    } catch (error) {
        return NextResponse.json({ error: "Failed to list analyses" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    // Temporary local-development restriction.
    if (!process.env.ALLOW_ANALYSIS && process.env.NODE_ENV !== "development") {
        return NextResponse.json(
            { error: "Endpoint disabled" },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const run = await startAnalysis(body);

        return NextResponse.json(
            {
                success: true,
                message: "Analysis queued successfully",
                data: {
                    analysisId: run.id,
                    status: run.status,
                },
            },
            { status: 202 }
        );
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: "Invalid input", details: error.issues },
                { status: 400 }
            );
        }

        console.error("Create analysis failed:", error);

        return NextResponse.json(
            { error: "Unable to create analysis" },
            { status: 500 }
        );
    }
}
