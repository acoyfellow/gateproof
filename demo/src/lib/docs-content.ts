import scope from "../../../plan";
import { renderDocsContent } from "../../../scripts/render-scope";

export const docsContent: Record<string, string> = renderDocsContent(scope);
