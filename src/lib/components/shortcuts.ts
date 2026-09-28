const NOT_TEXT = new Set([
	'checkbox',
	'radio',
	'button',
	'submit',
	'reset',
	'range',
	'color',
	'file'
]);

/**
 * True when a key press belongs to a text field (which has its own undo) rather
 * than an app shortcut. A focused checkbox or button doesn't count.
 */
export function isTyping(e: KeyboardEvent): boolean {
	const el = e.target as HTMLElement | null;
	if (!el) return false;
	if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
	if (el.tagName === 'INPUT') return !NOT_TEXT.has((el as HTMLInputElement).type);
	return false;
}

/** App-wide ⌘Z / ⇧⌘Z (Ctrl on Windows), outside text fields. */
export function handleUndoKeys(e: KeyboardEvent, undo: () => void, redo: () => void) {
	if (isTyping(e)) return;
	if (isRedo(e)) redo();
	else if (isUndo(e)) undo();
	else return;
	e.preventDefault();
}

export function isUndo(e: KeyboardEvent) {
	return (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
}

export function isRedo(e: KeyboardEvent) {
	return (
		(e.metaKey || e.ctrlKey) &&
		((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y')
	);
}

interface GridKeys {
	setTool: (tool: 'select' | 'draw' | 'add' | 'erase') => void;
	deleteSelected: () => void;
	deselect: () => void;
	selectAll: () => void;
}

/** Keyboard shortcuts shared by every screen with an editable TimeGrid. Undo is app-wide. */
export function handleGridKeys(e: KeyboardEvent, keys: GridKeys) {
	if (isTyping(e)) return;
	if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') keys.selectAll();
	else if (e.metaKey || e.ctrlKey || e.altKey) return;
	else if (e.key === 'Backspace' || e.key === 'Delete') keys.deleteSelected();
	else if (e.key === 'Escape') keys.deselect();
	else if (e.key === 'v') keys.setTool('select');
	else if (e.key === 'd') keys.setTool('draw');
	else if (e.key === 'a') keys.setTool('add');
	else if (e.key === 'e') keys.setTool('erase');
	else return;
	e.preventDefault();
}
