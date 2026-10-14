import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleAudio } = await import("@/lib/ai/audio.server");
        return handleAudio(request);
      },
    },
  },
});
