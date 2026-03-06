import type { PageServerLoad } from "./$types";
import { homepageContent, type HomepageContent } from "$lib/homepage-content";

export const load: PageServerLoad<HomepageContent> = async () => homepageContent;
