import type { ObserveResource } from "./observe";
import type { ObserveConfig } from "./types";

export interface Provider {
  observe(config: ObserveConfig): ObserveResource;
}
