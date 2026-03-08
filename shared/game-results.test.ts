import { describe, expect, it } from "vitest";
import {
	buildLeaderboardRows,
	pickWinnerMessage,
	validateNicknameInput,
	validateOptionalUsernameInput,
} from "./game-results";

describe("game-results identity validation", () => {
	it("accepts nickname-only entries", () => {
		expect(validateNicknameInput("  Sushil  ")).toBe("Sushil");
		expect(
			validateOptionalUsernameInput(undefined, "Sushil"),
		).toStrictEqual({
			username: undefined,
			usernameLower: undefined,
		});
	});

	it("rejects identical nickname and username ignoring case", () => {
		expect(() =>
			validateOptionalUsernameInput("winner", "Winner"),
		).toThrowError("Username and nickname must be different.");
	});

	it("rejects invalid username characters", () => {
		expect(() =>
			validateOptionalUsernameInput("bad name!", "Legend"),
		).toThrowError(
			"Username can only use letters, numbers, dots, dashes, and underscores.",
		);
	});
});

describe("game-results ranking", () => {
	it("ranks higher scores above all tie-breakers", () => {
		const rows = buildLeaderboardRows({
			participants: [
				{
					participantId: "p1",
					nickname: "Alpha",
					uuid: "uuid-1",
					joinedAt: 1,
					submittedAt: 500,
				},
				{
					participantId: "p2",
					nickname: "Bravo",
					uuid: "uuid-2",
					joinedAt: 2,
					submittedAt: 100,
				},
				{
					participantId: "p3",
					nickname: "Charlie",
					uuid: "uuid-3",
					joinedAt: 3,
					submittedAt: 300,
				},
			],
			questions: [
				{
					questionId: "q1",
					pointValue: 5,
					correctOptionIndex: 0,
				},
				{
					questionId: "q2",
					pointValue: 5,
					correctOptionIndex: 1,
				},
			],
			predictions: [
				{
					participantId: "p1",
					questionId: "q1",
					selectedOptionIndex: 0,
				},
				{
					participantId: "p1",
					questionId: "q2",
					selectedOptionIndex: 1,
				},
				{
					participantId: "p2",
					questionId: "q1",
					selectedOptionIndex: 0,
				},
				{
					participantId: "p3",
					questionId: "q1",
					selectedOptionIndex: 1,
				},
			],
		});

		expect(rows.map((row) => row.participantId)).toStrictEqual([
			"p1",
			"p2",
			"p3",
		]);
		expect(rows.map((row) => row.score)).toStrictEqual([10, 5, 0]);
	});

	it("prefers players who answered more questions when scores are tied", () => {
		const rows = buildLeaderboardRows({
			participants: [
				{
					participantId: "p1",
					nickname: "Alpha",
					uuid: "uuid-1",
					joinedAt: 0,
					submittedAt: 800,
				},
				{
					participantId: "p2",
					nickname: "Bravo",
					uuid: "uuid-2",
					joinedAt: 0,
					submittedAt: 200,
				},
				{
					participantId: "p3",
					nickname: "Charlie",
					uuid: "uuid-3",
					joinedAt: 0,
					submittedAt: 400,
				},
			],
			questions: [
				{
					questionId: "q1",
					pointValue: 5,
					correctOptionIndex: 0,
				},
				{
					questionId: "q2",
					pointValue: 5,
					correctOptionIndex: 1,
				},
			],
			predictions: [
				{
					participantId: "p1",
					questionId: "q1",
					selectedOptionIndex: 0,
				},
				{
					participantId: "p1",
					questionId: "q2",
					selectedOptionIndex: 0,
				},
				{
					participantId: "p2",
					questionId: "q1",
					selectedOptionIndex: 0,
				},
				{
					participantId: "p3",
					questionId: "q1",
					selectedOptionIndex: 1,
				},
			],
		});

		expect(rows.map((row) => row.participantId)).toStrictEqual([
			"p1",
			"p2",
			"p3",
		]);
		expect(rows.map((row) => row.totalAnswered)).toStrictEqual([2, 1, 1]);
	});

	it("breaks remaining ties using faster time from join to submission", () => {
		const rows = buildLeaderboardRows({
			participants: [
				{
					participantId: "p1",
					nickname: "Alpha",
					uuid: "uuid-1",
					joinedAt: 0,
					submittedAt: 200,
				},
				{
					participantId: "p2",
					nickname: "Bravo",
					uuid: "uuid-2",
					joinedAt: 1_000,
					submittedAt: 1_100,
				},
				{
					participantId: "p3",
					nickname: "Charlie",
					uuid: "uuid-3",
					joinedAt: 0,
					submittedAt: 300,
				},
			],
			questions: [
				{
					questionId: "q1",
					pointValue: 5,
					correctOptionIndex: 0,
				},
			],
			predictions: [
				{
					participantId: "p1",
					questionId: "q1",
					selectedOptionIndex: 0,
				},
				{
					participantId: "p2",
					questionId: "q1",
					selectedOptionIndex: 0,
				},
				{
					participantId: "p3",
					questionId: "q1",
					selectedOptionIndex: 1,
				},
			],
		});

		expect(rows.map((row) => row.participantId)).toStrictEqual([
			"p2",
			"p1",
			"p3",
		]);
		expect(rows.map((row) => row.medal)).toStrictEqual([
			"gold",
			"silver",
			"bronze",
		]);
	});
});

describe("game-results message selection", () => {
	it("prefers sport-specific messages and falls back to generic variants", () => {
		const cricketMessage = pickWinnerMessage(
			[
				{
					medal: "gold",
					sportKey: null,
					order: 1,
					title: "Generic gold",
					body: "Generic body",
				},
				{
					medal: "gold",
					sportKey: "cricket",
					order: 2,
					title: "Cricket gold",
					body: "Cricket body",
				},
			],
			{
				medal: "gold",
				sport: "Cricket",
				seed: "challenge:gold",
			},
		);
		const tennisMessage = pickWinnerMessage(
			[
				{
					medal: "gold",
					sportKey: null,
					order: 1,
					title: "Generic gold",
					body: "Generic body",
				},
				{
					medal: "gold",
					sportKey: "cricket",
					order: 2,
					title: "Cricket gold",
					body: "Cricket body",
				},
			],
			{
				medal: "gold",
				sport: "Tennis",
				seed: "challenge:gold",
			},
		);

		expect(cricketMessage?.title).toBe("Cricket gold");
		expect(tennisMessage?.title).toBe("Generic gold");
	});
});
