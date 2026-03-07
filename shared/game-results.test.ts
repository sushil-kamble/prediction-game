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
	it("breaks ties using earlier final submission time", () => {
		const rows = buildLeaderboardRows({
			participants: [
				{
					participantId: "p1",
					nickname: "Alpha",
					uuid: "uuid-1",
					joinedAt: 1,
					submittedAt: 200,
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

		expect(rows.map((row) => row.participantId)).toStrictEqual(["p2", "p1", "p3"]);
		expect(rows.map((row) => row.medal)).toStrictEqual([
			"gold",
			"silver",
			"bronze",
		]);
		expect(rows[0]?.rank).toBe(1);
		expect(rows[1]?.rank).toBe(2);
		expect(rows[2]?.rank).toBe(3);
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
