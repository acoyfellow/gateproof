import { validateSavedProof } from "./finalize-turn-lib";
import { runQualityCheck } from "./run-quality-check";

const defaultCommitMessage = "chore(turn): finalize agent turn";

async function runGit(command: string[]): Promise<void> {
  const subprocess = Bun.spawn(command, {
    cwd: process.cwd(),
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await subprocess.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed: ${command.join(" ")}`);
  }
}

async function getGitOutput(command: string[]): Promise<string> {
  const subprocess = Bun.spawn(command, {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await subprocess.exited;
  const stdout = await new Response(subprocess.stdout).text();
  const stderr = await new Response(subprocess.stderr).text();

  if (exitCode !== 0) {
    const detail = stderr.trim() || stdout.trim();
    throw new Error(detail || `Command failed: ${command.join(" ")}`);
  }

  return stdout.trim();
}

function parseArgs(argv: string[]) {
  const push = argv.includes("--push");
  const messageArg = argv.find((arg) => arg.startsWith("--message="));
  const commitMessage = messageArg
    ? messageArg.slice("--message=".length).trim() || defaultCommitMessage
    : defaultCommitMessage;

  return {
    push,
    commitMessage,
  };
}

export async function finalizeTurn(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);

  await runQualityCheck();
  await validateSavedProof(process.cwd());

  const hadChanges = (await getGitOutput(["git", "status", "--short"])) !== "";

  await runGit(["git", "add", "-A"]);
  await runGit(["git", "commit", "--allow-empty", "-m", options.commitMessage]);

  if (options.push) {
    await runGit(["git", "push"]);
  }

  const remainingChanges = await getGitOutput(["git", "status", "--short"]);
  if (remainingChanges !== "") {
    throw new Error("Working tree is not clean after turn finalization");
  }

  console.log(
    hadChanges
      ? "turn:finalize completed with a commit"
      : "turn:finalize completed with an empty commit",
  );
}

if (import.meta.main) {
  await finalizeTurn();
}
