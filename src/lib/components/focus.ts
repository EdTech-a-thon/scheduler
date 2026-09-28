/** Focus an element once it's on screen; the `autofocus` attribute only works on page load. */
export function focusOnMount(node: HTMLElement) {
	requestAnimationFrame(() => node.focus());
}
