
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type TranscriptStatus =
    | "pending"
    | "completed"
    | "unavailable"
    | "failed";

export async function saveTranscriptStatus(
    postId: string,
    status: TranscriptStatus,
    options: {
        transcript?: string | null;
        errorMessage?: string | null;
        sourceType?: string | null;
    } = {}
) {
    const db = createAdminClient();

    const { error } = await db
        .from("transcripts")
        .upsert(
            {
                post_id: postId,
                status,
                transcript: options.transcript ?? null,
                error_message: options.errorMessage ?? null,
                source_type: options.sourceType ?? null,

                // Google Gemini transcription provider
                provider: "gemini",
                model:
                    process.env.GEMINI_MODEL ||
                    "gemini-2.5-flash",

                attempted_at: new Date().toISOString(),

                completed_at:
                    status === "completed"
                        ? new Date().toISOString()
                        : null,
            },
            { onConflict: "post_id" }
        );

    if (error) {
        throw error;
    }
}
