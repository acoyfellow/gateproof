import { test, expect } from "bun:test";
import { createHttpObserveResource } from "../src/http-backend";
import { Effect } from "effect";

test("HTTP backend: multiple instances have independent state", async () => {
  const instance1 = createHttpObserveResource({ url: "http://example.com" });
  const instance2 = createHttpObserveResource({ url: "http://example.com" });

  const stream1 = await Effect.runPromise(instance1.start());
  const stream2 = await Effect.runPromise(instance2.start());

  // Both should be independent streams
  expect(stream1).toBeDefined();
  expect(stream2).toBeDefined();
  expect(stream1).not.toBe(stream2);

  await Effect.runPromise(instance1.stop());
  await Effect.runPromise(instance2.stop());
});

test("HTTP backend: query returns empty array (forward-only limitation)", async () => {
  const instance = createHttpObserveResource({ url: "http://example.com" });

  const result = await Effect.runPromise(
    instance.query({ stage: "http" })
  );

  expect(result).toEqual([]);
});

test("HTTP backend: response size limit enforced", async () => {
  // Mock fetch to return large Content-Length
  const originalFetch = global.fetch;
  global.fetch = (async () => {
    return new Response("x".repeat(11 * 1024 * 1024), {
      headers: { "content-length": String(11 * 1024 * 1024) }
    });
  }) as unknown as typeof fetch;

  const instance = createHttpObserveResource({
    url: "http://example.com",
    maxResponseSizeBytes: 10 * 1024 * 1024
  });

  const stream = await Effect.runPromise(instance.start());

  // Wait a bit for polling
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Collect logs
  const logs: any[] = [];
  for await (const log of stream) {
    logs.push(log);
    if (logs.length > 0) break;
  }

  await Effect.runPromise(instance.stop());

  // Should have error log about size limit
  expect(logs.length).toBeGreaterThan(0);
  const errorLog = logs.find((l) => l.error?.tag === "HttpResponseTooLarge");
  expect(errorLog).toBeDefined();

  global.fetch = originalFetch;
});
