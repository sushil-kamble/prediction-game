import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	challenges: defineTable({
		title: v.string(),
		sport: v.string(),
		status: v.union(
			v.literal("draft"),
			v.literal("open"),
			v.literal("scoring"),
			v.literal("closed"),
		),
		adminSecret: v.string(),
		createdAt: v.number(),
	}),
	questions: defineTable({
		challengeId: v.id("challenges"),
		text: v.string(),
		options: v.array(v.string()),
		pointValue: v.number(),
		correctOptionIndex: v.union(v.number(), v.null()),
		order: v.number(),
	}).index("by_challenge_order", ["challengeId", "order"]),
	participants: defineTable({
		challengeId: v.id("challenges"),
		uuid: v.string(),
		nickname: v.string(),
		joinedAt: v.number(),
	})
		.index("by_challenge", ["challengeId"])
		.index("by_challenge_uuid", ["challengeId", "uuid"]),
	predictions: defineTable({
		participantId: v.id("participants"),
		questionId: v.id("questions"),
		challengeId: v.id("challenges"),
		selectedOptionIndex: v.number(),
		submittedAt: v.number(),
	})
		.index("by_participant", ["participantId"])
		.index("by_challenge", ["challengeId"])
		.index("by_participant_question", ["participantId", "questionId"]),
});
