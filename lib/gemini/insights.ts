import "server-only";
import { createGeminiClient } from "@/lib/gemini/client";

export interface InsightResult {
  competitor_patterns: {
    themes: string[];
    hooks: string[];
    style: string;
    summary: string;
  };
  client_differences: {
    gaps: string[];
    strengths: string[];
    summary: string;
  };
  recommendations: {
    items: string[];
    summary: string;
  };
  scripts: Array<{
    title: string;
    hook: string;
    body: string;
    cta: string;
  }>;
}

interface PostData {
  rank: number;
  caption: string | null;
  transcript: string | null;
}

interface CompetitorData {
  username: string;
  transcripts: PostData[];
}

export async function generateInsights(params: {
  clientUsername: string;
  clientTranscripts: PostData[];
  competitors: CompetitorData[];
}): Promise<InsightResult> {
  const ai = createGeminiClient();
  const model = process.env.GEMINI_INSIGHTS_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const formatPosts = (posts: PostData[]) =>
    posts
      .map(
        (p) =>
          `  [Rank #${p.rank}]\n  Caption: ${p.caption ? `"${p.caption.slice(0, 300)}"` : "(none)"}\n  Transcript: ${p.transcript ? `"${p.transcript.slice(0, 1200)}"` : "(no speech detected)"}`
      )
      .join("\n\n");

  const competitorSection = params.competitors
    .map(
      (c) =>
        `=== COMPETITOR: @${c.username} (${c.transcripts.length} top posts) ===\n${formatPosts(c.transcripts)}`
    )
    .join("\n\n");

  const clientSection = `=== CLIENT: @${params.clientUsername} (${params.clientTranscripts.length} top posts) ===\n${formatPosts(params.clientTranscripts)}`;

  const prompt = `You are an expert Instagram content strategist and scriptwriter. Analyze these top Instagram video posts and return a JSON analysis.

${competitorSection}

${clientSection}

Based on the above content (transcripts of spoken words + captions from their top-performing videos), return ONLY a valid JSON object with this exact structure — no markdown, no explanation, just JSON:

{
  "competitor_patterns": {
    "themes": ["array of 3-5 recurring content themes competitors use"],
    "hooks": ["array of 3-5 hook styles or opening patterns that appear in competitor videos"],
    "style": "1-2 sentence description of competitors' overall content style and tone",
    "summary": "2-3 sentence analysis of what makes their top content work and why it performs well"
  },
  "client_differences": {
    "gaps": ["array of 3-5 specific gaps or opportunities the client is missing compared to competitors"],
    "strengths": ["array of 2-3 things the client does well or differently that could be leveraged"],
    "summary": "2-3 sentence description of how the client's content currently differs from what's working for competitors"
  },
  "recommendations": {
    "items": ["array of 4-6 specific, actionable content recommendations for the client"],
    "summary": "2-3 sentence strategic direction for the client based on the competitive analysis"
  },
  "scripts": [
    {
      "title": "Descriptive title for the script concept",
      "hook": "Exact opening line/sentence that grabs attention in the first 3 seconds — make it punchy and specific",
      "body": "The main script content (4-6 sentences). Write it as natural spoken dialogue the creator would say on camera. Use the competitor patterns that work but adapted to the client's voice and niche.",
      "cta": "The specific call-to-action to close the video (1-2 sentences)"
    }
  ]
}

RULES:
- Base analysis strictly on the actual transcript and caption content provided
- Scripts MUST be tailored to @${params.clientUsername}'s niche and style
- Scripts should directly apply the competitor patterns that drive views
- Provide exactly 3 scripts in the scripts array
- If transcripts are missing/null for posts, base analysis on captions only`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned an empty response for insights");

  try {
    return JSON.parse(text) as InsightResult;
  } catch {
    // Try to extract JSON block from response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as InsightResult;
      } catch {
        // fall through
      }
    }
    throw new Error(
      `Failed to parse Gemini insights as JSON. Response: ${text.slice(0, 200)}`
    );
  }
}
