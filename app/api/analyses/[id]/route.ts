
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnalysisRun } from "@/server/repositories/analysis.repository";

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> }
) {
    if (!process.env.ALLOW_ANALYSIS && process.env.NODE_ENV !== "development") {
        return NextResponse.json(
            { error: "Endpoint disabled" },
            { status: 403 }
        );
    }

    const { id } = await context.params;

    if (!z.string().uuid().safeParse(id).success) {
        return NextResponse.json(
            { error: "Invalid analysis ID" },
            { status: 400 }
        );
    }

    try {
        const result = await getAnalysisRun(id);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Get analysis failed:", error);

        return NextResponse.json(
            { error: "Analysis not found or unavailable" },
            { status: 404 }
        );
    }
}
