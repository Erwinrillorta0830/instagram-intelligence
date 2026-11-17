
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InstagramPost } from "@/types/instagram";

export async function savePosts(
    accountId: string,
    posts: InstagramPost[]
) {
    if (posts.length === 0) return [];

    const supabase = createAdminClient();

    const rows = posts.map((post) => ({
        account_id: accountId,
        shortcode: post.shortcode,
        post_url: post.postUrl,
        media_type: post.mediaType,
        caption: post.caption,
        view_count: post.viewCount,
        like_count: post.likeCount,
        published_at: post.publishedAt,
        collected_at: new Date().toISOString(),
        raw_data: post.rawData,
    }));

    const { data, error } = await supabase
        .from("posts")
        .upsert(rows, { onConflict: "shortcode" })
        .select("id, shortcode");

    if (error) throw error;

    return data;
}

export async function getPostsByAccountId(accountId: string, limit = 50) {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("account_id", accountId)
        .order("view_count", { ascending: false, nullsFirst: false })
        .order("like_count", { ascending: false, nullsFirst: false })
        .limit(limit);

    if (error) throw error;

    return data;
}
