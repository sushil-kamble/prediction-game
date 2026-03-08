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

/* ── Admin next-step hints ── */

export function getAdminHint({
	status,
	questionCount,
	questionsPublished,
	scoredCount,
	totalQuestions,
	hasSubmissions,
	winnersAnnounced,
}: {
	status: ChallengeStatus;
	questionCount: number;
	questionsPublished: boolean;
	scoredCount: number;
	totalQuestions: number;
	hasSubmissions: boolean;
	winnersAnnounced: boolean;
}): string {
	if (winnersAnnounced) {
		return "Challenge complete. Winners have been announced and the board is locked.";
	}

	if (status === "closed") {
		return "Challenge is closed.";
	}

	if (status === "draft" && questionCount === 0) {
		return "Add your first question below, then publish to go live.";
	}

	if (status === "draft" && questionCount > 0) {
		return "Questions ready. Hit publish to open the challenge and share the link.";
	}

	// open or scoring
	if (!questionsPublished) {
		return "Questions are unlocked for editing. Publish them to freeze picks and enable answer marking.";
	}

	if (status === "open") {
		return "Challenge is live and accepting predictions. Lock predictions when the match starts to stop new submissions.";
	}

	const allScored = scoredCount === totalQuestions && totalQuestions > 0;

	if (!allScored) {
		return `Predictions locked. Mark the correct answer for each question. ${scoredCount}/${totalQuestions} scored.`;
	}

	if (!hasSubmissions) {
		return "All questions scored. Waiting for at least one player to submit before you can announce winners.";
	}

	return "All questions scored and players have submitted. You can announce winners now.";
}
