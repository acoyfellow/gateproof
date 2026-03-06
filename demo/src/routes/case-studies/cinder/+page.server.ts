import type { PageServerLoad } from "./$types";
import {
  getCinderCaseStudyContent,
  type CinderCaseStudyContent,
} from '$scripts/render-scope';

export const prerender = true;

export const load: PageServerLoad<CinderCaseStudyContent> = async () => {
  return getCinderCaseStudyContent();
};
