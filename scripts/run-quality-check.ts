type Step = {
  label: string;
  command: string[];
  cwd?: string;
};

async function runStep(step: Step): Promise<void> {
  console.log(`\n==> ${step.label}`);
  const process = Bun.spawn(step.command, {
    cwd: step.cwd,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(`${step.label} failed with exit code ${exitCode}`);
  }
}

export async function runQualityCheck(): Promise<void> {
  const root = process.cwd();
  const demo = `${root}/demo`;

  const steps: Step[] = [
    {
      label: "Plan validate",
      command: ["bun", "run", "plan:validate"],
      cwd: root,
    },
    {
      label: "Gate hygiene",
      command: ["bun", "run", "plan:hygiene"],
      cwd: root,
    },
    {
      label: "Root lint",
      command: ["bun", "run", "lint"],
      cwd: root,
    },
    {
      label: "Root typecheck",
      command: ["bun", "run", "typecheck"],
      cwd: root,
    },
    {
      label: "Root tests",
      command: ["bun", "run", "test"],
      cwd: root,
    },
    {
      label: "Root build",
      command: ["bun", "run", "build"],
      cwd: root,
    },
    {
      label: "Demo lint",
      command: ["bun", "run", "lint"],
      cwd: demo,
    },
    {
      label: "Demo check",
      command: ["bun", "run", "check"],
      cwd: demo,
    },
    {
      label: "Demo build",
      command: ["bun", "run", "build"],
      cwd: demo,
    },
  ];

  for (const step of steps) {
    await runStep(step);
  }
}

if (import.meta.main) {
  await runQualityCheck();
  console.log("\nquality:check passed");
}
