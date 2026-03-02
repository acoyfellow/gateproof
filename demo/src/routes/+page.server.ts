import type { PageServerLoad } from "./$types";
import scope from "../../../plan";
import { getFrontdoorContent, type FrontdoorContent } from "../../../scripts/render-scope";

export const load: PageServerLoad<FrontdoorContent> = async () => {
  return getFrontdoorContent(scope);
};
