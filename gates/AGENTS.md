# Gates

**Find all gates:** `find gates -name "*.gate.ts"`

**Run a gate:** `bun run gates/<path>.gate.ts`

**Run all gates:** `bun run gate:all`

Each gate file has a header comment explaining its purpose. Read the gate file directly.

Gate assertions receive observed logs. Check `logs.find(l => l.stage === "http")` for HTTP observation data.
