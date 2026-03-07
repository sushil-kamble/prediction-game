import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Check, Lock } from "lucide-react";
import {
	BottomSheet,
	Button,
	FullScreenState,
	GlassCard,
	InlineNotice,
	Input,
	OptionButton,
	PageShell,
	SectionEyebrow,
	SkeletonBlock,
	SportBadge,
	StatusBadge,
} from "#/components/app/ui";
import { useToast } from "#/components/app/use-toast";
import { api } from "#/lib/api";
import { buildLeaderboardUrl } from "#/lib/challenge";
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
	pointValue: number;
	order: number;
};

const getChallengeMeta = createServerFn({ method: "GET" })
	.inputValidator((input: { challengeId: string }) => input)
	.handler(async ({ data }) => await fetchChallengePreview(data.challengeId));

export const Route = createFileRoute("/c/$challengeId/")({
	loader: async ({ params }) =>
		await getChallengeMeta({ data: { challengeId: params.challengeId } }),
	head: ({ loaderData, params }) => {
		const title = loaderData?.title
			? `${loaderData.title} | PredictGame`
			: "PredictGame | Sports Prediction Challenge";
		const description = loaderData
			? `${loaderData.sport} Prediction Challenge - Can you predict the outcome? Join and lock in your picks.`
			: "PredictGame - Sports Prediction Challenge.";
		const url = `/c/${params.challengeId}`;

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

function PlayerChallengeRoute() {
	const { challengeId } = Route.useParams();
	const challenge = useQuery(api.challenges.getChallenge, { challengeId });
	const joinChallenge = useMutation(api.challenges.joinChallenge);
	const submitPredictions = useMutation(api.challenges.submitPredictions);
	const { showToast } = useToast();
	const uuid = useClientUUID();

	const participant = useQuery(
		api.challenges.getParticipant,
		uuid ? { challengeId, uuid } : "skip",
	);

	const [storedParticipantId, setStoredParticipantIdState] = useState<
		string | null | undefined
	>(undefined);
	const participantId =
		participant?._id.toString() ?? (storedParticipantId ?? null);
	const participantPredictions = useQuery(
		api.challenges.getParticipantPredictions,
		participantId ? { challengeId, participantId } : "skip",
	);

	const [nickname, setNickname] = useState("");
	const [selections, setSelections] = useState<Record<string, number>>({});
	const [isJoining, setIsJoining] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
			]),
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
		[challenge],
	);

	const hasSubmitted =
		participantPredictions !== undefined &&
		Object.keys(participantPredictions).length > 0;
	const answeredCount = Object.keys(selections).length;
	const isReadyToSubmit =
		orderedQuestions.length > 0 && answeredCount === orderedQuestions.length;
	const leaderboardHref =
		typeof window !== "undefined"
			? buildLeaderboardUrl(window.location.origin, challengeId)
			: `/c/${challengeId}/leaderboard`;

	if (
		challenge === undefined ||
		uuid === null ||
		storedParticipantId === undefined ||
		(participantId !== null && participantPredictions === undefined)
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
					<Link to="/" className="no-underline">Back home</Link>
				</Button>
			</FullScreenState>
		);
	}

	if (challenge.status === "draft") {
		return (
			<FullScreenState
				title="This challenge isn't open yet"
				description="Check back soon once the admin publishes the board."
			/>
		);
	}

	if (challenge.status === "closed") {
		return (
			<FullScreenState
				title="This challenge has ended"
				description="Predictions are locked. You can still jump straight to the leaderboard."
			>
				<Button asChild>
					<Link
						to="/c/$challengeId/leaderboard"
						params={{ challengeId }}
						className="no-underline"
					>
						Open leaderboard
					</Link>
				</Button>
			</FullScreenState>
		);
	}

	async function handleJoin(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedNickname = nickname.trim();
		if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
			showToast("Nickname must be between 2 and 20 characters.", "error");
			return;
		}

		if (!uuid) {
			showToast("Couldn't initialize a player ID. Refresh and try again.", "error");
			return;
		}

		setIsJoining(true);
		try {
			const nextParticipantId = await joinChallenge({
				challengeId,
				uuid,
				nickname: trimmedNickname,
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

	function updateSelection(questionId: string, optionIndex: number) {
		setSelections((current) => {
			const nextSelections = {
				...current,
				[questionId]: optionIndex,
			};
			setStoredPredictionDraft(challengeId, nextSelections);
			return nextSelections;
		});
	}

	async function handleSubmitPredictions() {
		if (!participantId) {
			showToast("Join the challenge before submitting predictions.", "error");
			return;
		}

		setIsSubmitting(true);
		try {
			await submitPredictions({
				challengeId,
				participantId,
				predictions: orderedQuestions.map((question) => ({
					questionId: question._id.toString(),
					selectedOptionIndex: selections[question._id.toString()],
				})),
			});
			clearStoredPredictionDraft(challengeId);
			setIsConfirmOpen(false);
			showToast("Predictions locked in.", "success");
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			<PageShell className="gap-6 py-5 sm:py-8">
				<PlayerHeader
					title={challenge.title}
					sport={challenge.sport}
					status={challenge.status}
					challengeId={challengeId}
				/>

				{!participant ? (
					<GlassCard className="px-5 py-6 sm:px-8">
						<SectionEyebrow>Join the challenge</SectionEyebrow>
						<h1 className="font-display text-4xl leading-none text-foreground sm:text-5xl">
							{challenge.title}
						</h1>
						<p className="mt-4 text-base leading-7 text-muted-foreground">
							One shot. No changes. Lock your picks before the results start moving.
						</p>
						<form className="mt-6 flex flex-col gap-4" onSubmit={handleJoin}>
							<label className="flex flex-col gap-2">
								<span className="text-sm font-semibold text-foreground">
									Nickname
								</span>
								<Input
									value={nickname}
									onChange={(event) => setNickname(event.target.value)}
									placeholder="Pick a name everyone will recognise"
									maxLength={20}
								/>
							</label>
							<Button type="submit" className="w-full" disabled={isJoining}>
								{isJoining ? "Joining..." : "Let's go"}
							</Button>
						</form>
					</GlassCard>
				) : hasSubmitted ? (
					<GlassCard className="px-5 py-6 sm:px-8">
						<SectionEyebrow>Locked in</SectionEyebrow>
						<h1 className="font-display text-4xl leading-none text-foreground sm:text-5xl">
							You're locked in
						</h1>
						<p className="mt-4 text-base leading-7 text-muted-foreground">
							Your picks are sealed. Watch the live leaderboard while the admin marks
							correct answers.
						</p>
						<Button className="mt-6" asChild>
							<Link
								to="/c/$challengeId/leaderboard"
								params={{ challengeId }}
								className="no-underline"
							>
								Open leaderboard
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>

						<div className="mt-6 grid gap-4">
							{orderedQuestions.map((question) => (
								<div
									key={question._id}
									className="rounded-xl border border-border bg-secondary/30 p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
												{question.pointValue} pts
											</p>
											<h2 className="mt-2 text-lg font-semibold leading-7 text-foreground">
												{question.text}
											</h2>
										</div>
										<Lock className="h-4 w-4 text-primary/60" />
									</div>
									<div className="mt-4 grid gap-3">
										{question.options.map((option, optionIndex) => (
											<OptionButton
												key={option}
												locked
												selected={
													selections[question._id.toString()] === optionIndex
												}
											>
												<span className="flex items-center gap-2">
													{selections[question._id.toString()] === optionIndex ? (
														<Check className="h-4 w-4" />
													) : null}
													{option}
												</span>
											</OptionButton>
										))}
									</div>
								</div>
							))}
						</div>
					</GlassCard>
				) : (
					<>
						<InlineNotice tone="success">
							You're joined as <strong>{participant.nickname}</strong>. Answer every
							question, then submit all picks at once.
						</InlineNotice>

						<div className="grid gap-4">
							{orderedQuestions.map((question) => (
								<div
									key={question._id}
									className="rounded-xl border border-border bg-secondary/30 p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
												{question.pointValue} pts
											</p>
											<h2 className="mt-2 text-lg font-semibold leading-7 text-foreground">
												{question.text}
											</h2>
										</div>
									</div>
									<div className="mt-4 grid gap-3">
										{question.options.map((option, optionIndex) => (
											<OptionButton
												key={option}
												onClick={() =>
													updateSelection(question._id.toString(), optionIndex)
												}
												selected={
													selections[question._id.toString()] === optionIndex
												}
											>
												{option}
											</OptionButton>
										))}
									</div>
								</div>
							))}
						</div>
					</>
				)}
			</PageShell>

			{participant && !hasSubmitted ? (
				<div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
					<div className="mx-auto flex max-w-5xl items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
						<div className="flex-1">
							<p className="m-0 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
								Progress
							</p>
							<p className="mt-1 text-sm font-semibold text-foreground">
								{answeredCount} of {orderedQuestions.length} answered
							</p>
						</div>
						<Button
							onClick={() => setIsConfirmOpen(true)}
							disabled={!isReadyToSubmit}
						>
							Submit all
						</Button>
					</div>
				</div>
			) : null}

			<BottomSheet
				open={isConfirmOpen}
				onClose={() => setIsConfirmOpen(false)}
				title="Lock in your predictions?"
				description="You can't change them after this. Make sure every answer looks right before you confirm."
				footer={
					<>
						<Button className="w-full" onClick={handleSubmitPredictions} disabled={isSubmitting}>
							{isSubmitting ? "Submitting..." : "Confirm picks"}
						</Button>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => setIsConfirmOpen(false)}
						>
							Go back
						</Button>
					</>
				}
			>
				<InlineNotice tone="warning">
					Leaderboard link:
					<br />
					<a href={leaderboardHref}>{leaderboardHref}</a>
				</InlineNotice>
			</BottomSheet>
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
	status: "open" | "scoring";
	challengeId: string;
}) {
	return (
		<GlassCard className="sticky top-4 z-20 px-5 py-4 backdrop-blur-xl">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<SectionEyebrow>PredictGame</SectionEyebrow>
					<h1 className="font-display text-3xl leading-none text-foreground">
						{title}
					</h1>
					<div className="mt-3 flex flex-wrap gap-2">
						<SportBadge sport={sport} />
						<StatusBadge status={status} />
					</div>
				</div>
				<Button variant="outline" asChild>
					<Link
						to="/c/$challengeId/leaderboard"
						params={{ challengeId }}
						className="no-underline"
					>
						Leaderboard
					</Link>
				</Button>
			</div>
		</GlassCard>
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
