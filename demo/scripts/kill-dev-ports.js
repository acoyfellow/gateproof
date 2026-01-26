import { execSync } from "node:child_process";

const ports = [5173, 1337];

function hasLsof() {
  try {
    execSync("command -v lsof", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function pidsForPort(port) {
  try {
    const output = execSync(`lsof -ti tcp:${port}`, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (!output) return [];
    return output.split(/\s+/).filter(Boolean);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasLsof()) {
  console.error("lsof not found; cannot enforce dev port cleanup.");
  process.exit(1);
}

const killed = new Set();

for (const port of ports) {
  const pids = pidsForPort(port);
  if (pids.length === 0) continue;
  for (const pid of pids) {
    if (killed.has(pid)) continue;
    if (killPid(pid)) killed.add(pid);
  }
}

if (killed.size > 0) {
  console.log(`🔪 Killed processes on ports ${ports.join(", ")}`);
}

const stillInUse = ports.filter((port) => pidsForPort(port).length > 0);
if (stillInUse.length > 0) {
  console.error(
    `Ports still in use after cleanup: ${stillInUse.join(", ")}. Cannot start dev.`
  );
  process.exit(1);
}
