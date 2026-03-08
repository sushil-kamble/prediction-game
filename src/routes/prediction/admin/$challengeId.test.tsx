import type {
	AnchorHTMLAttributes,
	ButtonHTMLAttributes,
	ReactNode,
} from "react";
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
		},
	},
}));

vi.mock("#/components/app/use-toast", () => ({
	useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock("#/components/app/results", () => ({
	PodiumSection: () => null,
}));

vi.mock("#/components/ui/alert-dialog", () => ({
	AlertDialog: ({ children }: { children: ReactNode }) => <>{children}</>,
	AlertDialogAction: ({
		children,
		...props
	}: ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button type="button" {...props}>
			{children}
		</button>
	),
	AlertDialogCancel: ({
		children,
		...props
	}: ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button type="button" {...props}>
			{children}
		</button>
	),
	AlertDialogContent: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	AlertDialogDescription: ({ children }: { children: ReactNode }) => (
		<p>{children}</p>
	),
	AlertDialogFooter: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	AlertDialogTitle: ({ children }: { children: ReactNode }) => (
		<h2>{children}</h2>
	),
}));

vi.mock("#/lib/storage", () => ({
	getStoredAdminChallenge: () => ({ adminSecret: "admin-secret" }),
}));

import { AdminChallengeRoute } from "./$challengeId";

function buildAdminChallenge({
	correctOptionIndex = null,
}: {
	correctOptionIndex?: number | null;
}) {
	return {
		_id: "challenge-1",
		title: "World Cup Final",
		sport: "Cricket",
		status: "scoring" as const,
		questionEditUnlocked: false,
		winnersAnnouncedAt: null,
		questions: [
			{
				_id: "q1",
				text: "Who wins the final?",
				options: ["India", "Australia"],
				pointValue: 3,
				correctOptionIndex,
				order: 0,
			},
		],
	};
}

function buildLeaderboard() {
	return {
		participantCount: 3,
		submittedParticipantCount: 3,
		podium: [],
		winnersAnnounced: false,
	};
}

describe("AdminChallengeRoute", () => {
	beforeEach(() => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			correctOptionIndex: null,
		});
		mocks.queries.leaderboard = buildLeaderboard();
		Object.values(mocks.mutations).forEach((mutation) =>
			mutation.mockResolvedValue(undefined)
		);
		mocks.showToast.mockReset();
	});

	it("hides the unpublish action once the challenge has moved into scoring", async () => {
		render(<AdminChallengeRoute />);

		await screen.findByRole("heading", { name: /Score the board/i });

		expect(
			screen.queryByRole("button", { name: /Unpublish questions/i })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Unlock submissions/i })
		).toBeInTheDocument();
	});

	it("toggles a marked answer off when the same option is clicked again", async () => {
		mocks.queries.adminChallenge = buildAdminChallenge({
			correctOptionIndex: 1,
		});
		const user = userEvent.setup();

		render(<AdminChallengeRoute />);

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
