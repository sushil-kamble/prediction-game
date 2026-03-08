import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	prediction_challenges: defineTable({
		title: v.string(),
		sport: v.string(),
		status: v.union(
			v.literal("draft"),
			v.literal("open"),
			v.literal("scoring"),
			v.literal("closed"),
		),
		questionEditUnlocked: v.optional(v.boolean()),
		winnersAnnouncedAt: v.optional(v.number()),
		winnerParticipantIds: v.optional(
			v.array(v.id("prediction_participants")),
		),
		adminSecret: v.string(),
		createdAt: v.number(),
	}),
	prediction_questions: defineTable({
		challengeId: v.id("prediction_challenges"),
		text: v.string(),
		options: v.array(v.string()),
		pointValue: v.number(),
		correctOptionIndex: v.union(v.number(), v.null()),
		order: v.number(),
	}).index("by_challenge_order", ["challengeId", "order"]),
	prediction_participants: defineTable({
		challengeId: v.id("prediction_challenges"),
		uuid: v.string(),
		nickname: v.string(),
		username: v.optional(v.string()),
		usernameLower: v.optional(v.string()),
		joinedAt: v.number(),
		submittedAt: v.optional(v.number()),
	})
		.index("by_challenge", ["challengeId"])
		.index("by_challenge_uuid", ["challengeId", "uuid"])
		.index("by_challenge_username", ["challengeId", "usernameLower"]),
	prediction_participantDevices: defineTable({
		challengeId: v.id("prediction_challenges"),
		participantId: v.id("prediction_participants"),
		uuid: v.string(),
		linkedAt: v.number(),
	})
		.index("by_challenge_uuid", ["challengeId", "uuid"])
		.index("by_participant", ["participantId"]),
	prediction_predictions: defineTable({
		participantId: v.id("prediction_participants"),
		questionId: v.id("prediction_questions"),
		challengeId: v.id("prediction_challenges"),
		selectedOptionIndex: v.number(),
		submittedAt: v.number(),
	})
		.index("by_participant", ["participantId"])
		.index("by_challenge", ["challengeId"])
		.index("by_participant_question", ["participantId", "questionId"]),
	prediction_winnerMessages: defineTable({
		medal: v.union(
			v.literal("gold"),
			v.literal("silver"),
			v.literal("bronze"),
		),
		sportKey: v.optional(v.string()),
		order: v.number(),
		title: v.string(),
		body: v.string(),
	})
		.index("by_medal", ["medal"])
		.index("by_medal_sportKey", ["medal", "sportKey"]),
});
