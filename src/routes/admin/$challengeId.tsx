import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	ArrowLeft,
	Check,
	Copy,
	Pencil,
	Share2,
	Trash2,
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

function AdminChallengeRoute() {
	const { challengeId } = Route.useParams();
	const challenge = useQuery(api.challenges.getAdminChallenge, { challengeId });
	const addQuestion = useMutation(api.challenges.addQuestion);
	const updateQuestion = useMutation(api.challenges.updateQuestion);
	const deleteQuestion = useMutation(api.challenges.deleteQuestion);
	const publishChallenge = useMutation(api.challenges.publishChallenge);
	const unpublishChallenge = useMutation(api.challenges.unpublishChallenge);
	const markCorrectAnswer = useMutation(api.challenges.markCorrectAnswer);
	const clearAnswerMarkings = useMutation(api.challenges.clearAnswerMarkings);
	const closeChallenge = useMutation(api.challenges.closeChallenge);
	const { showToast } = useToast();

	const [adminSecret, setAdminSecret] = useState<string | null | undefined>(
		undefined,
	);
	const [questionText, setQuestionText] = useState("");
	const [options, setOptions] = useState(["", ""]);
	const [pointValue, setPointValue] = useState(1);
	const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null);
	const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
	const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
	const [isUnpublishConfirmOpen, setIsUnpublishConfirmOpen] = useState(false);
	const [isClearFormConfirmOpen, setIsClearFormConfirmOpen] = useState(false);
	const [isClearMarkingsConfirmOpen, setIsClearMarkingsConfirmOpen] =
		useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [isUnpublishing, setIsUnpublishing] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const [isClearingMarkings, setIsClearingMarkings] = useState(false);
	const [isSharing, setIsSharing] = useState(false);

	useEffect(() => {
		setAdminSecret(getStoredAdminChallenge(challengeId)?.adminSecret ?? null);
	}, [challengeId]);

	useEffect(() => {
		if (
			editingQuestionId &&
			challenge &&
			!challenge.questions.some(
				(question) => question._id.toString() === editingQuestionId,
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
			(challenge?.questions ?? []).slice().sort((a, b) => a.order - b.order) as Array<
				AdminQuestion
			>,
		[challenge],
	);
	const isFormPristine =
		!editingQuestionId &&
		questionText.trim().length === 0 &&
		options.length === 2 &&
		options.every((option) => option.trim().length === 0) &&
		pointValue === 1;

	if (challenge === undefined || adminSecret === undefined) {
		return <AdminChallengeSkeleton />;
	}

	if (challenge === null) {
		return (
			<FullScreenState
				title="Challenge not found"
				description="This admin link doesn't map to a challenge on the current Convex deployment."
			>
				<Button asChild>
					<Link to="/admin" className="no-underline">Back to admin</Link>
				</Button>
			</FullScreenState>
		);
	}

	async function handleSaveQuestion(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!adminSecret) {
			showToast("Admin access is only available on the device that created this challenge.", "error");
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
			showToast("This browser doesn't have admin access for the challenge.", "error");
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
				"success",
			);
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsPublishing(false);
		}
	}

	async function handleUnpublish() {
		if (!adminSecret) {
			showToast("This browser doesn't have admin access for the challenge.", "error");
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

	async function handleMarkAnswer(questionIdToScore: string, optionIndex: number) {
		if (!adminSecret) {
			showToast("This browser doesn't have admin access for the challenge.", "error");
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

	async function handleCloseChallenge() {
		if (!adminSecret) {
			return;
		}

		setIsClosing(true);
		try {
			await closeChallenge({ challengeId, adminSecret });
			showToast("Challenge closed.", "success");
			setIsCloseConfirmOpen(false);
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsClosing(false);
		}
	}

	async function handleClearAnswerMarkings() {
		if (!adminSecret) {
			showToast(
				"This browser doesn't have admin access for the challenge.",
				"error",
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
						<span className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
							Admin mode
						</span>
					</div>

					<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<SectionEyebrow>Challenge</SectionEyebrow>
							<h1 className="font-display text-4xl leading-none text-foreground sm:text-5xl">
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
						challenge here, but editing and scoring require the browser that created
						it.
					</InlineNotice>
				) : null}

				{hasAdminAccess ? (
					<>
						<GlassCard className="px-5 py-6 sm:px-8">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<SectionEyebrow>
										{editingQuestionId ? "Edit question" : "Question composer"}
									</SectionEyebrow>
									<h2 className="font-display text-3xl text-foreground">
										{editingQuestionId
											? "Update the pick card"
											: "Add a new pick card"}
									</h2>
								</div>
							</div>

							{!isQuestionEditUnlocked ? (
								<InlineNotice tone="warning" className="mt-5">
									Questions are frozen. Click unpublish in the publish section to unlock
									editing.
								</InlineNotice>
							) : null}

							<form className="mt-5 flex flex-col gap-4" onSubmit={handleSaveQuestion}>
								<label className="flex flex-col gap-2">
									<span className="text-sm font-semibold text-foreground">
										Question
									</span>
									<Textarea
										value={questionText}
										onChange={(event) => setQuestionText(event.target.value)}
										placeholder="Who scores first?"
										disabled={!isQuestionEditUnlocked}
									/>
								</label>

								<div className="flex flex-col gap-3">
									<div className="flex items-center justify-between">
										<span className="text-sm font-semibold text-foreground">
											Options
										</span>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												setOptions((current) =>
													current.length >= 5 ? current : [...current, ""],
												)
											}
											disabled={!isQuestionEditUnlocked}
										>
											Add option
										</Button>
									</div>

									{options.map((option, index) => (
										<div key={index} className="flex items-center gap-3">
											<Input
												value={option}
												onChange={(event) =>
													setOptions((current) =>
														current.map((item, itemIndex) =>
															itemIndex === index ? event.target.value : item,
														),
													)
												}
												placeholder={`Option ${index + 1}`}
												disabled={!isQuestionEditUnlocked}
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() =>
													setOptions((current) =>
														current.length <= 2
															? current
															: current.filter(
																	(_, itemIndex) => itemIndex !== index,
															),
													)
												}
												disabled={!isQuestionEditUnlocked || options.length <= 2}
											>
												Remove
											</Button>
										</div>
									))}
								</div>

								<div className="flex items-center gap-3">
									<Button
										type="button"
										variant="outline"
										onClick={() =>
											setPointValue((current) => Math.max(1, current - 1))
										}
										disabled={!isQuestionEditUnlocked}
									>
										-1
									</Button>
									<div className="flex-1 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-center">
										<p className="m-0 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
											Point value
										</p>
										<p className="mt-1 text-2xl font-semibold text-foreground">
											{pointValue}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										onClick={() => setPointValue((current) => current + 1)}
										disabled={!isQuestionEditUnlocked}
									>
										+1
									</Button>
								</div>

								<Button
									type="submit"
									className="w-full"
									disabled={isSaving || !isQuestionEditUnlocked}
								>
									{isSaving
										? "Saving..."
										: editingQuestionId
											? "Update question"
											: "Add question"}
								</Button>
								<div className="flex justify-end">
									<Button
										type="button"
										variant="outline"
										className="w-full sm:w-auto"
										onClick={() => setIsClearFormConfirmOpen(true)}
										disabled={!isQuestionEditUnlocked || isFormPristine}
									>
										Clear form
									</Button>
								</div>
							</form>
						</GlassCard>

						<GlassCard className="px-5 py-6 sm:px-8">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<SectionEyebrow>Publish</SectionEyebrow>
									<h2 className="font-display text-3xl text-foreground">
										Launch the challenge
									</h2>
								</div>
									{challenge.status === "closed" ? (
										<Button className="sm:w-auto" disabled>
											Challenge closed
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

							{challenge.status !== "draft" ? (
								<div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
									<Input readOnly value={shareUrl} />
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
							<h2 className="font-display text-3xl text-foreground">
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
									className="rounded-xl border border-border bg-secondary/30 p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
												Question {index + 1}
											</p>
											<h3 className="mt-2 text-lg font-semibold leading-7 text-foreground">
												{question.text}
											</h3>
										</div>
										{hasAdminAccess && isQuestionEditUnlocked ? (
											<div className="flex items-center gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => beginEditing(question)}
												>
													<Pencil className="h-3.5 w-3.5" />
													Edit
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setDeleteTarget(question)}
												>
													<Trash2 className="h-3.5 w-3.5" />
													Delete
												</Button>
											</div>
										) : null}
									</div>
									<div className="mt-4 flex flex-wrap gap-2">
										<MetricPill
											label="Options"
											value={String(question.options.length)}
											className="min-w-[9rem]"
										/>
										<MetricPill
											label="Points"
											value={`${question.pointValue} pts`}
											className="min-w-[9rem]"
										/>
									</div>
								</div>
							))
						)}
					</div>
				</GlassCard>

				{hasAdminAccess &&
				(challenge.status === "open" || challenge.status === "scoring") && (
					<GlassCard className="px-5 py-6 sm:px-8">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<SectionEyebrow>Answer marking</SectionEyebrow>
								<h2 className="font-display text-3xl text-foreground">
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
								<div
									key={question._id}
									className="rounded-xl border border-border bg-secondary/30 p-4"
								>
									<h3 className="text-lg font-semibold leading-7 text-foreground">
										{question.text}
									</h3>
									<div className="mt-4 grid gap-3">
										{question.options.map((option, optionIndex) => (
											<OptionButton
												key={option}
												onClick={() =>
													handleMarkAnswer(question._id.toString(), optionIndex)
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
								</div>
							))}
						</div>

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
										variant="destructive"
										className="w-full sm:w-auto"
										onClick={() => setIsCloseConfirmOpen(true)}
									>
										Close challenge
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
						<Button variant="destructive" className="w-full" onClick={handleDeleteQuestion}>
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
						<Button className="w-full" onClick={handleShare} disabled={isSharing}>
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
				<Input readOnly value={shareUrl} />
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

			<AlertDialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Close challenge?</AlertDialogTitle>
						<AlertDialogDescription>
							Players can still view the leaderboard, but new submissions will be
							blocked.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="w-full sm:w-auto">
							Keep open
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							className="w-full sm:w-auto"
							onClick={handleCloseChallenge}
							disabled={isClosing}
						>
							{isClosing ? "Closing..." : "Close challenge"}
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
							This unlocks question editing for admins. The challenge link stays the
							same and users can continue answering.
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
