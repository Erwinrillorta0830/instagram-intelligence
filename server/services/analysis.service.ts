
import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnalysisRun } from "@/server/repositories/analysis.repository";
import { inngest } from "@/lib/inngest/client";

const schema = z.object({
    clientId: z.string().uuid(),
    competitorIds: z.array(z.string().uuid())
        .min(1)
        .max(10),
}).refine(
    ({ clientId, competitorIds }) => {
        const ids = [clientId, ...competitorIds];
        return new Set(ids).size === ids.length;
    },
    { message: "All account IDs must be unique" }
);

export async function startAnalysis(input: unknown) {
    const parsed = schema.parse(input);
    const db = createAdminClient();

    const ids = [
        parsed.clientId,
        ...parsed.competitorIds,
    ];

    const { data: accounts, error } = await db
        .from("accounts")
        .select("id")
        .in("id", ids);

    if (error) throw error;

    if (accounts?.length !== ids.length) {
        throw new Error("One or more accounts do not exist");
    }

    const run = await createAnalysisRun(
        parsed.clientId,
        parsed.competitorIds
    );

    try {
        await inngest.send({
            name: "analysis/run.created",
            data: { runId: run.id },
        });
    } catch (error) {
        await db.from("analysis_runs")
            .update({
                status: "failed",
                error_message: "Failed to dispatch background job",
            })
            .eq("id", run.id);

        throw error;
    }

    return run;
}
