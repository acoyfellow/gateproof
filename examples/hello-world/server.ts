import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_PORT = Number(process.env.HELLO_WORLD_PORT ?? "3210");

export const HELLO_WORLD_PORT = Number.isFinite(DEFAULT_PORT) ? DEFAULT_PORT : 3210;
export const HELLO_WORLD_RESPONSE_PATH = resolve(import.meta.dir, "response.txt");

const readResponseBody = (): string => {
  try {
    const body = readFileSync(HELLO_WORLD_RESPONSE_PATH, "utf8").trimEnd();
    return body.length > 0 ? body : "hello world";
  } catch {
    return "hello world";
  }
};

export function startHelloWorldServer(port = HELLO_WORLD_PORT): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    port,
    hostname: "127.0.0.1",
    fetch() {
      return new Response(readResponseBody(), { status: 200 });
    },
  });
}

if (import.meta.main) {
  const server = startHelloWorldServer();
  console.log(`hello-world server listening on http://127.0.0.1:${server.port}/`);
}
