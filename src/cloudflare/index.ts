import type { Provider } from "../provider";
import type { ObserveConfig } from "../types";
import type { ObserveResource } from "../observe";
import { createObserveResource } from "../observe";
import { createAnalyticsBackend } from "./analytics";
import { createWorkersLogsBackend } from "./workers-logs";
import { createCliStreamBackend } from "./cli-stream";
export interface CloudflareProviderConfig {
  accountId: string;
  apiToken: string;
}

export function CloudflareProvider(
  config: CloudflareProviderConfig
): Provider {
  const apiTokenValue = config.apiToken;

  return {
    observe(observeConfig: ObserveConfig): ObserveResource {
      const dataset = observeConfig.dataset as string | undefined;
      const pollInterval = observeConfig.pollInterval as number | undefined;
      const workerName = observeConfig.workerName as string | undefined;

      if (observeConfig.backend === "analytics") {
        const backend = createAnalyticsBackend({
          accountId: config.accountId,
          apiToken: apiTokenValue,
          dataset: dataset || "worker_logs",
          pollInterval
        });
        return createObserveResource(backend);
      }

      if (observeConfig.backend === "workers-logs") {
        if (!workerName) {
          throw new Error("workerName required for workers-logs backend");
        }
        const backend = createWorkersLogsBackend({
          accountId: config.accountId,
          apiToken: apiTokenValue,
          workerName,
          pollInterval
        });
        return createObserveResource(backend);
      }

      if (observeConfig.backend === "cli-stream") {
        const backend = createCliStreamBackend({
          accountId: config.accountId,
          workerName
        });
        return createObserveResource(backend);
      }

      throw new Error(`Unknown backend: ${observeConfig.backend}`);
    },

  };
}
