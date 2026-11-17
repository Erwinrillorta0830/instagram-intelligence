
import "server-only";

const TRUSTED_HOSTS = [
    "cdninstagram.com",
    "fbcdn.net",
];

function isTrustedHost(hostname: string): boolean {
    return TRUSTED_HOSTS.some(
        (domain) =>
            hostname === domain ||
            hostname.endsWith(`.${domain}`)
    );
}

export function validateMediaUrl(value: string): string {
    const url = new URL(value);

    if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.port ||
        !isTrustedHost(url.hostname)
    ) {
        throw new Error("Untrusted media URL");
    }

    return url.toString();
}

export function extractVideoUrl(
    raw: Record<string, unknown> | null
): string | null {
    if (!raw) return null;

    const candidates = [
        raw.videoUrl,
        raw.video_url,
    ];

    for (const candidate of candidates) {
        if (typeof candidate !== "string") continue;

        try {
            return validateMediaUrl(candidate);
        } catch {
            continue;
        }
    }

    return null;
}
