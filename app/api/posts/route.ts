
import { NextRequest, NextResponse } from "next/server";
import { getPostsByAccountId } from "@/server/repositories/post.repository";

export async function GET(request: NextRequest) {
    try {
        const accountId = request.nextUrl.searchParams.get("accountId");

        if (!accountId) {
            return NextResponse.json(
                { success: false, error: "accountId is required" },
                { status: 400 }
            );
        }

        const limit = Number(request.nextUrl.searchParams.get("limit")) || 50;
        const posts = await getPostsByAccountId(accountId, limit);

        return NextResponse.json({
            success: true,
            data: posts,
        });
    } catch (error) {
        console.error("GET posts failed:", error);

        return NextResponse.json(
            { success: false, error: "Failed to fetch posts" },
            { status: 500 }
        );
    }
}
