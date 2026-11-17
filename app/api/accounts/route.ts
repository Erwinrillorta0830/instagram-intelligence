
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
    listAccounts,
    registerAccount,
    removeAccount,
} from "@/server/services/account.service";


export async function GET() {
    try {
        const accounts = await listAccounts();

        return NextResponse.json({
            success: true,
            data: accounts,
        });
    } catch (error) {
        console.error("GET accounts failed:", error);

        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const input = await request.json();
        const account = await registerAccount(input);

        return NextResponse.json(
            { success: true, data: account },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid account input",
                    details: error.issues,
                },
                { status: 400 }
            );
        }

        console.error("POST account failed:", error);

        return NextResponse.json(
            { success: false, error: "Unable to create account" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        let id = request.nextUrl.searchParams.get("id");

        if (!id) {
            try {
                const body = await request.json();
                id = body.id;
            } catch {
                // Ignore if body is empty or not json
            }
        }

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Account ID is required" },
                { status: 400 }
            );
        }

        await removeAccount(id);

        return NextResponse.json({
            success: true,
            message: "Account deleted successfully",
        });
    } catch (error) {
        console.error("DELETE account failed:", error);

        return NextResponse.json(
            { success: false, error: "Unable to delete account" },
            { status: 500 }
        );
    }
}
