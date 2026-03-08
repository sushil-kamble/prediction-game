import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import {
	Button,
	FullScreenState,
	GlassCard,
	InlineNotice,
	PageShell,
	SectionEyebrow,
	SkeletonBlock,
	SportBadge,
	StatusBadge,
} from "#/components/app/ui";
import { ClosedChallengeView } from "#/components/app/player/closed-challenge-view";
import { JoinChallengeForm } from "#/components/app/player/join-challenge-form";
import { QuestionCard } from "#/components/app/player/question-card";
import { SubmitBar } from "#/components/app/player/submit-bar";
import { useToast } from "#/components/app/use-toast";
import { api } from "#/lib/api";
import { getPlayerChallengeBlocker } from "#/lib/challenge";
import { fetchChallengePreview } from "#/lib/convex-server";
import { useClientUUID } from "#/lib/use-client-uuid";
import {
	clearStoredPredictionDraft,
	getStoredParticipantId,
	getStoredPredictionDraft,
	setStoredParticipantId,
	setStoredPredictionDraft,
} from "#/lib/storage";

type PublicQuestion = {
	_id: string;
	text: string;
	options: string[];
	order: number;
};

type PublicChallenge = {
	_id: string;
	title: string;
	sport: string;
	status: "draft" | "open" | "scoring" | "closed";
	questionEditUnlocked: boolean;
	winnersAnnouncedAt: number | null;
	questions: PublicQuestion[];
};

const getChallengeMeta = createServerFn({ method: "GET" })
	.inputValidator((input: { challengeId: string }) => input)
	.handler(async ({ data }) => await fetchChallengePreview(data.challengeId));

export const Route = createFileRoute("/prediction/c/$challengeId/")({
	loader: async ({ params }) =>
		await getChallengeMeta({ data: { challengeId: params.challengeId } }),
	head: ({ loaderData, params }) => {
		const title = loaderData?.title
			? `${loaderData.title} | Sushil Games`
			: "Prediction Game | Sushil Games";
		const description = loaderData
			? `${loaderData.sport} Prediction Challenge - Can you predict the outcome? Join and lock in your picks.`
			: "Prediction Game - Sports Prediction Challenge.";
		const url = `/prediction/c/${params.challengeId}`;

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:url", content: url },
			],
		};
	},
	component: PlayerChallengeRoute,
});

export function PlayerChallengeRoute() {
	const { challengeId } = Route.useParams();
	const uuid = useClientUUID();
	const challenge = useQuery(api.challenges.getChallenge, { challengeId });
	const leaderboard = useQuery(
		api.challenges.getLeaderboard,
		challenge?.status === "closed"
			? {
					challengeId,
					uuid: uuid ?? undefined,
				}
			: "skip"
	);
	const joinChallenge = useMutation(api.challenges.joinChallenge);
	const recoverParticipantByUsername = useMutation(
		api.challenges.recoverParticipantByUsername
	);
	const submitPredictions = useMutation(api.challenges.submitPredictions);
	const { showToast } = useToast();

	const participant = useQuery(
		api.challenges.getParticipant,
		uuid ? { challengeId, uuid } : "skip"
	);

	const [storedParticipantId, setStoredParticipantIdState] = useState<
		string | null | undefined
	>(undefined);
	const participantId =
		participant?._id.toString() ?? storedParticipantId ?? null;
	const participantPredictions = useQuery(
		api.challenges.getParticipantPredictions,
		participantId && uuid ? { challengeId, participantId, uuid } : "skip"
	);
	const participantAnswerReview = useQuery(
		api.challenges.getParticipantAnswerReview,
		participantId && uuid && Boolean(challenge?.winnersAnnouncedAt)
			? { challengeId, participantId, uuid }
			: "skip"
	);

	const [selections, setSelections] = useState<Record<string, number>>({});
	const [isJoining, setIsJoining] = useState(false);
	const [isRecovering, setIsRecovering] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const hasInteracted = useRef(false);

	useEffect(() => {
		setStoredParticipantIdState(getStoredParticipantId(challengeId));
		setSelections(getStoredPredictionDraft(challengeId));
	}, [challengeId]);

	useEffect(() => {
		if (participant?._id) {
			const nextParticipantId = participant._id.toString();
			setStoredParticipantId(challengeId, nextParticipantId);
			setStoredParticipantIdState(nextParticipantId);
		}
	}, [challengeId, participant?._id]);

	useEffect(() => {
		if (!participantPredictions) {
			return;
		}

		const submittedSelections = Object.fromEntries(
			Object.values(participantPredictions).map((prediction) => [
				prediction.questionId.toString(),
				prediction.selectedOptionIndex,
			])
		);

		if (Object.keys(submittedSelections).length > 0) {
			setSelections(submittedSelections);
			clearStoredPredictionDraft(challengeId);
		}
	}, [challengeId, participantPredictions]);

	const orderedQuestions = useMemo(
		() =>
			(challenge?.questions ?? [])
				.slice()
				.sort((a, b) => a.order - b.order) as Array<PublicQuestion>,
		[challenge]
	);

	const hasSubmitted =
		participantPredictions !== undefined &&
		Object.keys(participantPredictions).length > 0;
	const answeredCount = Object.keys(selections).length;
	const playerChallengeBlocker = challenge
		? getPlayerChallengeBlocker({
				status: challenge.status,
				questionEditUnlocked: challenge.questionEditUnlocked,
			})
		: null;

	if (
		challenge === undefined ||
		uuid === null ||
		storedParticipantId === undefined ||
		(participantId !== null && participantPredictions === undefined) ||
		(Boolean(challenge?.winnersAnnouncedAt) &&
			participantId !== null &&
			participantAnswerReview === undefined) ||
		(challenge?.status === "closed" && leaderboard === undefined)
	) {
		return <PlayerChallengeSkeleton />;
	}

	if (challenge === null) {
		return (
			<FullScreenState
				title="Challenge not found"
				description="This link doesn't point to an active challenge."
			>
				<Button asChild>
					<Link to="/prediction" className="no-underline">
						Back home
					</Link>
				</Button>
			</FullScreenState>
		);
	}

	if (challenge.status === "closed" && leaderboard === null) {
		return (
			<FullScreenState
				title="Leaderboard unavailable"
				description="This challenge couldn't load the latest standings."
			/>
		);
	}

	if (playerChallengeBlocker) {
		return (
			<FullScreenState
				title={playerChallengeBlocker.title}
				description={playerChallengeBlocker.description}
			/>
		);
	}

	const playerHeader = (
		<PlayerHeader
			title={challenge.title}
			sport={challenge.sport}
			status={challenge.status}
			challengeId={challengeId}
		/>
	);

	if (challenge.status === "closed") {
		return (
			<ClosedChallengeView
				challenge={challenge}
				challengeId={challengeId}
				leaderboard={leaderboard ?? null}
				participantAnswerReview={participantAnswerReview}
				onRecover={handleRecover}
				isRecovering={isRecovering}
				playerHeader={playerHeader}
			/>
		);
	}

	if (challenge.status === "scoring" && !hasSubmitted && !participant) {
		return (
			<FullScreenState
				title="Predictions are locked"
				description="Scoring has started, so new picks and changes are no longer allowed."
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

	async function handleJoin(nickname: string, username: string | undefined) {
		if (!uuid) {
			showToast(
				"Couldn't initialize a player ID. Refresh and try again.",
				"error"
			);
			return;
		}

		setIsJoining(true);
		try {
			const nextParticipantId = await joinChallenge({
				challengeId,
				uuid,
				nickname,
				username,
			});
			setStoredParticipantId(challengeId, nextParticipantId.toString());
			setStoredParticipantIdState(nextParticipantId.toString());
			showToast("You're in. Make your picks.", "success");
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsJoining(false);
		}
	}

	async function handleRecover(username: string) {
		if (!uuid) {
			showToast(
				"Couldn't initialize this device. Refresh and try again.",
				"error"
			);
			return;
		}

		setIsRecovering(true);
		try {
			const result = await recoverParticipantByUsername({
				challengeId,
				uuid,
				username,
			});
			setStoredParticipantId(challengeId, result.participantId.toString());
			setStoredParticipantIdState(result.participantId.toString());
			showToast(`Welcome back, ${result.nickname}.`, "success");
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsRecovering(false);
		}
	}

	function updateSelection(questionId: string, optionIndex: number) {
		hasInteracted.current = true;
		setSelections((current) => {
			const nextSelections = {
				...current,
				[questionId]: optionIndex,
			};
			setStoredPredictionDraft(challengeId, nextSelections);

			// Auto-scroll to next unanswered question after a brief pause
			const nextUnanswered = orderedQuestions.find(
				(q) => nextSelections[q._id.toString()] === undefined
			);
			if (nextUnanswered) {
				requestAnimationFrame(() => {
					setTimeout(() => {
						document
							.getElementById(`question-${nextUnanswered._id}`)
							?.scrollIntoView({ behavior: "smooth", block: "center" });
					}, 250);
				});
			}

			return nextSelections;
		});
	}

	async function handleSubmitPredictions(): Promise<boolean> {
		if (!participantId) {
			showToast("Join the challenge before submitting predictions.", "error");
			return false;
		}
		if (!uuid) {
			showToast("Couldn't verify this device. Refresh and try again.", "error");
			return false;
		}

		setIsSubmitting(true);
		try {
			await submitPredictions({
				challengeId,
				participantId,
				uuid,
				predictions: orderedQuestions.map((question) => ({
					questionId: question._id.toString(),
					selectedOptionIndex: selections[question._id.toString()],
				})),
			});
			clearStoredPredictionDraft(challengeId);
			showToast("Predictions locked in.", "success");
			return true;
		} catch (error) {
			showToast(getErrorMessage(error), "error");
			return false;
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			<PageShell className="gap-6 pt-0 pb-8">
				{playerHeader}

				{!participant ? (
					<JoinChallengeForm
						challengeTitle={challenge.title}
						onJoin={handleJoin}
						onRecover={handleRecover}
						isJoining={isJoining}
						isRecovering={isRecovering}
						showToast={showToast}
					/>
				) : hasSubmitted ? (
					<GlassCard className="px-5 py-6 sm:px-8">
						<SectionEyebrow>Locked in</SectionEyebrow>
						<h1 className="font-display text-foreground text-4xl leading-none sm:text-5xl">
							You're locked in
						</h1>
						<p className="text-muted-foreground mt-4 text-base leading-7">
							Your picks are sealed. Watch the live leaderboard while the admin
							marks correct answers.
						</p>
						<Button className="mt-6" asChild>
							<Link
								to="/prediction/c/$challengeId/leaderboard"
								params={{ challengeId }}
								className="no-underline"
							>
								Open leaderboard
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>

						<div className="mt-6 mb-20 grid gap-4">
							{orderedQuestions.map((question, questionIndex) => (
								<QuestionCard
									key={question._id}
									question={question}
									questionIndex={questionIndex}
									selectedOptionIndex={selections[question._id.toString()]}
									mode="locked"
									lockIconClassName="text-primary/60"
								/>
							))}
						</div>
					</GlassCard>
				) : challenge.status === "scoring" ? (
					<>
						<InlineNotice tone="warning">
							Predictions are locked. Your picks are shown below as read-only.
						</InlineNotice>

						<div className="mb-8 grid gap-4">
							{orderedQuestions.map((question, questionIndex) => (
								<QuestionCard
									key={question._id}
									question={question}
									questionIndex={questionIndex}
									selectedOptionIndex={selections[question._id.toString()]}
									mode="locked"
								/>
							))}
						</div>

						<Button asChild>
							<Link
								to="/prediction/c/$challengeId/leaderboard"
								params={{ challengeId }}
								className="no-underline"
							>
								Open leaderboard
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>
					</>
				) : (
					<>
						<InlineNotice tone="success">
							You're joined as <strong>{participant.nickname}</strong>. Answer
							every question, then submit all picks at once.
						</InlineNotice>

						<div className="mb-28 grid gap-4">
							{orderedQuestions.map((question, questionIndex) => (
								<QuestionCard
									key={question._id}
									question={question}
									questionIndex={questionIndex}
									selectedOptionIndex={selections[question._id.toString()]}
									mode="active"
									onSelect={(optionIndex) =>
										updateSelection(question._id.toString(), optionIndex)
									}
								/>
							))}
						</div>
					</>
				)}
			</PageShell>

			{participant && !hasSubmitted && challenge.status !== "scoring" ? (
				<SubmitBar
					answeredCount={answeredCount}
					totalQuestions={orderedQuestions.length}
					challengeTitle={challenge.title}
					challengeSport={challenge.sport}
					onSubmit={handleSubmitPredictions}
					isSubmitting={isSubmitting}
				/>
			) : null}
		</>
	);
}

function PlayerHeader({
	title,
	sport,
	status,
	challengeId,
}: {
	title: string;
	sport: string;
	status: PublicChallenge["status"];
	challengeId: string;
}) {
	return (
		<div
			className="sticky top-0 z-20 -mx-4 mb-2 border-b-2 border-zinc-800 bg-black px-4 pb-4"
			style={{
				paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
			}}
		>
			{" "}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<SectionEyebrow className="mb-2">Sushil Games</SectionEyebrow>
					<h1 className="font-display text-3xl leading-none text-white uppercase">
						{title}
					</h1>
					<div className="mt-3 flex flex-wrap gap-2">
						<SportBadge sport={sport} />
						<StatusBadge status={status} />
					</div>
					<p className="mt-2 text-[11px] leading-snug text-zinc-500">
						Ties go to whoever answers more questions, then whoever submits
						fastest.
					</p>
				</div>
				<Button variant="outline" asChild className="w-full sm:w-auto">
					<Link
						to="/prediction/c/$challengeId/leaderboard"
						params={{ challengeId }}
						className="no-underline"
					>
						Leaderboard
					</Link>
				</Button>
			</div>
		</div>
	);
}

function PlayerChallengeSkeleton() {
	return (
		<PageShell className="gap-6 py-6 sm:py-8">
			<SkeletonBlock className="h-32" />
			<SkeletonBlock className="h-56" />
			<SkeletonBlock className="h-72" />
		</PageShell>
	);
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "Something went wrong. Please try again.";
}
