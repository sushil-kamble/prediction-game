export type ChallengeStatus = "draft" | "open" | "scoring" | "closed";

export type AdminWorkflowStepKey =
	| "questions"
	| "publish"
	| "collect"
	| "lock"
	| "score"
	| "announce";

export type AdminWorkflowStepState = "complete" | "current" | "upcoming";

export type AdminWorkflowAction =
	| "focus-questions"
	| "publish"
	| "lock-predictions"
	| "focus-scoring"
	| "announce-winners"
	| null;

export type AdminWorkflowStep = {
	key: AdminWorkflowStepKey;
	label: string;
	description: string;
	state: AdminWorkflowStepState;
};

export type AdminWorkflowModel = {
	eyebrow: string;
	title: string;
	description: string;
	primaryAction: {
		type: AdminWorkflowAction;
		label: string;
		disabled?: boolean;
	} | null;
	steps: AdminWorkflowStep[];
};

export type PlayerChallengeBlocker = {
	title: string;
	description: string;
} | null;

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

const ADMIN_WORKFLOW_STEPS: Array<{
	key: AdminWorkflowStepKey;
	label: string;
	description: string;
}> = [
	{
		key: "questions",
		label: "Add questions",
		description: "Build the question set for this challenge.",
	},
	{
		key: "publish",
		label: "Publish challenge",
		description: "Freeze the question set and open the challenge link.",
	},
	{
		key: "collect",
		label: "Collect predictions",
		description: "Let players join and submit their picks.",
	},
	{
		key: "lock",
		label: "Lock submissions",
		description: "Stop new joins and submissions when the event starts.",
	},
	{
		key: "score",
		label: "Mark answers",
		description: "Score every question once submissions are locked.",
	},
	{
		key: "announce",
		label: "Announce winners",
		description: "Finalize results after every answer is marked.",
	},
];

export function getAdminWorkflow({
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
}): AdminWorkflowModel {
	const allScored = totalQuestions > 0 && scoredCount === totalQuestions;
	let currentStep: AdminWorkflowStepKey = "questions";
	let eyebrow = "Next step";
	let title = "Add your first question";
	let description =
		"Start by building the question set. Publishing stays unavailable until at least one question exists.";
	let primaryAction: AdminWorkflowModel["primaryAction"] = {
		type: "focus-questions",
		label: "Add question",
	};

	if (winnersAnnounced) {
		currentStep = "announce";
		eyebrow = "Challenge complete";
		title = "Winners are announced";
		description =
			"The challenge is locked and the final results experience is live for players.";
		primaryAction = null;
	} else if (status === "closed") {
		currentStep = "announce";
		eyebrow = "Challenge closed";
		title = "This challenge is locked";
		description =
			"The challenge is closed. Review the final state from the cards below.";
		primaryAction = null;
	} else if (questionCount === 0) {
		currentStep = "questions";
	} else if (status === "draft") {
		currentStep = "publish";
		eyebrow = "Ready to go live";
		title = "Publish the challenge";
		description =
			"Publishing freezes the current question set and opens the player link for submissions.";
		primaryAction = {
			type: "publish",
			label: "Publish challenge",
		};
	} else if (!questionsPublished) {
		currentStep = "publish";
		eyebrow = "Questions unlocked";
		title = "Republish the question set";
		description =
			"Questions are editable again. Publish to freeze this version before players continue or scoring resumes.";
		primaryAction = {
			type: "publish",
			label: "Publish questions",
		};
	} else if (status === "open") {
		currentStep = "collect";
		eyebrow = "Challenge live";
		title = "Collect predictions";
		description =
			"Players can submit right now. When the event starts, lock submissions before scoring answers.";
		primaryAction = {
			type: "lock-predictions",
			label: "Lock submissions",
		};
	} else if (!allScored) {
		currentStep = "score";
		eyebrow = "Scoring";
		title = "Mark the correct answers";
		description = `Submissions are locked. Score each question to move toward final results. ${scoredCount}/${totalQuestions} marked.`;
		primaryAction = {
			type: "focus-scoring",
			label: "Mark answers",
		};
	} else {
		currentStep = "announce";
		eyebrow = hasSubmissions ? "Final step" : "Waiting";
		title = hasSubmissions ? "Announce the winners" : "Waiting for submissions";
		description = hasSubmissions
			? "Every question is scored and at least one player submitted picks. You can now finalize the challenge."
			: "All questions are scored, but at least one submitted player is still required before winners can be announced.";
		primaryAction = {
			type: "announce-winners",
			label: "Announce winners",
			disabled: !hasSubmissions,
		};
	}

	const currentIndex = ADMIN_WORKFLOW_STEPS.findIndex(
		(step) => step.key === currentStep
	);
	const steps = ADMIN_WORKFLOW_STEPS.map((step, index) => ({
		...step,
		state:
			winnersAnnounced || (status === "closed" && index <= currentIndex)
				? "complete"
				: index < currentIndex
					? "complete"
					: index === currentIndex
						? "current"
						: "upcoming",
	})) satisfies AdminWorkflowStep[];

	return {
		eyebrow,
		title,
		description,
		primaryAction,
		steps,
	};
}

export function getPlayerChallengeBlocker({
	status,
	questionEditUnlocked,
}: {
	status: ChallengeStatus;
	questionEditUnlocked: boolean;
}): PlayerChallengeBlocker {
	if (status === "draft") {
		return {
			title: "This challenge isn't open yet",
			description: "Check back soon once the admin publishes the board.",
		};
	}

	if (questionEditUnlocked) {
		return {
			title: "Questions are unpublished",
			description:
				"The admin is updating this challenge right now. Please check back once the questions are republished.",
		};
	}

	return null;
}

export function getRuntimeCopy({
	status,
	isQuestionEditUnlocked,
	questionCount,
	allQuestionsScored,
	winnersAnnouncedAt,
	formatTs,
}: {
	status: ChallengeStatus;
	isQuestionEditUnlocked: boolean;
	questionCount: number;
	allQuestionsScored: boolean;
	winnersAnnouncedAt: number | null | undefined;
	formatTs: (timestamp: number) => string;
}): { title: string; description: string } {
	if (status === "draft") {
		return {
			title: "Publishing will freeze the question set",
			description:
				questionCount === 0
					? "Add at least one question before publishing. Once published, the current question set is frozen for players."
					: "The current question set is ready. Publishing will open the player link and freeze these questions for prediction.",
		};
	}

	if (status === "open" && isQuestionEditUnlocked) {
		return {
			title: "Questions are unpublished",
			description:
				"Players cannot view or answer these questions right now. Republish when the updated question set is ready to go live again.",
		};
	}

	if (status === "open") {
		return {
			title: "The challenge is live",
			description:
				"Players can join and submit predictions. Answer marking stays hidden until you lock submissions.",
		};
	}

	if (status === "scoring") {
		return {
			title: "Submissions are locked",
			description: allQuestionsScored
				? "Every question is scored. If players submitted picks, you can finish by announcing winners."
				: "No new submissions are allowed. Mark each answer below to complete the board.",
		};
	}

	return {
		title: "The challenge is finalized",
		description: winnersAnnouncedAt
			? `Winners were announced on ${formatTs(winnersAnnouncedAt)}.`
			: "This challenge is closed.",
	};
}

export function canUnpublishChallengeQuestions({
	status,
	submittedCount,
	questionEditUnlocked,
}: {
	status: ChallengeStatus;
	submittedCount: number;
	questionEditUnlocked: boolean;
}) {
	return status === "open" && submittedCount === 0 && !questionEditUnlocked;
}

export function toggleCorrectOptionIndex(
	currentOptionIndex: number | null,
	nextOptionIndex: number
) {
	return currentOptionIndex === nextOptionIndex ? null : nextOptionIndex;
}
