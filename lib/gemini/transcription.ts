
import "server-only";

import {
    createPartFromUri,
    createUserContent,
} from "@google/genai";

import { createGeminiClient } from "@/lib/gemini/client";

export type GeminiTranscriptResult = {
    text: string;
    model: string;
};

const PROMPT = `
Transcribe all audible spoken dialogue in this video.

Requirements:
- Preserve the original language.
- Include all spoken words.
- Do not summarize or paraphrase.
- Do not invent speech.
- Ignore background music without lyrics.
- Do not include visual descriptions.
- Return only the transcript text.

If there is no intelligible speech, return exactly:
NO_SPEECH_DETECTED
`.trim();

const POLL_INTERVAL_MS = 1500;
const PROCESSING_TIMEOUT_MS = 120000;

export async function transcribeWithGemini(
    filePath: string,
    mimeType = "video/mp4"
): Promise<GeminiTranscriptResult> {
    if (!["video/mp4", "video/webm"].includes(mimeType)) {
        throw new Error("Unsupported video format");
    }

    const ai = createGeminiClient();

    const model =
        process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

    let uploadedFileName: string | undefined;

    try {
        const uploaded = await ai.files.upload({
            file: filePath,
            config: { mimeType },
        });

        uploadedFileName = uploaded.name;

        if (!uploadedFileName) {
            throw new Error(
                "Gemini upload did not return a file name"
            );
        }

        let file = uploaded;

        const deadline =
            Date.now() + PROCESSING_TIMEOUT_MS;

        while (String(file.state) !== "ACTIVE") {
            if (String(file.state) === "FAILED") {
                throw new Error(
                    "Gemini failed to process the uploaded video"
                );
            }

            if (Date.now() >= deadline) {
                throw new Error(
                    "Timed out waiting for Gemini video processing"
                );
            }

            await new Promise<void>((resolve) =>
                setTimeout(resolve, POLL_INTERVAL_MS)
            );

            file = await ai.files.get({
                name: uploadedFileName,
            });
        }

        if (!file.uri || !file.mimeType) {
            throw new Error(
                "Gemini file is missing its URI or MIME type"
            );
        }

        const response = await ai.models.generateContent({
            model,
            contents: createUserContent([
                createPartFromUri(
                    file.uri,
                    file.mimeType
                ),
                PROMPT,
            ]),
        });

        const text = response.text?.trim();

        if (!text) {
            throw new Error(
                "Gemini returned an empty response"
            );
        }

        return { text, model };
    } finally {
        if (uploadedFileName) {
            try {
                await ai.files.delete({
                    name: uploadedFileName,
                });
            } catch (error) {
                console.error(
                    "Failed to clean up Gemini file:",
                    error
                );
            }
        }
    }
}
