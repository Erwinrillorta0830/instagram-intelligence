
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { extractVideoUrl } from "@/lib/apify/media";
import { transcribeMedia } from "./transcription.service";
import { saveTranscriptStatus } from "@/server/repositories/transcript.repository";

export async function transcribePost(postId: string) {
    const db = createAdminClient();

    const { data: post, error } = await db
        .from("posts")
        .select("id, shortcode, media_type, raw_data")
        .eq("id", postId)
        .single();

    if (error || !post) {
        throw error ?? new Error("Post not found");
    }

    const { data: existing, error: existingError } =
        await db
            .from("transcripts")
            .select("status, transcript")
            .eq("post_id", postId)
            .maybeSingle();

    if (existingError) {
        throw existingError;
    }

    if (existing?.status === "completed") {
        return {
            postId,
            status: "cached",
        };
    }

    const raw = post.raw_data as
        | Record<string, unknown>
        | null;

    const mediaUrl = extractVideoUrl(raw);

    if (!mediaUrl) {
        await saveTranscriptStatus(
            postId,
            "unavailable",
            {
                errorMessage: "No accessible video URL",
            }
        );

        return {
            postId,
            status: "unavailable",
        };
    }

    await saveTranscriptStatus(postId, "pending", {
        sourceType: "video",
    });

    try {
        const transcript = await transcribeMedia(mediaUrl);

        if (
            !transcript ||
            transcript === "NO_SPEECH_DETECTED"
        ) {
            await saveTranscriptStatus(
                postId,
                "unavailable",
                {
                    sourceType: "video",
                    errorMessage: "No intelligible speech detected",
                }
            );

            return {
                postId,
                status: "unavailable",
            };
        }

        await saveTranscriptStatus(
            postId,
            "completed",
            {
                transcript,
                sourceType: "video",
            }
        );

        return {
            postId,
            status: "completed",
            transcriptLength: transcript.length,
        };
    } catch (error) {
        await saveTranscriptStatus(
            postId,
            "failed",
            {
                errorMessage:
                    error instanceof Error
                        ? error.message.slice(0, 500)
                        : "Unknown transcription error",
                sourceType: "video",
            }
        );

        return {
            postId,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown transcription error",
        };
    }
}
