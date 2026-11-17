
import "server-only";
import { z } from "zod";
import {
    createAccount,
    deleteAccount,
    getAccounts,
} from "../repositories/account.repository";

export const accountSchema = z.object({
    username: z
        .string()
        .trim()
        .transform((value) =>
            value.replace(/^@/, "").toLowerCase()
        )
        .pipe(
            z.string().regex(
                /^[a-z0-9._]{1,30}$/,
                "Invalid Instagram username"
            )
        ),
    niche: z.string().trim().max(100).optional(),
});

export async function listAccounts() {
    return getAccounts();
}

export async function registerAccount(input: unknown) {
    const validated = accountSchema.parse(input);

    return createAccount(
        validated.username,
        validated.niche
    );
}

export async function removeAccount(id: string) {
    return deleteAccount(id);
}
