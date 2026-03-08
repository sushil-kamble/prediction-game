export type ChallengeStatus = "draft" | "open" | "scoring" | "closed";

export const SPORT_SUGGESTIONS = [
	"Cricket",
	"Football",
	"F1",
	"Basketball",
	"Other",
] as const;

const STATUS_LABELS: Record<ChallengeStatus, string> = {
	draft: "Draft",
	open: "Open",
	scoring: "Live",
	closed: "Closed",
};

const SPORT_EMOJIS: Array<[string, string]> = [
	["cricket", "🏏"],
	["football", "⚽"],
	["soccer", "⚽"],
	["basketball", "🏀"],
	["f1", "🏎️"],
	["formula", "🏎️"],
	["tennis", "🎾"],
	["golf", "⛳"],
];

export function getStatusLabel(status: ChallengeStatus) {
	return STATUS_LABELS[status];
}

export function getSportEmoji(sport: string) {
	const normalized = sport.trim().toLowerCase();
	return (
		SPORT_EMOJIS.find(([needle]) => normalized.includes(needle))?.[1] ?? "🔥"
	);
}

export function buildChallengeUrl(origin: string, challengeId: string) {
	return `${origin}/prediction/c/${challengeId}`;
}

export function buildLeaderboardUrl(origin: string, challengeId: string) {
	return `${origin}/prediction/c/${challengeId}/leaderboard`;
}

export function answeredCorrectCount(
	questions: Array<{ correctOptionIndex?: number | null }>
) {
	return questions.filter((question) => question.correctOptionIndex !== null)
		.length;
}

export function clampOptionCount(options: string[]) {
	return options.slice(0, 5);
}

/** Map a zero-based option index to a letter label: 0 → "A", 1 → "B", … */
export function optionLabel(index: number) {
	return String.fromCharCode(65 + index);
}

export function formatSportDescription(sport: string) {
	return `${sport} Prediction Challenge`;
}
