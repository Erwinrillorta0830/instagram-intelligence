
export interface InstagramPost {
    shortcode: string;
    accountUsername: string;
    postUrl: string;
    mediaType: string;
    caption: string | null;
    viewCount: number | null;
    likeCount: number | null;
    publishedAt: string;
    rawData: Record<string, unknown>;
}

export interface RankedInstagramPost extends InstagramPost {
    rank: number;
    rankingMetric: "views" | "likes";
    rankingValue: number;
}

export interface InstagramAccount {
    id: string;
    username: string;
    profile_url: string;
    niche: string | null;
    created_at: string;
    post_count?: number;
}

export interface SavedPost {
    id: string;
    account_id: string;
    shortcode: string;
    post_url: string;
    media_type: string;
    caption: string | null;
    view_count: number | null;
    like_count: number | null;
    published_at: string;
    collected_at: string;
    raw_data: Record<string, any>;
    rank?: number;
}

export interface CollectResult {
    account: string;
    periodStart: string;
    periodEnd: string;
    collectedCount: number;
    rankedCount: number;
    collectionLimit: number;
    topPosts: RankedInstagramPost[];
}
