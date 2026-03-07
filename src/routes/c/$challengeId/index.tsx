import { useEffect, useMemo, useRef, useState } from "react";
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
		uuid ? { challengeId, uuid } : "skip"
	);

	const [storedParticipantId, setStoredParticipantIdState] = useState<
		string | null | undefined
	>(undefined);
	const participantId =
		participant?._id.toString() ?? storedParticipantId ?? null;
	const participantPredictions = useQuery(
		api.challenges.getParticipantPredictions,
		participantId ? { challengeId, participantId } : "skip"
	);

	const [nickname, setNickname] = useState("");
	const [selections, setSelections] = useState<Record<string, number>>({});
	const [isJoining, setIsJoining] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
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
	const isReadyToSubmit =
		orderedQuestions.length > 0 && answeredCount === orderedQuestions.length;

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
					<Link to="/" className="no-underline">
						Back home
					</Link>
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
			<PageShell className="gap-6 pt-0 pb-8">
				<PlayerHeader
					title={challenge.title}
					sport={challenge.sport}
					status={challenge.status}
					challengeId={challengeId}
				/>

				{!participant ? (
					<GlassCard className="px-5 py-6 sm:px-8">
						<SectionEyebrow>Join the challenge</SectionEyebrow>
						<h1 className="font-display text-foreground text-4xl leading-none sm:text-5xl">
							{challenge.title}
						</h1>
						<p className="text-muted-foreground mt-4 text-base leading-7">
							One shot. No changes. Lock your picks before the results start
							moving.
						</p>
						<form className="mt-6 flex flex-col gap-4" onSubmit={handleJoin}>
							<label className="flex flex-col gap-2">
								<span className="text-foreground text-sm font-semibold">
									Nickname
								</span>
								<Input
									value={nickname}
									onChange={(event) => setNickname(event.target.value)}
									placeholder="Pick a name everyone will recognise"
									maxLength={20}
									autoComplete="nickname"
									autoCapitalize="words"
									enterKeyHint="go"
									spellCheck={false}
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
						<h1 className="font-display text-foreground text-4xl leading-none sm:text-5xl">
							You're locked in
						</h1>
						<p className="text-muted-foreground mt-4 text-base leading-7">
							Your picks are sealed. Watch the live leaderboard while the admin
							marks correct answers.
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

						<div className="mt-6 mb-20 grid gap-4">
							{orderedQuestions.map((question, questionIndex) => (
								<div
									key={question._id}
									className="border-border bg-secondary/30 rounded-xl border p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-start gap-3">
											<span className="text-muted-foreground mt-0.5 text-xs font-bold tracking-widest">
												Q{questionIndex + 1}
											</span>
											<h2 className="text-foreground text-lg leading-7 font-semibold">
												{question.text}
											</h2>
										</div>
										<Lock className="text-primary/60 mt-0.5 h-4 w-4 shrink-0" />
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
													{selections[question._id.toString()] ===
													optionIndex ? (
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
							You're joined as <strong>{participant.nickname}</strong>. Answer
							every question, then submit all picks at once.
						</InlineNotice>

						<div className="mb-28 grid gap-4">
							{orderedQuestions.map((question, questionIndex) => {
								const isAnswered =
									selections[question._id.toString()] !== undefined;
								return (
									<div
										key={question._id}
										id={`question-${question._id}`}
										className="border-border bg-secondary/30 scroll-mt-36 rounded-xl border p-4"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-start gap-3">
												<span className="text-muted-foreground mt-0.5 text-xs font-bold tracking-widest">
													Q{questionIndex + 1}
												</span>
												<h2 className="text-foreground text-lg leading-7 font-semibold">
													{question.text}
												</h2>
											</div>
											{isAnswered ? (
												<span className="bg-primary mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
													<Check className="h-3.5 w-3.5 text-black" />
												</span>
											) : null}
										</div>
										<div className="mt-4 grid gap-3">
											{question.options.map((option, optionIndex) => (
												<OptionButton
													key={option}
													onClick={() =>
														updateSelection(
															question._id.toString(),
															optionIndex
														)
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
								);
							})}
						</div>
					</>
				)}
			</PageShell>

			{participant && !hasSubmitted ? (
				<div
					className="fixed inset-x-0 bottom-0 z-40 px-4"
					style={{
						paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
					}}
				>
					<div className="border-border bg-card/95 mx-auto max-w-5xl overflow-hidden rounded-xl border shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
						{/* Visual progress bar */}
						<div className="h-1 w-full bg-zinc-800/60">
							<div
								className="bg-primary h-full transition-all duration-500 ease-out"
								style={{
									width: `${orderedQuestions.length > 0 ? (answeredCount / orderedQuestions.length) * 100 : 0}%`,
								}}
							/>
						</div>
						<div className="flex items-center gap-3 px-4 py-3">
							<div className="flex-1">
								<p className="text-foreground m-0 text-sm font-semibold">
									{answeredCount}/{orderedQuestions.length} picked
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
				</div>
			) : null}

			<BottomSheet
				open={isConfirmOpen}
				onClose={() => setIsConfirmOpen(false)}
				title="Lock in your predictions?"
				description="You can't change them after this. Make sure every answer looks right before you confirm."
				footer={
					<>
						<Button
							className="w-full"
							onClick={handleSubmitPredictions}
							disabled={isSubmitting}
						>
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
				<div className="border-border bg-secondary/40 grid gap-3 border px-4 py-3">
					<p className="text-muted-foreground m-0 text-xs font-bold tracking-[0.2em] uppercase">
						Challenge
					</p>
					<p className="text-foreground m-0 text-base font-semibold">
						{challenge.title}
					</p>
					<div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs font-semibold">
						<span>{challenge.sport}</span>
						<span>•</span>
						<span>
							{answeredCount}/{orderedQuestions.length} answered
						</span>
					</div>
				</div>
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
		<div
			className="sticky top-0 z-20 -mx-4 mb-2 border-b-2 border-zinc-800 bg-black px-4 pb-4"
			style={{
				paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
			}}
		>
			{" "}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<SectionEyebrow className="mb-2">PredictGame</SectionEyebrow>
					<h1 className="font-display text-3xl leading-none text-white uppercase">
						{title}
					</h1>
					<div className="mt-3 flex flex-wrap gap-2">
						<SportBadge sport={sport} />
						<StatusBadge status={status} />
					</div>
				</div>
				<Button variant="outline" asChild className="w-full sm:w-auto">
					<Link
						to="/c/$challengeId/leaderboard"
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
