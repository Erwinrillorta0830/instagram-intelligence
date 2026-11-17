
import "server-only";

import { inngest } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectAccountPosts } from "@/server/services/scraping.service";
import { updateRunStatus } from "@/server/repositories/analysis.repository";

export const processAnalysis = inngest.createFunction(
    {
        id: "process-instagram-analysis",
        triggers: [{ event: "analysis/run.created" }],
        retries: 2,
        concurrency: { limit: 1 },
    },
    async ({ event, step }) => {
        const runId = event.data.runId;

        if (typeof runId !== "string" || !runId) {
            throw new Error("Invalid analysis run ID");
        }

        const db = createAdminClient();

        // 1. Load the analysis run and associated accounts.
        const setup = await step.run(
            "load-analysis-run",
            async () => {
                const { data: run, error: runError } = await db
                    .from("analysis_runs")
                    .select("id, period_start, period_end")
                    .eq("id", runId)
                    .single();

                if (runError || !run) {
                    throw runError ?? new Error(
                        "Analysis run not found"
                    );
                }

                const { data: accounts, error: accountsError } =
                    await db
                        .from("analysis_run_accounts")
                        .select("account_id, role")
                        .eq("run_id", runId);

                if (accountsError) throw accountsError;

                if (!accounts?.length) {
                    throw new Error(
                        "No accounts linked to analysis"
                    );
                }

                return {
                    periodStart: run.period_start,
                    periodEnd: run.period_end,
                    accounts,
                };
            }
        );

        // 2. Mark the analysis as running.
        await step.run(
            "mark-analysis-running",
            async () => {
                await updateRunStatus(runId, "running");
            }
        );

        let collected = 0;
        let selected = 0;

        // 3. Scrape, rank, save, and link posts for all accounts IN PARALLEL.
        const results = await step.run(
            "collect-all-accounts-parallel",
            async () => {
                return await Promise.all(
                    setup.accounts.map(async (account) => {
                        const collection = await collectAccountPosts(
                            account.account_id,
                            {
                                since: new Date(setup.periodStart),
                                until: new Date(setup.periodEnd),
                            }
                        );

                        // Get unique Instagram shortcodes.
                        const shortcodes = [
                            ...new Set(
                                collection.topPosts.map(
                                    (post) => post.shortcode
                                )
                            ),
                        ];

                        // Handle accounts with no eligible posts.
                        if (shortcodes.length === 0) {
                            const { error: progressError } = await db
                                .from("analysis_run_accounts")
                                .update({
                                    status: "completed",
                                    collected_count:
                                        collection.collectedCount,
                                    ranked_count: 0,
                                    error_message: null,
                                })
                                .eq("run_id", runId)
                                .eq("account_id", account.account_id);

                            if (progressError) throw progressError;

                            return {
                                collectedCount:
                                    collection.collectedCount,
                                selectedCount: 0,
                            };
                        }

                        // 4. Retrieve actual Supabase post UUIDs.
                        const { data: savedPosts, error: postsError } =
                            await db
                                .from("posts")
                                .select("id, shortcode")
                                .eq("account_id", account.account_id)
                                .in("shortcode", shortcodes);

                        if (postsError) throw postsError;

                        const idByShortcode = new Map(
                            (savedPosts ?? []).map((post) => [
                                post.shortcode,
                                post.id,
                            ])
                        );

                        // Verify every selected post exists.
                        const missing = shortcodes.filter(
                            (shortcode) =>
                                !idByShortcode.has(shortcode)
                        );

                        if (missing.length > 0) {
                            throw new Error(
                                `Saved posts missing: ${missing.join(", ")}`
                            );
                        }

                        // 5. Build ranked post relationships.
                        const rankedPosts = collection.topPosts.map(
                            (post) => {
                                const postId = idByShortcode.get(
                                    post.shortcode
                                );

                                if (!postId) {
                                    throw new Error(
                                        `Missing database ID for ${post.shortcode}`
                                    );
                                }

                                return {
                                    run_id: runId,
                                    post_id: postId,
                                    account_id: account.account_id,
                                    rank: post.rank,
                                    views_snapshot: post.viewCount,
                                    likes_snapshot: post.likeCount,
                                };
                            }
                        );

                        // 6. Save ranking snapshots.
                        // Composite primary key: run_id + post_id.
                        const { error: linkError } = await db
                            .from("analysis_run_posts")
                            .upsert(rankedPosts, {
                                onConflict: "run_id,post_id",
                            });

                        if (linkError) throw linkError;

                        // 7. Update collection progress.
                        const { error: progressError } = await db
                            .from("analysis_run_accounts")
                            .update({
                                status: "completed",
                                collected_count:
                                    collection.collectedCount,
                                ranked_count: rankedPosts.length,
                                error_message: null,
                            })
                            .eq("run_id", runId)
                            .eq("account_id", account.account_id);

                        if (progressError) throw progressError;

                        return {
                            collectedCount:
                                collection.collectedCount,
                            selectedCount: rankedPosts.length,
                        };
                    })
                );
            }
        );

        for (const res of results) {
            collected += res.collectedCount;
            selected += res.selectedCount;
        }

        // 8. Queue Gemini transcription only after
        // all selected posts have been saved.
        await step.run(
            "queue-gemini-transcription",
            async () => {
                await inngest.send({
                    name: "transcription/run.requested",
                    data: { runId },
                });

                return { queued: true };
            }
        );

        return {
            runId,
            status: "transcription_queued",
            accountCount: setup.accounts.length,
            collected,
            selected,
        };
    }
);
