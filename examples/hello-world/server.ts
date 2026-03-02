const DEFAULT_PORT = Number(process.env.HELLO_WORLD_PORT ?? "3210");

export const HELLO_WORLD_PORT = Number.isFinite(DEFAULT_PORT) ? DEFAULT_PORT : 3210;

export function startHelloWorldServer(port = HELLO_WORLD_PORT): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    port,
    hostname: "127.0.0.1",
    fetch() {
      return new Response("hello world", { status: 200 });
    },
  });
}

if (import.meta.main) {
  const server = startHelloWorldServer();
  console.log(`hello-world server listening on http://127.0.0.1:${server.port}/`);
}
