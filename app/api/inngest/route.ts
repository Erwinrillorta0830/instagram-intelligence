
import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { processAnalysis } from "@/lib/inngest/functions";
import {
  processTranscriptions,
  processSingleTranscription,
} from "@/lib/inngest/transcription";
import { processInsights } from "@/lib/inngest/insights";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processAnalysis,
    processTranscriptions,
    processSingleTranscription,
    processInsights,
  ],
});
