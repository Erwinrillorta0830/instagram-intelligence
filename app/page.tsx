"use client";

import React, { useEffect, useState, useRef } from "react";
import { Header } from "@/components/Header";
import { AccountInputForm } from "@/components/AccountInputForm";
import { AccountList } from "@/components/AccountList";
import { TopVideosView } from "@/components/TopVideosView";
import { AnalysisSection } from "@/components/AnalysisSection";
import {
    Sparkles,
    AlertCircle,
    CheckCircle2,
    X,
    Loader2,
    Video,
    Users,
    Plus,
    Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
    InstagramAccount,
    RankedInstagramPost,
    SavedPost,
} from "@/types/instagram";

interface Notification {
    type: "success" | "error" | "info";
    message: string;
}

type TabType = "intelligence" | "videos" | "accounts";

export default function Home() {
    const [activeTab, setActiveTab] = useState<TabType>("intelligence");
    const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null);
    const [posts, setPosts] = useState<(RankedInstagramPost | SavedPost)[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
    const [scrapingAccountId, setScrapingAccountId] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notification | null>(null);

    const topVideosRef = useRef<HTMLDivElement>(null);

    // Fetch tracked accounts
    const loadAccounts = async () => {
        try {
            const res = await fetch("/api/accounts");
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setAccounts(data.data);

                // Auto-select the first account with saved posts if none selected
                if (!selectedAccount) {
                    const accountWithPosts = data.data.find(
                        (a: InstagramAccount) => (a.post_count ?? 0) > 0
                    );
                    if (accountWithPosts) {
                        selectAccount(accountWithPosts, false);
                    } else if (data.data.length > 0) {
                        selectAccount(data.data[0], false);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load accounts:", err);
        } finally {
            setIsLoadingAccounts(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    // Load posts for a specific account
    const selectAccount = async (
        account: InstagramAccount,
        switchToVideosTab = false
    ) => {
        setSelectedAccount(account);
        if (switchToVideosTab) {
            setActiveTab("videos");
        }
        setIsLoadingPosts(true);

        try {
            const res = await fetch(`/api/posts?accountId=${account.id}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setPosts(data.data);
            } else {
                setPosts([]);
            }
        } catch (err) {
            console.error("Failed to fetch posts:", err);
            setPosts([]);
        } finally {
            setIsLoadingPosts(false);
        }
    };

    // Trigger Apify gathering for an account
    const handleGatherVideos = async (
        account: InstagramAccount,
        switchToVideos = false
    ) => {
        setScrapingAccountId(account.id);
        setNotification({
            type: "info",
            message: `Scraping recent posts and ranking top videos for @${account.username}...`,
        });

        try {
            const res = await fetch("/api/posts/collect", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    accountId: account.id,
                }),
            });

            const result = await res.json();

            if (!res.ok || !result.success) {
                const errorMsg =
                    result?.error ||
                    "Failed to collect posts via Apify. Please verify your API token and try again.";
                throw new Error(errorMsg);
            }

            const collectData = result.data;
            const topPosts: RankedInstagramPost[] = collectData.topPosts ?? [];

            // Update local state
            setSelectedAccount(account);
            setPosts(topPosts);

            // Update post count in accounts list
            setAccounts((prev) =>
                prev.map((acc) =>
                    acc.id === account.id
                        ? {
                            ...acc,
                            post_count:
                                collectData.collectedCount ??
                                (acc.post_count || 0) + topPosts.length,
                        }
                        : acc
                )
            );

            setNotification({
                type: "success",
                message: `Successfully gathered ${collectData.collectedCount} posts for @${account.username}! Displaying top ${topPosts.length} ranked videos.`,
            });

            if (switchToVideos) {
                setActiveTab("videos");
            }
        } catch (err) {
            console.error("Gather videos error:", err);
            setNotification({
                type: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "An error occurred while gathering videos from Apify.",
            });
        } finally {
            setScrapingAccountId(null);
        }
    };

    // Handle account addition
    const handleAccountAdded = (newAccount: InstagramAccount) => {
        setAccounts((prev) => [
            { ...newAccount, post_count: 0 },
            ...prev.filter((a) => a.id !== newAccount.id),
        ]);
        setSelectedAccount(newAccount);
        setPosts([]);
    };

    // Handle account deletion
    const handleDeleteAccount = async (accountId: string) => {
        try {
            const res = await fetch(`/api/accounts?id=${accountId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to delete account");
            }

            setAccounts((prev) => prev.filter((a) => a.id !== accountId));
            if (selectedAccount?.id === accountId) {
                setSelectedAccount(null);
                setPosts([]);
            }
            setNotification({
                type: "success",
                message: "Account removed successfully.",
            });
        } catch (err) {
            setNotification({
                type: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Failed to delete account",
            });
        }
    };

    const totalPostsCount = accounts.reduce(
        (sum, a) => sum + (a.post_count || 0),
        0
    );

    return (
        <div className="min-h-screen bg-zinc-50/50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100 flex flex-col">
            <Header
                totalAccounts={accounts.length}
                totalPosts={totalPostsCount}
            />

            <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
                {/* Global Notification Banner */}
                {notification && (
                    <div
                        role="alert"
                        className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-sm shadow-xs transition-all ${
                            notification.type === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                                : notification.type === "error"
                                ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                                : "border-purple-200 bg-purple-50 text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-300"
                        }`}
                    >
                        <div className="flex items-start gap-2.5">
                            {notification.type === "success" && (
                                <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                            )}
                            {notification.type === "error" && (
                                <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                            )}
                            {notification.type === "info" && (
                                <Loader2 className="size-5 shrink-0 text-purple-600 dark:text-purple-400 animate-spin mt-0.5" />
                            )}
                            <div>
                                <p className="font-medium">{notification.message}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNotification(null)}
                            className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            aria-label="Dismiss notification"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                )}

                {/* Primary Segmented Navigation Tabs */}
                <nav
                    aria-label="Dashboard sections"
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800 pb-3"
                >
                    <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 max-w-fit">
                        {/* Tab 1: Competitor Intelligence */}
                        <button
                            type="button"
                            onClick={() => setActiveTab("intelligence")}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === "intelligence"
                                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                            }`}
                        >
                            <Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
                            <span>Competitor Intelligence</span>
                            <span className="hidden sm:inline-flex items-center rounded-full bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
                                AI Scripts
                            </span>
                        </button>

                        {/* Tab 2: Top Videos Explorer */}
                        <button
                            type="button"
                            onClick={() => setActiveTab("videos")}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === "videos"
                                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                            }`}
                        >
                            <Film className="size-4 text-sky-600 dark:text-sky-400" />
                            <span>Top Videos Explorer</span>
                            {selectedAccount && (
                                <span className="hidden md:inline-block max-w-[90px] truncate text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                                    @{selectedAccount.username}
                                </span>
                            )}
                        </button>

                        {/* Tab 3: Manage Accounts */}
                        <button
                            type="button"
                            onClick={() => setActiveTab("accounts")}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === "accounts"
                                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                            }`}
                        >
                            <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Manage Accounts</span>
                            <span className="rounded-full bg-zinc-200/80 dark:bg-zinc-700 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                                {accounts.length}
                            </span>
                        </button>
                    </div>

                    {/* Quick Helper / Actions */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        {activeTab === "intelligence" && (
                            <span className="hidden sm:inline">
                                Compare client against competitors & generate 3 reels
                            </span>
                        )}
                        {activeTab === "videos" && selectedAccount && (
                            <span className="hidden sm:inline">
                                Viewing top ranked posts for <strong className="text-zinc-800 dark:text-zinc-200">@{selectedAccount.username}</strong>
                            </span>
                        )}
                        {activeTab === "accounts" && (
                            <span className="hidden sm:inline">
                                Track creator handles and scrape media with Apify
                            </span>
                        )}
                    </div>
                </nav>

                {/* ========================================================================= */}
                {/* TAB 1: COMPETITOR INTELLIGENCE & SCRIPT GENERATOR                        */}
                {/* ========================================================================= */}
                {activeTab === "intelligence" && (
                    <div className="space-y-6">
                        <AnalysisSection
                            accounts={accounts}
                            onNavigateToAccounts={() => setActiveTab("accounts")}
                        />
                    </div>
                )}

                {/* ========================================================================= */}
                {/* TAB 2: TOP VIDEOS EXPLORER                                               */}
                {/* ========================================================================= */}
                {activeTab === "videos" && (
                    <div className="space-y-6">
                        {/* Horizontal Quick-Account Switcher Strip */}
                        {accounts.length > 0 && (
                            <div className="flex items-center justify-between gap-2 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mr-1 pl-1">
                                        Accounts:
                                    </span>
                                    {accounts.map((acc) => {
                                        const isSelected = selectedAccount?.id === acc.id;
                                        return (
                                            <button
                                                key={acc.id}
                                                type="button"
                                                onClick={() => selectAccount(acc, false)}
                                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all shrink-0 ${
                                                    isSelected
                                                        ? "bg-purple-600 text-white shadow-xs"
                                                        : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                                }`}
                                            >
                                                <span>@{acc.username}</span>
                                                <span
                                                    className={`rounded-full px-1.5 text-[10px] font-bold ${
                                                        isSelected
                                                            ? "bg-white/20 text-white"
                                                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                                                    }`}
                                                >
                                                    {acc.post_count || 0}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActiveTab("accounts")}
                                    className="gap-1 text-xs shrink-0"
                                >
                                    <Plus className="size-3" />
                                    <span>Add Account</span>
                                </Button>
                            </div>
                        )}

                        {/* Video Grid View */}
                        <div ref={topVideosRef}>
                            {isLoadingPosts ? (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 dark:border-zinc-800 dark:bg-zinc-900">
                                    <Loader2 className="size-8 animate-spin text-purple-600" />
                                    <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Loading videos for @{selectedAccount?.username}...
                                    </p>
                                </div>
                            ) : selectedAccount ? (
                                <TopVideosView
                                    username={selectedAccount.username}
                                    accountId={selectedAccount.id}
                                    posts={posts}
                                    onClose={() => setSelectedAccount(null)}
                                    onRefreshScrape={() => handleGatherVideos(selectedAccount, false)}
                                    isScraping={scrapingAccountId === selectedAccount.id}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                                    <Video className="size-10 text-zinc-300 dark:text-zinc-600" />
                                    <h3 className="mt-3 text-base font-semibold text-zinc-800 dark:text-zinc-200">
                                        No Account Selected
                                    </h3>
                                    <p className="mt-1 max-w-sm text-xs text-zinc-500">
                                        Select an account from the bar above or track a new one in the Accounts tab.
                                    </p>
                                    <Button
                                        onClick={() => setActiveTab("accounts")}
                                        className="mt-4 gap-1.5 bg-purple-600 text-white text-xs"
                                        size="sm"
                                    >
                                        <Plus className="size-3.5" />
                                        <span>Manage Accounts</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* TAB 3: MANAGE ACCOUNTS                                                   */}
                {/* ========================================================================= */}
                {activeTab === "accounts" && (
                    <div className="space-y-6">
                        {/* Account Addition Form */}
                        <AccountInputForm onAccountAdded={handleAccountAdded} />

                        {/* Tracked Accounts List */}
                        {isLoadingAccounts ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
                                <Loader2 className="size-8 animate-spin text-purple-600" />
                                <p className="mt-3 text-sm text-zinc-500">
                                    Loading tracked accounts...
                                </p>
                            </div>
                        ) : (
                            <AccountList
                                accounts={accounts}
                                selectedAccountId={selectedAccount?.id ?? null}
                                scrapingAccountId={scrapingAccountId}
                                onSelectAccount={(acc) => selectAccount(acc, true)}
                                onGatherVideos={(acc) => handleGatherVideos(acc, true)}
                                onDeleteAccount={handleDeleteAccount}
                            />
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-zinc-200 bg-white py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p>
                        Instagram Intelligence Platform • Built with Next.js, Supabase, Apify & Google Gemini
                    </p>
                    <p className="text-zinc-400">
                        Rank top videos & generate tailored viral scripts
                    </p>
                </div>
            </footer>
        </div>
    );
}
