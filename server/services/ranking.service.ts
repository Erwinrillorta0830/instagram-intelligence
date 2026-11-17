
import type {
    InstagramPost,
    RankedInstagramPost,
} from "@/types/instagram";

export function rankTopPosts(
    posts: InstagramPost[],
    limit = 10
): RankedInstagramPost[] {
    return posts
        .filter(
            (post) =>
                post.viewCount !== null ||
                post.likeCount !== null
        )
        .map((post) => {
            const useViews = post.viewCount !== null;

            return {
                ...post,
                rankingMetric: useViews
                    ? "views" as const
                    : "likes" as const,
                rankingValue: useViews
                    ? post.viewCount!
                    : post.likeCount!,
            };
        })
        .sort((a, b) => {
            return (
                b.rankingValue - a.rankingValue ||
                Date.parse(b.publishedAt) -
                Date.parse(a.publishedAt)
            );
        })
        .slice(0, limit)
        .map((post, index) => ({
            ...post,
            rank: index + 1,
        }));
}
