"use client";

import React, { useState } from "react";
import {
    Sparkles,
    Loader2,
    Video,
    Trash2,
    ExternalLink,
    Search,
    ChevronRight,
    Flame,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstagramAccount } from "@/types/instagram";

interface AccountListProps {
    accounts: InstagramAccount[];
    selectedAccountId: string | null;
    scrapingAccountId: string | null;
    onSelectAccount: (account: InstagramAccount) => void;
    onGatherVideos: (account: InstagramAccount) => void;
    onDeleteAccount: (accountId: string) => void;
}

export function AccountList({
    accounts,
    selectedAccountId,
    scrapingAccountId,
    onSelectAccount,
    onGatherVideos,
    onDeleteAccount,
}: AccountListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const filteredAccounts = accounts.filter((acc) => {
        const query = searchQuery.toLowerCase();
        return (
            acc.username.toLowerCase().includes(query) ||
            (acc.niche && acc.niche.toLowerCase().includes(query))
        );
    });

    const handleDelete = async (e: React.MouseEvent, account: InstagramAccount) => {
        e.stopPropagation();
        const confirmDelete = window.confirm(
            `Are you sure you want to stop tracking @${account.username}? This will also delete any saved posts.`
        );
        if (!confirmDelete) return;

        setDeletingId(account.id);
        try {
            await onDeleteAccount(account.id);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <section
            aria-labelledby="tracked-accounts-heading"
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
        >
            {/* Header and Filter */}
            <div className="flex flex-col gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h2
                            id="tracked-accounts-heading"
                            className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
                        >
                            Tracked Accounts
                        </h2>
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {accounts.length}
                        </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Select an account to view top videos or trigger Apify scraping
                    </p>
                </div>

                {/* Accessible Search Bar */}
                <search className="relative w-full sm:w-64">
                    <label htmlFor="search-accounts" className="sr-only">
                        Search accounts by username or niche
                    </label>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <input
                        id="search-accounts"
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search accounts or niche..."
                        className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100"
                    />
                </search>
            </div>

            {/* Account List Items */}
            {filteredAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Video className="size-10 text-zinc-300 dark:text-zinc-600" />
                    <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {searchQuery ? "No accounts matching your search" : "No accounts tracked yet"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {searchQuery
                            ? "Try searching for a different handle or niche"
                            : "Add your first Instagram handle using the form above"}
                    </p>
                </div>
            ) : (
                <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredAccounts.map((account) => {
                        const isSelected = selectedAccountId === account.id;
                        const isScraping = scrapingAccountId === account.id;
                        const isDeleting = deletingId === account.id;
                        const postCount = account.post_count ?? 0;

                        return (
                            <div
                                key={account.id}
                                onClick={() => onSelectAccount(account)}
                                className={`group flex flex-col gap-4 rounded-xl p-4 transition-all sm:flex-row sm:items-center sm:justify-between cursor-pointer ${
                                    isSelected
                                        ? "bg-purple-50/70 border border-purple-200/80 dark:bg-purple-950/20 dark:border-purple-800/40"
                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                }`}
                            >
                                {/* Left Info */}
                                <div className="flex items-center gap-3.5">
                                    {/* Avatar with IG gradient border */}
                                    <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-xs">
                                        <div className="flex size-full items-center justify-center rounded-full bg-white font-bold text-zinc-800 uppercase dark:bg-zinc-900 dark:text-zinc-100">
                                            {account.username.slice(0, 2)}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-zinc-900 hover:underline dark:text-zinc-100">
                                                @{account.username}
                                            </span>
                                            <a
                                                href={account.profile_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                                title="Open profile on Instagram"
                                                aria-label={`Open @${account.username} on Instagram`}
                                            >
                                                <ExternalLink className="size-3.5" />
                                            </a>
                                        </div>

                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                            {account.niche && (
                                                <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                                    {account.niche}
                                                </span>
                                            )}

                                            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                                <Video className="size-3 text-purple-500" />
                                                <span>
                                                    {postCount > 0
                                                        ? `${postCount} videos saved`
                                                        : "No videos gathered"}
                                                </span>
                                            </span>

                                            {isScraping && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 dark:text-purple-400 animate-pulse">
                                                    <Loader2 className="size-3 animate-spin" />
                                                    <span>Apify scraping in progress...</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Actions */}
                                <div
                                    className="flex items-center gap-2 sm:self-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Primary Button: Gather Top Videos via Apify */}
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={isScraping || isDeleting}
                                        onClick={() => onGatherVideos(account)}
                                        className="gap-1.5 bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-xs hover:from-purple-700 hover:to-rose-700 disabled:opacity-50 text-xs"
                                    >
                                        {isScraping ? (
                                            <>
                                                <Loader2 className="size-3.5 animate-spin" />
                                                <span>Scraping...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="size-3.5" />
                                                <span>Gather Top Videos</span>
                                            </>
                                        )}
                                    </Button>

                                    {/* Secondary Button: View Videos (if posts exist) */}
                                    {postCount > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onSelectAccount(account)}
                                            className="text-xs"
                                        >
                                            <span>View Videos</span>
                                            <ChevronRight className="size-3.5" />
                                        </Button>
                                    )}

                                    {/* Delete Button */}
                                    <button
                                        type="button"
                                        disabled={isDeleting || isScraping}
                                        onClick={(e) => handleDelete(e, account)}
                                        aria-label={`Delete @${account.username}`}
                                        className="flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                                        title="Delete account"
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="size-3.5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
