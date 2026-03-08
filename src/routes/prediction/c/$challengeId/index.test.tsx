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
	Link: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a {...props}>{children}</a>
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

describe("PlayerChallengeRoute", () => {
	beforeEach(() => {
		mocks.queries.challenge = {
			_id: "challenge-1",
			title: "World Cup Final",
			sport: "Cricket",
			status: "open" as const,
			questionEditUnlocked: true,
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
		mocks.queries.leaderboard = undefined;
		mocks.queries.participant = null;
		mocks.queries.participantPredictions = undefined;
		mocks.queries.participantAnswerReview = undefined;
	});

	it("blocks players when the admin has unpublished the question set", async () => {
		render(<PlayerChallengeRoute />);

		expect(
			await screen.findByRole("heading", { name: /Questions are unpublished/i })
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/The admin is updating this challenge right now\. Please check back once the questions are republished\./i
			)
		).toBeInTheDocument();
	});
});
