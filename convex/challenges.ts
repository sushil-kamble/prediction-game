import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
	buildLeaderboardRows,
	MEDAL_TIERS,
	normalizeComparableValue,
	pickWinnerMessage,
	validateNicknameInput,
	validateOptionalUsernameInput,
} from "../shared/game-results";
import type {
	MedalTier,
	WinnerMessageRecord,
} from "../shared/game-results";

type ReadCtx = QueryCtx | MutationCtx;

const challengeStatus = v.union(
	v.literal("draft"),
	v.literal("open"),
	v.literal("scoring"),
	v.literal("closed"),
);

const predictionInput = v.object({
	questionId: v.string(),
	selectedOptionIndex: v.number(),
});

const DEFAULT_WINNER_MESSAGES: WinnerMessageRecord[] = [
	{
		medal: "gold",
		sportKey: null,
		order: 1,
		title: "You owned the moment.",
		body: "Every call landed with champion energy. This board remembers who set the standard.",
	},
	{
		medal: "gold",
		sportKey: null,
		order: 2,
		title: "First place fits you well.",
		body: "You saw the swing of the game before everyone else and finished on top with room to celebrate.",
	},
	{
		medal: "gold",
		sportKey: "cricket",
		order: 3,
		title: "A captain's innings from start to finish.",
		body: "You read the match like a veteran, timed every call, and walked away with the crown.",
	},
	{
		medal: "gold",
		sportKey: "football",
		order: 4,
		title: "You played this board like a title run.",
		body: "Composed, clinical, and impossible to catch once you hit your stride.",
	},
	{
		medal: "gold",
		sportKey: "basketball",
		order: 5,
		title: "Pure closer behavior.",
		body: "You stacked bucket after bucket of correct calls and left the rest of the league chasing shadows.",
	},
	{
		medal: "gold",
		sportKey: "f1",
		order: 6,
		title: "Pole position to the checkered flag.",
		body: "You called the race with elite precision and never let the lead wobble.",
	},
	{
		medal: "silver",
		sportKey: null,
		order: 7,
		title: "A seriously sharp finish.",
		body: "You were right in the thick of it all the way through and earned a result worth talking about.",
	},
	{
		medal: "silver",
		sportKey: null,
		order: 8,
		title: "Runner-up, but never background.",
		body: "This was a high-level performance. One more bounce and you might have been untouchable.",
	},
	{
		medal: "silver",
		sportKey: "cricket",
		order: 9,
		title: "Built like a calm chase under lights.",
		body: "You stayed close to the target all night and finished with a scorecard to be proud of.",
	},
	{
		medal: "silver",
		sportKey: "football",
		order: 10,
		title: "You were one move away from lifting it.",
		body: "Brilliant reads, brave picks, and a finish that deserves real applause.",
	},
	{
		medal: "silver",
		sportKey: "basketball",
		order: 11,
		title: "You kept the pressure on until the final buzzer.",
		body: "That was a deep run with real poise. Silver looks earned here, not given.",
	},
	{
		medal: "silver",
		sportKey: "f1",
		order: 12,
		title: "Front row finish. Serious pace.",
		body: "You stayed in the hunt from lights out to the final lap and crossed the line with style.",
	},
	{
		medal: "bronze",
		sportKey: null,
		order: 13,
		title: "Podium secured.",
		body: "You backed yourself, made enough elite calls, and left this game with something worth smiling about.",
	},
	{
		medal: "bronze",
		sportKey: null,
		order: 14,
		title: "Top three and fully deserved.",
		body: "You stayed in the fight, held your nerve, and turned solid instincts into a podium finish.",
	},
	{
		medal: "bronze",
		sportKey: "cricket",
		order: 15,
		title: "A podium built on nerve and timing.",
		body: "You picked the key overs, trusted your read, and finished with bronze in hand.",
	},
	{
		medal: "bronze",
		sportKey: "football",
		order: 16,
		title: "You earned your place on the podium.",
		body: "Strong calls, sharp instincts, and enough big moments won you a medal.",
	},
	{
		medal: "bronze",
		sportKey: "basketball",
		order: 17,
		title: "Clutch enough to make the podium.",
		body: "You stayed alive possession after possession and turned that grit into a bronze finish.",
	},
	{
		medal: "bronze",
		sportKey: "f1",
		order: 18,
		title: "A podium drive all the way through.",
		body: "You kept the pace honest, avoided mistakes, and finished with a medal to show for it.",
	},
];

function trimValue(value: string) {
	return value.trim();
}

function requireTrimmed(value: string, field: string) {
	const trimmed = trimValue(value);
	if (!trimmed) {
		throw new Error(`${field} is required.`);
	}
	return trimmed;
}

function validateNickname(nickname: string) {
	return validateNicknameInput(nickname);
}

function validateUsername(username: string | undefined, nickname: string) {
	return validateOptionalUsernameInput(username, nickname);
}

function validatePointValue(pointValue: number) {
	if (!Number.isInteger(pointValue) || pointValue < 1) {
		throw new Error("Point value must be a positive integer.");
	}
	return pointValue;
}

function validateOptions(options: string[]) {
	const trimmedOptions = options.map((option) => trimValue(option));

	if (trimmedOptions.length < 2 || trimmedOptions.length > 5) {
		throw new Error("Questions must have between 2 and 5 options.");
	}

	if (trimmedOptions.some((option) => option.length === 0)) {
		throw new Error("Option text cannot be empty.");
	}

	return trimmedOptions;
}

function generateAdminSecret() {
	return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function sanitizeLogValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => sanitizeLogValue(item));
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, nestedValue]) => [
				key,
				key.toLowerCase().includes("secret")
					? "[REDACTED]"
					: sanitizeLogValue(nestedValue),
			]),
		);
	}

	return value;
}

function logMutationError(
	mutationName: string,
	args: Record<string, unknown>,
	error: unknown,
) {
	const challengeId =
		typeof args.challengeId === "string" ? args.challengeId : null;
	const details =
		error instanceof Error
			? { message: error.message, stack: error.stack }
			: { message: String(error) };

	console.error("SushilGames prediction mutation failed", {
		mutationName,
		challengeId,
		input: sanitizeLogValue(args),
		error: details,
	});
}

async function requireChallenge(
	ctx: ReadCtx,
	challengeId: Id<"prediction_challenges">,
) {
	const challenge = await ctx.db.get(challengeId);
	if (!challenge) {
		throw new Error("Challenge not found.");
	}
	return challenge;
}

async function requireQuestion(
	ctx: ReadCtx,
	questionId: Id<"prediction_questions">,
) {
	const question = await ctx.db.get(questionId);
	if (!question) {
		throw new Error("Question not found.");
	}
	return question;
}

async function requireParticipant(
	ctx: ReadCtx,
	participantId: Id<"prediction_participants">,
) {
	const participant = await ctx.db.get(participantId);
	if (!participant) {
		throw new Error("Participant not found.");
	}
	return participant;
}

async function requireAdminChallenge(
	ctx: ReadCtx,
	challengeId: Id<"prediction_challenges">,
	adminSecret: string,
) {
	const challenge = await requireChallenge(ctx, challengeId);

	if (challenge.adminSecret !== adminSecret) {
		throw new Error("Invalid admin secret.");
	}

	return challenge;
}

async function listChallengeQuestions(
	ctx: ReadCtx,
	challengeId: Id<"prediction_challenges">,
): Promise<Array<Doc<"prediction_questions">>> {
	return await ctx.db
		.query("prediction_questions")
		.withIndex("by_challenge_order", (q) => q.eq("challengeId", challengeId))
		.collect();
}

function ensureQuestionInChallenge(
	question: Doc<"prediction_questions">,
	challengeId: Id<"prediction_challenges">,
) {
	if (question.challengeId !== challengeId) {
		throw new Error("Question does not belong to this challenge.");
	}
}

function ensureParticipantInChallenge(
	participant: Doc<"prediction_participants">,
	challengeId: Id<"prediction_challenges">,
) {
	if (participant.challengeId !== challengeId) {
		throw new Error("Participant does not belong to this challenge.");
	}
}

function ensureOptionIndex(index: number, options: string[], fieldName: string) {
	if (!Number.isInteger(index) || index < 0 || index >= options.length) {
		throw new Error(`${fieldName} is out of bounds.`);
	}
}

function isQuestionEditingUnlocked(challenge: Doc<"prediction_challenges">) {
	return challenge.questionEditUnlocked ?? challenge.status === "draft";
}

function serializePublicQuestion(question: Doc<"prediction_questions">) {
	return {
		_id: question._id,
		text: question.text,
		options: question.options,
		order: question.order,
	};
}

function serializePublicChallenge(
	challenge: Doc<"prediction_challenges">,
	questions: Array<Doc<"prediction_questions">>,
) {
	return {
		_id: challenge._id,
		title: challenge.title,
		sport: challenge.sport,
		status: challenge.status,
		winnersAnnouncedAt: challenge.winnersAnnouncedAt ?? null,
		questions: questions.map((question) => serializePublicQuestion(question)),
	};
}

function serializeAdminChallenge(
	challenge: Doc<"prediction_challenges">,
	questions: Array<Doc<"prediction_questions">>,
) {
	return {
		_id: challenge._id,
		title: challenge.title,
		sport: challenge.sport,
		status: challenge.status,
		questionEditUnlocked: challenge.questionEditUnlocked ?? false,
		winnersAnnouncedAt: challenge.winnersAnnouncedAt ?? null,
		questions,
	};
}

function serializeParticipantIdentity(participant: Doc<"prediction_participants">) {
	return {
		_id: participant._id,
		nickname: participant.nickname,
	};
}

function ensureChallengeOpenForPredictions(
	challenge: Doc<"prediction_challenges">,
	action: "join" | "submit",
) {
	if (challenge.status === "draft") {
		throw new Error("This challenge is not open yet.");
	}

	if (challenge.status === "scoring") {
		throw new Error(
			action === "join"
				? "Predictions are locked because scoring has started."
				: "Predictions are locked because scoring has started.",
		);
	}

	if (challenge.status === "closed") {
		throw new Error("This challenge has ended.");
	}
}

async function hasChallengeSubmissions(
	ctx: ReadCtx,
	challengeId: Id<"prediction_challenges">,
) {
	const prediction = await ctx.db
		.query("prediction_predictions")
		.withIndex("by_challenge", (q) => q.eq("challengeId", challengeId))
		.first();

	return Boolean(prediction);
}

async function ensureQuestionSetMutable(
	ctx: ReadCtx,
	challengeId: Id<"prediction_challenges">,
) {
	if (await hasChallengeSubmissions(ctx, challengeId)) {
		throw new Error(
			"Questions cannot be edited after a player has submitted picks.",
		);
	}
}

async function ensureWinnerMessagesSeeded(ctx: MutationCtx) {
	const existing = await ctx.db.query("prediction_winnerMessages").first();
	if (existing) {
		return;
	}

	await Promise.all(
		DEFAULT_WINNER_MESSAGES.map((message) =>
			ctx.db.insert("prediction_winnerMessages", {
				medal: message.medal,
				sportKey: message.sportKey ?? undefined,
				order: message.order,
				title: message.title,
				body: message.body,
			}),
		),
	);
}

async function findParticipantByUuid(
	ctx: ReadCtx,
	challengeId: Id<"prediction_challenges">,
	uuid: string,
) {
	const normalizedUuid = requireTrimmed(uuid, "UUID");
	const directParticipant = await ctx.db
		.query("prediction_participants")
		.withIndex("by_challenge_uuid", (q) =>
			q.eq("challengeId", challengeId).eq("uuid", normalizedUuid),
		)
		.unique();

	if (directParticipant) {
		return directParticipant;
	}

	const deviceLink = await ctx.db
		.query("prediction_participantDevices")
		.withIndex("by_challenge_uuid", (q) =>
			q.eq("challengeId", challengeId).eq("uuid", normalizedUuid),
		)
		.unique();

	if (!deviceLink) {
		return null;
	}

	const participant = await ctx.db.get(deviceLink.participantId);
	if (!participant || participant.challengeId !== challengeId) {
		return null;
	}

	return participant;
}

async function requireParticipantByUsername(
	ctx: ReadCtx,
	challengeId: Id<"prediction_challenges">,
	username: string,
) {
	const usernameLower = normalizeComparableValue(requireTrimmed(username, "Username"));
	const participant = await ctx.db
		.query("prediction_participants")
		.withIndex("by_challenge_username", (q) =>
			q.eq("challengeId", challengeId).eq("usernameLower", usernameLower),
		)
		.unique();

	if (!participant) {
		throw new Error("No player was found with that username.");
	}

	return participant;
}

async function linkDeviceToParticipant(
	ctx: MutationCtx,
	challengeId: Id<"prediction_challenges">,
	participant: Doc<"prediction_participants">,
	uuid: string,
) {
	const normalizedUuid = requireTrimmed(uuid, "UUID");

	if (participant.uuid === normalizedUuid) {
		return;
	}

	const existingDeviceLink = await ctx.db
		.query("prediction_participantDevices")
		.withIndex("by_challenge_uuid", (q) =>
			q.eq("challengeId", challengeId).eq("uuid", normalizedUuid),
		)
		.unique();

	if (existingDeviceLink?.participantId === participant._id) {
		return;
	}

	if (existingDeviceLink && existingDeviceLink.participantId !== participant._id) {
		throw new Error("That device is already linked to another player.");
	}

	await ctx.db.insert("prediction_participantDevices", {
		challengeId,
		participantId: participant._id,
		uuid: normalizedUuid,
		linkedAt: Date.now(),
	});
}

function getSubmittedParticipantIds(rows: Array<{ participantId: string; submittedAt: number | null }>) {
	return rows
		.filter((row) => row.submittedAt !== null)
		.slice(0, MEDAL_TIERS.length)
		.map((row) => row.participantId);
}

async function buildChallengeLeaderboard(
	ctx: ReadCtx,
	challengeId: Id<"prediction_challenges">,
	options?: { uuid?: string },
) {
	const challenge = await requireChallenge(ctx, challengeId);
	const [participants, questions, predictions, winnerMessages] = await Promise.all([
		ctx.db
			.query("prediction_participants")
			.withIndex("by_challenge", (q) => q.eq("challengeId", challengeId))
			.collect(),
		listChallengeQuestions(ctx, challengeId),
		ctx.db
			.query("prediction_predictions")
			.withIndex("by_challenge", (q) => q.eq("challengeId", challengeId))
			.collect(),
		ctx.db.query("prediction_winnerMessages").collect(),
	]);

	const rows = buildLeaderboardRows({
		participants: participants.map((participant) => ({
			participantId: participant._id.toString(),
			nickname: participant.nickname,
			uuid: participant.uuid,
			joinedAt: participant.joinedAt,
			submittedAt: participant.submittedAt ?? null,
		})),
		questions: questions.map((question) => ({
			questionId: question._id.toString(),
			pointValue: question.pointValue,
			correctOptionIndex: question.correctOptionIndex,
		})),
		predictions: predictions.map((prediction) => ({
			participantId: prediction.participantId.toString(),
			questionId: prediction.questionId.toString(),
			selectedOptionIndex: prediction.selectedOptionIndex,
		})),
		winnerParticipantIds:
			challenge.winnerParticipantIds?.map((participantId) =>
				participantId.toString(),
			) ?? null,
	});

	let currentParticipantId: string | null = null;
	let currentParticipant = null;
	let celebrationMessage = null;

	if (options?.uuid) {
		const participant = await findParticipantByUuid(ctx, challengeId, options.uuid);
		if (participant) {
			currentParticipantId = participant._id.toString();
			const row = rows.find(
				(candidate) => candidate.participantId === participant._id.toString(),
			);

			if (row) {
				currentParticipant = {
					nickname: row.nickname,
					rank: row.rank,
					medal: row.medal,
					score: row.score,
					correctCount: row.correctCount,
					totalAnswered: row.totalAnswered,
					accuracy: row.accuracy,
					isWinner: row.medal !== null,
				};

				if (challenge.winnersAnnouncedAt && row.medal) {
					const selectedMessage = pickWinnerMessage(
						winnerMessages.map((message) => ({
							medal: message.medal,
							sportKey: message.sportKey ?? null,
							order: message.order,
							title: message.title,
							body: message.body,
						})),
						{
							medal: row.medal,
							sport: challenge.sport,
							seed: `${challenge._id.toString()}:${participant._id.toString()}:${row.medal}`,
						},
					);

					if (selectedMessage) {
						celebrationMessage = {
							medal: selectedMessage.medal,
							title: selectedMessage.title,
							body: selectedMessage.body,
						};
					}
				}
			}
		}
	}

	const podium = rows
		.filter((row) => row.medal !== null)
		.slice(0, MEDAL_TIERS.length)
		.map((row) => ({
			rank: row.rank,
			medal: row.medal as MedalTier,
			nickname: row.nickname,
			score: row.score,
			correctCount: row.correctCount,
			totalAnswered: row.totalAnswered,
			accuracy: row.accuracy,
			isCurrentPlayer:
				currentParticipantId !== null &&
				row.participantId === currentParticipantId,
		}));

	return {
		challenge,
		rows,
		podium,
		currentParticipantId,
		currentParticipant,
		celebrationMessage,
		participantCount: participants.length,
		submittedParticipantCount: participants.filter(
			(participant) => participant.submittedAt !== undefined,
		).length,
		answeredQuestionCount: questions.filter(
			(question) => question.correctOptionIndex !== null,
		).length,
		questionCount: questions.length,
		winnersAnnounced: challenge.winnersAnnouncedAt !== undefined,
		winnersAnnouncedAt: challenge.winnersAnnouncedAt ?? null,
	};
}

export const createChallenge = mutation({
	args: {
		title: v.string(),
		sport: v.string(),
	},
	returns: v.object({
		challengeId: v.id("prediction_challenges"),
		adminSecret: v.string(),
		status: challengeStatus,
		title: v.string(),
		sport: v.string(),
	}),
	handler: async (ctx, args) => {
		try {
			const title = requireTrimmed(args.title, "Title");
			const sport = requireTrimmed(args.sport, "Sport");
			const adminSecret = generateAdminSecret();
			const status = "draft" as const;

			const challengeId = await ctx.db.insert("prediction_challenges", {
				title,
				sport,
				status,
				questionEditUnlocked: true,
				adminSecret,
				createdAt: Date.now(),
			});

			return {
				challengeId,
				adminSecret,
				status,
				title,
				sport,
			};
		} catch (error) {
			logMutationError("createChallenge", args, error);
			throw error;
		}
	},
});

export const addQuestion = mutation({
	args: {
		challengeId: v.string(),
		adminSecret: v.string(),
		text: v.string(),
		options: v.array(v.string()),
		pointValue: v.number(),
	},
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			if (!challengeId) {
				throw new Error("Challenge not found.");
			}

			const challenge = await requireAdminChallenge(
				ctx,
				challengeId,
				requireTrimmed(args.adminSecret, "Admin secret"),
			);
			if (challenge.status === "closed") {
				throw new Error("This challenge is closed.");
			}
			if (!isQuestionEditingUnlocked(challenge)) {
				throw new Error(
					"Questions are locked. Unpublish to edit questions.",
				);
			}
			await ensureQuestionSetMutable(ctx, challengeId);

			const existingQuestions = await listChallengeQuestions(ctx, challengeId);
			return await ctx.db.insert("prediction_questions", {
				challengeId,
				text: requireTrimmed(args.text, "Question text"),
				options: validateOptions(args.options),
				pointValue: validatePointValue(args.pointValue),
				correctOptionIndex: null,
				order: existingQuestions.length,
			});
		} catch (error) {
			logMutationError("addQuestion", args, error);
			throw error;
		}
	},
});

export const updateQuestion = mutation({
	args: {
		challengeId: v.string(),
		questionId: v.string(),
		adminSecret: v.string(),
		text: v.string(),
		options: v.array(v.string()),
		pointValue: v.number(),
	},
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			const questionId = ctx.db.normalizeId("prediction_questions", args.questionId);

			if (!challengeId || !questionId) {
				throw new Error("Question not found.");
			}

			const challenge = await requireAdminChallenge(
				ctx,
				challengeId,
				requireTrimmed(args.adminSecret, "Admin secret"),
			);
			if (challenge.status === "closed") {
				throw new Error("This challenge is closed.");
			}
			if (!isQuestionEditingUnlocked(challenge)) {
				throw new Error(
					"Questions are locked. Unpublish to edit questions.",
				);
			}
			await ensureQuestionSetMutable(ctx, challengeId);

			const question = await requireQuestion(ctx, questionId);
			ensureQuestionInChallenge(question, challengeId);

			await ctx.db.patch(questionId, {
				text: requireTrimmed(args.text, "Question text"),
				options: validateOptions(args.options),
				pointValue: validatePointValue(args.pointValue),
			});
		} catch (error) {
			logMutationError("updateQuestion", args, error);
			throw error;
		}
	},
});

export const deleteQuestion = mutation({
	args: {
		challengeId: v.string(),
		questionId: v.string(),
		adminSecret: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			const questionId = ctx.db.normalizeId("prediction_questions", args.questionId);

			if (!challengeId || !questionId) {
				throw new Error("Question not found.");
			}

			const challenge = await requireAdminChallenge(
				ctx,
				challengeId,
				requireTrimmed(args.adminSecret, "Admin secret"),
			);
			if (challenge.status === "closed") {
				throw new Error("This challenge is closed.");
			}
			if (!isQuestionEditingUnlocked(challenge)) {
				throw new Error(
					"Questions are locked. Unpublish to edit questions.",
				);
			}
			await ensureQuestionSetMutable(ctx, challengeId);

			const question = await requireQuestion(ctx, questionId);
			ensureQuestionInChallenge(question, challengeId);

			await ctx.db.delete(questionId);

			const remainingQuestions = await listChallengeQuestions(ctx, challengeId);
			await Promise.all(
				remainingQuestions.map((item: Doc<"prediction_questions">, index: number) =>
					item.order === index
						? Promise.resolve()
						: ctx.db.patch(item._id, { order: index }),
				),
			);
		} catch (error) {
			logMutationError("deleteQuestion", args, error);
			throw error;
		}
	},
});

export const publishChallenge = mutation({
	args: {
		challengeId: v.string(),
		adminSecret: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			if (!challengeId) {
				throw new Error("Challenge not found.");
			}

			const challenge = await requireAdminChallenge(
				ctx,
				challengeId,
				requireTrimmed(args.adminSecret, "Admin secret"),
			);
			if (challenge.status === "closed") {
				throw new Error("Closed challenges cannot be published.");
			}

			if (challenge.status === "draft") {
				const questions = await listChallengeQuestions(ctx, challengeId);
				if (questions.length === 0) {
					throw new Error("Add at least one question before publishing.");
				}

				await ctx.db.patch(challengeId, {
					status: "open",
					questionEditUnlocked: false,
				});
				return;
			}

			await ctx.db.patch(challengeId, { questionEditUnlocked: false });
		} catch (error) {
			logMutationError("publishChallenge", args, error);
			throw error;
		}
	},
});

export const unpublishChallenge = mutation({
	args: {
		challengeId: v.string(),
		adminSecret: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			if (!challengeId) {
				throw new Error("Challenge not found.");
			}

			const challenge = await requireAdminChallenge(
				ctx,
				challengeId,
				requireTrimmed(args.adminSecret, "Admin secret"),
			);
			if (challenge.status === "draft") {
				throw new Error("Draft challenges are already editable.");
			}
			if (challenge.status === "closed") {
				throw new Error("Closed challenges cannot be unpublished.");
			}
			await ensureQuestionSetMutable(ctx, challengeId);

			await ctx.db.patch(challengeId, { questionEditUnlocked: true });
		} catch (error) {
			logMutationError("unpublishChallenge", args, error);
			throw error;
		}
	},
});

export const joinChallenge = mutation({
	args: {
		challengeId: v.string(),
		uuid: v.string(),
		nickname: v.string(),
		username: v.optional(v.string()),
	},
	returns: v.id("prediction_participants"),
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			if (!challengeId) {
				throw new Error("Challenge not found.");
			}

			const challenge = await requireChallenge(ctx, challengeId);
			ensureChallengeOpenForPredictions(challenge, "join");

			const uuid = requireTrimmed(args.uuid, "UUID");
			const nickname = validateNickname(args.nickname);
			const { username, usernameLower } = validateUsername(
				args.username,
				nickname,
			);
			const existing = await findParticipantByUuid(ctx, challengeId, uuid);

			if (existing) {
				return existing._id;
			}

			if (usernameLower) {
				const existingUsername = await ctx.db
					.query("prediction_participants")
					.withIndex("by_challenge_username", (q) =>
						q.eq("challengeId", challengeId).eq("usernameLower", usernameLower),
					)
					.unique();

				if (existingUsername) {
					throw new Error("That username is already taken in this challenge.");
				}
			}

			return await ctx.db.insert("prediction_participants", {
				challengeId,
				uuid,
				nickname,
				username,
				usernameLower,
				joinedAt: Date.now(),
			});
		} catch (error) {
			logMutationError("joinChallenge", args, error);
			throw error;
		}
	},
});

export const recoverParticipantByUsername = mutation({
	args: {
		challengeId: v.string(),
		uuid: v.string(),
		username: v.string(),
	},
	returns: v.object({
		participantId: v.id("prediction_participants"),
		nickname: v.string(),
	}),
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			if (!challengeId) {
				throw new Error("Challenge not found.");
			}

			const challenge = await requireChallenge(ctx, challengeId);
			if (challenge.status === "draft") {
				throw new Error("This challenge is not open yet.");
			}

			const participant = await requireParticipantByUsername(
				ctx,
				challengeId,
				args.username,
			);

			await linkDeviceToParticipant(
				ctx,
				challengeId,
				participant,
				requireTrimmed(args.uuid, "UUID"),
			);

			return {
				participantId: participant._id,
				nickname: participant.nickname,
			};
		} catch (error) {
			logMutationError("recoverParticipantByUsername", args, error);
			throw error;
		}
	},
});

export const submitPredictions = mutation({
	args: {
		challengeId: v.string(),
		participantId: v.string(),
		uuid: v.string(),
		predictions: v.array(predictionInput),
	},
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			const participantId = ctx.db.normalizeId(
				"prediction_participants",
				args.participantId,
			);

			if (!challengeId || !participantId) {
				throw new Error("Challenge not found.");
			}

			const challenge = await requireChallenge(ctx, challengeId);
			ensureChallengeOpenForPredictions(challenge, "submit");

			const participant = await requireParticipant(ctx, participantId);
			ensureParticipantInChallenge(participant, challengeId);

			const authorizedParticipant = await findParticipantByUuid(
				ctx,
				challengeId,
				requireTrimmed(args.uuid, "UUID"),
			);
			if (!authorizedParticipant || authorizedParticipant._id !== participantId) {
				throw new Error("This device is not authorized for that participant.");
			}

			const existingPrediction = await ctx.db
				.query("prediction_predictions")
				.withIndex("by_participant", (q) => q.eq("participantId", participantId))
				.first();
			if (existingPrediction) {
				throw new Error("Predictions have already been submitted.");
			}

			const questions = await listChallengeQuestions(ctx, challengeId);
			if (questions.length === 0) {
				throw new Error("This challenge has no questions.");
			}

			if (args.predictions.length !== questions.length) {
				throw new Error("Submit one prediction for every question.");
			}

			const questionMap = new Map<Id<"prediction_questions">, Doc<"prediction_questions">>(
				questions.map((question: Doc<"prediction_questions">) => [question._id, question]),
			);
			const seenQuestionIds = new Set<string>();

			for (const prediction of args.predictions) {
				const questionId = ctx.db.normalizeId("prediction_questions", prediction.questionId);
				if (!questionId) {
					throw new Error("One or more selected questions are invalid.");
				}

				const question = questionMap.get(questionId);
				if (!question) {
					throw new Error(
						"One or more questions do not belong to this challenge.",
					);
				}

				const key = questionId.toString();
				if (seenQuestionIds.has(key)) {
					throw new Error("Each question can only be answered once.");
				}
				seenQuestionIds.add(key);

				ensureOptionIndex(
					prediction.selectedOptionIndex,
					question.options,
					"Selected option",
				);
			}

			if (seenQuestionIds.size !== questions.length) {
				throw new Error("Submit one prediction for every question.");
			}

			const submittedAt = Date.now();
			await Promise.all(
				args.predictions.map(
					async (prediction: typeof args.predictions[number]) => {
						const questionId = ctx.db.normalizeId(
							"prediction_questions",
							prediction.questionId,
						);
						if (!questionId) {
							throw new Error("One or more selected questions are invalid.");
						}

						await ctx.db.insert("prediction_predictions", {
							participantId,
							questionId,
							challengeId,
							selectedOptionIndex: prediction.selectedOptionIndex,
							submittedAt,
						});
					},
				),
			);
			await ctx.db.patch(participantId, { submittedAt });
		} catch (error) {
			logMutationError("submitPredictions", args, error);
			throw error;
		}
	},
});

export const markCorrectAnswer = mutation({
	args: {
		challengeId: v.string(),
		questionId: v.string(),
		adminSecret: v.string(),
		correctOptionIndex: v.number(),
	},
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			const questionId = ctx.db.normalizeId("prediction_questions", args.questionId);

			if (!challengeId || !questionId) {
				throw new Error("Question not found.");
			}

			const challenge = await requireAdminChallenge(
				ctx,
				challengeId,
				requireTrimmed(args.adminSecret, "Admin secret"),
			);
			if (challenge.status === "draft") {
				throw new Error("Publish the challenge before scoring answers.");
			}
			if (challenge.status === "closed") {
				throw new Error("This challenge is closed.");
			}

			const question = await requireQuestion(ctx, questionId);
			ensureQuestionInChallenge(question, challengeId);
			ensureOptionIndex(
				args.correctOptionIndex,
				question.options,
				"Correct option",
			);

			await ctx.db.patch(questionId, {
				correctOptionIndex: args.correctOptionIndex,
			});

			if (challenge.status === "open") {
				await ctx.db.patch(challengeId, { status: "scoring" });
			}
		} catch (error) {
			logMutationError("markCorrectAnswer", args, error);
			throw error;
		}
	},
});

export const clearAnswerMarkings = mutation({
	args: {
		challengeId: v.string(),
		adminSecret: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			if (!challengeId) {
				throw new Error("Challenge not found.");
			}

			const challenge = await requireAdminChallenge(
				ctx,
				challengeId,
				requireTrimmed(args.adminSecret, "Admin secret"),
			);
			if (challenge.status === "draft") {
				throw new Error("Publish the challenge before scoring answers.");
			}
			if (challenge.status === "closed") {
				throw new Error("This challenge is closed.");
			}

			const questions = await listChallengeQuestions(ctx, challengeId);
			await Promise.all(
				questions
					.filter((question: Doc<"prediction_questions">) => question.correctOptionIndex !== null)
					.map((question: Doc<"prediction_questions">) =>
						ctx.db.patch(question._id, { correctOptionIndex: null }),
					),
			);

			if (challenge.status === "scoring") {
				await ctx.db.patch(challengeId, { status: "open" });
			}
		} catch (error) {
			logMutationError("clearAnswerMarkings", args, error);
			throw error;
		}
	},
});

export const announceWinners = mutation({
	args: {
		challengeId: v.string(),
		adminSecret: v.string(),
	},
	returns: v.object({
		winnerParticipantIds: v.array(v.id("prediction_participants")),
		announcedAt: v.number(),
	}),
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			if (!challengeId) {
				throw new Error("Challenge not found.");
			}

			const challenge = await requireAdminChallenge(
				ctx,
				challengeId,
				requireTrimmed(args.adminSecret, "Admin secret"),
			);

			if (challenge.winnersAnnouncedAt) {
				throw new Error("Winners have already been announced.");
			}

			const leaderboard = await buildChallengeLeaderboard(ctx, challengeId);
			if (leaderboard.questionCount === 0) {
				throw new Error("Add questions before announcing winners.");
			}

			if (leaderboard.answeredQuestionCount !== leaderboard.questionCount) {
				throw new Error("Mark every correct answer before announcing winners.");
			}

			if (leaderboard.submittedParticipantCount === 0) {
				throw new Error("At least one player must submit picks first.");
			}

			const winnerParticipantIds = getSubmittedParticipantIds(leaderboard.rows)
				.map((participantId) => ctx.db.normalizeId("prediction_participants", participantId))
				.filter((participantId): participantId is Id<"prediction_participants"> =>
					Boolean(participantId),
				);

			if (winnerParticipantIds.length === 0) {
				throw new Error("There are no submitted players to announce.");
			}

			await ensureWinnerMessagesSeeded(ctx);
			const announcedAt = Date.now();
			await ctx.db.patch(challengeId, {
				status: "closed",
				questionEditUnlocked: false,
				winnersAnnouncedAt: announcedAt,
				winnerParticipantIds,
			});

			return {
				winnerParticipantIds,
				announcedAt,
			};
		} catch (error) {
			logMutationError("announceWinners", args, error);
			throw error;
		}
	},
});

export const closeChallenge = mutation({
	args: {
		challengeId: v.string(),
		adminSecret: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
			if (!challengeId) {
				throw new Error("Challenge not found.");
			}

			await requireAdminChallenge(
				ctx,
				challengeId,
				requireTrimmed(args.adminSecret, "Admin secret"),
			);
			await ctx.db.patch(challengeId, {
				status: "closed",
				questionEditUnlocked: false,
			});
		} catch (error) {
			logMutationError("closeChallenge", args, error);
			throw error;
		}
	},
});

export const getChallenge = query({
	args: {
		challengeId: v.string(),
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
		if (!challengeId) {
			return null;
		}

		const challenge = await ctx.db.get(challengeId);
		if (!challenge) {
			return null;
		}

		const questions = await listChallengeQuestions(ctx, challengeId);
		return serializePublicChallenge(challenge, questions);
	},
});

export const getAdminChallenge = query({
	args: {
		challengeId: v.string(),
		adminSecret: v.string(),
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
		if (!challengeId) {
			return null;
		}

		let challenge: Doc<"prediction_challenges">;
		try {
			challenge = await requireAdminChallenge(
				ctx,
				challengeId,
				requireTrimmed(args.adminSecret, "Admin secret"),
			);
		} catch {
			return null;
		}

		const questions = await listChallengeQuestions(ctx, challengeId);
		return serializeAdminChallenge(challenge, questions);
	},
});

export const getChallengeSummaries = query({
	args: {
		challengeIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const summaries = await Promise.all(
			args.challengeIds.map(async (challengeId) => {
				const normalizedId = ctx.db.normalizeId("prediction_challenges", challengeId);
				if (!normalizedId) {
					return null;
				}

				const challenge = await ctx.db.get(normalizedId);
				if (!challenge) {
					return null;
				}

				return {
					challengeId: challenge._id,
					title: challenge.title,
					sport: challenge.sport,
					status: challenge.status,
					createdAt: challenge.createdAt,
				};
			}),
		);

		return summaries.filter(Boolean);
	},
});

export const getParticipant = query({
	args: {
		challengeId: v.string(),
		uuid: v.string(),
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
		if (!challengeId) {
			return null;
		}

		const participant = await findParticipantByUuid(ctx, challengeId, args.uuid);
		return participant ? serializeParticipantIdentity(participant) : null;
	},
});

export const getParticipantPredictions = query({
	args: {
		participantId: v.string(),
		challengeId: v.string(),
		uuid: v.string(),
	},
	handler: async (ctx, args) => {
		const participantId = ctx.db.normalizeId("prediction_participants", args.participantId);
		const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);

		if (!participantId || !challengeId) {
			return {};
		}

		const participant = await ctx.db.get(participantId);
		if (!participant || participant.challengeId !== challengeId) {
			return {};
		}

		const authorizedParticipant = await findParticipantByUuid(
			ctx,
			challengeId,
			args.uuid,
		);
		if (!authorizedParticipant || authorizedParticipant._id !== participantId) {
			return {};
		}

		const predictions = await ctx.db
			.query("prediction_predictions")
			.withIndex("by_participant", (q) => q.eq("participantId", participantId))
			.collect();

		return Object.fromEntries(
			predictions
				.filter((prediction) => prediction.challengeId === challengeId)
				.map((prediction) => [
					prediction.questionId,
					{
						questionId: prediction.questionId,
						selectedOptionIndex: prediction.selectedOptionIndex,
						submittedAt: prediction.submittedAt,
					},
				]),
		);
	},
});

export const getLeaderboard = query({
	args: {
		challengeId: v.string(),
		uuid: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("prediction_challenges", args.challengeId);
		if (!challengeId) {
			return null;
		}

		const leaderboard = await buildChallengeLeaderboard(ctx, challengeId, {
			uuid: args.uuid,
		});

		return {
			status: leaderboard.challenge.status,
			participantCount: leaderboard.participantCount,
			submittedParticipantCount: leaderboard.submittedParticipantCount,
			answeredQuestionCount: leaderboard.answeredQuestionCount,
			questionCount: leaderboard.questionCount,
			winnersAnnounced: leaderboard.winnersAnnounced,
			winnersAnnouncedAt: leaderboard.winnersAnnouncedAt,
			podium: leaderboard.podium,
			currentParticipant: leaderboard.currentParticipant,
			celebrationMessage: leaderboard.celebrationMessage,
			rows: leaderboard.rows.map((row) => ({
				rank: row.rank,
				medal: row.medal,
				nickname: row.nickname,
				score: row.score,
				correctCount: row.correctCount,
				totalAnswered: row.totalAnswered,
				accuracy: row.accuracy,
				isCurrentPlayer:
					leaderboard.currentParticipantId !== null &&
					row.participantId === leaderboard.currentParticipantId,
			})),
		};
	},
});
