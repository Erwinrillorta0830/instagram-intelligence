"use client";

import React from "react";
import { Sparkles, Video, Database } from "lucide-react";

interface HeaderProps {
    totalAccounts: number;
    totalPosts: number;
}

export function Header({ totalAccounts, totalPosts }: HeaderProps) {
    return (
        <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80 sticky top-0 z-20">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-sm">
                        <Video className="size-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                Instagram Intelligence
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                <Sparkles className="size-2.5" />
                                <span>Apify Scraper</span>
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Monitor creator & competitor accounts • Uncover top viral videos
                        </p>
                    </div>
                </div>

                {/* Live Stats Pills */}
                <div className="hidden items-center gap-2 sm:flex">
                    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        <span className="size-2 rounded-full bg-emerald-500"></span>
                        <span>{totalAccounts} Accounts</span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        <Database className="size-3 text-purple-500" />
                        <span>{totalPosts} Posts Saved</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
