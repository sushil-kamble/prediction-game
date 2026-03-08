import { describe, expect, it } from "vitest";
import {
	canUnpublishChallengeQuestions,
	getAdminWorkflow,
	getPlayerChallengeBlocker,
	toggleCorrectOptionIndex,
} from "./challenge";

describe("challenge workflow helpers", () => {
	it("starts the admin flow with question setup for an empty draft", () => {
		const workflow = getAdminWorkflow({
			status: "draft",
			questionCount: 0,
			questionsPublished: false,
			scoredCount: 0,
			totalQuestions: 0,
			hasSubmissions: false,
			winnersAnnounced: false,
		});

		expect(workflow.title).toBe("Add your first question");
		expect(workflow.primaryAction).toStrictEqual({
			type: "focus-questions",
			label: "Add question",
		});
		expect(workflow.steps.map((step) => step.state)).toStrictEqual([
			"current",
			"upcoming",
			"upcoming",
			"upcoming",
			"upcoming",
			"upcoming",
		]);
	});

	it("moves a draft with questions to the publish step", () => {
		const workflow = getAdminWorkflow({
			status: "draft",
			questionCount: 4,
			questionsPublished: false,
			scoredCount: 0,
			totalQuestions: 4,
			hasSubmissions: false,
			winnersAnnounced: false,
		});

		expect(workflow.title).toBe("Publish the challenge");
		expect(workflow.primaryAction).toStrictEqual({
			type: "publish",
			label: "Publish challenge",
		});
		expect(workflow.steps.map((step) => step.state)).toStrictEqual([
			"complete",
			"current",
			"upcoming",
			"upcoming",
			"upcoming",
			"upcoming",
		]);
	});

	it("treats unpublished live questions as a republish step", () => {
		const workflow = getAdminWorkflow({
			status: "open",
			questionCount: 4,
			questionsPublished: false,
			scoredCount: 0,
			totalQuestions: 4,
			hasSubmissions: false,
			winnersAnnounced: false,
		});

		expect(workflow.title).toBe("Republish the question set");
		expect(workflow.primaryAction).toStrictEqual({
			type: "publish",
			label: "Publish questions",
		});
		expect(workflow.steps[1]?.state).toBe("current");
	});

	it("surfaces lock submissions once the challenge is live", () => {
		const workflow = getAdminWorkflow({
			status: "open",
			questionCount: 4,
			questionsPublished: true,
			scoredCount: 0,
			totalQuestions: 4,
			hasSubmissions: false,
			winnersAnnounced: false,
		});

		expect(workflow.title).toBe("Collect predictions");
		expect(workflow.primaryAction).toStrictEqual({
			type: "lock-predictions",
			label: "Lock submissions",
		});
		expect(workflow.steps.map((step) => step.state)).toStrictEqual([
			"complete",
			"complete",
			"current",
			"upcoming",
			"upcoming",
			"upcoming",
		]);
	});

	it("moves scoring into answer marking once submissions are locked", () => {
		const workflow = getAdminWorkflow({
			status: "scoring",
			questionCount: 4,
			questionsPublished: true,
			scoredCount: 2,
			totalQuestions: 4,
			hasSubmissions: true,
			winnersAnnounced: false,
		});

		expect(workflow.title).toBe("Mark the correct answers");
		expect(workflow.primaryAction).toStrictEqual({
			type: "focus-scoring",
			label: "Mark answers",
		});
		expect(workflow.steps.map((step) => step.state)).toStrictEqual([
			"complete",
			"complete",
			"complete",
			"complete",
			"current",
			"upcoming",
		]);
	});

	it("requires at least one submitted player before announcing winners", () => {
		const workflow = getAdminWorkflow({
			status: "scoring",
			questionCount: 4,
			questionsPublished: true,
			scoredCount: 4,
			totalQuestions: 4,
			hasSubmissions: false,
			winnersAnnounced: false,
		});

		expect(workflow.title).toBe("Waiting for submissions");
		expect(workflow.primaryAction).toStrictEqual({
			type: "announce-winners",
			label: "Announce winners",
			disabled: true,
		});
		expect(workflow.steps.at(-1)?.state).toBe("current");
	});

	it("finishes with winner announcement once scoring is complete and submissions exist", () => {
		const workflow = getAdminWorkflow({
			status: "scoring",
			questionCount: 4,
			questionsPublished: true,
			scoredCount: 4,
			totalQuestions: 4,
			hasSubmissions: true,
			winnersAnnounced: false,
		});

		expect(workflow.title).toBe("Announce the winners");
		expect(workflow.primaryAction).toStrictEqual({
			type: "announce-winners",
			label: "Announce winners",
			disabled: false,
		});
		expect(workflow.steps.at(-1)?.state).toBe("current");
	});

	it("marks every step complete after winners are announced", () => {
		const workflow = getAdminWorkflow({
			status: "closed",
			questionCount: 4,
			questionsPublished: true,
			scoredCount: 4,
			totalQuestions: 4,
			hasSubmissions: true,
			winnersAnnounced: true,
		});

		expect(workflow.primaryAction).toBeNull();
		expect(workflow.steps.every((step) => step.state === "complete")).toBe(
			true
		);
	});
});

describe("player challenge blockers", () => {
	it("blocks unpublished drafts from players", () => {
		expect(
			getPlayerChallengeBlocker({
				status: "draft",
				questionEditUnlocked: true,
			})
		).toStrictEqual({
			title: "This challenge isn't open yet",
			description: "Check back soon once the admin publishes the board.",
		});
	});

	it("blocks players when questions are unpublished for edits", () => {
		expect(
			getPlayerChallengeBlocker({
				status: "open",
				questionEditUnlocked: true,
			})
		).toStrictEqual({
			title: "Questions are unpublished",
			description:
				"The admin is updating this challenge right now. Please check back once the questions are republished.",
		});
	});

	it("allows players through when the challenge is live and published", () => {
		expect(
			getPlayerChallengeBlocker({
				status: "open",
				questionEditUnlocked: false,
			})
		).toBeNull();
	});
});

describe("admin lifecycle guard helpers", () => {
	it("only allows unpublishing published open challenges with no submissions", () => {
		expect(
			canUnpublishChallengeQuestions({
				status: "open",
				submittedCount: 0,
				questionEditUnlocked: false,
			})
		).toBe(true);
		expect(
			canUnpublishChallengeQuestions({
				status: "open",
				submittedCount: 1,
				questionEditUnlocked: false,
			})
		).toBe(false);
		expect(
			canUnpublishChallengeQuestions({
				status: "scoring",
				submittedCount: 0,
				questionEditUnlocked: false,
			})
		).toBe(false);
		expect(
			canUnpublishChallengeQuestions({
				status: "open",
				submittedCount: 0,
				questionEditUnlocked: true,
			})
		).toBe(false);
	});

	it("toggles a marked answer off when the same option is selected again", () => {
		expect(toggleCorrectOptionIndex(2, 2)).toBeNull();
		expect(toggleCorrectOptionIndex(2, 1)).toBe(1);
		expect(toggleCorrectOptionIndex(null, 0)).toBe(0);
	});
});
