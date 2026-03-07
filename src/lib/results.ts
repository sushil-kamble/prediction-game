export function formatAccuracy(accuracy: number | null) {
	if (accuracy === null) {
		return "--";
	}

	return `${Math.round(accuracy * 100)}%`;
}
