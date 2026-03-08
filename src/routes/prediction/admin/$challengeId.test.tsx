import type { AnchorHTMLAttributes } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	params: { challengeId: "challenge-1" },
	queries: {
		adminChallenge: null as unknown,
		leaderboard: null as unknown,
	},
	mutations: {
		addQuestion: vi.fn(),
		updateQuestion: vi.fn(),
		deleteQuestion: vi.fn(),
		publishChallenge: vi.fn(),
		unpublishChallenge: vi.fn(),
		lockPredictions: vi.fn(),
		unlockPredictions: vi.fn(),
		markCorrectAnswer: vi.fn(),
		clearAnswerMarkings: vi.fn(),
		announceWinners: vi.fn(),
		closeChallenge: vi.fn(),
	},
	showToast: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: Record<string, unknown>) => ({
		...options,
		useParams: () => mocks.params,
	}),
	Link: ({
		children,
		to,
		...props
	}: AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
}));

vi.mock("convex/react", () => ({
	useQuery: (query: unknown, args: unknown) => {
		if (args === "skip") {
			return undefined;
		}

		if (query === "getAdminChallenge") {
			return mocks.queries.adminChallenge;
		}

		if (query === "getLeaderboard") {
			return mocks.queries.leaderboard;
		}

		return undefined;
	},
	useMutation: (mutation: unknown) => {
		switch (mutation) {
			case "addQuestion":
				return mocks.mutations.addQuestion;
			case "updateQuestion":
				return mocks.mutations.updateQuestion;
			case "deleteQuestion":
				return mocks.mutations.deleteQuestion;
			case "publishChallenge":
				return mocks.mutations.publishChallenge;
			case "unpublishChallenge":
				return mocks.mutations.unpublishChallenge;
			case "lockPredictions":
				return mocks.mutations.lockPredictions;
			case "unlockPredictions":
				return mocks.mutations.unlockPredictions;
			case "markCorrectAnswer":
				return mocks.mutations.markCorrectAnswer;
			case "clearAnswerMarkings":
				return mocks.mutations.clearAnswerMarkings;
			case "announceWinners":
				return mocks.mutations.announceWinners;
			case "closeChallenge":
				return mocks.mutations.closeChallenge;
			default:
				return vi.fn();
		}
	},
}));

vi.mock("#/lib/api", () => ({
	api: {
		challenges: {
			getAdminChallenge: "getAdminChallenge",
			getLeaderboard: "getLeaderboard",
			addQuestion: "addQuestion",
			updateQuestion: "updateQuestion",
			deleteQuestion: "deleteQuestion",
			publishChallenge: "publishChallenge",
			unpublishChallenge: "unpublishChallenge",
			lockPredictions: "lockPredictions",
			unlockPredictions: "unlockPredictions",
			markCorrectAnswer: "markCorrectAnswer",
			clearAnswerMarkings: "clearAnswerMarkings",
			announceWinners: "announceWinners",
			closeChallenge: "closeChallenge",
		},
	},
}));

vi.mock("#/components/app/use-toast", () => ({
	useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock("#/components/app/results", () => ({
	PodiumSection: () => null,
}));

vi.mock("#/components/app/admin/admin-dialogs", () => ({
	AdminDialogs: () => null,
}));


vi.mock("#/lib/storage", () => ({
	getStoredAdminChallenge: () => ({ adminSecret: "admin-secret" }),
}));

import { AdminChallengeRoute } from "./$challengeId";

type ChallengeStatus = "draft" | "open" | "scoring" | "closed";

function buildAdminChallenge({
	status,
	questionEditUnlocked,
	questionCount,
	answeredCount = 0,
	winnersAnnouncedAt = null,
}: {
	status: ChallengeStatus;
	questionEditUnlocked?: boolean;
	questionCount: number;
	answeredCount?: number;
	winnersAnnouncedAt?: number | null;
}) {
	return {
		_id: "challenge-1",
		title: "World Cup Final",
		sport: "Cricket",
		status,
		questionEditUnlocked:
			questionEditUnlocked ?? (status === "draft" ? true : false),
		winnersAnnouncedAt,
		questions: Array.from({ length: questionCount }, (_, index) => ({
			_id: `q${index + 1}`,
			text: `Question ${index + 1}`,
			options: ["Option A", "Option B", "Option C"],
			pointValue: 3,
			correctOptionIndex: index < answeredCount ? 1 : null,
			order: index,
		})),
	};
}

function buildLeaderboard({
	participantCount = 0,
	submittedParticipantCount = 0,
}: {
	participantCount?: number;
	submittedParticipantCount?: number;
} = {}) {
	return {
		participantCount,
		submittedParticipantCount,
		podium: [],
		winnersAnnounced: false,
	};
}

function renderRoute() {
	return render(<AdminChallengeRoute />);
}

describe("AdminChallengeRoute", () => {
	beforeEach(() => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			status: "draft",
			questionCount: 0,
		});
		mocks.queries.leaderboard = buildLeaderboard();
		Object.values(mocks.mutations).forEach((mutation) => {
			mutation.mockReset();
			mutation.mockResolvedValue(undefined);
		});
		mocks.showToast.mockReset();
	});

	it("starts an empty draft on the add-question step", async () => {
		renderRoute();

	expect(
		await screen.findByRole("heading", { name: /Add your first question/i })
	).toBeInTheDocument();
	expect(screen.getAllByRole("button", { name: /Add question/i })).toHaveLength(
		2
	);
	expect(
		screen.queryByRole("link", { name: /Preview leaderboard/i })
	).not.toBeInTheDocument();
	});

	it("moves a draft with questions to publish", async () => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			status: "draft",
			questionCount: 3,
		});

		renderRoute();

		expect(
			await screen.findByRole("button", { name: /Publish challenge/i })
		).toBeInTheDocument();
	});

	it("shows unpublish questions only for an open published challenge with no submissions", async () => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			status: "open",
			questionCount: 3,
			questionEditUnlocked: false,
		});

		renderRoute();

		expect(
			await screen.findByRole("button", { name: /Lock submissions/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Unpublish questions/i })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Unlock submissions/i })
		).not.toBeInTheDocument();
	});

	it("hides unpublish questions once submissions already exist", async () => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			status: "open",
			questionCount: 3,
			questionEditUnlocked: false,
		});
		mocks.queries.leaderboard = buildLeaderboard({
			participantCount: 4,
			submittedParticipantCount: 2,
		});

		renderRoute();

		await screen.findByRole("button", { name: /Lock submissions/i });

		expect(
			screen.queryByRole("button", { name: /Unpublish questions/i })
		).not.toBeInTheDocument();
	});

	it("shows unlock submissions only before any answers are marked", async () => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			status: "scoring",
			questionCount: 3,
			answeredCount: 0,
		});
		mocks.queries.leaderboard = buildLeaderboard({
			participantCount: 5,
			submittedParticipantCount: 5,
		});

		renderRoute();

		expect(
			await screen.findByRole("button", { name: /Unlock submissions/i })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^Announce winners$/i })
		).not.toBeInTheDocument();
	});

	it("hides unlock submissions after scoring has started", async () => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			status: "scoring",
			questionCount: 3,
			answeredCount: 1,
		});
		mocks.queries.leaderboard = buildLeaderboard({
			participantCount: 5,
			submittedParticipantCount: 5,
		});

		renderRoute();

		await screen.findByRole("heading", { name: /Score the board/i });

		expect(
			screen.queryByRole("button", { name: /Unlock submissions/i })
		).not.toBeInTheDocument();
	});

	it("keeps announce winners hidden until all answers are marked and submissions exist", async () => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			status: "scoring",
			questionCount: 3,
			answeredCount: 3,
		});
		mocks.queries.leaderboard = buildLeaderboard({
			participantCount: 3,
			submittedParticipantCount: 0,
		});

		renderRoute();

	expect(
		await screen.findByText(
			/at least one submitted player is required before winners can be announced/i
		)
	).toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: /^Announce winners$/i })
	).toBeDisabled();
	});

	it("reveals announce winners once all answers are marked and submissions exist", async () => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			status: "scoring",
			questionCount: 3,
			answeredCount: 3,
		});
		mocks.queries.leaderboard = buildLeaderboard({
			participantCount: 6,
			submittedParticipantCount: 4,
		});

		renderRoute();

	expect(
		await screen.findAllByRole("button", { name: /^Announce winners$/i })
	).toHaveLength(2);
	});

	it("shows cancel challenge button for a non-closed challenge without winners", async () => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			status: "open",
			questionCount: 3,
			questionEditUnlocked: false,
		});

		renderRoute();

		expect(
			await screen.findByRole("button", { name: /Cancel challenge/i })
		).toBeInTheDocument();
	});

	it("hides cancel challenge button after winners are announced", async () => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			status: "closed",
			questionCount: 3,
			answeredCount: 3,
			winnersAnnouncedAt: Date.now(),
		});
		mocks.queries.leaderboard = {
			...buildLeaderboard({ participantCount: 5, submittedParticipantCount: 5 }),
			winnersAnnounced: true,
		};

		renderRoute();

		await screen.findByRole("heading", { name: /Winners are announced/i });

		expect(
			screen.queryByRole("button", { name: /Cancel challenge/i })
		).not.toBeInTheDocument();
	});

	it("toggles a marked answer off when the same option is clicked again", async () => {
		mocks.queries.adminChallenge = {
			...buildAdminChallenge({
				status: "scoring",
				questionCount: 1,
				answeredCount: 1,
			}),
			questions: [
				{
					_id: "q1",
					text: "Who wins the final?",
					options: ["India", "Australia"],
					pointValue: 3,
					correctOptionIndex: 1,
					order: 0,
				},
			],
		};
		mocks.queries.leaderboard = buildLeaderboard({
			participantCount: 3,
			submittedParticipantCount: 3,
		});
		const user = userEvent.setup();

		renderRoute();

		const selectedOption = await screen.findByRole("radio", {
			name: /Australia/i,
		});

		await user.click(selectedOption);

		await waitFor(() => {
			expect(mocks.mutations.markCorrectAnswer).toHaveBeenCalledWith({
				challengeId: "challenge-1",
				questionId: "q1",
				adminSecret: "admin-secret",
				correctOptionIndex: null,
			});
		});
	});
});
