import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
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
import {
	PodiumSection,
	ResultHero,
	ResultsRecoveryCard,
} from "#/components/app/results";
import { useToast } from "#/components/app/use-toast";
import { api } from "#/lib/api";
import { optionLabel } from "#/lib/challenge";
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

type JoinFormErrors = {
	nickname?: string;
	username?: string;
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
		}
	},
	component: PlayerChallengeRoute,
});

function focusField(fieldId: string) {
	if (typeof document === "undefined") {
		return;
	}

	const field = document.getElementById(fieldId);
	if (field instanceof HTMLElement) {
		field.focus();
	}
}

function handleRadioOptionKeyDown(
	event: KeyboardEvent<HTMLButtonElement>,
	currentIndex: number,
	totalOptions: number,
	onSelect: (nextIndex: number) => void
) {
	switch (event.key) {
		case "ArrowDown":
		case "ArrowRight":
			event.preventDefault();
			onSelect((currentIndex + 1) % totalOptions);
			return
		case "ArrowUp":
		case "ArrowLeft":
			event.preventDefault();
			onSelect((currentIndex - 1 + totalOptions) % totalOptions);
			return
		case "Home":
			event.preventDefault();
			onSelect(0);
			return
		case "End":
			event.preventDefault();
			onSelect(totalOptions - 1);
			return
		default:
			return
	}
}

function PlayerChallengeRoute() {
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
	)
	const joinChallenge = useMutation(api.challenges.joinChallenge);
	const recoverParticipantByUsername = useMutation(
		api.challenges.recoverParticipantByUsername
	)
	const submitPredictions = useMutation(api.challenges.submitPredictions);
	const { showToast } = useToast();

	const participant = useQuery(
		api.challenges.getParticipant,
		uuid ? { challengeId, uuid } : "skip"
	)

	const [storedParticipantId, setStoredParticipantIdState] = useState<
		string | null | undefined
	>(undefined);
	const participantId =
		participant?._id.toString() ?? storedParticipantId ?? null;
	const participantPredictions = useQuery(
		api.challenges.getParticipantPredictions,
		participantId && uuid ? { challengeId, participantId, uuid } : "skip"
	)

	const [nickname, setNickname] = useState("");
	const [username, setUsername] = useState("");
	const [recoveryUsername, setRecoveryUsername] = useState("");
	const [joinErrors, setJoinErrors] = useState<JoinFormErrors>({});
	const [recoveryError, setRecoveryError] = useState<string | null>(null);
	const [selections, setSelections] = useState<Record<string, number>>({});
	const [isJoining, setIsJoining] = useState(false);
	const [isRecovering, setIsRecovering] = useState(false);
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
			return
		}

		const submittedSelections = Object.fromEntries(
			Object.values(participantPredictions).map((prediction) => [
				prediction.questionId.toString(),
				prediction.selectedOptionIndex,
			])
		)

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
	)

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
		(participantId !== null && participantPredictions === undefined) ||
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
		)
	}

	if (challenge.status === "closed" && leaderboard === null) {
		return (
			<FullScreenState
				title="Leaderboard unavailable"
				description="This challenge couldn't load the latest standings."
			/>
		)
	}

	if (challenge.status === "draft") {
		return (
			<FullScreenState
				title="This challenge isn't open yet"
				description="Check back soon once the admin publishes the board."
			/>
		)
	}

	if (challenge.status === "closed") {
		if (!leaderboard) {
			return (
				<FullScreenState
					title="Leaderboard unavailable"
					description="This challenge couldn't load the latest standings."
				/>
			)
		}

		if (challenge.winnersAnnouncedAt) {
			if (leaderboard?.currentParticipant) {
				return (
					<PageShell className="gap-6 pt-0 pb-8">
						<PlayerHeader
							title={challenge.title}
							sport={challenge.sport}
							status={challenge.status}
							challengeId={challengeId}
						/>
						<ResultHero
							challengeTitle={challenge.title}
							currentParticipant={leaderboard.currentParticipant}
							celebrationMessage={leaderboard.celebrationMessage}
							participantCount={leaderboard.participantCount}
						/>
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
				)
			}

			return (
				<PageShell className="gap-6 pt-0 pb-8">
					<PlayerHeader
						title={challenge.title}
						sport={challenge.sport}
						status={challenge.status}
						challengeId={challengeId}
					/>
					<ResultsRecoveryCard
						title="The game is over. Your result is waiting."
						description="If you joined this challenge with a private username, enter it here to reconnect this device to your picks and unlock your personalized final result."
						username={recoveryUsername}
						onUsernameChange={setRecoveryUsername}
						onSubmit={handleRecoverParticipant}
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
			)
		}

		return (
			<FullScreenState
				title="This challenge has ended"
				description="Predictions are locked. You can still jump straight to the leaderboard."
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
		)
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
		)
	}

	async function handleJoin(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedNickname = nickname.trim();
		const trimmedUsername = username.trim();
		const nextErrors: JoinFormErrors = {};

		if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
			nextErrors.nickname = "Nickname must be between 2 and 20 characters.";
		}

		if (
			trimmedUsername &&
			trimmedUsername.toLowerCase() === trimmedNickname.toLowerCase()
		) {
			nextErrors.username = "Username and nickname must be different.";
		}

		if (nextErrors.nickname || nextErrors.username) {
			setJoinErrors(nextErrors);
			focusField(nextErrors.nickname ? "player-nickname" : "player-username");
			showToast(
				nextErrors.nickname ??
					nextErrors.username ??
					"Check the highlighted fields.",
				"error"
			)
			return
		}

		if (!uuid) {
			showToast(
				"Couldn't initialize a player ID. Refresh and try again.",
				"error"
			)
			return
		}

		setJoinErrors({});
		setIsJoining(true);
		try {
			const nextParticipantId = await joinChallenge({
				challengeId,
				uuid,
				nickname: trimmedNickname,
				username: trimmedUsername || undefined,
			})
			setStoredParticipantId(challengeId, nextParticipantId.toString());
			setStoredParticipantIdState(nextParticipantId.toString());
			showToast("You're in. Make your picks.", "success");
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsJoining(false);
		}
	}

	async function handleRecoverParticipant() {
		const trimmedUsername = recoveryUsername.trim();
		if (!trimmedUsername) {
			setRecoveryError("Enter the username you saved for this challenge.");
			focusField("player-recovery-username");
			showToast("Enter the username you saved for this challenge.", "error");
			return
		}
		if (!uuid) {
			showToast(
				"Couldn't initialize this device. Refresh and try again.",
				"error"
			)
			return
		}

		setRecoveryError(null);
		setIsRecovering(true);
		try {
			const result = await recoverParticipantByUsername({
				challengeId,
				uuid,
				username: trimmedUsername,
			})
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
			}
			setStoredPredictionDraft(challengeId, nextSelections);

			// Auto-scroll to next unanswered question after a brief pause
			const nextUnanswered = orderedQuestions.find(
				(q) => nextSelections[q._id.toString()] === undefined
			)
			if (nextUnanswered) {
				requestAnimationFrame(() => {
					setTimeout(() => {
						document
							.getElementById(`question-${nextUnanswered._id}`)
							?.scrollIntoView({ behavior: "smooth", block: "center" });
					}, 250)
				})
			}

			return nextSelections;
		})
	}

	async function handleSubmitPredictions() {
		if (!participantId) {
			showToast("Join the challenge before submitting predictions.", "error");
			return
		}
		if (!uuid) {
			showToast("Couldn't verify this device. Refresh and try again.", "error");
			return
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
			})
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
									id="player-nickname"
									value={nickname}
									onChange={(event) => {
										setNickname(event.target.value);
										setJoinErrors((current) => ({
											...current,
											nickname: undefined,
										}))
									}}
									placeholder="Pick a name everyone will recognise"
									maxLength={20}
									autoComplete="nickname"
									autoCapitalize="words"
									enterKeyHint="go"
									spellCheck={false}
									aria-invalid={Boolean(joinErrors.nickname)}
									aria-describedby={
										joinErrors.nickname ? "player-nickname-error" : undefined
									}
								/>
								{joinErrors.nickname ? (
									<p
										id="player-nickname-error"
										className="text-sm leading-6 text-rose-300"
									>
										{joinErrors.nickname}
									</p>
								) : null}
							</label>
							<label className="flex flex-col gap-2">
								<span className="text-foreground text-sm font-semibold">
									Private username{" "}
									<span className="text-zinc-400">(optional)</span>
								</span>
								<Input
									id="player-username"
									value={username}
									onChange={(event) => {
										setUsername(event.target.value);
										setJoinErrors((current) => ({
											...current,
											username: undefined,
										}))
									}}
									placeholder="Only for logging in from another device"
									maxLength={20}
									autoComplete="username"
									autoCapitalize="none"
									enterKeyHint="go"
									spellCheck={false}
									aria-invalid={Boolean(joinErrors.username)}
									aria-describedby={
										joinErrors.username ? "player-username-error" : undefined
									}
								/>
								{joinErrors.username ? (
									<p
										id="player-username-error"
										className="text-sm leading-6 text-rose-300"
									>
										{joinErrors.username}
									</p>
								) : null}
								<p className="text-sm leading-6 text-zinc-400">
									This never appears on the leaderboard. Use it only if you want
									to recover this same entry on another device later.
								</p>
							</label>
							<Button type="submit" className="w-full" disabled={isJoining}>
								{isJoining ? "Joining..." : "Let's go"}
							</Button>
						</form>

						<div className="mt-8 border-t border-zinc-800 pt-6">
							<p className="text-sm font-semibold text-white">
								Already joined from another device?
							</p>
							<p className="mt-2 text-sm leading-6 text-zinc-400">
								Use your private username to reconnect this device to your
								picks.
							</p>
							<form
								className="mt-4 flex flex-col gap-3 sm:flex-row"
								onSubmit={(event) => {
									event.preventDefault()
									void handleRecoverParticipant();
								}}
							>
								<Input
									id="player-recovery-username"
									value={recoveryUsername}
									onChange={(event) => {
										setRecoveryUsername(event.target.value);
										setRecoveryError(null)
									}}
									placeholder="Enter your private username"
									autoComplete="username"
									autoCapitalize="none"
									spellCheck={false}
									aria-invalid={Boolean(recoveryError)}
									aria-describedby={
										recoveryError ? "player-recovery-error" : undefined
									}
								/>
								<Button type="submit" variant="outline" disabled={isRecovering} className="shrink-0 whitespace-nowrap">
									{isRecovering ? "Checking..." : "Recover my entry"}
								</Button>
							</form>
							{recoveryError ? (
								<p
									id="player-recovery-error"
									className="mt-3 text-sm leading-6 text-rose-300"
								>
									{recoveryError}
								</p>
							) : null}
						</div>
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
								<fieldset
									key={question._id}
									className="border-border bg-secondary/30 rounded-xl border p-4"
								>
									<legend className="w-full">
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
									</legend>
									<div className="mt-4 grid gap-3">
										{question.options.map((option, optionIndex) => (
											<OptionButton
												key={option}
												locked
												role="radio"
												aria-checked={
													selections[question._id.toString()] === optionIndex
												}
												aria-readonly="true"
												selected={
													selections[question._id.toString()] === optionIndex
												}
											>
												<span className="flex items-center gap-2">
													{selections[question._id.toString()] ===
													optionIndex ? (
														<Check className="h-4 w-4" />
													) : null}
													<span className="text-muted-foreground mr-1 font-mono text-xs">
														{optionLabel(optionIndex)}.
													</span>
													{option}
												</span>
											</OptionButton>
										))}
									</div>
								</fieldset>
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
								<fieldset
									key={question._id}
									className="border-border bg-secondary/30 rounded-xl border p-4"
								>
									<legend className="w-full">
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-start gap-3">
												<span className="text-muted-foreground mt-0.5 text-xs font-bold tracking-widest">
													Q{questionIndex + 1}
												</span>
												<h2 className="text-foreground text-lg leading-7 font-semibold">
													{question.text}
												</h2>
											</div>
											<Lock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
										</div>
									</legend>
									<div className="mt-4 grid gap-3">
										{question.options.map((option, optionIndex) => (
											<OptionButton
												key={option}
												locked
												role="radio"
												aria-checked={
													selections[question._id.toString()] === optionIndex
												}
												aria-readonly="true"
												selected={
													selections[question._id.toString()] === optionIndex
												}
											>
												<span className="flex items-center gap-2">
													{selections[question._id.toString()] ===
													optionIndex ? (
														<Check className="h-4 w-4" />
													) : null}
													<span className="text-muted-foreground mr-1 font-mono text-xs">
														{optionLabel(optionIndex)}.
													</span>
													{option}
												</span>
											</OptionButton>
										))}
									</div>
								</fieldset>
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
							{orderedQuestions.map((question, questionIndex) => {
								const isAnswered =
									selections[question._id.toString()] !== undefined;
								return (
									<fieldset
										key={question._id}
										id={`question-${question._id}`}
										className="border-border bg-secondary/30 scroll-mt-36 rounded-xl border p-4"
										role="radiogroup"
										aria-labelledby={`question-legend-${question._id}`}
									>
										<legend
											id={`question-legend-${question._id}`}
											className="w-full"
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
										</legend>
										<div className="mt-4 grid gap-3">
											{question.options.map((option, optionIndex) => (
												<OptionButton
													key={option}
													role="radio"
													aria-checked={
														selections[question._id.toString()] === optionIndex
													}
													tabIndex={
														selections[question._id.toString()] ===
															optionIndex || optionIndex === 0
															? 0
															: -1
													}
													onClick={() =>
														updateSelection(
															question._id.toString(),
															optionIndex
														)
													}
													onKeyDown={(event) =>
														handleRadioOptionKeyDown(
															event,
															optionIndex,
															question.options.length,
															(nextIndex) =>
																updateSelection(
																	question._id.toString(),
																	nextIndex
																)
														)
													}
													selected={
														selections[question._id.toString()] === optionIndex
													}
												>
													<span className="flex items-center gap-2">
														<span className="text-muted-foreground mr-1 font-mono text-xs">
															{optionLabel(optionIndex)}.
														</span>
														{option}
													</span>
												</OptionButton>
											))}
										</div>
									</fieldset>
								)
							})}
						</div>
					</>
				)}
			</PageShell>

			{participant && !hasSubmitted && challenge.status !== "scoring" ? (
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
	)
}

function PlayerHeader({
	title,
	sport,
	status,
	challengeId,
}: {
	title: string;
	sport: string;
	status: "open" | "scoring" | "closed";
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
	)
}

function PlayerChallengeSkeleton() {
	return (
		<PageShell className="gap-6 py-6 sm:py-8">
			<SkeletonBlock className="h-32" />
			<SkeletonBlock className="h-56" />
			<SkeletonBlock className="h-72" />
		</PageShell>
	)
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "Something went wrong. Please try again.";
}
