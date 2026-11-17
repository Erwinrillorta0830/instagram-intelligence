
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createGeminiClient } from "@/lib/gemini/client";
import {
    saveAnalysisResults,
    updateRunStatus,
} from "@/server/repositories/analysis.repository";

interface PostWithDetails {
    shortcode: string;
    post_url: string;
    media_type: string;
    caption: string | null;
    view_count: number | null;
    like_count: number | null;
    rank: number | null;
    account_username: string;
    account_role: "client" | "competitor";
    transcript: string | null;
    transcript_status: string | null;
}

export async function generateInsightsForRun(runId: string) {
    const db = createAdminClient();

    // 1. Fetch analysis run accounts
    const { data: runAccounts, error: accountsError } = await db
        .from("analysis_run_accounts")
        .select(`
            account_id,
            role,
            accounts(username)
        `)
        .eq("run_id", runId);

    if (accountsError || !runAccounts || runAccounts.length === 0) {
        throw new Error("No accounts found for analysis run");
    }

    const clientAccount = runAccounts.find((a) => a.role === "client");
    const competitorAccounts = runAccounts.filter((a) => a.role === "competitor");

    const clientUsername = (clientAccount?.accounts as any)?.username || "client";
    const competitorUsernames = competitorAccounts.map(
        (c) => (c.accounts as any)?.username || "competitor"
    );

    // 2. Fetch ranked posts for this run
    const { data: runPosts, error: postsError } = await db
        .from("analysis_run_posts")
        .select(`
            post_id,
            account_id,
            rank,
            views_snapshot,
            likes_snapshot,
            posts (
                shortcode,
                post_url,
                media_type,
                caption,
                view_count,
                like_count
            )
        `)
        .eq("run_id", runId)
        .order("rank", { ascending: true });

    if (postsError || !runPosts || runPosts.length === 0) {
        throw new Error("No ranked posts found for analysis run");
    }

    // 3. Fetch transcripts for these posts
    const postIds = runPosts.map((p) => p.post_id);
    const { data: transcripts } = await db
        .from("transcripts")
        .select("post_id, transcript, status")
        .in("post_id", postIds);

    const transcriptByPostId = new Map(
        (transcripts ?? []).map((t) => [t.post_id, t])
    );

    const accountRoleMap = new Map(
        runAccounts.map((a) => [a.account_id, a.role as "client" | "competitor"])
    );
    const accountUsernameMap = new Map(
        runAccounts.map((a) => [
            a.account_id,
            (a.accounts as any)?.username || "unknown",
        ])
    );

    const clientPosts: PostWithDetails[] = [];
    const competitorPosts: PostWithDetails[] = [];

    for (const rp of runPosts) {
        const post = rp.posts as any;
        if (!post) continue;

        const role = accountRoleMap.get(rp.account_id) ?? "competitor";
        const username = accountUsernameMap.get(rp.account_id) ?? "unknown";
        const tr = transcriptByPostId.get(rp.post_id);

        const item: PostWithDetails = {
            shortcode: post.shortcode,
            post_url: post.postUrl || post.post_url,
            media_type: post.mediaType || post.media_type,
            caption: post.caption,
            view_count: rp.views_snapshot ?? post.view_count,
            like_count: rp.likes_snapshot ?? post.like_count,
            rank: rp.rank,
            account_username: username,
            account_role: role,
            transcript: tr?.status === "completed" ? tr.transcript : null,
            transcript_status: tr?.status ?? "pending",
        };

        if (role === "client") {
            clientPosts.push(item);
        } else {
            competitorPosts.push(item);
        }
    }

    // 4. Construct Prompt for Gemini
    const prompt = `
You are a world-class social media strategist and viral video producer for Instagram Reels.
You are conducting a deep competitive intelligence audit for an Instagram creator/brand client.

CLIENT ACCOUNT:
@${clientUsername}
Top Videos Analyzed: ${clientPosts.length}

COMPETITOR ACCOUNTS:
${competitorUsernames.map((u) => `@${u}`).join(", ")}
Top Videos Analyzed: ${competitorPosts.length}

---
COMPETITOR TOP PERFORMING POSTS & VIDEO TRANSCRIPTS:
${competitorPosts
    .map(
        (p, idx) => `
[Competitor Video #${idx + 1}]
Account: @${p.account_username} | Rank: #${p.rank}
Views: ${p.view_count?.toLocaleString() ?? "N/A"} | Likes: ${p.like_count?.toLocaleString() ?? "N/A"}
Caption: ${p.caption ? p.caption.slice(0, 300) : "None"}
Transcript (spoken audio): ${p.transcript || "(No speech detected or instrumental music only)"}
`
    )
    .join("\n")}

---
CLIENT TOP PERFORMING POSTS & VIDEO TRANSCRIPTS:
${clientPosts
    .map(
        (p, idx) => `
[Client Video #${idx + 1}]
Account: @${p.account_username} | Rank: #${p.rank}
Views: ${p.view_count?.toLocaleString() ?? "N/A"} | Likes: ${p.like_count?.toLocaleString() ?? "N/A"}
Caption: ${p.caption ? p.caption.slice(0, 300) : "None"}
Transcript (spoken audio): ${p.transcript || "(No speech detected or instrumental music only)"}
`
    )
    .join("\n")}

---
TASK:
Analyze the transcripts, video hooks, captions, and view counts above to uncover actionable intelligence:
1. Identify what the competitors' top-performing videos have in common (common themes, hook structures, storytelling angles, audio pacing, formats).
2. Contrast how the client's (@${clientUsername}) current posts differ from what is working best for competitors (gaps, weaknesses, opportunities).
3. Provide strategic takeaways and concrete recommendations for the client.
4. Write 3 complete, production-ready, viral Instagram Reel scripts specifically customized for @${clientUsername}. Each script must have a high-retention hook (first 3 seconds), an engaging body with visual and spoken directions, and an effective call-to-action (CTA).

OUTPUT REQUIREMENTS:
Return valid JSON only matching this exact structure:
{
  "competitor_patterns": {
    "summary": "High-level summary of what drives competitor viral success",
    "common_themes": ["Theme 1", "Theme 2", "Theme 3"],
    "hook_tactics": ["Hook tactic 1", "Hook tactic 2", "Hook tactic 3"],
    "content_formats": ["Format observation 1", "Format observation 2"],
    "pacing_and_audio": "Analysis of their spoken delivery, tone, and pacing"
  },
  "client_differences": {
    "summary": "High-level summary of where the client currently stands vs competitors",
    "critical_gaps": ["Gap 1", "Gap 2", "Gap 3"],
    "untapped_strengths": ["Strength 1", "Strength 2"],
    "why_competitors_win": "Direct explanation of why top competitor posts out-perform client content"
  },
  "recommendations": {
    "summary": "Core strategy roadmap for @${clientUsername}",
    "actionable_rules": ["Rule 1", "Rule 2", "Rule 3"],
    "winning_hook_formulas": ["Formula 1", "Formula 2", "Formula 3"]
  },
  "scripts": [
    {
      "script_number": 1,
      "title": "Clear catchy title for Script 1",
      "hook": "Exact spoken words for the first 0-3 seconds to stop the scroll",
      "body": "Step-by-step video script including [Visual action cues] and exact spoken dialogue",
      "cta": "Exact spoken & on-screen Call to Action at the end of the video"
    },
    {
      "script_number": 2,
      "title": "Clear catchy title for Script 2",
      "hook": "Exact spoken words for the first 0-3 seconds to stop the scroll",
      "body": "Step-by-step video script including [Visual action cues] and exact spoken dialogue",
      "cta": "Exact spoken & on-screen Call to Action at the end of the video"
    },
    {
      "script_number": 3,
      "title": "Clear catchy title for Script 3",
      "hook": "Exact spoken words for the first 0-3 seconds to stop the scroll",
      "body": "Step-by-step video script including [Visual action cues] and exact spoken dialogue",
      "cta": "Exact spoken & on-screen Call to Action at the end of the video"
    }
  ]
}
`.trim();

    // 5. Call Gemini
    const ai = createGeminiClient();
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    console.log(`[INSIGHTS] Calling Gemini (${model}) for run ${runId}...`);

    let rawText = "";
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });

        rawText = response.text?.trim() || "";
    } catch (apiError) {
        console.error("[INSIGHTS] Gemini API error:", apiError);
        // Fallback without responseMimeType in case of model version config differences
        const fallbackResponse = await ai.models.generateContent({
            model,
            contents: prompt + "\n\nCRITICAL: Respond ONLY with valid JSON. Do not include markdown codeblocks or explanation.",
        });
        rawText = fallbackResponse.text?.trim() || "";
    }

    if (!rawText) {
        throw new Error("Gemini returned empty response for analysis insights");
    }

    // Clean any accidental markdown codeblock wrapper
    const jsonString = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    let parsed: any;
    try {
        parsed = JSON.parse(jsonString);
    } catch (parseError) {
        console.error("[INSIGHTS] Failed to parse JSON response:", jsonString);
        throw new Error("Failed to parse Gemini analysis output into JSON");
    }

    // Validate expected structure
    const competitorPatterns = parsed.competitor_patterns ?? {};
    const clientDifferences = parsed.client_differences ?? {};
    const recommendations = parsed.recommendations ?? {};
    const scripts = Array.isArray(parsed.scripts) ? parsed.scripts : [];

    // 6. Save results to Supabase
    await saveAnalysisResults(runId, {
        competitorPatterns,
        clientDifferences,
        recommendations,
        scripts,
    });

    console.log(`[INSIGHTS] Analysis results & ${scripts.length} scripts saved for run ${runId}`);

    return {
        runId,
        competitorPatterns,
        clientDifferences,
        recommendations,
        scriptsCount: scripts.length,
    };
}
