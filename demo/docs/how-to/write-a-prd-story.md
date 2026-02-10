# How to Write a PRD Story

Goal: define a single story that points to a gate and encodes intent.

## Story shape

```ts
{
  id: "user-signup",
  title: "User can sign up — evidence: user_created — scope: src/routes/**",
  gateFile: "./gates/user-signup.gate.ts",
  dependsOn: [],
  scope: {
    allowedPaths: ["src/routes/**", "src/lib/**"],
    maxChangedFiles: 5,
    maxChangedLines: 200,
  },
  progress: ["signup_page_live", "user_created"],
}
```

## Tips

- Encode behavior + evidence + scope in the title
- Keep IDs literal and stable
- Use `dependsOn` only when required

## Full PRD example

```ts
import { definePrd } from "gateproof/prd";

export const prd = definePrd({
  stories: [
    {
      id: "user-signup",
      title: "User can sign up — evidence: user_created — scope: src/routes/**",
      gateFile: "./gates/user-signup.gate.ts",
      progress: ["signup_page_live", "user_created"],
    },
  ] as const,
});
```

## Related

- Reference: `docs/reference/prd-runner.md`
