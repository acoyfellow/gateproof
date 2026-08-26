import { describe, expect, test } from "bun:test";
import { checkTitleGrammar } from "../scripts/check-gate-hygiene";

describe("checkTitleGrammar", () => {
  test("accepts a title with em-dash separators and both clauses", () => {
    const result = checkTitleGrammar(
      "User can log in \u2014 evidence: session_created \u2014 scope: src/auth/**",
    );
    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test("accepts a title with ASCII double-hyphen separators", () => {
    const result = checkTitleGrammar(
      "User can log in -- evidence: session_created -- scope: src/auth/**",
    );
    expect(result.ok).toBe(true);
  });

  test("tolerates extra whitespace around separators and clauses", () => {
    const result = checkTitleGrammar(
      "   User can log in   \u2014   evidence:   session_created   \u2014   scope:   src/auth/**   ",
    );
    expect(result.ok).toBe(true);
  });

  test("warns when both evidence: and scope: clauses are missing", () => {
    const result = checkTitleGrammar("GET / returns hello world");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing evidence: and scope: clauses");
  });

  test("warns when the scope: clause is missing", () => {
    const result = checkTitleGrammar("User signup works \u2014 evidence: signup_done");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing scope: clause");
  });

  test("warns when the evidence: clause is missing", () => {
    const result = checkTitleGrammar("User signup works \u2014 scope: src/signup/**");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing evidence: clause");
  });

  test("warns on an empty / whitespace-only title", () => {
    const result = checkTitleGrammar("   ");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("empty title");
  });

  test("does not try to detect vagueness (evidence+scope present = pass)", () => {
    const result = checkTitleGrammar(
      "Improve performance \u2014 evidence: faster \u2014 scope: src/",
    );
    expect(result.ok).toBe(true);
  });
});
