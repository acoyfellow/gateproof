import type { PageServerLoad } from "./$types";
import {
  getCaseStudiesList,
  type CaseStudyEntry,
} from '$scripts/render-scope';

export const prerender = true;

export const load: PageServerLoad<{ caseStudies: CaseStudyEntry[] }> =
  async () => {
    return { caseStudies: [...getCaseStudiesList()] };
  };
