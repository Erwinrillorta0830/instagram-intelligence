"use client";

import React, { useState } from "react";
import {
    Trophy,
    Eye,
    Heart,
    ExternalLink,
    Play,
    Calendar,
    ArrowLeft,
    TrendingUp,
    Sparkles,
    Video as VideoIcon,
    RefreshCw,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RankedInstagramPost, SavedPost } from "@/types/instagram";

interface TopVideosViewProps {
    username: string;
    accountId: string;
    posts: (RankedInstagramPost | SavedPost)[];
    onClose?: () => void;
    onRefreshScrape?: () => void;
    isScraping?: boolean;
}

function getMediaType(p: RankedInstagramPost | SavedPost): string {
    return "mediaType" in p ? p.mediaType : p.media_type;
}

function getViewCount(p: RankedInstagramPost | SavedPost): number | null {
    return "viewCount" in p ? p.viewCount : p.view_count;
}

function getLikeCount(p: RankedInstagramPost | SavedPost): number | null {
    return "likeCount" in p ? p.likeCount : p.like_count;
}

function getPublishedAt(p: RankedInstagramPost | SavedPost): string {
    return "publishedAt" in p ? p.publishedAt : p.published_at;
}

function getPostUrl(p: RankedInstagramPost | SavedPost): string {
    return "postUrl" in p ? p.postUrl : p.post_url;
}

function getRawData(p: RankedInstagramPost | SavedPost): Record<string, any> {
    return ("rawData" in p ? p.rawData : p.raw_data) || {};
}

function formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined) return "N/A";
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toLocaleString();
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

export function TopVideosView({
    username,
    accountId,
    posts,
    onClose,
    onRefreshScrape,
    isScraping = false,
}: TopVideosViewProps) {
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

    // Filter to videos or ranked posts
    const videoPosts = posts.filter((p) => {
        const mType = getMediaType(p);
        const vCount = getViewCount(p);
        return mType === "Video" || (vCount !== null && vCount > 0);
    });

    const displayList = videoPosts.length > 0 ? videoPosts : posts;

    // Top metrics calculations
    const viewCounts = displayList
        .map((p) => getViewCount(p))
        .filter((v): v is number => typeof v === "number");

    const maxViews = viewCounts.length > 0 ? Math.max(...viewCounts) : 0;
    const avgViews =
        viewCounts.length > 0
            ? Math.round(viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length)
            : 0;

    const likeCounts = displayList
        .map((p) => getLikeCount(p))
        .filter((l): l is number => typeof l === "number");

    const totalLikes = likeCounts.reduce((a, b) => a + b, 0);

    return (
        <section
            aria-labelledby="top-videos-heading"
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
        >
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            aria-label="Back to all accounts"
                        >
                            <ArrowLeft className="size-4" />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                <Trophy className="size-3.5" />
                            </span>
                            <h2
                                id="top-videos-heading"
                                className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
                            >
                                Top Videos for @{username}
                            </h2>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Ranked by performance (views, plays & engagement) gathered from Apify
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onRefreshScrape && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isScraping}
                            onClick={() => onRefreshScrape()}
                            className="gap-1.5 text-xs"
                        >
                            {isScraping ? (
                                <>
                                    <Loader2 className="size-3.5 animate-spin" />
                                    <span>Gathering...</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="size-3.5" />
                                    <span>Re-gather via Apify</span>
                                </>
                            )}
                        </Button>
                    )}
                    <a
                        href={`https://www.instagram.com/${username}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                        <span>Profile</span>
                        <ExternalLink className="size-3" />
                    </a>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Top Video Views
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            {formatNumber(maxViews)}
                        </span>
                        <TrendingUp className="size-3.5 text-emerald-500" />
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Avg Top Video Views
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            {formatNumber(avgViews)}
                        </span>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Total Video Likes
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            {formatNumber(totalLikes)}
                        </span>
                        <Heart className="size-3.5 text-rose-500" />
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Analyzed Videos
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            {displayList.length}
                        </span>
                        <VideoIcon className="size-3.5 text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Video Cards Grid */}
            {displayList.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
                    <VideoIcon className="size-10 text-zinc-300 dark:text-zinc-600" />
                    <h3 className="mt-3 text-base font-medium text-zinc-700 dark:text-zinc-300">
                        No videos gathered yet
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                        Click the &quot;Gather Top Videos&quot; button to scrape and rank top videos for @{username} via Apify.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {displayList.map((post, index) => {
                        const rankNumber = ("rank" in post && post.rank) ? post.rank : index + 1;
                        const postUrl = getPostUrl(post);
                        const shortcode = post.shortcode;
                        const publishedAt = getPublishedAt(post);
                        const views = getViewCount(post);
                        const likes = getLikeCount(post);
                        const caption = post.caption || "";
                        const raw = getRawData(post);
                        const displayUrl = raw.displayUrl || raw.thumbnailUrl || null;
                        const commentsCount = raw.commentsCount;

                        const isTop3 = rankNumber <= 3;
                        const isExpanded = expandedPostId === shortcode;

                        // Badging based on rank
                        const rankBadgeColors =
                            rankNumber === 1
                                ? "bg-amber-400 text-amber-950 ring-2 ring-amber-300/60"
                                : rankNumber === 2
                                ? "bg-slate-300 text-slate-900 ring-2 ring-slate-200"
                                : rankNumber === 3
                                ? "bg-amber-700/80 text-amber-100 ring-2 ring-amber-600/40"
                                : "bg-zinc-900/80 text-zinc-100 backdrop-blur-xs";

                        return (
                            <article
                                key={shortcode || index}
                                className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-850 dark:hover:border-zinc-700"
                            >
                                {/* Media Thumbnail Header */}
                                <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-900">
                                    {displayUrl ? (
                                        <img
                                            src={displayUrl}
                                            alt={caption ? caption.slice(0, 80) : `Video #${rankNumber}`}
                                            referrerPolicy="no-referrer"
                                            loading="lazy"
                                            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => {
                                                // Fallback on hotlink error
                                                e.currentTarget.style.display = "none";
                                                const fallback = e.currentTarget.parentElement?.querySelector(
                                                    ".fallback-placeholder"
                                                );
                                                if (fallback) fallback.classList.remove("hidden");
                                            }}
                                        />
                                    ) : null}

                                    {/* Fallback Placeholder */}
                                    <div
                                        className={`fallback-placeholder ${
                                            displayUrl ? "hidden" : ""
                                        } flex size-full flex-col items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-4 text-center`}
                                    >
                                        <div className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm">
                                            <Play className="size-6 fill-white pl-0.5" />
                                        </div>
                                        <span className="mt-2 text-xs font-medium text-zinc-400">
                                            Instagram Reel #{rankNumber}
                                        </span>
                                    </div>

                                    {/* Rank Badge */}
                                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-tight shadow-sm ${rankBadgeColors}`}
                                        >
                                            {rankNumber === 1 && <Trophy className="size-3" />}
                                            #{rankNumber}
                                        </span>
                                    </div>

                                    {/* Media Type & Duration Badge */}
                                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                                        <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                                            <VideoIcon className="size-3" />
                                            <span>Video</span>
                                        </span>
                                    </div>

                                    {/* Views Floating Overlay */}
                                    <div className="absolute right-2.5 bottom-2.5 left-2.5 flex items-center justify-between rounded-lg bg-black/60 px-2.5 py-1.5 text-xs text-white backdrop-blur-md">
                                        <div className="flex items-center gap-1.5 font-semibold">
                                            <Eye className="size-3.5 text-sky-400" />
                                            <span>{formatNumber(views)} views</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-semibold">
                                            <Heart className="size-3.5 text-rose-400 fill-rose-400/30" />
                                            <span>{formatNumber(likes)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Details */}
                                <div className="flex flex-1 flex-col p-4">
                                    {/* Metrics summary */}
                                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="size-3" />
                                            <span>{formatDate(publishedAt)}</span>
                                        </div>
                                        {commentsCount !== undefined && (
                                            <span>{formatNumber(commentsCount)} comments</span>
                                        )}
                                    </div>

                                    {/* Caption Excerpt */}
                                    <div className="mt-2.5 flex-1 text-xs text-zinc-700 dark:text-zinc-300">
                                        {caption ? (
                                            <>
                                                <p className={isExpanded ? "" : "line-clamp-3"}>
                                                    {caption}
                                                </p>
                                                {caption.length > 120 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExpandedPostId(isExpanded ? null : shortcode)
                                                        }
                                                        className="mt-1 text-xs font-semibold text-purple-600 hover:underline dark:text-purple-400"
                                                    >
                                                        {isExpanded ? "Show less" : "Read more"}
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <span className="italic text-zinc-400">No caption provided.</span>
                                        )}
                                    </div>

                                    {/* Watch on Instagram CTA */}
                                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                        <a
                                            href={postUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 py-2 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                        >
                                            <span>Watch on Instagram</span>
                                            <ExternalLink className="size-3.5" />
                                        </a>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
