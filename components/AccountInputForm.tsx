"use client";

import React, { useState } from "react";
import { Plus, Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstagramAccount } from "@/types/instagram";

interface AccountInputFormProps {
    onAccountAdded: (account: InstagramAccount) => void;
}

const POPULAR_NICHES = [
    "Journalism",
    "Tech & AI",
    "Creator",
    "Fitness",
    "Finance",
    "Entertainment",
    "Business",
];

export function AccountInputForm({ onAccountAdded }: AccountInputFormProps) {
    const [rawUsername, setRawUsername] = useState("");
    const [niche, setNiche] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clean username: remove @ and lowercase
    const cleanUsername = rawUsername.replace(/^@/, "").trim().toLowerCase();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        if (!cleanUsername) {
            setErrorMessage("Please enter an Instagram username.");
            return;
        }

        // Validate Instagram username format
        const usernameRegex = /^[a-z0-9._]{1,30}$/;
        if (!usernameRegex.test(cleanUsername)) {
            setErrorMessage(
                "Invalid Instagram username. Only letters, numbers, periods, and underscores are allowed (up to 30 characters)."
            );
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/accounts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: cleanUsername,
                    niche: niche.trim() || undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                const errorText =
                    result?.details?.[0]?.message ||
                    result?.error ||
                    "Failed to add Instagram account.";
                throw new Error(errorText);
            }

            setSuccessMessage(`Account @${result.data.username} successfully added!`);
            setRawUsername("");
            setNiche("");
            onAccountAdded(result.data);
        } catch (err) {
            setErrorMessage(
                err instanceof Error ? err.message : "An unexpected error occurred."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section
            aria-labelledby="add-account-heading"
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
        >
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-xs">
                        <Plus className="size-5" />
                    </div>
                    <div>
                        <h2
                            id="add-account-heading"
                            className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
                        >
                            Track New Instagram Account
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Add client or competitor handles to monitor their top videos
                        </p>
                    </div>
                </div>
            </div>

            <form
                method="POST"
                action="/api/accounts"
                onSubmit={handleSubmit}
                className="space-y-4"
                noValidate
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Username Field */}
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="instagram-username"
                            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            Instagram Username <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                            <span className="pointer-events-none absolute left-3 select-none text-zinc-400 dark:text-zinc-500">
                                @
                            </span>
                            <input
                                id="instagram-username"
                                name="username"
                                type="text"
                                required
                                value={rawUsername}
                                onChange={(e) => {
                                    setRawUsername(e.target.value);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                placeholder="e.g. isw_tv"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                enterKeyHint="next"
                                aria-describedby="username-hint"
                                disabled={isLoading}
                                className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-8 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
                            />
                        </div>
                        <span id="username-hint" className="text-xs text-zinc-500 dark:text-zinc-400">
                            Enter the handle without URL. Leading @ is stripped automatically.
                        </span>
                    </div>

                    {/* Niche / Category Field */}
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="account-niche"
                            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            Category / Niche <span className="text-xs font-normal text-zinc-400">(optional)</span>
                        </label>
                        <input
                            id="account-niche"
                            name="niche"
                            type="text"
                            value={niche}
                            onChange={(e) => setNiche(e.target.value)}
                            placeholder="e.g. Journalism, Tech, Creator"
                            enterKeyHint="done"
                            disabled={isLoading}
                            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
                        />
                        {/* Quick suggestions */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-xs text-zinc-400">Suggestions:</span>
                            {POPULAR_NICHES.slice(0, 4).map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setNiche(item)}
                                    className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Inline Messages */}
                {errorMessage && (
                    <div
                        role="alert"
                        className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                    >
                        <AlertCircle className="size-4 shrink-0 text-rose-500" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {successMessage && (
                    <div
                        role="status"
                        className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                    >
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="flex items-center justify-end pt-2">
                    <Button
                        type="submit"
                        disabled={isLoading || !cleanUsername}
                        className="gap-2 bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-sm hover:from-purple-700 hover:to-rose-700 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                <span>Adding Account...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="size-4" />
                                <span>Track Account</span>
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </section>
    );
}
