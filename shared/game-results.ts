export type MedalTier = "gold" | "silver" | "bronze";

export type WinnerMessageRecord = {
	medal: MedalTier;
	sportKey: string | null;
	order: number;
	title: string;
	body: string;
};

export type RankedParticipant = {
	participantId: string;
	nickname: string;
	uuid: string | null;
	joinedAt: number;
	submittedAt: number | null;
};

export type RankedQuestion = {
	questionId: string;
	pointValue: number;
	correctOptionIndex: number | null;
};

export type RankedPrediction = {
	participantId: string;
	questionId: string;
	selectedOptionIndex: number;
};

export type RankedRow = RankedParticipant & {
	rank: number;
	score: number;
	correctCount: number;
	totalAnswered: number;
	accuracy: number | null;
	medal: MedalTier | null;
};

export const MEDAL_TIERS: MedalTier[] = ["gold", "silver", "bronze"];

export function normalizeComparableValue(value: string) {
	return value.trim().toLowerCase();
}

export function validateNicknameInput(nickname: string) {
	const trimmed = nickname.trim();
	if (!trimmed) {
		throw new Error("Nickname is required.");
	}

	if (trimmed.length < 2 || trimmed.length > 20) {
		throw new Error("Nickname must be between 2 and 20 characters.");
	}

	return trimmed;
}

export function validateOptionalUsernameInput(
	username: string | undefined,
	nickname: string,
) {
	const trimmed = username ? username.trim() : "";
	if (!trimmed) {
		return { username: undefined, usernameLower: undefined };
	}

	if (trimmed.length < 3 || trimmed.length > 20) {
		throw new Error("Username must be between 3 and 20 characters.");
	}

	if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
		throw new Error(
			"Username can only use letters, numbers, dots, dashes, and underscores.",
		);
	}

	const usernameLower = normalizeComparableValue(trimmed);
	if (usernameLower === normalizeComparableValue(nickname)) {
		throw new Error("Username and nickname must be different.");
	}

	return { username: trimmed, usernameLower };
}

export function normalizeSportKey(sport: string) {
	const normalized = normalizeComparableValue(sport);

	if (!normalized) {
		return null;
	}

	if (normalized.includes("football") || normalized.includes("soccer")) {
		return "football";
	}

	if (normalized.includes("cricket")) {
		return "cricket";
	}

	if (normalized.includes("basketball")) {
		return "basketball";
	}

	if (normalized.includes("formula") || normalized.includes("f1")) {
		return "f1";
	}

	return normalized;
}

export function hashStableValue(value: string) {
	let hash = 0;

	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
	}

	return hash;
}

export function pickWinnerMessage(
	messages: WinnerMessageRecord[],
	{
		medal,
		sport,
		seed,
	}: {
		medal: MedalTier;
		sport: string;
		seed: string;
	},
) {
	const sportKey = normalizeSportKey(sport);
	const scopedMessages = messages.filter(
		(message) =>
			message.medal === medal &&
			(sportKey ? message.sportKey === sportKey : false),
	);
	const fallbackMessages = messages.filter(
		(message) => message.medal === medal && message.sportKey === null,
	);
	const pool = scopedMessages.length > 0 ? scopedMessages : fallbackMessages;

	if (pool.length === 0) {
		return null;
	}

	const orderedPool = [...pool].sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}

		return left.title.localeCompare(right.title);
	});

	return orderedPool[hashStableValue(seed) % orderedPool.length];
}

export function buildLeaderboardRows({
	participants,
	questions,
	predictions,
	winnerParticipantIds,
}: {
	participants: RankedParticipant[];
	questions: RankedQuestion[];
	predictions: RankedPrediction[];
	winnerParticipantIds?: string[] | null;
}) {
	const questionMap = new Map(
		questions.map((question) => [question.questionId, question]),
	);
	const predictionGroups = new Map<string, RankedPrediction[]>();

	for (const prediction of predictions) {
		const participantPredictions =
			predictionGroups.get(prediction.participantId) ?? [];
		participantPredictions.push(prediction);
		predictionGroups.set(prediction.participantId, participantPredictions);
	}

	const rows = participants
		.map((participant) => {
			const participantPredictions =
				predictionGroups.get(participant.participantId) ?? [];
			let score = 0;
			let correctCount = 0;

			for (const prediction of participantPredictions) {
				const question = questionMap.get(prediction.questionId);
				if (!question || question.correctOptionIndex === null) {
					continue;
				}

				if (prediction.selectedOptionIndex === question.correctOptionIndex) {
					score += question.pointValue;
					correctCount += 1;
				}
			}

			return {
				...participant,
				score,
				correctCount,
				totalAnswered: participantPredictions.length,
				accuracy:
					participantPredictions.length > 0
						? correctCount / participantPredictions.length
						: null,
			};
		})
		.sort((left, right) => {
			if (right.score !== left.score) {
				return right.score - left.score;
			}

			if (right.correctCount !== left.correctCount) {
				return right.correctCount - left.correctCount;
			}

			const leftSubmittedAt = left.submittedAt ?? Number.MAX_SAFE_INTEGER;
			const rightSubmittedAt = right.submittedAt ?? Number.MAX_SAFE_INTEGER;
			if (leftSubmittedAt !== rightSubmittedAt) {
				return leftSubmittedAt - rightSubmittedAt;
			}

			if (left.nickname !== right.nickname) {
				return left.nickname.localeCompare(right.nickname);
			}

			if (left.joinedAt !== right.joinedAt) {
				return left.joinedAt - right.joinedAt;
			}

			return left.participantId.localeCompare(right.participantId);
		});

	const medalAssignments = new Map<string, MedalTier>();
	const winnerIds =
		winnerParticipantIds && winnerParticipantIds.length > 0
			? winnerParticipantIds
			: rows.slice(0, MEDAL_TIERS.length).map((row) => row.participantId);

	winnerIds.slice(0, MEDAL_TIERS.length).forEach((participantId, index) => {
		const medal = MEDAL_TIERS[index];
		if (medal) {
			medalAssignments.set(participantId, medal);
		}
	});

	return rows.map((row, index) => ({
		...row,
		rank: index + 1,
		medal: medalAssignments.get(row.participantId) ?? null,
	}));
}
