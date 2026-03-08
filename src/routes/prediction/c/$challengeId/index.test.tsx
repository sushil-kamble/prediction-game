import type { AnchorHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	params: { challengeId: "challenge-1" },
	queries: {
		challenge: null as unknown,
		leaderboard: undefined as unknown,
		participant: null as unknown,
		participantPredictions: undefined as unknown,
		participantAnswerReview: undefined as unknown,
	},
	mutations: {
		joinChallenge: vi.fn(),
		recoverParticipantByUsername: vi.fn(),
		submitPredictions: vi.fn(),
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

vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => ({
		inputValidator: () => ({
			handler: () => vi.fn(),
		}),
	}),
}));

vi.mock("convex/react", () => ({
	useQuery: (query: unknown, args: unknown) => {
		if (args === "skip") {
			return undefined;
		}

		if (query === "getChallenge") {
			return mocks.queries.challenge;
		}

		if (query === "getLeaderboard") {
			return mocks.queries.leaderboard;
		}

		if (query === "getParticipant") {
			return mocks.queries.participant;
		}

		if (query === "getParticipantPredictions") {
			return mocks.queries.participantPredictions;
		}

		if (query === "getParticipantAnswerReview") {
			return mocks.queries.participantAnswerReview;
		}

		return undefined;
	},
	useMutation: (mutation: unknown) => {
		switch (mutation) {
			case "joinChallenge":
				return mocks.mutations.joinChallenge;
			case "recoverParticipantByUsername":
				return mocks.mutations.recoverParticipantByUsername;
			case "submitPredictions":
				return mocks.mutations.submitPredictions;
			default:
				return vi.fn();
		}
	},
}));

vi.mock("#/lib/api", () => ({
	api: {
		challenges: {
			getChallenge: "getChallenge",
			getLeaderboard: "getLeaderboard",
			getParticipant: "getParticipant",
			getParticipantPredictions: "getParticipantPredictions",
			getParticipantAnswerReview: "getParticipantAnswerReview",
			joinChallenge: "joinChallenge",
			recoverParticipantByUsername: "recoverParticipantByUsername",
			submitPredictions: "submitPredictions",
		},
	},
}));

vi.mock("#/components/app/use-toast", () => ({
	useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock("#/components/app/results", () => ({
	ParticipantAnswerReview: () => null,
	PodiumSection: () => null,
	ResultHero: () => null,
	ResultsRecoveryCard: () => null,
}));

vi.mock("#/lib/use-client-uuid", () => ({
	useClientUUID: () => "uuid-1",
}));

vi.mock("#/lib/storage", () => ({
	clearStoredPredictionDraft: vi.fn(),
	getStoredParticipantId: () => null,
	getStoredPredictionDraft: () => ({}),
	setStoredParticipantId: vi.fn(),
	setStoredPredictionDraft: vi.fn(),
}));

vi.mock("#/lib/convex-server", () => ({
	fetchChallengePreview: vi.fn(),
}));

import { PlayerChallengeRoute } from "./index";

type ChallengeStatus = "draft" | "open" | "scoring" | "closed";

function buildChallenge({
	status,
	questionEditUnlocked = false,
}: {
	status: ChallengeStatus;
	questionEditUnlocked?: boolean;
}) {
	return {
		_id: "challenge-1",
		title: "World Cup Final",
		sport: "Cricket",
		status,
		questionEditUnlocked,
		winnersAnnouncedAt: null,
		questions: [
			{
				_id: "q1",
				text: "Who wins the final?",
				options: ["India", "Australia"],
				order: 0,
			},
		],
	};
}

function renderRoute() {
	return render(<PlayerChallengeRoute />);
}

describe("PlayerChallengeRoute", () => {
	beforeEach(() => {
		mocks.queries.challenge = buildChallenge({
			status: "open",
			questionEditUnlocked: true,
		});
		mocks.queries.leaderboard = undefined;
		mocks.queries.participant = null;
		mocks.queries.participantPredictions = undefined;
		mocks.queries.participantAnswerReview = undefined;
		mocks.showToast.mockReset();
		Object.values(mocks.mutations).forEach((mutation) => mutation.mockReset());
	});

	it("blocks players when the challenge is still a draft", async () => {
		mocks.queries.challenge = buildChallenge({
			status: "draft",
			questionEditUnlocked: true,
		});

		renderRoute();

		expect(
			await screen.findByRole("heading", {
				name: /This challenge isn't open yet/i,
			})
		).toBeInTheDocument();
		expect(
			screen.getByText(/Check back soon once the admin publishes the board/i)
		).toBeInTheDocument();
	});

	it("blocks players when the admin has unpublished the question set", async () => {
		renderRoute();

		expect(
			await screen.findByRole("heading", { name: /Questions are unpublished/i })
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/The admin is updating this challenge right now\. Please check back once the questions are republished\./i
			)
		).toBeInTheDocument();
	});

	it("shows the locked screen when scoring has started and the player never joined", async () => {
		mocks.queries.challenge = buildChallenge({
			status: "scoring",
			questionEditUnlocked: false,
		});

		renderRoute();

		expect(
			await screen.findByRole("heading", { name: /Predictions are locked/i })
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/Scoring has started, so new picks and changes are no longer allowed\./i
			)
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Open leaderboard/i })
		).toBeInTheDocument();
	});

	it("shows cancelled message when challenge is closed without winners", async () => {
		mocks.queries.challenge = {
			...buildChallenge({ status: "closed" }),
			winnersAnnouncedAt: null,
		};
		mocks.queries.leaderboard = {
			currentParticipant: null,
			celebrationMessage: null,
			participantCount: 3,
			podium: [],
			winnersAnnounced: false,
		};

		renderRoute();

		expect(
			await screen.findByRole("heading", {
				name: /This challenge was cancelled/i,
			})
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/The admin closed this challenge without announcing winners/i
			)
		).toBeInTheDocument();
	});

	it("shows joined-but-never-submitted message for participants with zero answers", async () => {
		mocks.queries.challenge = {
			...buildChallenge({ status: "closed" }),
			winnersAnnouncedAt: Date.now(),
		};
		mocks.queries.participant = {
			_id: "participant-1",
			nickname: "Sushil",
		};
		mocks.queries.participantPredictions = {};
		mocks.queries.participantAnswerReview = [];
		mocks.queries.leaderboard = {
			currentParticipant: {
				nickname: "Sushil",
				rank: 5,
				medal: null,
				score: 0,
				correctCount: 0,
				totalAnswered: 0,
				accuracy: null,
				isWinner: false,
			},
			celebrationMessage: null,
			participantCount: 5,
			podium: [],
			winnersAnnounced: true,
		};

		renderRoute();

		expect(
			await screen.findByRole("heading", {
				name: /You joined but didn't submit predictions/i,
			})
		).toBeInTheDocument();
	});

	it("shows a read-only scoring state for an existing participant", async () => {
		mocks.queries.challenge = buildChallenge({
			status: "scoring",
			questionEditUnlocked: false,
		});
		mocks.queries.participant = {
			_id: "participant-1",
			nickname: "Sushil",
		};
		mocks.queries.participantPredictions = {};

		renderRoute();

		expect(
			await screen.findByText(
				/Predictions are locked\. Your picks are shown below as read-only\./i
			)
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Open leaderboard/i })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: /Questions are unpublished/i })
		).not.toBeInTheDocument();
	});
});
