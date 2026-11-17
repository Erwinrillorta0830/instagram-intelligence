
import { NextResponse } from "next/server";
import { z } from "zod";
import { collectAccountPosts } from "@/server/services/scraping.service";

const requestSchema = z.object({
    accountId: z.string().uuid(),
});

export async function POST(request: Request) {
    // Prevent accidental execution in production if Apify token is not present
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_COLLECT_API && !process.env.APIFY_API_TOKEN) {
        return NextResponse.json(
            { error: "Endpoint disabled in production" },
            { status: 403 }
        );
    }

    try {
        const input = requestSchema.parse(
            await request.json()
        );

        const result = await collectAccountPosts(
            input.accountId
        );

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid account ID" },
                { status: 400 }
            );
        }

        console.error("Post collection failed:", error);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Post collection failed" },
            { status: 500 }
        );
    }
}
