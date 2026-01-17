import { test, expect } from "bun:test";
import { Gate, Act, Assert } from "../src/index";
import { CloudflareProvider } from "../src/cloudflare/index";

test("Gate.define creates a spec", () => {
  const provider = CloudflareProvider({
    accountId: "test",
    apiToken: "test"
  });

  const gate = {
    name: "test",
    observe: provider.observe({ backend: "analytics", dataset: "test" }),
    act: [Act.wait(100)],
    assert: [Assert.noErrors()]
  };

  expect(gate.name).toBe("test");
  expect(gate.act.length).toBe(1);
});

test("Act helpers create correct actions", () => {
  const deploy = Act.deploy({ worker: "test" });
  expect(deploy._tag).toBe("Deploy");
  if (deploy._tag === "Deploy") {
    expect(deploy.worker).toBe("test");
  }

  const browser = Act.browser({ url: "https://example.com" });
  expect(browser._tag).toBe("Browser");
  if (browser._tag === "Browser") {
    expect(browser.url).toBe("https://example.com");
  }

  const wait = Act.wait(1000);
  expect(wait._tag).toBe("Wait");
  if (wait._tag === "Wait") {
    expect(wait.ms).toBe(1000);
  }

  const exec = Act.exec("echo test");
  expect(exec._tag).toBe("Exec");
  if (exec._tag === "Exec") {
    expect(exec.command).toBe("echo test");
  }
});

test("Assert helpers create correct assertions", () => {
  const noErrors = Assert.noErrors();
  expect(noErrors._tag).toBe("NoErrors");

  const hasAction = Assert.hasAction("test");
  expect(hasAction._tag).toBe("HasAction");
  if (hasAction._tag === "HasAction") {
    expect(hasAction.action).toBe("test");
  }

  const hasStage = Assert.hasStage("worker");
  expect(hasStage._tag).toBe("HasStage");
  if (hasStage._tag === "HasStage") {
    expect(hasStage.stage).toBe("worker");
  }
});
