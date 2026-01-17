import type { RequestEvent } from "@sveltejs/kit";

export const GET = async ({ platform, request }: RequestEvent) => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "request_received";
  const requestId = crypto.randomUUID();
  
  // Log structured data that gateproof can observe
  const logData = {
    timestamp: new Date().toISOString(),
    level: "info" as const,
    message: `Action: ${action}`,
    action,
    stage: "worker",
    requestId,
    metadata: {
      path: "/api/test",
      method: "GET",
      userAgent: request.headers.get("user-agent") || "unknown"
    }
  };
  
  console.log(JSON.stringify(logData));

  return new Response(
    JSON.stringify({
      success: true,
      action,
      timestamp: new Date().toISOString(),
      message: `Test endpoint executed: ${action}`,
      // Return log data so gate can collect it
      log: logData
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
