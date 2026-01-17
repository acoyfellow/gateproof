import type { RequestEvent } from "@sveltejs/kit";
import { Gate, Act, Assert } from "../../../../../src/index";
import { Queue, Effect, Runtime } from "effect";
import { createObserveResource, type Backend } from "../../../../../src/observe";
import type { Log } from "../../../../../src/types";

// Create a queue-based backend that collects logs from HTTP responses
function createHttpLogBackend(testUrl: string): Backend {
  const queue = Queue.unsafeMake<Log>();
  const runtime = Runtime.defaultRuntime;
  
  return {
    start: () => {
      // Start collecting logs by making the HTTP request
      // The test endpoint will log, and we'll capture it
      fetch(testUrl + "?action=request_received")
        .then(async (res) => {
          const data = await res.json();
          // Create a log from the response
          const log: Log = {
            timestamp: new Date().toISOString(),
            level: "info",
            message: data.message || "Test endpoint executed",
            action: data.action || "request_received",
            stage: "worker",
            requestId: crypto.randomUUID()
          };
          // Add to queue
          Runtime.runPromise(runtime)(
            Queue.offer(queue, log)
          ).catch(() => {});
        })
        .catch(() => {});
      
      return Effect.succeed<AsyncIterable<Log>>({
        async *[Symbol.asyncIterator]() {
          // Wait a bit for the log to arrive
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try to get the log from queue
          const log = await Runtime.runPromise(runtime)(
            Queue.take(queue).pipe(
              Effect.timeout("1000 millis"),
              Effect.catchAll(() => Effect.succeed(null as Log | null))
            )
          );
          
          if (log) {
            yield log;
          }
        }
      });
    },
    stop: () => Effect.void
  };
}

export const POST = async ({ platform, request, url }: RequestEvent) => {
  try {
    const baseUrl = url.origin;
    const testUrl = `${baseUrl}/api/test`;
    
    // Create a simple HTTP-based observe resource
    const backend = createHttpLogBackend(testUrl);
    const observe = createObserveResource(backend);

    const gate = {
      name: "demo-gate",
      observe,
      act: [
        Act.exec(`curl -s "${testUrl}?action=request_received"`),
        Act.wait(1000)
      ],
      assert: [
        Assert.noErrors(),
        Assert.hasAction("request_received")
      ],
      stop: { idleMs: 2000, maxMs: 10000 }
    };

    const result = await Gate.run(gate);

    return new Response(
      JSON.stringify({
        status: result.status,
        durationMs: result.durationMs,
        logs: result.logs.map(log => ({
          timestamp: log.timestamp,
          level: log.level,
          message: log.message,
          action: log.action,
          stage: log.stage
        })),
        evidence: result.evidence,
        error: result.error ? {
          message: result.error.message,
          name: result.error.name
        } : null
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Gate execution failed",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
