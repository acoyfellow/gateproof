import type { PageServerLoad } from "./$types";
import { getHomepageContent, type HomepageContent } from "../../../scripts/render-scope";

export const load: PageServerLoad<HomepageContent> = async () => {
  return getHomepageContent();
};
