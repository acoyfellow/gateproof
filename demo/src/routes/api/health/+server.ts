import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
  return new Response(
    JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString()
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
