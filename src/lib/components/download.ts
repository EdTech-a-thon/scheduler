export function downloadText(filename: string, text: string, type: string) {
	const blob = new Blob([text], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, value: unknown) {
	downloadText(filename, JSON.stringify(value, null, '\t') + '\n', 'application/json');
}
