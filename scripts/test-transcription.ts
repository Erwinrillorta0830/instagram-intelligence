
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
    const postId = process.argv[2];

    if (!postId) {
        throw new Error("Provide a post UUID");
    }

    const { transcribePost } = await import(
        "../server/services/post-transcription.service"
    );

    const result = await transcribePost(postId);
    console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
