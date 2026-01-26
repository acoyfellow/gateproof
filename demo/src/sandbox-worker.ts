import { Sandbox } from "@cloudflare/sandbox";

export { Sandbox };

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
