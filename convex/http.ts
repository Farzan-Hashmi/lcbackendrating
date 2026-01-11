import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Endpoint to trigger Mochi sync - call this after adding cards
// Usage: Just visit or fetch your-convex-url/syncMochi
http.route({
  path: "/syncMochi",
  method: "GET",
  handler: httpAction(async (ctx) => {
    // Run the mochi table update
    await ctx.runAction(api.myFunctions.updateMochiTable, {});

    return new Response(
      JSON.stringify({ success: true, message: "Mochi sync triggered!" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }),
});

export default http;
