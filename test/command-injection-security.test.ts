import { test, expect } from "bun:test";
import { validateCommand } from "../src/validation";
import { Effect } from "effect";

test("validateCommand: blocks shell metacharacters", async () => {
  const dangerous = [
    "ls; rm -rf /",
    "echo $HOME",
    "cat file | grep test",
    "cmd && other",
    "test || fail",
    "test `backtick`",
    "test $(command)",
    "test ${VAR}",
    "test $VAR",
    "test (grouped)",
    "test {braced}",
    "test [bracketed]",
    "test <redirected",
    "test >redirected",
    "test 'quoted'",
    'test "double"',
    "test\nnewline",
    "test\ttab"
  ];

  for (const cmd of dangerous) {
    const result = await Effect.runPromise(
      validateCommand(cmd).pipe(Effect.either)
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("GateError");
    }
  }
});

test("validateCommand: allows safe commands", async () => {
  const safe = [
    "echo hello",
    "ls -la",
    "npm install",
    "bun test",
    "git status"
  ];

  for (const cmd of safe) {
    const result = await Effect.runPromise(
      validateCommand(cmd).pipe(Effect.either)
    );

    expect(result._tag).toBe("Right");
  }
});
