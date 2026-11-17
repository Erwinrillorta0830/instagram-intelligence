
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createAnalysisRun(
    clientId: string,
    competitorIds: string[]
) {
    const db = createAdminClient();

    const end = new Date();
    const start = new Date(
        end.getTime() - 90 * 24 * 60 * 60 * 1000
    );

    const { data: run, error } = await db
        .from("analysis_runs")
        .insert({
            period_start: start.toISOString(),
            period_end: end.toISOString(),
            status: "pending",
        })
        .select()
        .single();

    if (error || !run) {
        throw error ?? new Error("Failed to create run");
    }

    const accounts = [
        { run_id: run.id, account_id: clientId, role: "client" },
        ...competitorIds.map((id) => ({
            run_id: run.id,
            account_id: id,
            role: "competitor",
        })),
    ];

    const { error: linkError } = await db
        .from("analysis_run_accounts")
        .insert(accounts);

    if (linkError) {
        await db.from("analysis_runs").delete().eq("id", run.id);
        throw linkError;
    }

    return run;
}

export async function updateRunStatus(
    runId: string,
    status: "running" | "completed" | "failed",
    errorMessage?: string
) {
    const db = createAdminClient();

    const { error } = await db
        .from("analysis_runs")
        .update({
            status,
            error_message: errorMessage ?? null,
            completed_at:
                status === "running" ? null : new Date().toISOString(),
        })
        .eq("id", runId);

    if (error) throw error;
}

export async function listAnalysisRuns(limit = 10) {
    const db = createAdminClient();

    const { data: runs, error } = await db
        .from("analysis_runs")
        .select(`
            id,
            status,
            period_start,
            period_end,
            created_at,
            completed_at,
            error_message,
            analysis_run_accounts(
                role,
                account_id,
                status,
                collected_count,
                ranked_count,
                accounts(username)
            )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return runs ?? [];
}

export async function getAnalysisRun(runId: string) {
    const db = createAdminClient();

    const { data: run, error } = await db
        .from("analysis_runs")
        .select("*")
        .eq("id", runId)
        .single();

    if (error) throw error;

    const { data: accounts, error: accountsError } = await db
        .from("analysis_run_accounts")
        .select(`
      account_id,
      role,
      status,
      error_message,
      collected_count,
      ranked_count,
      accounts(username)
    `)
        .eq("run_id", runId);

    if (accountsError) throw accountsError;

    // Fetch analysis results & generated scripts if available
    const { data: result } = await db
        .from("analysis_results")
        .select("*")
        .eq("run_id", runId)
        .maybeSingle();

    let scripts: any[] = [];
    if (result) {
        const { data: scriptRows } = await db
            .from("generated_scripts")
            .select("*")
            .eq("result_id", result.id)
            .order("script_number", { ascending: true });
        scripts = scriptRows ?? [];
    }

    // Fetch stats for posts and transcripts
    const { data: runPosts } = await db
        .from("analysis_run_posts")
        .select("post_id")
        .eq("run_id", runId);

    const postIds = (runPosts ?? []).map((p) => p.post_id);

    let completedTranscriptsCount = 0;
    if (postIds.length > 0) {
        const { count } = await db
            .from("transcripts")
            .select("id", { count: "exact", head: true })
            .in("post_id", postIds)
            .in("status", ["completed", "unavailable", "failed"]);
        completedTranscriptsCount = count ?? 0;
    }

    return {
        ...run,
        accounts,
        total_posts: postIds.length,
        processed_transcripts: completedTranscriptsCount,
        result: result
            ? {
                ...result,
                scripts,
            }
            : null,
    };
}

export async function saveAnalysisResults(
    runId: string,
    data: {
        competitorPatterns: Record<string, any>;
        clientDifferences: Record<string, any>;
        recommendations: Record<string, any>;
        scripts: Array<{
            script_number: number;
            title: string;
            hook: string;
            body: string;
            cta: string;
        }>;
    }
) {
    const db = createAdminClient();

    // 1. Upsert analysis_results on conflict with run_id
    const { data: result, error: resultError } = await db
        .from("analysis_results")
        .upsert(
            {
                run_id: runId,
                competitor_patterns: data.competitorPatterns,
                client_differences: data.clientDifferences,
                recommendations: data.recommendations,
            },
            { onConflict: "run_id" }
        )
        .select()
        .single();

    if (resultError || !result) {
        throw resultError ?? new Error("Failed to upsert analysis_results");
    }

    // 2. Clear out any previous scripts for this result_id before inserting new ones
    await db.from("generated_scripts").delete().eq("result_id", result.id);

    // 3. Insert generated_scripts
    if (data.scripts.length > 0) {
        const scriptRows = data.scripts.map((s, index) => ({
            result_id: result.id,
            script_number: s.script_number ?? index + 1,
            title: s.title,
            hook: s.hook,
            body: s.body,
            cta: s.cta,
        }));

        const { error: scriptsError } = await db
            .from("generated_scripts")
            .insert(scriptRows);

        if (scriptsError) {
            console.error("Failed to insert generated_scripts:", scriptsError);
            throw scriptsError;
        }
    }

    // 4. Mark run as completed
    await updateRunStatus(runId, "completed");

    return {
        resultId: result.id,
        runId,
    };
}
