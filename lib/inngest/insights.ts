import "server-only";

import { inngest } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInsights } from "@/lib/gemini/insights";
import { updateRunStatus } from "@/server/repositories/analysis.repository";

export const processInsights = inngest.createFunction(
  {
    id: "process-instagram-insights",
    triggers: [{ event: "insights/run.requested" }],
    retries: 1,
    concurrency: { limit: 1 },
  },
  async ({ event, step }) => {
    const runId = event.data.runId as string;

    if (typeof runId !== "string" || !runId) {
      throw new Error("Invalid insights run ID");
    }

    const db = createAdminClient();

    // 1. Load posts selected for this run
    const runPosts = await step.run("load-run-posts", async () => {
      const { data, error } = await db
        .from("analysis_run_posts")
        .select("post_id, account_id, rank")
        .eq("run_id", runId);
      if (error) throw error;
      return data ?? [];
    });

    if (runPosts.length === 0) {
      await step.run("complete-no-posts", async () => {
        await updateRunStatus(runId, "completed");
      });
      return { runId, status: "no_posts" };
    }

    const postIds = [...new Set(runPosts.map((p) => p.post_id))];

    // 2. Poll until all transcriptions reach a terminal state (every 5 seconds)
    let transcriptsDone = false;
    for (let attempt = 0; attempt < 40 && !transcriptsDone; attempt++) {
      if (attempt > 0) {
        await step.sleep(`poll-sleep-${attempt}`, "5 seconds");
      }

      transcriptsDone = await step.run(
        `check-transcripts-attempt-${attempt}`,
        async () => {
          const { data, error } = await db
            .from("transcripts")
            .select("post_id, status")
            .in("post_id", postIds);

          if (error) return false;

          const doneStatuses = new Set(["completed", "unavailable", "failed"]);
          const statusMap = new Map(
            (data ?? []).map((t) => [t.post_id, t.status])
          );

          return postIds.every(
            (id) => statusMap.has(id) && doneStatuses.has(statusMap.get(id)!)
          );
        }
      );
    }

    // 3. Load transcripts + post captions
    const rawData = await step.run("load-transcripts-and-posts", async () => {
      const [transcriptsRes, postsRes, accountsRes] = await Promise.all([
        db
          .from("transcripts")
          .select("post_id, transcript, status")
          .in("post_id", postIds),
        db.from("posts").select("id, caption").in("id", postIds),
        db
          .from("analysis_run_accounts")
          .select("account_id, role, accounts(username, niche)")
          .eq("run_id", runId),
      ]);

      if (transcriptsRes.error) throw transcriptsRes.error;
      if (postsRes.error) throw postsRes.error;
      if (accountsRes.error) throw accountsRes.error;

      return {
        transcripts: transcriptsRes.data ?? [],
        posts: postsRes.data ?? [],
        accounts: accountsRes.data ?? [],
      };
    });

    // 4. Build LLM input
    const insightsInput = await step.run("build-insights-input", async () => {
      const transcriptMap = new Map(
        rawData.transcripts.map((t) => [t.post_id, t.transcript as string | null])
      );
      const postMap = new Map(
        rawData.posts.map((p) => [p.id, p.caption as string | null])
      );

      const clientAccount = rawData.accounts.find((a) => a.role === "client");
      const competitorAccounts = rawData.accounts.filter(
        (a) => a.role === "competitor"
      );

      if (!clientAccount) throw new Error("No client account found in run");

      const clientUsername =
        (clientAccount.accounts as any)?.username ?? "client";

      const clientTranscripts = runPosts
        .filter((p) => p.account_id === clientAccount.account_id)
        .sort((a, b) => a.rank - b.rank)
        .map((p) => ({
          rank: p.rank,
          caption: postMap.get(p.post_id) ?? null,
          transcript: transcriptMap.get(p.post_id) ?? null,
        }));

      const competitors = competitorAccounts.map((acc) => ({
        username: (acc.accounts as any)?.username ?? acc.account_id,
        transcripts: runPosts
          .filter((p) => p.account_id === acc.account_id)
          .sort((a, b) => a.rank - b.rank)
          .map((p) => ({
            rank: p.rank,
            caption: postMap.get(p.post_id) ?? null,
            transcript: transcriptMap.get(p.post_id) ?? null,
          })),
      }));

      return { clientUsername, clientTranscripts, competitors };
    });

    // 5. Call Gemini
    const insights = await step.run("generate-gemini-insights", async () => {
      return generateInsights(insightsInput);
    });

    // 6. Save to Supabase (upsert to handle retries/re-runs safely)
    const resultId = await step.run("save-analysis-results", async () => {
      const { data: result, error: resultError } = await db
        .from("analysis_results")
        .upsert(
          {
            run_id: runId,
            competitor_patterns: insights.competitor_patterns,
            client_differences: insights.client_differences,
            recommendations: insights.recommendations,
          },
          { onConflict: "run_id" }
        )
        .select("id")
        .single();

      if (resultError || !result) {
        throw resultError ?? new Error("Failed to save analysis results");
      }

      // Remove any previously generated scripts for this result_id
      await db.from("generated_scripts").delete().eq("result_id", result.id);

      const scriptRows = insights.scripts.map((s, i) => ({
        result_id: result.id,
        script_number: i + 1,
        title: s.title,
        hook: s.hook,
        body: s.body,
        cta: s.cta,
      }));

      const { error: scriptsError } = await db
        .from("generated_scripts")
        .insert(scriptRows);

      if (scriptsError) throw scriptsError;

      return result.id;
    });

    // 7. Mark analysis run as completed
    await step.run("mark-run-completed", async () => {
      await updateRunStatus(runId, "completed");
    });

    return { runId, resultId, status: "completed" };
  }
);
