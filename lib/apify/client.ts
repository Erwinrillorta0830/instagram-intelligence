
import "server-only";
import { ApifyClient } from "apify-client";

export function createApifyClient() {
    const token = process.env.APIFY_API_TOKEN;

    if (!token) {
        throw new Error("APIFY_API_TOKEN is missing");
    }

    return new ApifyClient({ token });
}
