const motionAllowed = (): boolean =>
	typeof IntersectionObserver !== 'undefined' &&
	!window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function reveal(node: HTMLElement): { destroy: () => void } {
	if (!motionAllowed()) {
		return { destroy: () => {} };
	}
	node.classList.add('gp-reveal');
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				node.classList.add('gp-visible');
				observer.disconnect();
			}
		},
		{ threshold: 0.15 }
	);
	observer.observe(node);
	return { destroy: () => observer.disconnect() };
}
