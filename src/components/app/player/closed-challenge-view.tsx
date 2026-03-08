import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button, FullScreenState, PageShell } from "#/components/app/ui";
import {
	ParticipantAnswerReview,
	PodiumSection,
	ResultHero,
	ResultsRecoveryCard,
} from "#/components/app/results";

type MedalTier = "gold" | "silver" | "bronze";

type CurrentParticipantSummary = {
	nickname: string;
	rank: number;
	medal: MedalTier | null;
	score: number;
	correctCount: number;
	totalAnswered: number;
	accuracy: number | null;
	isWinner: boolean;
};

type CelebrationMessage = {
	medal: MedalTier;
	title: string;
	body: string;
} | null;

type PodiumEntry = {
	rank: number;
	medal: MedalTier;
	nickname: string;
	score: number;
	correctCount: number;
	totalAnswered: number;
	accuracy: number | null;
	isCurrentPlayer: boolean;
};

type ParticipantAnswerReviewItem = {
	questionId: string;
	order: number;
	text: string;
	pointValue: number;
	selectedOptionIndex: number | null;
	correctOptionIndex: number | null;
	isCorrect: boolean;
	options: Array<{
		index: number;
		text: string;
		isSelected: boolean;
		isCorrect: boolean;
	}>;
};

type Leaderboard = {
	currentParticipant: CurrentParticipantSummary | null;
	celebrationMessage: CelebrationMessage;
	participantCount: number;
	podium: PodiumEntry[];
	winnersAnnounced: boolean;
};

export function ClosedChallengeView({
	challenge,
	challengeId,
	leaderboard,
	participantAnswerReview,
	onRecover,
	isRecovering,
	playerHeader,
}: {
	challenge: {
		title: string;
		sport: string;
		status: string;
		winnersAnnouncedAt: number | null;
	};
	challengeId: string;
	leaderboard: Leaderboard | null;
	participantAnswerReview: ParticipantAnswerReviewItem[] | undefined;
	onRecover: (username: string) => Promise<void>;
	isRecovering: boolean;
	playerHeader: ReactNode;
}) {
	const [recoveryUsername, setRecoveryUsername] = useState("");

	if (!leaderboard) {
		return (
			<FullScreenState
				title="Leaderboard unavailable"
				description="This challenge couldn't load the latest standings."
			/>
		);
	}

	if (challenge.winnersAnnouncedAt) {
		const neverSubmitted =
			leaderboard.currentParticipant &&
			leaderboard.currentParticipant.totalAnswered === 0;

		if (leaderboard.currentParticipant && neverSubmitted) {
			return (
				<PageShell className="gap-6 pt-0 pb-8">
					{playerHeader}
					<div className="border-border bg-card rounded-xl border px-5 py-6 text-center sm:px-8">
						<h2 className="font-display text-foreground text-2xl">
							You joined but didn't submit predictions
						</h2>
						<p className="text-muted-foreground mt-3 text-sm leading-relaxed">
							You were part of this challenge, but no picks were locked in before the deadline. Unanswered questions count as incorrect.
						</p>
					</div>
					<PodiumSection
						podium={leaderboard.podium}
						winnersAnnounced={leaderboard.winnersAnnounced}
						title="The final podium"
					/>
					<Button asChild className="w-full sm:w-auto">
						<Link
							to="/prediction/c/$challengeId/leaderboard"
							params={{ challengeId }}
							className="no-underline"
						>
							Open full leaderboard
						</Link>
					</Button>
				</PageShell>
			);
		}

		if (leaderboard.currentParticipant) {
			return (
				<PageShell className="gap-6 pt-0 pb-8">
					{playerHeader}
					<ResultHero
						challengeTitle={challenge.title}
						currentParticipant={leaderboard.currentParticipant}
						celebrationMessage={leaderboard.celebrationMessage}
						participantCount={leaderboard.participantCount}
					/>
					<ParticipantAnswerReview answers={participantAnswerReview ?? []} />
					<PodiumSection
						podium={leaderboard.podium}
						winnersAnnounced={leaderboard.winnersAnnounced}
						title="The final podium"
					/>
					<Button asChild className="w-full sm:w-auto">
						<Link
							to="/prediction/c/$challengeId/leaderboard"
							params={{ challengeId }}
							className="no-underline"
						>
							Open full leaderboard
						</Link>
					</Button>
				</PageShell>
			);
		}

		return (
			<PageShell className="gap-6 pt-0 pb-8">
				{playerHeader}
				<ResultsRecoveryCard
					title="The game is over. Your result is waiting."
					description="If you joined this challenge with a private username, enter it here to reconnect this device to your picks and unlock your personalized final result."
					username={recoveryUsername}
					onUsernameChange={setRecoveryUsername}
					onSubmit={() => void onRecover(recoveryUsername.trim())}
					isSubmitting={isRecovering}
					showLeaderboardAction={
						<Button variant="outline" asChild className="sm:flex-1">
							<Link
								to="/prediction/c/$challengeId/leaderboard"
								params={{ challengeId }}
								className="no-underline"
							>
								View public leaderboard
							</Link>
						</Button>
					}
				/>
				<PodiumSection
					podium={leaderboard.podium}
					winnersAnnounced={leaderboard.winnersAnnounced}
					title="Final podium"
				/>
			</PageShell>
		);
	}

	return (
		<FullScreenState
			title="This challenge was cancelled"
			description="The admin closed this challenge without announcing winners. You can still view the leaderboard."
		>
			<Button asChild>
				<Link
					to="/prediction/c/$challengeId/leaderboard"
					params={{ challengeId }}
					className="no-underline"
				>
					Open leaderboard
				</Link>
			</Button>
		</FullScreenState>
	);
}
