import {
  getDualityContent,
  getHelloWorldSnippet,
  getPatternsContent,
  type DualityContent,
  type PatternContent,
} from '$scripts/render-scope';

export const patternsContent: ReadonlyArray<PatternContent> = getPatternsContent();
export const dualityContent: DualityContent = getDualityContent();
export const defaultPlanTemplate: string = getHelloWorldSnippet();
