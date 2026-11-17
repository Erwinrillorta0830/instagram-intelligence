
import "server-only";
import { createApifyClient } from "./client";
import type { InstagramPost } from "@/types/instagram";

type RawPost = Record<string, unknown>;

function stringValue(value: unknown): string | null {
    return typeof value === "string" && value.length > 0
        ? value
        : null;
}

function metric(value: unknown): number | null {
    const number =
        typeof value === "number" ? value :
            typeof value === "string" && value.trim()
                ? Number(value)
                : NaN;

    return Number.isFinite(number) && number >= 0
        ? number
        : null;
}

function normalizePost(
    raw: RawPost,
    username: string
): InstagramPost | null {
    const shortcode = stringValue(
        raw.shortCode ?? raw.shortcode
    );

    const timestamp = raw.timestamp ?? raw.takenAtIso
        ?? raw.takenAt;

    const date = typeof timestamp === "number"
        ? new Date(timestamp * 1000)
        : new Date(String(timestamp ?? ""));

    if (!shortcode || Number.isNaN(date.getTime())) {
        return null;
    }

    const owner = stringValue(
        raw.ownerUsername ?? raw.username
    );

    // Reject unrelated or ambiguous records.
    if (!owner || owner.toLowerCase() !== username.toLowerCase()) {
        return null;
    }

    return {
        shortcode,
        accountUsername: owner.toLowerCase(),
        postUrl: stringValue(raw.url) ??
            `https://www.instagram.com/p/${shortcode}/`,
        mediaType: stringValue(raw.type) ?? "unknown",
        caption: stringValue(raw.caption),
        viewCount: metric(
            raw.videoViewCount ?? raw.videoPlayCount ??
            raw.viewsCount ?? raw.views
        ),
        likeCount: metric(raw.likesCount ?? raw.likes),
        publishedAt: date.toISOString(),
        rawData: raw,
    };
}

export async function scrapeInstagramPosts(
    username: string,
    since: Date,
    until: Date,
    resultsLimit = 100
): Promise<InstagramPost[]> {
    const client = createApifyClient();

    const run = await client.actor(
        process.env.APIFY_ACTOR_ID ??
        "apify/instagram-scraper"
    ).call({
        directUrls: [
            `https://www.instagram.com/${username}/`,
        ],
        resultsType: "posts",
        resultsLimit,
        onlyPostsNewerThan: since.toISOString().slice(0, 10),
    });

    if (!run || run.status !== "SUCCEEDED") {
        throw new Error(
            `Instagram scraper did not succeed: ${run?.status}`
        );
    }

    const posts: InstagramPost[] = [];
    let offset = 0;

    while (true) {
        const page = await client
            .dataset(run.defaultDatasetId)
            .listItems({ offset, limit: 1000 });

        for (const item of page.items) {
            const post = normalizePost(
                item as RawPost,
                username
            );

            if (!post) continue;

            const published = new Date(post.publishedAt);
            if (published >= since && published <= until) {
                posts.push(post);
            }
        }

        offset += page.items.length;
        if (page.items.length === 0 || offset >= page.total) {
            break;
        }
    }

    return Array.from(
        new Map(posts.map((post) => [post.shortcode, post])).values()
    );
}
