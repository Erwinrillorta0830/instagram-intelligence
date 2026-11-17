
import { NextResponse } from "next/server";
import { z } from "zod";
import { transcribePost } from "@/server/services/post-transcription.service";

const schema = z.object({
    postId: z.string().uuid(),
});

export async function POST(request: Request) {
    // Never expose this test endpoint in production.
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
            { error: "Endpoint disabled" },
            { status: 403 }
        );
    }

    try {
        const body = schema.parse(await request.json());

        console.log("[TRANSCRIPTION] Starting:", body.postId);

        const result = await transcribePost(body.postId);

        console.log("[TRANSCRIPTION] Result:", result);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid post ID",
                    details: error.issues,
                },
                { status: 400 }
            );
        }

        console.error("[TRANSCRIPTION] Failed:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Transcription failed. Check server logs.",
            },
            { status: 500 }
        );
    }
}
