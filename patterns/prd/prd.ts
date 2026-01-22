export type StoryStatus = "pending" | "done";

export type StoryId =
  | "user-signup"
  | "email-verification";

export type Story = {
  id: StoryId;
  title: string;
  gateFile: string;
  dependsOn?: StoryId[];
  status: StoryStatus;
};

export const prd = {
  stories: [
    {
      id: "user-signup",
      title: "User can sign up",
      gateFile: "./gates/user-signup.gate.ts",
      status: "pending"
    },
    {
      id: "email-verification",
      title: "Email verification works",
      gateFile: "./gates/email-verification.gate.ts",
      dependsOn: ["user-signup"],
      status: "pending"
    }
  ] as const satisfies readonly Story[]
};

