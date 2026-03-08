import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	Button,
	FullScreenState,
	PageShell,
	SkeletonBlock,
} from "#/components/app/ui";
import { AdminDialogs } from "#/components/app/admin/admin-dialogs";
import type { AdminQuestion } from "#/components/app/admin/admin-challenge-types";
import { ChallengeHeaderCard } from "#/components/app/admin/challenge-header-card";
import { QuestionSetupSection } from "#/components/app/admin/question-setup-section";
import { RuntimeSection } from "#/components/app/admin/runtime-section";
import { ScoringSection } from "#/components/app/admin/scoring-section";
import { WorkflowCard } from "#/components/app/admin/workflow-card";
import { PodiumSection } from "#/components/app/results";
import { useToast } from "#/components/app/use-toast";
import { api } from "#/lib/api";
import {
	type AdminWorkflowAction,
	answeredCorrectCount,
	buildChallengeUrl,
	buildLeaderboardUrl,
	canUnpublishChallengeQuestions,
	getAdminWorkflow,
	getRuntimeCopy,
	toggleCorrectOptionIndex,
} from "#/lib/challenge";
import { getStoredAdminChallenge } from "#/lib/storage";

export const Route = createFileRoute("/prediction/admin/$challengeId")({
	head: ({ params }) => ({
		meta: [{ title: `Admin ${params.challengeId} | Sushil Games` }],
	}),
	component: AdminChallengeRoute,
});

export function AdminChallengeRoute() {
	const { challengeId } = Route.useParams();
	const addQuestion = useMutation(api.challenges.addQuestion);
	const updateQuestion = useMutation(api.challenges.updateQuestion);
	const deleteQuestion = useMutation(api.challenges.deleteQuestion);
	const publishChallenge = useMutation(api.challenges.publishChallenge);
	const unpublishChallenge = useMutation(api.challenges.unpublishChallenge);
	const lockPredictions = useMutation(api.challenges.lockPredictions);
	const unlockPredictions = useMutation(api.challenges.unlockPredictions);
	const markCorrectAnswer = useMutation(api.challenges.markCorrectAnswer);
	const clearAnswerMarkings = useMutation(api.challenges.clearAnswerMarkings);
	const announceWinners = useMutation(api.challenges.announceWinners);
	const closeMutation = useMutation(api.challenges.closeChallenge);
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
	const [isLocking, setIsLocking] = useState(false);
	const [isUnlocking, setIsUnlocking] = useState(false);
	const [isLockConfirmOpen, setIsLockConfirmOpen] = useState(false);
	const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState(false);
	const [isCancelChallengeConfirmOpen, setIsCancelChallengeConfirmOpen] =
		useState(false);
	const [isCancellingChallenge, setIsCancellingChallenge] = useState(false);
	const questionInputRef = useRef<HTMLTextAreaElement | null>(null);
	const optionInputRefs = useRef<Array<HTMLInputElement | null>>([]);
	const addOptionButtonRef = useRef<HTMLButtonElement | null>(null);
	const decreasePointsButtonRef = useRef<HTMLButtonElement | null>(null);
	const questionSectionRef = useRef<HTMLElement | null>(null);
	const scoringSectionRef = useRef<HTMLElement | null>(null);

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
		optionInputRefs.current = optionInputRefs.current.slice(0, options.length);
	}, [options.length]);

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
			: `/prediction/c/${challengeId}`;

	const leaderboardUrl =
		typeof window !== "undefined"
			? buildLeaderboardUrl(window.location.origin, challengeId)
			: `/prediction/c/${challengeId}/leaderboard`;

	const answeredCount = challenge
		? answeredCorrectCount(challenge.questions)
		: 0;
	const isQuestionEditUnlocked =
		(challenge?.questionEditUnlocked ?? challenge?.status === "draft") &&
		challenge?.status !== "closed";
	const questionCount = challenge?.questions.length ?? 0;
	const submittedCount = leaderboard?.submittedParticipantCount ?? 0;
	const participantCount = leaderboard?.participantCount ?? 0;
	const allQuestionsScored =
		questionCount > 0 && answeredCount === questionCount;
	const showScoringSection = challenge?.status === "scoring";
	const showRuntimeLink = challenge?.status !== "draft";
	const showUtilityActions = challenge?.status !== "draft";
	const workflow = challenge
		? getAdminWorkflow({
				status: challenge.status,
				questionCount,
				questionsPublished: !isQuestionEditUnlocked,
				scoredCount: answeredCount,
				totalQuestions: questionCount,
				hasSubmissions: submittedCount > 0,
				winnersAnnounced: Boolean(challenge.winnersAnnouncedAt),
			})
		: null;

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

	const getEnabledOptionInputs = () =>
		optionInputRefs.current.filter((input): input is HTMLInputElement =>
			Boolean(input && !input.disabled)
		);

	const focusQuestionComposerField = (field: HTMLElement | null) => {
		if (!field) {
			return;
		}

		requestAnimationFrame(() => field.focus());
	};

	const handleQuestionInputTab = (
		event: KeyboardEvent<HTMLTextAreaElement>
	) => {
		if (
			event.key !== "Tab" ||
			event.shiftKey ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey
		) {
			return;
		}

		const firstOptionInput = getEnabledOptionInputs()[0];
		if (!firstOptionInput) {
			return;
		}

		event.preventDefault();
		focusQuestionComposerField(firstOptionInput);
	};

	const handleOptionInputTab = (
		event: KeyboardEvent<HTMLInputElement>,
		optionIndex: number
	) => {
		if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) {
			return;
		}

		const enabledOptionInputs = getEnabledOptionInputs();
		const currentInput = optionInputRefs.current[optionIndex];
		const currentPosition = currentInput
			? enabledOptionInputs.indexOf(currentInput)
			: -1;

		if (currentPosition === -1) {
			return;
		}

		event.preventDefault();

		if (event.shiftKey) {
			focusQuestionComposerField(
				currentPosition === 0
					? questionInputRef.current
					: enabledOptionInputs[currentPosition - 1]
			);
			return;
		}

		focusQuestionComposerField(
			enabledOptionInputs[currentPosition + 1] ??
				addOptionButtonRef.current ??
				decreasePointsButtonRef.current
		);
	};

	const handleAddOptionButtonTab = (
		event: KeyboardEvent<HTMLButtonElement>
	) => {
		if (
			event.key !== "Tab" ||
			!event.shiftKey ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey
		) {
			return;
		}

		const lastOptionInput = getEnabledOptionInputs().at(-1);
		if (!lastOptionInput) {
			return;
		}

		event.preventDefault();
		focusQuestionComposerField(lastOptionInput);
	};

	const handleDecreasePointsButtonTab = (
		event: KeyboardEvent<HTMLButtonElement>
	) => {
		if (
			event.key !== "Tab" ||
			!event.shiftKey ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey
		) {
			return;
		}

		event.preventDefault();
		focusQuestionComposerField(
			addOptionButtonRef.current ?? getEnabledOptionInputs().at(-1) ?? null
		);
	};

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
					<Link to="/prediction/admin" className="no-underline">
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
					<Link to="/prediction/admin" className="no-underline">
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
	const canUnlockPredictions =
		challenge.status === "scoring" && answeredCount === 0;
	const canCancelChallenge =
		challenge.status !== "closed" && !challenge.winnersAnnouncedAt;
	const canUnpublishQuestions = canUnpublishChallengeQuestions({
		status: challenge.status,
		submittedCount,
		questionEditUnlocked: isQuestionEditUnlocked,
	});
	const { title: runtimeTitle, description: runtimeDescription } =
		getRuntimeCopy({
			status: challenge.status,
			isQuestionEditUnlocked,
			questionCount,
			allQuestionsScored,
			winnersAnnouncedAt: challenge.winnersAnnouncedAt ?? null,
			formatTs: formatTimestamp,
		});

	function scrollToSection(section: HTMLElement | null) {
		section?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	function handleWorkflowAction(action: AdminWorkflowAction | null) {
		switch (action) {
			case "focus-questions":
				scrollToSection(questionSectionRef.current);
				focusQuestionComposerField(questionInputRef.current);
				return;
			case "publish":
				void handlePublish();
				return;
			case "lock-predictions":
				setIsLockConfirmOpen(true);
				return;
			case "focus-scoring":
				scrollToSection(scoringSectionRef.current);
				return;
			case "announce-winners":
				if (canAnnounceWinners) {
					setIsAnnounceConfirmOpen(true);
				}
				return;
			default:
				return;
		}
	}

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
			showToast(
				"Questions are unpublished and hidden from players.",
				"success"
			);
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
					title: challenge?.title ?? "Sushil Games",
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

	async function handleCopyShareLink() {
		if (typeof navigator === "undefined" || !navigator.clipboard) {
			showToast("Clipboard access isn't available in this browser.", "error");
			return;
		}

		try {
			await navigator.clipboard.writeText(shareUrl);
			showToast("Link copied!", "success");
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		}
	}

	async function handleMarkAnswer(
		questionIdToScore: string,
		optionIndex: number,
		currentOptionIndex: number | null
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
				correctOptionIndex: toggleCorrectOptionIndex(
					currentOptionIndex,
					optionIndex
				),
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

	async function handleLockPredictions() {
		if (!adminSecret) return;
		setIsLocking(true);
		try {
			await lockPredictions({ challengeId, adminSecret });
			showToast("Predictions locked. No new submissions allowed.", "success");
			setIsLockConfirmOpen(false);
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsLocking(false);
		}
	}

	async function handleUnlockPredictions() {
		if (!adminSecret) return;
		setIsUnlocking(true);
		try {
			await unlockPredictions({ challengeId, adminSecret });
			showToast("Predictions unlocked. Players can submit again.", "success");
			setIsUnlockConfirmOpen(false);
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsUnlocking(false);
		}
	}

	async function handleCancelChallenge() {
		if (!adminSecret) return;
		setIsCancellingChallenge(true);
		try {
			await closeMutation({ challengeId, adminSecret });
			showToast("Challenge cancelled.", "success");
			setIsCancelChallengeConfirmOpen(false);
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsCancellingChallenge(false);
		}
	}

	function beginEditing(question: AdminQuestion) {
		setEditingQuestionId(question._id.toString());
		setQuestionText(question.text);
		setOptions(question.options);
		setPointValue(question.pointValue);
		scrollToSection(questionSectionRef.current);
		focusQuestionComposerField(questionInputRef.current);
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

	const actionLoadingStates: Record<string, { busy: boolean; label: string }> =
		{
			publish: { busy: isPublishing, label: "Publishing..." },
			"lock-predictions": { busy: isLocking, label: "Locking..." },
			"announce-winners": { busy: isAnnouncing, label: "Announcing..." },
		};
	const actionState = workflow?.primaryAction?.type
		? actionLoadingStates[workflow.primaryAction.type]
		: undefined;
	const workflowActionBusy = actionState?.busy ?? false;
	const workflowActionLabel = actionState?.busy
		? actionState.label
		: workflow?.primaryAction?.label;

	return (
		<>
			<PageShell className="gap-6 py-6 sm:py-8">
				<ChallengeHeaderCard
					challengeId={challengeId}
					title={challenge.title}
					sport={challenge.sport}
					status={challenge.status}
					runtimeDescription={runtimeDescription}
					questionCount={questionCount}
					answeredCount={answeredCount}
					submittedCount={submittedCount}
					participantCount={participantCount}
					showUtilityActions={showUtilityActions}
					onOpenShareSheet={() => setIsShareSheetOpen(true)}
					onCopyShareLink={handleCopyShareLink}
				/>

				{workflow ? (
					<WorkflowCard
						workflow={workflow}
						workflowActionBusy={workflowActionBusy}
						workflowActionLabel={workflowActionLabel}
						onWorkflowAction={handleWorkflowAction}
					/>
				) : null}

				<section ref={questionSectionRef}>
					<QuestionSetupSection
						editingQuestionId={editingQuestionId}
						questionCount={questionCount}
						isQuestionEditUnlocked={isQuestionEditUnlocked}
						challengeStatus={challenge.status}
						questionText={questionText}
						options={options}
						pointValue={pointValue}
						isSaving={isSaving}
						isFormPristine={isFormPristine}
						orderedQuestions={orderedQuestions}
						questionInputRef={questionInputRef}
						optionInputRefs={optionInputRefs}
						addOptionButtonRef={addOptionButtonRef}
						decreasePointsButtonRef={decreasePointsButtonRef}
						onQuestionTextChange={setQuestionText}
						onQuestionInputTab={handleQuestionInputTab}
						onOptionChange={(index, value) =>
							setOptions((current) =>
								current.map((item, itemIndex) =>
									itemIndex === index ? value : item
								)
							)
						}
						onOptionInputTab={handleOptionInputTab}
						onAddOption={() => setOptions((current) => [...current, ""])}
						onAddOptionButtonTab={handleAddOptionButtonTab}
						onRemoveOption={(index) =>
							setOptions((current) =>
								current.length <= 2
									? current
									: current.filter((_, itemIndex) => itemIndex !== index)
							)
						}
						onDecreasePoints={() =>
							setPointValue((current) => Math.max(1, current - 1))
						}
						onDecreasePointsButtonTab={handleDecreasePointsButtonTab}
						onIncreasePoints={() => setPointValue((current) => current + 1)}
						onSubmit={handleSaveQuestion}
						onClear={() => setIsClearFormConfirmOpen(true)}
						onBeginEditing={beginEditing}
						onDeleteQuestion={setDeleteTarget}
					/>
				</section>

				{leaderboard.podium.length > 0 ? (
					<PodiumSection
						podium={leaderboard.podium}
						winnersAnnounced={leaderboard.winnersAnnounced}
						title={
							leaderboard.winnersAnnounced
								? "Announced winners"
								: "Announcement preview"
						}
					/>
				) : null}

				{showScoringSection ? (
					<section ref={scoringSectionRef}>
						<ScoringSection
							orderedQuestions={orderedQuestions}
							answeredCount={answeredCount}
							submittedCount={submittedCount}
							canAnnounceWinners={canAnnounceWinners}
							isClearingMarkings={isClearingMarkings}
							leaderboardUrl={leaderboardUrl}
							onMarkAnswer={handleMarkAnswer}
							onClearMarkings={() => setIsClearMarkingsConfirmOpen(true)}
							onAnnounceWinners={() => setIsAnnounceConfirmOpen(true)}
						/>
					</section>
				) : null}

				<RuntimeSection
					runtimeTitle={runtimeTitle}
					runtimeDescription={runtimeDescription}
					participantCount={participantCount}
					questionCount={questionCount}
					winnersAnnouncedAt={challenge.winnersAnnouncedAt ?? null}
					showRuntimeLink={showRuntimeLink}
					shareUrl={shareUrl}
					canUnpublishQuestions={canUnpublishQuestions}
					canUnlockPredictions={canUnlockPredictions}
					canCancelChallenge={canCancelChallenge}
					onUnpublishQuestions={() => setIsUnpublishConfirmOpen(true)}
					onUnlockSubmissions={() => setIsUnlockConfirmOpen(true)}
					onCancelChallenge={() => setIsCancelChallengeConfirmOpen(true)}
					formatTimestamp={formatTimestamp}
				/>
			</PageShell>

			<AdminDialogs
				deleteTargetLabel={deleteTarget?.text ?? null}
				isShareSheetOpen={isShareSheetOpen}
				shareUrl={shareUrl}
				isSharing={isSharing}
				isClearFormConfirmOpen={isClearFormConfirmOpen}
				isAnnounceConfirmOpen={isAnnounceConfirmOpen}
				isAnnouncing={isAnnouncing}
				isUnpublishConfirmOpen={isUnpublishConfirmOpen}
				isUnpublishing={isUnpublishing}
				isClearMarkingsConfirmOpen={isClearMarkingsConfirmOpen}
				isClearingMarkings={isClearingMarkings}
				isLockConfirmOpen={isLockConfirmOpen}
				isLocking={isLocking}
				isUnlockConfirmOpen={isUnlockConfirmOpen}
				isUnlocking={isUnlocking}
				isCancelChallengeConfirmOpen={isCancelChallengeConfirmOpen}
				isCancellingChallenge={isCancellingChallenge}
				challengeTitle={challenge.title}
				onDeleteTargetChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
					}
				}}
				onDeleteQuestion={handleDeleteQuestion}
				onShareSheetChange={setIsShareSheetOpen}
				onShare={handleShare}
				onClearFormConfirmChange={setIsClearFormConfirmOpen}
				onClearForm={handleClearForm}
				onAnnounceConfirmChange={setIsAnnounceConfirmOpen}
				onAnnounceWinners={handleAnnounceWinners}
				onUnpublishConfirmChange={setIsUnpublishConfirmOpen}
				onUnpublish={handleUnpublish}
				onClearMarkingsConfirmChange={setIsClearMarkingsConfirmOpen}
				onClearAnswerMarkings={handleClearAnswerMarkings}
				onLockConfirmChange={setIsLockConfirmOpen}
				onLockPredictions={handleLockPredictions}
				onUnlockConfirmChange={setIsUnlockConfirmOpen}
				onUnlockPredictions={handleUnlockPredictions}
				onCancelChallengeConfirmChange={setIsCancelChallengeConfirmOpen}
				onCancelChallenge={handleCancelChallenge}
			/>
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
