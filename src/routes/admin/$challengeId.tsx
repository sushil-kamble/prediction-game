import { useEffect, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	ArrowLeft,
	Check,
	Copy,
	Minus,
	Pencil,
	Plus,
	Share2,
	Trash2,
	X,
} from "lucide-react";
import {
	BottomSheet,
	Button,
	FullScreenState,
	GlassCard,
	InlineNotice,
	Input,
	MetricPill,
	OptionButton,
	PageShell,
	SectionEyebrow,
	SkeletonBlock,
	SportBadge,
	StatusBadge,
	Textarea,
} from "#/components/app/ui";
import { PodiumSection } from "#/components/app/results";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { useToast } from "#/components/app/use-toast";
import { api } from "#/lib/api";
import {
	answeredCorrectCount,
	buildChallengeUrl,
	buildLeaderboardUrl,
} from "#/lib/challenge";
import { getStoredAdminChallenge } from "#/lib/storage";

type AdminQuestion = {
	_id: string;
	text: string;
	options: string[];
	pointValue: number;
	correctOptionIndex: number | null;
	order: number;
};

export const Route = createFileRoute("/admin/$challengeId")({
	head: ({ params }) => ({
		meta: [{ title: `Admin ${params.challengeId} | PredictGame` }],
	}),
	component: AdminChallengeRoute,
});

function handleRadioOptionKeyDown(
	event: KeyboardEvent<HTMLButtonElement>,
	currentIndex: number,
	totalOptions: number,
	onSelect: (nextIndex: number) => void,
) {
	switch (event.key) {
		case "ArrowDown":
		case "ArrowRight":
			event.preventDefault();
			onSelect((currentIndex + 1) % totalOptions);
			return;
		case "ArrowUp":
		case "ArrowLeft":
			event.preventDefault();
			onSelect((currentIndex - 1 + totalOptions) % totalOptions);
			return;
		case "Home":
			event.preventDefault();
			onSelect(0);
			return;
		case "End":
			event.preventDefault();
			onSelect(totalOptions - 1);
			return;
		default:
			return;
	}
}

function AdminChallengeRoute() {
	const { challengeId } = Route.useParams();
	const addQuestion = useMutation(api.challenges.addQuestion);
	const updateQuestion = useMutation(api.challenges.updateQuestion);
	const deleteQuestion = useMutation(api.challenges.deleteQuestion);
	const publishChallenge = useMutation(api.challenges.publishChallenge);
	const unpublishChallenge = useMutation(api.challenges.unpublishChallenge);
	const markCorrectAnswer = useMutation(api.challenges.markCorrectAnswer);
	const clearAnswerMarkings = useMutation(api.challenges.clearAnswerMarkings);
	const announceWinners = useMutation(api.challenges.announceWinners);
	const { showToast } = useToast();

	const [adminSecret, setAdminSecret] = useState<string | null | undefined>(
		undefined
	);
	const [questionText, setQuestionText] = useState("");
	const [options, setOptions] = useState(["", ""]);
	const [pointValue, setPointValue] = useState(1);
	const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
		null
	);
	const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null);
	const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
	const [isAnnounceConfirmOpen, setIsAnnounceConfirmOpen] = useState(false);
	const [isUnpublishConfirmOpen, setIsUnpublishConfirmOpen] = useState(false);
	const [isClearFormConfirmOpen, setIsClearFormConfirmOpen] = useState(false);
	const [isClearMarkingsConfirmOpen, setIsClearMarkingsConfirmOpen] =
		useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [isUnpublishing, setIsUnpublishing] = useState(false);
	const [isAnnouncing, setIsAnnouncing] = useState(false);
	const [isClearingMarkings, setIsClearingMarkings] = useState(false);
	const [isSharing, setIsSharing] = useState(false);

	const challenge = useQuery(
		api.challenges.getAdminChallenge,
		adminSecret
			? {
					challengeId,
					adminSecret,
				}
			: "skip"
	);
	const leaderboard = useQuery(
		api.challenges.getLeaderboard,
		adminSecret ? { challengeId } : "skip"
	);

	useEffect(() => {
		setAdminSecret(getStoredAdminChallenge(challengeId)?.adminSecret ?? null);
	}, [challengeId]);

	useEffect(() => {
		if (
			editingQuestionId &&
			challenge &&
			!challenge.questions.some(
				(question) => question._id.toString() === editingQuestionId
			)
		) {
			resetForm();
		}
	}, [challenge, editingQuestionId]);

	const shareUrl =
		typeof window !== "undefined"
			? buildChallengeUrl(window.location.origin, challengeId)
			: `/c/${challengeId}`;

	const leaderboardUrl =
		typeof window !== "undefined"
			? buildLeaderboardUrl(window.location.origin, challengeId)
			: `/c/${challengeId}/leaderboard`;

	const answeredCount = challenge
		? answeredCorrectCount(challenge.questions)
		: 0;
	const hasAdminAccess = Boolean(adminSecret);
	const isQuestionEditUnlocked =
		(challenge?.questionEditUnlocked ?? challenge?.status === "draft") &&
		challenge?.status !== "closed";

	const orderedQuestions = useMemo(
		() =>
			(challenge?.questions ?? [])
				.slice()
				.sort((a, b) => a.order - b.order) as Array<AdminQuestion>,
		[challenge]
	);
	const isFormPristine =
		!editingQuestionId &&
		questionText.trim().length === 0 &&
		options.length === 2 &&
		options.every((option) => option.trim().length === 0) &&
		pointValue === 1;

	if (adminSecret === undefined) {
		return <AdminChallengeSkeleton />;
	}

	if (adminSecret === null) {
		return (
			<FullScreenState
				title="Admin access unavailable"
				description="This browser does not have the admin secret for this challenge. Open it from the device that created the challenge."
			>
				<Button asChild>
					<Link to="/admin" className="no-underline">
						Back to admin
					</Link>
				</Button>
			</FullScreenState>
		);
	}

	if (challenge === undefined || leaderboard === undefined) {
		return <AdminChallengeSkeleton />;
	}

	if (challenge === null || leaderboard === null) {
		return (
			<FullScreenState
				title="Challenge not found"
				description="This admin link doesn't map to a challenge on the current Convex deployment."
			>
				<Button asChild>
					<Link to="/admin" className="no-underline">
						Back to admin
					</Link>
				</Button>
			</FullScreenState>
		);
	}

	const canAnnounceWinners =
		challenge.status !== "draft" &&
		!challenge.winnersAnnouncedAt &&
		challenge.questions.length > 0 &&
		answeredCount === challenge.questions.length &&
		leaderboard.submittedParticipantCount > 0;

	async function handleSaveQuestion(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!adminSecret) {
			showToast(
				"Admin access is only available on the device that created this challenge.",
				"error"
			);
			return;
		}
		if (challenge?.status === "closed") {
			showToast("Challenge is closed. Questions cannot be edited.", "error");
			return;
		}
		if (!isQuestionEditUnlocked) {
			showToast("Questions are frozen. Unpublish to edit questions.", "error");
			return;
		}

		const trimmedText = questionText.trim();
		const trimmedOptions = options.map((option) => option.trim());
		if (!trimmedText) {
			showToast("Question text is required.", "error");
			return;
		}

		if (trimmedOptions.some((option) => option.length === 0)) {
			showToast("Every option needs text before saving.", "error");
			return;
		}

		setIsSaving(true);
		try {
			if (editingQuestionId) {
				await updateQuestion({
					challengeId,
					questionId: editingQuestionId,
					adminSecret,
					text: trimmedText,
					options: trimmedOptions,
					pointValue,
				});
				showToast("Question updated.", "success");
			} else {
				await addQuestion({
					challengeId,
					adminSecret,
					text: trimmedText,
					options: trimmedOptions,
					pointValue,
				});
				showToast("Question added.", "success");
			}

			resetForm();
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsSaving(false);
		}
	}

	async function handlePublish() {
		if (!adminSecret) {
			showToast(
				"This browser doesn't have admin access for the challenge.",
				"error"
			);
			return;
		}

		const wasDraft = challenge?.status === "draft";
		setIsPublishing(true);
		try {
			await publishChallenge({ challengeId, adminSecret });
			showToast(
				wasDraft
					? "Challenge published and questions frozen."
					: "Questions frozen.",
				"success"
			);
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsPublishing(false);
		}
	}

	async function handleUnpublish() {
		if (!adminSecret) {
			showToast(
				"This browser doesn't have admin access for the challenge.",
				"error"
			);
			return;
		}

		setIsUnpublishing(true);
		try {
			await unpublishChallenge({ challengeId, adminSecret });
			showToast("Questions are now editable.", "success");
			setIsUnpublishConfirmOpen(false);
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsUnpublishing(false);
		}
	}

	async function handleDeleteQuestion() {
		if (!adminSecret || !deleteTarget) {
			return;
		}

		try {
			await deleteQuestion({
				challengeId,
				questionId: deleteTarget._id.toString(),
				adminSecret,
			});
			showToast("Question deleted.", "success");
			if (editingQuestionId === deleteTarget._id.toString()) {
				resetForm();
			}
			setDeleteTarget(null);
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		}
	}

	async function handleShare() {
		setIsSharing(true);
		try {
			if (typeof navigator !== "undefined" && navigator.share) {
				await navigator.share({
					title: challenge?.title ?? "PredictGame",
					url: shareUrl,
				});
			} else if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(shareUrl);
				showToast("Link copied!", "success");
			} else {
				showToast("Sharing isn't available in this browser.", "error");
			}
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				return;
			}
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsSharing(false);
			setIsShareSheetOpen(false);
		}
	}

	async function handleMarkAnswer(
		questionIdToScore: string,
		optionIndex: number
	) {
		if (!adminSecret) {
			showToast(
				"This browser doesn't have admin access for the challenge.",
				"error"
			);
			return;
		}

		try {
			await markCorrectAnswer({
				challengeId,
				questionId: questionIdToScore,
				adminSecret,
				correctOptionIndex: optionIndex,
			});
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		}
	}

	async function handleAnnounceWinners() {
		if (!adminSecret) {
			return;
		}

		setIsAnnouncing(true);
		try {
			await announceWinners({ challengeId, adminSecret });
			showToast("Winners announced.", "success");
			setIsAnnounceConfirmOpen(false);
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsAnnouncing(false);
		}
	}

	async function handleClearAnswerMarkings() {
		if (!adminSecret) {
			showToast(
				"This browser doesn't have admin access for the challenge.",
				"error"
			);
			return;
		}

		setIsClearingMarkings(true);
		try {
			await clearAnswerMarkings({ challengeId, adminSecret });
			showToast("Answer markings cleared.", "success");
			setIsClearMarkingsConfirmOpen(false);
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsClearingMarkings(false);
		}
	}

	function beginEditing(question: AdminQuestion) {
		setEditingQuestionId(question._id.toString());
		setQuestionText(question.text);
		setOptions(question.options);
		setPointValue(question.pointValue);
	}

	function resetForm() {
		setEditingQuestionId(null);
		setQuestionText("");
		setOptions(["", ""]);
		setPointValue(1);
	}

	function handleClearForm() {
		resetForm();
		setIsClearFormConfirmOpen(false);
	}

	return (
		<>
			<PageShell className="gap-6 py-6 sm:py-8">
				<GlassCard className="px-5 py-6 sm:px-8">
					<div className="flex flex-wrap items-center gap-3">
						<Button variant="outline" size="sm" asChild>
							<Link to="/admin" className="no-underline">
								<ArrowLeft className="h-4 w-4" />
								Back
							</Link>
						</Button>
						<span className="border-primary/20 bg-primary/10 text-primary rounded-lg border px-3 py-1 text-xs font-extrabold tracking-[0.22em] uppercase">
							Admin mode
						</span>
					</div>

					<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<SectionEyebrow>Challenge</SectionEyebrow>
							<h1 className="font-display text-foreground text-4xl leading-none sm:text-5xl">
								{challenge.title}
							</h1>
							<div className="mt-4 flex flex-wrap gap-2">
								<SportBadge sport={challenge.sport} />
								<StatusBadge status={challenge.status} />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3 sm:min-w-[18rem]">
							<MetricPill
								label="Questions"
								value={String(challenge.questions.length)}
							/>
							<MetricPill
								label="Scored"
								value={`${answeredCount}/${challenge.questions.length}`}
							/>
						</div>
					</div>
				</GlassCard>

				{!hasAdminAccess ? (
					<InlineNotice tone="warning">
						Admin access is device-specific in this version. You can view the
						challenge here, but editing and scoring require the browser that
						created it.
					</InlineNotice>
				) : null}

				{hasAdminAccess ? (
					<>
						<GlassCard className="px-5 py-6 sm:px-8">
							<SectionEyebrow>
								{editingQuestionId ? "Editing question" : "New question"}
							</SectionEyebrow>

							{!isQuestionEditUnlocked ? (
								<InlineNotice tone="warning" className="mt-1">
									{challenge.status === "closed"
										? "Challenge closed. Editing is permanently locked."
										: "Questions are frozen. Unpublish to unlock editing."}
								</InlineNotice>
							) : null}

							<form
								className="mt-4 flex flex-col gap-5"
								onSubmit={handleSaveQuestion}
							>
								<label className="flex flex-col gap-1.5">
									<span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
										Question
									</span>
									<Textarea
										value={questionText}
										onChange={(event) => setQuestionText(event.target.value)}
										placeholder="Who scores first?"
										disabled={!isQuestionEditUnlocked}
									/>
								</label>

								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
											Options
										</span>
										{options.length < 5 ? (
											<button
												type="button"
												onClick={() =>
													setOptions((current) => [...current, ""])
												}
												disabled={!isQuestionEditUnlocked}
												className="focus-visible:ring-primary/40 text-primary hover:text-primary/80 flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors outline-none focus-visible:ring-4 disabled:opacity-40"
												aria-label="Add another option"
											>
												<Plus className="h-3.5 w-3.5" />
												Add
											</button>
										) : null}
									</div>

									{options.map((option, index) => (
										<div key={index} className="flex items-center gap-2">
											<span className="text-muted-foreground w-5 shrink-0 text-center text-xs font-bold">
												{index + 1}
											</span>
											<Input
												value={option}
												onChange={(event) =>
													setOptions((current) =>
														current.map((item, itemIndex) =>
															itemIndex === index ? event.target.value : item
														)
													)
												}
												placeholder={`Option ${index + 1}`}
												disabled={!isQuestionEditUnlocked}
												className="flex-1"
											/>
											<button
												type="button"
												onClick={() =>
													setOptions((current) =>
														current.length <= 2
															? current
															: current.filter(
																	(_, itemIndex) => itemIndex !== index
																)
													)
												}
												disabled={
													!isQuestionEditUnlocked || options.length <= 2
												}
												className="focus-visible:ring-primary/40 hover:border-destructive hover:text-destructive flex h-10 w-10 shrink-0 items-center justify-center border-2 border-zinc-700 text-zinc-500 transition-colors outline-none focus-visible:ring-4 disabled:opacity-30"
												aria-label={`Remove option ${index + 1}`}
											>
												<X className="h-4 w-4" />
											</button>
										</div>
									))}
								</div>

								{/* Points — compact inline row */}
								<div className="flex items-center gap-3">
									<span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
										Points
									</span>
									<div className="flex items-center">
										<button
											type="button"
											onClick={() =>
												setPointValue((current) => Math.max(1, current - 1))
											}
											disabled={!isQuestionEditUnlocked || pointValue <= 1}
											className="focus-visible:ring-primary/40 hover:border-primary hover:text-primary flex h-10 w-10 items-center justify-center border-2 border-r-0 border-zinc-700 bg-black text-zinc-400 transition-colors outline-none focus-visible:ring-4 disabled:opacity-30"
											aria-label="Decrease point value"
										>
											<Minus className="h-4 w-4" />
										</button>
										<div className="flex h-10 min-w-[3rem] items-center justify-center border-2 border-zinc-700 bg-zinc-900 px-3">
											<span className="text-foreground text-lg font-bold tabular-nums">
												{pointValue}
											</span>
										</div>
										<button
											type="button"
											onClick={() => setPointValue((current) => current + 1)}
											disabled={!isQuestionEditUnlocked}
											className="focus-visible:ring-primary/40 hover:border-primary hover:text-primary flex h-10 w-10 items-center justify-center border-2 border-l-0 border-zinc-700 bg-black text-zinc-400 transition-colors outline-none focus-visible:ring-4 disabled:opacity-30"
											aria-label="Increase point value"
										>
											<Plus className="h-4 w-4" />
										</button>
									</div>
								</div>

								<div className="flex items-center gap-3">
									<Button
										type="submit"
										className="flex-1"
										disabled={isSaving || !isQuestionEditUnlocked}
									>
										{isSaving
											? "Saving..."
											: editingQuestionId
												? "Update question"
												: "Add question"}
									</Button>
									{!isFormPristine ? (
										<Button
											type="button"
											variant="outline"
											onClick={() => setIsClearFormConfirmOpen(true)}
											disabled={!isQuestionEditUnlocked}
										>
											Clear
										</Button>
									) : null}
								</div>
							</form>
						</GlassCard>

						<GlassCard className="px-5 py-6 sm:px-8">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<SectionEyebrow>Publish</SectionEyebrow>
									<h2 className="font-display text-foreground text-3xl">
										Launch the challenge
									</h2>
								</div>
								{challenge.status === "closed" ? (
									<Button className="sm:w-auto" disabled>
										{challenge.winnersAnnouncedAt
											? "Winners announced"
											: "Challenge closed"}
									</Button>
								) : challenge.status === "draft" ? (
									<Button
										className="sm:w-auto"
										onClick={handlePublish}
										disabled={challenge.questions.length === 0 || isPublishing}
									>
										{isPublishing ? "Publishing..." : "Publish challenge"}
									</Button>
								) : isQuestionEditUnlocked ? (
									<Button
										className="sm:w-auto"
										onClick={handlePublish}
										disabled={isPublishing}
									>
										{isPublishing ? "Publishing..." : "Publish questions"}
									</Button>
								) : (
									<Button
										variant="outline"
										className="sm:w-auto"
										onClick={() => setIsUnpublishConfirmOpen(true)}
									>
										Unpublish
									</Button>
								)}
							</div>

							{challenge.questions.length === 0 ? (
								<InlineNotice tone="warning" className="mt-5">
									Add at least one question before publishing.
								</InlineNotice>
							) : null}

							{challenge.winnersAnnouncedAt ? (
								<InlineNotice tone="success" className="mt-5">
									Winners were announced on{" "}
									{formatTimestamp(challenge.winnersAnnouncedAt)}. The board is
									now locked in final mode.
								</InlineNotice>
							) : null}

							{challenge.status !== "draft" ? (
								<div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
									<Input
										readOnly
										value={shareUrl}
										aria-label="Challenge share link"
									/>
									<Button onClick={() => setIsShareSheetOpen(true)}>
										<Share2 className="h-4 w-4" />
										Share
									</Button>
									<Button
										variant="outline"
										onClick={async () => {
											if (navigator.clipboard) {
												await navigator.clipboard.writeText(shareUrl);
												showToast("Link copied!", "success");
											}
										}}
									>
										<Copy className="h-4 w-4" />
										Copy
									</Button>
								</div>
							) : null}
						</GlassCard>
					</>
				) : null}

				<GlassCard className="px-5 py-6 sm:px-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<SectionEyebrow>Question list</SectionEyebrow>
							<h2 className="font-display text-foreground text-3xl">
								Current stack
							</h2>
						</div>
						<Button variant="outline" asChild>
							<Link
								to="/c/$challengeId/leaderboard"
								params={{ challengeId }}
								className="no-underline"
							>
								Preview leaderboard
							</Link>
						</Button>
					</div>

					<div className="mt-6 grid gap-4">
						{orderedQuestions.length === 0 ? (
							<InlineNotice tone="warning">
								No questions yet. Add a few picks to unlock publishing.
							</InlineNotice>
						) : (
							orderedQuestions.map((question, index) => (
								<div
									key={question._id}
									className="border-border bg-secondary/30 rounded-xl border p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-3">
												<span className="text-muted-foreground shrink-0 text-xs font-bold tracking-widest">
													Q{index + 1}
												</span>
												<h3 className="text-foreground text-base leading-6 font-semibold">
													{question.text}
												</h3>
											</div>
											<div className="mt-2 flex items-center gap-3 text-xs font-bold text-zinc-500">
												<span>{question.options.length} options</span>
												<span className="text-zinc-700">·</span>
												<span>
													{question.pointValue}{" "}
													{question.pointValue === 1 ? "pt" : "pts"}
												</span>
											</div>
										</div>
										{hasAdminAccess && isQuestionEditUnlocked ? (
											<div className="flex shrink-0 items-center gap-1">
												<button
													type="button"
													onClick={() => beginEditing(question)}
													className="focus-visible:ring-primary/40 hover:border-primary hover:text-primary flex h-9 w-9 items-center justify-center border-2 border-zinc-700 text-zinc-400 transition-colors outline-none focus-visible:ring-4"
													aria-label={`Edit question ${index + 1}`}
												>
													<Pencil className="h-3.5 w-3.5" />
												</button>
												<button
													type="button"
													onClick={() => setDeleteTarget(question)}
													className="focus-visible:ring-primary/40 hover:border-destructive hover:text-destructive flex h-9 w-9 items-center justify-center border-2 border-zinc-700 text-zinc-400 transition-colors outline-none focus-visible:ring-4"
													aria-label={`Delete question ${index + 1}`}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</div>
										) : null}
									</div>
								</div>
							))
						)}
					</div>
				</GlassCard>

				{leaderboard.podium.length > 0 ? (
					<PodiumSection
						podium={leaderboard.podium}
						winnersAnnounced={leaderboard.winnersAnnounced}
						elevateGold={false}
						title={
							leaderboard.winnersAnnounced
								? "Announced winners"
								: "Announcement preview"
						}
					/>
				) : null}

				{hasAdminAccess &&
					(challenge.status === "open" || challenge.status === "scoring") && (
						<GlassCard className="px-5 py-6 sm:px-8">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<SectionEyebrow>Answer marking</SectionEyebrow>
									<h2 className="font-display text-foreground text-3xl">
										Score the board live
									</h2>
								</div>
								<MetricPill
									label="Progress"
									value={`${answeredCount}/${orderedQuestions.length}`}
									className="sm:min-w-[12rem]"
								/>
							</div>

							<div className="mt-6 grid gap-4">
								{orderedQuestions.map((question) => (
									<fieldset
										key={question._id}
										className="border-border bg-secondary/30 rounded-xl border p-4"
										role="radiogroup"
										aria-labelledby={`admin-score-${question._id}`}
									>
										<h3
											id={`admin-score-${question._id}`}
											className="text-foreground text-lg leading-7 font-semibold"
										>
											{question.text}
										</h3>
										<div className="mt-4 grid gap-3">
											{question.options.map((option, optionIndex) => (
												<OptionButton
													key={option}
													role="radio"
													aria-checked={
														question.correctOptionIndex === optionIndex
													}
													tabIndex={
														question.correctOptionIndex === optionIndex ||
														optionIndex === 0
															? 0
															: -1
													}
													onClick={() =>
														handleMarkAnswer(
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
																handleMarkAnswer(
																	question._id.toString(),
																	nextIndex
																),
														)
													}
													correct={question.correctOptionIndex === optionIndex}
												>
													<span className="flex items-center gap-2">
														{question.correctOptionIndex === optionIndex ? (
															<Check className="h-4 w-4" />
														) : null}
														{option}
													</span>
												</OptionButton>
											))}
										</div>
									</fieldset>
								))}
							</div>

							{!canAnnounceWinners ? (
								<InlineNotice tone="warning" className="mt-6">
									Finish scoring every question and make sure at least one
									player has submitted before announcing winners.
								</InlineNotice>
							) : null}

							<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<Button variant="outline" asChild className="w-full sm:w-auto">
									<a href={leaderboardUrl} className="no-underline">
										Open leaderboard
									</a>
								</Button>
								<div className="flex flex-col gap-3 sm:ml-auto sm:flex-row">
									<Button
										variant="outline"
										className="w-full sm:w-auto"
										onClick={() => setIsClearMarkingsConfirmOpen(true)}
										disabled={answeredCount === 0 || isClearingMarkings}
									>
										Clear answer markings
									</Button>
									<Button
										className="w-full sm:w-auto"
										onClick={() => setIsAnnounceConfirmOpen(true)}
										disabled={!canAnnounceWinners}
									>
										Announce winners
									</Button>
								</div>
							</div>
						</GlassCard>
					)}
			</PageShell>

			<BottomSheet
				open={deleteTarget !== null}
				onClose={() => setDeleteTarget(null)}
				title="Delete question?"
				description="This removes the pick card from the draft challenge."
				footer={
					<>
						<Button
							variant="destructive"
							className="w-full"
							onClick={handleDeleteQuestion}
						>
							Delete question
						</Button>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => setDeleteTarget(null)}
						>
							Keep it
						</Button>
					</>
				}
			/>

			<BottomSheet
				open={isShareSheetOpen}
				onClose={() => setIsShareSheetOpen(false)}
				title="Share challenge"
				description="On mobile this uses the native share sheet. Desktop falls back to clipboard."
				footer={
					<>
						<Button
							className="w-full"
							onClick={handleShare}
							disabled={isSharing}
						>
							{isSharing ? "Sharing..." : "Share now"}
						</Button>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => setIsShareSheetOpen(false)}
						>
							Cancel
						</Button>
					</>
				}
			>
				<Input readOnly value={shareUrl} aria-label="Challenge share link" />
			</BottomSheet>

			<AlertDialog
				open={isClearFormConfirmOpen}
				onOpenChange={setIsClearFormConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear form?</AlertDialogTitle>
						<AlertDialogDescription>
							This only resets the question composer fields on this screen. It
							does not delete any saved challenge questions.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="w-full sm:w-auto">
							Keep editing
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							className="w-full sm:w-auto"
							onClick={handleClearForm}
						>
							Yes, clear form
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={isAnnounceConfirmOpen}
				onOpenChange={setIsAnnounceConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Announce winners?</AlertDialogTitle>
						<AlertDialogDescription>
							This will lock the challenge, snapshot the current top three, and
							switch players into the final results experience.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="w-full sm:w-auto">
							Not yet
						</AlertDialogCancel>
						<AlertDialogAction
							className="w-full sm:w-auto"
							onClick={handleAnnounceWinners}
							disabled={isAnnouncing}
						>
							{isAnnouncing ? "Announcing..." : "Announce winners"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={isUnpublishConfirmOpen}
				onOpenChange={setIsUnpublishConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Unpublish questions?</AlertDialogTitle>
						<AlertDialogDescription>
							This unlocks question editing for admins. The challenge link stays
							the same and users can continue answering.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="w-full sm:w-auto">
							Keep published
						</AlertDialogCancel>
						<AlertDialogAction
							className="w-full sm:w-auto"
							onClick={handleUnpublish}
							disabled={isUnpublishing}
						>
							{isUnpublishing ? "Unpublishing..." : "Unpublish"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={isClearMarkingsConfirmOpen}
				onOpenChange={setIsClearMarkingsConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear answer markings?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove all currently marked correct answers so you can
							rescore from scratch.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="w-full sm:w-auto">
							Keep markings
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							className="w-full sm:w-auto"
							onClick={handleClearAnswerMarkings}
							disabled={isClearingMarkings}
						>
							{isClearingMarkings ? "Clearing..." : "Clear markings"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function AdminChallengeSkeleton() {
	return (
		<PageShell className="gap-6 py-6 sm:py-8">
			<SkeletonBlock className="h-48" />
			<SkeletonBlock className="h-96" />
			<SkeletonBlock className="h-80" />
		</PageShell>
	);
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "Something went wrong. Please try again.";
}

function formatTimestamp(timestamp: number) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(timestamp));
}
