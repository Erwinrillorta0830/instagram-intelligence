
import "server-only";

import { inngest } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcribePost } from "@/server/services/post-transcription.service";

/**
 * Function 1:
 * Dispatch individual transcription jobs for an analysis run.
 */
export const processTranscriptions = inngest.createFunction(
    {
        id: "process-instagram-transcriptions",
        triggers: [
            { event: "transcription/run.requested" },
        ],
        retries: 2,
        concurrency: { limit: 1 },
    },
    async ({ event, step }) => {
        const runId = event.data.runId;

        if (typeof runId !== "string" || !runId) {
            throw new Error("Invalid transcription run ID");
        }

        // Load the selected posts in a stable order.
        const postIds = await step.run(
            "load-selected-posts",
            async () => {
                const db = createAdminClient();

                const { data, error } = await db
                    .from("analysis_run_posts")
                    .select("post_id")
                    .eq("run_id", runId)
                    .order("post_id", {
                        ascending: true,
                    });

                if (error) throw error;

                return [
                    ...new Set(
                        (data ?? []).map((post) => post.post_id)
                    ),
                ];
            }
        );

        // Dispatch one event per selected post.
        const dispatched = await step.run(
            "dispatch-transcription-jobs",
            async () => {
                if (postIds.length === 0) {
                    return 0;
                }

                const events = postIds.map((postId) => ({
                    name: "transcription/post.requested",
                    data: {
                        runId,
                        postId,
                    },
                }));

                await inngest.send(events);

                return events.length;
            }
        );

        // Queue insights generation after all transcription jobs are dispatched
        await step.run("queue-insights-generation", async () => {
            await inngest.send({
                name: "insights/run.requested",
                data: { runId },
            });
            return { queued: true };
        });

        return {
            runId,
            total: postIds.length,
            dispatched,
            status: "transcription_jobs_dispatched",
        };
    }
);

/**
 * Function 2:
 * Transcribe one Instagram post independently.
 */
export const processSingleTranscription = inngest.createFunction(
    {
        id: "process-instagram-single-transcription",
        triggers: [
            { event: "transcription/post.requested" },
        ],
        retries: 0,
        concurrency: { limit: 2 },
    },
    async ({ event, step }) => {
        const { runId, postId } = event.data;

        if (
            typeof runId !== "string" ||
            !runId ||
            typeof postId !== "string" ||
            !postId
        ) {
            throw new Error("Invalid transcription event data");
        }

        const result = await step.run(
            "transcribe-instagram-post",
            async () => {
                return await transcribePost(postId);
            }
        );

        return {
            runId,
            postId,
            status: result.status,
        };
    }
);
