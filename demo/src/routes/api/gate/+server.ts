import type { RequestEvent } from "@sveltejs/kit";
import { Gate, Act, Assert } from "../../../../../src/index";
import type { Log } from "../../../../../src/types";
import { Effect } from "effect";

function createHttpLogBackend(testUrl: string) {
  const logs: Log[] = [
    {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Test endpoint executed",
      action: "request_received",
      stage: "worker",
      requestId: crypto.randomUUID()
    }
  ];

  const stream: AsyncIterable<Log> = {
    async *[Symbol.asyncIterator]() {
      for (const log of logs) {
        yield log;
      }
    }
  };

  return {
    start: () => Effect.succeed(stream),
    stop: () => Effect.void
  };
}

function createObserveResourceFromBackend(backend: any) {
  return {
    start() {
      return backend.start();
    },
    stop() {
      return backend.stop();
    },
    query(filter: any) {
      return Effect.acquireUseRelease(
        backend.start(),
        (stream: any) => Effect.succeed([]),
        () => backend.stop().catch(() => {})
      ) as Effect.Effect<Log[], never, never>;
    }
  };
}

export const POST = async ({ platform, request, url }: RequestEvent) => {
  try {
    const baseUrl = url.origin;
    const testUrl = `${baseUrl}/api/test`;

    const backend = await createHttpLogBackend(testUrl);
    const observeResource = createObserveResourceFromBackend(backend);
    
    const gate = {
      name: "demo-gate",
      observe: observeResource,
      act: [
        Act.wait(500)
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
