
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeInstagramPosts } from "@/lib/apify/instagram";
import { rankTopPosts } from "./ranking.service";
import { savePosts } from "@/server/repositories/post.repository";
import type { InstagramPost } from "@/types/instagram";

export async function collectAccountPosts(
    accountId: string,
    period?: { since: Date; until: Date },
    forceRefresh = false
) {
    const supabase = createAdminClient();

    const { data: account, error } = await supabase
        .from("accounts")
        .select("id, username")
        .eq("id", accountId)
        .single();

    if (error || !account) {
        throw new Error("Instagram account not found");
    }

    const until = period?.until ?? new Date();
    const since = period?.since ?? new Date(
        until.getTime() - 90 * 24 * 60 * 60 * 1000
    );

    let posts: InstagramPost[] = [];

    // Optimization 1: Reuse existing posts from DB if we already collected at least 10
    if (!forceRefresh) {
        const { data: cachedRows } = await supabase
            .from("posts")
            .select("*")
            .eq("account_id", account.id)
            .gte("published_at", since.toISOString())
            .lte("published_at", until.toISOString())
            .order("view_count", { ascending: false, nullsFirst: false });

        if (cachedRows && cachedRows.length >= 10) {
            console.log(
                `[CACHE] Reusing ${cachedRows.length} cached posts for @${account.username}`
            );
            posts = cachedRows.map((row: any) => ({
                shortcode: row.shortcode,
                accountUsername: account.username,
                postUrl: row.post_url,
                mediaType: row.media_type,
                caption: row.caption,
                viewCount: row.view_count,
                likeCount: row.like_count,
                publishedAt: row.published_at,
                rawData: row.raw_data || {},
            }));
        }
    }

    // Optimization 2: Scrape only 30 posts instead of 100 (cuts Apify time by ~70%)
    if (posts.length === 0) {
        console.log(
            `[SCRAPE] Scraping recent posts for @${account.username} via Apify (limit: 30)...`
        );
        posts = await scrapeInstagramPosts(
            account.username,
            since,
            until,
            30
        );

        if (posts.length > 0) {
            await savePosts(account.id, posts);
        }
    }

    const topPosts = rankTopPosts(posts, 10);

    return {
        account: account.username,
        periodStart: since.toISOString(),
        periodEnd: until.toISOString(),
        collectedCount: posts.length,
        rankedCount: topPosts.length,
        collectionLimit: 30,
        topPosts,
    };
}
