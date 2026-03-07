import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
	const trimmed = requireTrimmed(nickname, "Nickname");
	if (trimmed.length < 2 || trimmed.length > 20) {
		throw new Error("Nickname must be between 2 and 20 characters.");
	}
	return trimmed;
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

async function requireChallenge(
	ctx: ReadCtx,
	challengeId: Id<"challenges">,
) {
	const challenge = await ctx.db.get(challengeId);
	if (!challenge) {
		throw new Error("Challenge not found.");
	}
	return challenge;
}

async function requireQuestion(
	ctx: ReadCtx,
	questionId: Id<"questions">,
) {
	const question = await ctx.db.get(questionId);
	if (!question) {
		throw new Error("Question not found.");
	}
	return question;
}

async function requireParticipant(
	ctx: ReadCtx,
	participantId: Id<"participants">,
) {
	const participant = await ctx.db.get(participantId);
	if (!participant) {
		throw new Error("Participant not found.");
	}
	return participant;
}

async function requireAdminChallenge(
	ctx: ReadCtx,
	challengeId: Id<"challenges">,
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
	challengeId: Id<"challenges">,
): Promise<Array<Doc<"questions">>> {
	return await ctx.db
		.query("questions")
		.withIndex("by_challenge_order", (q) => q.eq("challengeId", challengeId))
		.collect();
}

function ensureQuestionInChallenge(
	question: Doc<"questions">,
	challengeId: Id<"challenges">,
) {
	if (question.challengeId !== challengeId) {
		throw new Error("Question does not belong to this challenge.");
	}
}

function ensureParticipantInChallenge(
	participant: Doc<"participants">,
	challengeId: Id<"challenges">,
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

function serializePublicQuestion(
	question: Doc<"questions">,
	status: Doc<"challenges">["status"],
) {
	if (status === "open") {
		const { correctOptionIndex, ...rest } = question;
		void correctOptionIndex;
		return rest;
	}

	return question;
}

export const createChallenge = mutation({
	args: {
		title: v.string(),
		sport: v.string(),
	},
	returns: v.object({
		challengeId: v.id("challenges"),
		adminSecret: v.string(),
		status: challengeStatus,
		title: v.string(),
		sport: v.string(),
	}),
	handler: async (ctx, args) => {
		const title = requireTrimmed(args.title, "Title");
		const sport = requireTrimmed(args.sport, "Sport");
		const adminSecret = generateAdminSecret();
		const status = "draft" as const;

		const challengeId = await ctx.db.insert("challenges", {
			title,
			sport,
			status,
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
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		if (!challengeId) {
			throw new Error("Challenge not found.");
		}

		const challenge = await requireAdminChallenge(
			ctx,
			challengeId,
			requireTrimmed(args.adminSecret, "Admin secret"),
		);
		if (challenge.status !== "draft") {
			throw new Error("Questions can only be added while the challenge is in draft.");
		}

		const existingQuestions = await listChallengeQuestions(ctx, challengeId);
		return await ctx.db.insert("questions", {
			challengeId,
			text: requireTrimmed(args.text, "Question text"),
			options: validateOptions(args.options),
			pointValue: validatePointValue(args.pointValue),
			correctOptionIndex: null,
			order: existingQuestions.length,
		});
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
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		const questionId = ctx.db.normalizeId("questions", args.questionId);

		if (!challengeId || !questionId) {
			throw new Error("Question not found.");
		}

		const challenge = await requireAdminChallenge(
			ctx,
			challengeId,
			requireTrimmed(args.adminSecret, "Admin secret"),
		);
		if (challenge.status !== "draft") {
			throw new Error(
				"Questions can only be edited while the challenge is in draft.",
			);
		}

		const question = await requireQuestion(ctx, questionId);
		ensureQuestionInChallenge(question, challengeId);

		await ctx.db.patch(questionId, {
			text: requireTrimmed(args.text, "Question text"),
			options: validateOptions(args.options),
			pointValue: validatePointValue(args.pointValue),
		});
	},
});

export const deleteQuestion = mutation({
	args: {
		challengeId: v.string(),
		questionId: v.string(),
		adminSecret: v.string(),
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		const questionId = ctx.db.normalizeId("questions", args.questionId);

		if (!challengeId || !questionId) {
			throw new Error("Question not found.");
		}

		const challenge = await requireAdminChallenge(
			ctx,
			challengeId,
			requireTrimmed(args.adminSecret, "Admin secret"),
		);
		if (challenge.status !== "draft") {
			throw new Error(
				"Questions can only be deleted while the challenge is in draft.",
			);
		}

		const question = await requireQuestion(ctx, questionId);
		ensureQuestionInChallenge(question, challengeId);

		await ctx.db.delete(questionId);

		const remainingQuestions = await listChallengeQuestions(ctx, challengeId);
		await Promise.all(
			remainingQuestions.map((item: Doc<"questions">, index: number) =>
				item.order === index
					? Promise.resolve()
					: ctx.db.patch(item._id, { order: index }),
			),
		);
	},
});

export const publishChallenge = mutation({
	args: {
		challengeId: v.string(),
		adminSecret: v.string(),
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		if (!challengeId) {
			throw new Error("Challenge not found.");
		}

		const challenge = await requireAdminChallenge(
			ctx,
			challengeId,
			requireTrimmed(args.adminSecret, "Admin secret"),
		);
		if (challenge.status !== "draft") {
			throw new Error("Only draft challenges can be published.");
		}

		const questions = await listChallengeQuestions(ctx, challengeId);
		if (questions.length === 0) {
			throw new Error("Add at least one question before publishing.");
		}

		await ctx.db.patch(challengeId, { status: "open" });
	},
});

export const joinChallenge = mutation({
	args: {
		challengeId: v.string(),
		uuid: v.string(),
		nickname: v.string(),
	},
	returns: v.id("participants"),
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		if (!challengeId) {
			throw new Error("Challenge not found.");
		}

		const challenge = await requireChallenge(ctx, challengeId);
		if (challenge.status === "draft") {
			throw new Error("This challenge is not open yet.");
		}
		if (challenge.status === "closed") {
			throw new Error("This challenge has ended.");
		}

		const uuid = requireTrimmed(args.uuid, "UUID");
		const nickname = validateNickname(args.nickname);
		const existing = await ctx.db
			.query("participants")
			.withIndex("by_challenge_uuid", (q) =>
				q.eq("challengeId", challengeId).eq("uuid", uuid),
			)
			.unique();

		if (existing) {
			return existing._id;
		}

		return await ctx.db.insert("participants", {
			challengeId,
			uuid,
			nickname,
			joinedAt: Date.now(),
		});
	},
});

export const submitPredictions = mutation({
	args: {
		challengeId: v.string(),
		participantId: v.string(),
		predictions: v.array(predictionInput),
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		const participantId = ctx.db.normalizeId(
			"participants",
			args.participantId,
		);

		if (!challengeId || !participantId) {
			throw new Error("Challenge not found.");
		}

		const challenge = await requireChallenge(ctx, challengeId);
		if (challenge.status === "draft") {
			throw new Error("This challenge is not open yet.");
		}
		if (challenge.status === "closed") {
			throw new Error("This challenge has ended.");
		}

		const participant = await requireParticipant(ctx, participantId);
		ensureParticipantInChallenge(participant, challengeId);

		const existingPrediction = await ctx.db
			.query("predictions")
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

		const questionMap = new Map<Id<"questions">, Doc<"questions">>(
			questions.map((question: Doc<"questions">) => [question._id, question]),
		);
		const seenQuestionIds = new Set<string>();

		for (const prediction of args.predictions) {
			const questionId = ctx.db.normalizeId("questions", prediction.questionId);
			if (!questionId) {
				throw new Error("One or more selected questions are invalid.");
			}

			const question = questionMap.get(questionId);
			if (!question) {
				throw new Error("One or more questions do not belong to this challenge.");
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
			args.predictions.map(async (prediction) => {
				const questionId = ctx.db.normalizeId("questions", prediction.questionId);
				if (!questionId) {
					throw new Error("One or more selected questions are invalid.");
				}

				await ctx.db.insert("predictions", {
					participantId,
					questionId,
					challengeId,
					selectedOptionIndex: prediction.selectedOptionIndex,
					submittedAt,
				});
			}),
		);
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
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		const questionId = ctx.db.normalizeId("questions", args.questionId);

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
	},
});

export const closeChallenge = mutation({
	args: {
		challengeId: v.string(),
		adminSecret: v.string(),
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		if (!challengeId) {
			throw new Error("Challenge not found.");
		}

		await requireAdminChallenge(
			ctx,
			challengeId,
			requireTrimmed(args.adminSecret, "Admin secret"),
		);
		await ctx.db.patch(challengeId, { status: "closed" });
	},
});

export const getChallenge = query({
	args: {
		challengeId: v.string(),
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		if (!challengeId) {
			return null;
		}

		const challenge = await ctx.db.get(challengeId);
		if (!challenge) {
			return null;
		}

		const questions = await listChallengeQuestions(ctx, challengeId);

		return {
			...challenge,
			questions: questions.map((question: Doc<"questions">) =>
				serializePublicQuestion(question, challenge.status),
			),
		};
	},
});

export const getAdminChallenge = query({
	args: {
		challengeId: v.string(),
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		if (!challengeId) {
			return null;
		}

		const challenge = await ctx.db.get(challengeId);
		if (!challenge) {
			return null;
		}

		const questions = await listChallengeQuestions(ctx, challengeId);
		return {
			...challenge,
			questions,
		};
	},
});

export const getChallengeSummaries = query({
	args: {
		challengeIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const summaries = await Promise.all(
			args.challengeIds.map(async (challengeId) => {
				const normalizedId = ctx.db.normalizeId("challenges", challengeId);
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
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		if (!challengeId) {
			return null;
		}

		return await ctx.db
			.query("participants")
			.withIndex("by_challenge_uuid", (q) =>
				q.eq("challengeId", challengeId).eq("uuid", trimValue(args.uuid)),
			)
			.unique();
	},
});

export const getParticipantPredictions = query({
	args: {
		participantId: v.string(),
		challengeId: v.string(),
	},
	handler: async (ctx, args) => {
		const participantId = ctx.db.normalizeId("participants", args.participantId);
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);

		if (!participantId || !challengeId) {
			return {};
		}

		const participant = await ctx.db.get(participantId);
		if (!participant || participant.challengeId !== challengeId) {
			return {};
		}

		const predictions = await ctx.db
			.query("predictions")
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
	},
	handler: async (ctx, args) => {
		const challengeId = ctx.db.normalizeId("challenges", args.challengeId);
		if (!challengeId) {
			return null;
		}

		const challenge = await ctx.db.get(challengeId);
		if (!challenge) {
			return null;
		}

		const [participants, questions, predictions] = await Promise.all([
			ctx.db
				.query("participants")
				.withIndex("by_challenge", (q) => q.eq("challengeId", challengeId))
				.collect(),
			listChallengeQuestions(ctx, challengeId),
			ctx.db
				.query("predictions")
				.withIndex("by_challenge", (q) => q.eq("challengeId", challengeId))
				.collect(),
		]);

		const questionMap = new Map<Id<"questions">, Doc<"questions">>(
			questions.map((question: Doc<"questions">) => [question._id, question]),
		);
		const predictionGroups = new Map<
			Id<"participants">,
			Array<Doc<"predictions">>
		>();

		for (const prediction of predictions) {
			const participantPredictions =
				predictionGroups.get(prediction.participantId) ?? [];
			participantPredictions.push(prediction);
			predictionGroups.set(prediction.participantId, participantPredictions);
		}

		const rows = participants
			.map((participant) => {
				const participantPredictions =
					predictionGroups.get(participant._id) ?? [];
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
					nickname: participant.nickname,
					uuid: participant.uuid,
					score,
					correctCount,
					totalAnswered: participantPredictions.length,
					joinedAt: participant.joinedAt,
				};
			})
			.sort((a, b) => {
				if (b.score !== a.score) {
					return b.score - a.score;
				}
				if (b.correctCount !== a.correctCount) {
					return b.correctCount - a.correctCount;
				}
				if (a.nickname !== b.nickname) {
					return a.nickname.localeCompare(b.nickname);
				}
				return a.joinedAt - b.joinedAt;
			});

		let lastScore: number | null = null;
		let lastRank = 0;
		const rankedRows = rows.map((row, index) => {
			if (lastScore !== row.score) {
				lastScore = row.score;
				lastRank = index + 1;
			}

			return {
				rank: lastRank,
				nickname: row.nickname,
				uuid: row.uuid,
				score: row.score,
				correctCount: row.correctCount,
				totalAnswered: row.totalAnswered,
			};
		});

		return {
			status: challenge.status,
			participantCount: participants.length,
			answeredQuestionCount: questions.filter(
				(question: Doc<"questions">) => question.correctOptionIndex !== null,
			).length,
			questionCount: questions.length,
			rows: rankedRows,
		};
	},
});
