export interface TocEntry {
	id: string;
	text: string;
	level: number;
}

export interface RenderResult {
	html: string;
	toc: TocEntry[];
}
