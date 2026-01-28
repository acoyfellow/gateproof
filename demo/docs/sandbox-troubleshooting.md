# Sandbox troubleshooting

## Findings (Jan 27, 2026)

- The SSE monitor loop treated `process.getStatus()` as an object, so it never observed terminal status and waited until the 180s deadline. This produced timeouts even when the process completed successfully.
- Sandbox provisioning calls can fail transiently during container spin-up. The errors surfaced as `SandboxError HTTP error` without actionable context.
- SSE responses had no keepalive, so idle runs were vulnerable to proxy timeouts when log output was sparse.

## Corrective steps applied

- Fix monitor status handling to treat `process.getStatus()` as a string and emit `complete` immediately on terminal states.
- Add SSE keepalive pings every ~25s to prevent idle connection drops.
- Add bounded retry + richer error summaries for `mkdir`, `startProcess`, and log streaming to surface provisioning failures and reduce flakiness.
- Increase the Cloudflare sandbox container `instanceType` from `lite` to `standard-3` so the Docker instance has more RAM/CPU during provisioning and execution, making transient memory-related 500s less likely.
- Wait for a lightweight sandbox readiness check (`listFiles`/pending) before mutating `/workspace`, giving Cloudflare a moment to finish provisioning before the first `mkdir`.
- Retry `mkdir` aggressively (many attempts with backoff) even after readiness checks in case the container still returns HTTP 500 during the provisioning window.

## Next checks to run

- Hit `/api/prd/run/diagnose` and confirm the response includes debug detail (status, code) when errors occur.
- Run `/api/prd/run` with a short PRD and verify the SSE emits `complete` well before the 180s timeout.
- If `SandboxError HTTP error` persists, capture `requestId` + sandboxId and compare against Cloudflare container/DO logs for provisioning limits.
