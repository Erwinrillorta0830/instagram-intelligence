
import "server-only";

import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { transcribeWithGemini } from "@/lib/gemini/transcription";

const MAX_BYTES = 100 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 25000;

const ALLOWED_TYPES = new Map([
    ["video/mp4", ".mp4"],
    ["video/webm", ".webm"],
]);

export async function transcribeMedia(
    mediaUrl: string
): Promise<string> {
    const url = new URL(mediaUrl);

    if (url.protocol !== "https:") {
        throw new Error("Media URL must use HTTPS");
    }

    // Reject obvious local/internal hostnames.
    // Production requires stronger DNS/IP validation.
    const hostname = url.hostname.toLowerCase();

    if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal") ||
        hostname === "metadata.google.internal" ||
        hostname.startsWith("127.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("169.254.") ||
        hostname === "::1" ||
        hostname.startsWith("[")
    ) {
        throw new Error("Private media hosts are not allowed");
    }

    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        DOWNLOAD_TIMEOUT_MS
    );

    let tempDirectory: string | undefined;

    try {
        const response = await fetch(url, {
            redirect: "error",
            signal: controller.signal,
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(
                `Media download failed: ${response.status}`
            );
        }

        const contentType = response.headers
            .get("content-type")
            ?.split(";")[0]
            .trim()
            .toLowerCase();

        const extension = contentType
            ? ALLOWED_TYPES.get(contentType)
            : undefined;

        if (!extension || !contentType) {
            await response.body?.cancel();

            throw new Error(
                `Unsupported media content type: ${contentType}`
            );
        }

        const contentLength = response.headers.get(
            "content-length"
        );

        if (contentLength !== null) {
            const declaredSize = Number(contentLength);

            if (
                !Number.isFinite(declaredSize) ||
                declaredSize < 0 ||
                declaredSize > MAX_BYTES
            ) {
                await response.body?.cancel();

                throw new Error(
                    "Media exceeds the 100 MB limit"
                );
            }
        }

        if (!response.body) {
            throw new Error("Empty media response");
        }

        tempDirectory = await mkdtemp(
            path.join(tmpdir(), "instagram-transcription-")
        );

        const filePath = path.join(
            tempDirectory,
            `${randomUUID()}${extension}`
        );

        let downloadedBytes = 0;

        const sizeLimiter = new Transform({
            transform(chunk: Buffer, _encoding, callback) {
                downloadedBytes += chunk.length;

                if (downloadedBytes > MAX_BYTES) {
                    callback(
                        new Error(
                            "Media exceeds the 100 MB limit"
                        )
                    );
                    return;
                }

                callback(null, chunk);
            },
        });

        await pipeline(
            Readable.fromWeb(
                response.body as Parameters<
                    typeof Readable.fromWeb
                >[0]
            ),
            sizeLimiter,
            createWriteStream(filePath),
            { signal: controller.signal }
        );

        if (downloadedBytes === 0) {
            throw new Error(
                "Downloaded media is empty"
            );
        }

        const fileInfo = await stat(filePath);

        if (fileInfo.size !== downloadedBytes) {
            throw new Error(
                "Downloaded file size mismatch"
            );
        }

        // Download timeout applies only to downloading.
        clearTimeout(timeout);

        const result = await transcribeWithGemini(
            filePath,
            contentType
        );

        return result.text.trim();
    } finally {
        clearTimeout(timeout);

        if (tempDirectory) {
            await rm(tempDirectory, {
                recursive: true,
                force: true,
            }).catch((error) => {
                console.error(
                    "Failed to remove temporary media:",
                    error
                );
            });
        }
    }
}
