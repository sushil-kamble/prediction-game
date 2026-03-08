import { useEffect, useMemo, useRef, useState } from "react";
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
	Unlock,
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
	type AdminWorkflowAction,
	type AdminWorkflowStepState,
	answeredCorrectCount,
	buildChallengeUrl,
	buildLeaderboardUrl,
	getAdminWorkflow,
	optionLabel,
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

export const Route = createFileRoute("/prediction/admin/$challengeId")({
	head: ({ params }) => ({
		meta: [{ title: `Admin ${params.challengeId} | Sushil Games` }],
	}),
	component: AdminChallengeRoute,
});

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
	const lockPredictions = useMutation(api.challenges.lockPredictions);
	const unlockPredictions = useMutation(api.challenges.unlockPredictions);
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
	const [isLocking, setIsLocking] = useState(false);
	const [isUnlocking, setIsUnlocking] = useState(false);
	const [isLockConfirmOpen, setIsLockConfirmOpen] = useState(false);
	const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState(false);
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
	const canUnpublishQuestions =
		challenge.status === "open" &&
		submittedCount === 0 &&
		!isQuestionEditUnlocked;
	const runtimeTitle =
		challenge.status === "draft"
			? "Publishing will freeze the question set"
			: challenge.status === "open" && isQuestionEditUnlocked
				? "Questions are unpublished"
				: challenge.status === "open"
					? "The challenge is live"
					: challenge.status === "scoring"
						? "Submissions are locked"
						: "The challenge is finalized";
	const runtimeDescription =
		challenge.status === "draft"
			? questionCount === 0
				? "Add at least one question before publishing. Once published, the current question set is frozen for players."
				: "The current question set is ready. Publishing will open the player link and freeze these questions for prediction."
			: challenge.status === "open" && isQuestionEditUnlocked
				? "Players cannot view or answer these questions right now. Republish when the updated question set is ready to go live again."
				: challenge.status === "open"
					? "Players can join and submit predictions. Answer marking stays hidden until you lock submissions."
					: challenge.status === "scoring"
						? allQuestionsScored
							? "Every question is scored. If players submitted picks, you can finish by announcing winners."
							: "No new submissions are allowed. Mark each answer below to complete the board."
						: challenge.winnersAnnouncedAt
							? `Winners were announced on ${formatTimestamp(
									challenge.winnersAnnouncedAt
								)}.`
							: "This challenge is closed.";

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
				correctOptionIndex:
					currentOptionIndex === optionIndex ? null : optionIndex,
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

	const workflowActionBusy =
		workflow?.primaryAction?.type === "publish"
			? isPublishing
			: workflow?.primaryAction?.type === "lock-predictions"
				? isLocking
				: workflow?.primaryAction?.type === "announce-winners"
					? isAnnouncing
					: false;
	const workflowActionLabel =
		workflow?.primaryAction?.type === "publish" && isPublishing
			? "Publishing..."
			: workflow?.primaryAction?.type === "lock-predictions" && isLocking
				? "Locking..."
				: workflow?.primaryAction?.type === "announce-winners" && isAnnouncing
					? "Announcing..."
					: workflow?.primaryAction?.label;

	return (
		<>
			<PageShell className="gap-6 py-6 sm:py-8">
				<GlassCard className="px-5 py-6 sm:px-8">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<Button variant="outline" size="sm" asChild>
								<Link to="/prediction/admin" className="no-underline">
									<ArrowLeft className="h-4 w-4" />
									Back
								</Link>
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="pointer-events-none"
							>
								Admin mode
							</Button>
						</div>
						{showUtilityActions ? (
							<div className="flex flex-wrap items-center gap-2">
								<Button variant="outline" size="sm" asChild>
									<Link
										to="/prediction/c/$challengeId/leaderboard"
										params={{ challengeId }}
										className="no-underline"
									>
										Preview leaderboard
									</Link>
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsShareSheetOpen(true)}
								>
									<Share2 className="h-4 w-4" />
									Share
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => void handleCopyShareLink()}
								>
									<Copy className="h-4 w-4" />
									Copy link
								</Button>
							</div>
						) : null}
					</div>

					<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(17rem,0.9fr)] lg:items-end">
						<div className="min-w-0">
							<SectionEyebrow>Challenge</SectionEyebrow>
							<h1 className="font-display text-foreground text-4xl leading-none sm:text-5xl">
								{challenge.title}
							</h1>
							<div className="mt-4 flex flex-wrap gap-2">
								<SportBadge sport={challenge.sport} />
								<StatusBadge status={challenge.status} />
							</div>
							<p className="mt-4 max-w-2xl text-sm leading-relaxed font-medium text-zinc-400 uppercase">
								{runtimeDescription}
							</p>
						</div>
						<div className="grid grid-cols-3 gap-3">
							<MetricPill label="Questions" value={String(questionCount)} />
							<MetricPill
								label="Scored"
								value={`${answeredCount}/${questionCount}`}
							/>
							<MetricPill
								label="Submitted"
								value={`${submittedCount}/${participantCount}`}
							/>
						</div>
					</div>
				</GlassCard>

				{workflow ? (
					<GlassCard className="border-primary/30 bg-primary/5 px-5 py-6 sm:px-8">
						<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
							<div className="max-w-2xl">
								<SectionEyebrow className="text-primary">
									{workflow.eyebrow}
								</SectionEyebrow>
								<h2 className="font-display text-foreground text-3xl leading-none sm:text-4xl">
									{workflow.title}
								</h2>
								<p className="mt-3 text-sm leading-relaxed font-medium text-zinc-300 uppercase">
									{workflow.description}
								</p>
							</div>
							{workflow.primaryAction ? (
								<Button
									className="w-full sm:w-auto"
									onClick={() =>
										handleWorkflowAction(workflow.primaryAction?.type ?? null)
									}
									disabled={
										workflow.primaryAction.disabled || workflowActionBusy
									}
								>
									{workflowActionLabel}
								</Button>
							) : null}
						</div>

						<div className="mt-6 grid gap-3 lg:grid-cols-3">
							{workflow.steps.map((step, index) => (
								<WorkflowStepCard
									key={step.key}
									index={index + 1}
									label={step.label}
									description={step.description}
									state={step.state}
								/>
							))}
						</div>
					</GlassCard>
				) : null}

				<section ref={questionSectionRef}>
					<GlassCard className="px-5 py-6 sm:px-8">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<SectionEyebrow>Question setup</SectionEyebrow>
								<h2 className="font-display text-foreground text-3xl">
									{editingQuestionId
										? "Editing question"
										: "Build the question set"}
								</h2>
								<p className="mt-2 max-w-2xl text-sm leading-relaxed font-medium text-zinc-400 uppercase">
									Add the questions players will answer. Once published, this
									set becomes read-only until you explicitly unlock it again.
								</p>
							</div>
							<MetricPill
								label="Current stack"
								value={String(questionCount)}
								className="sm:min-w-[12rem]"
							/>
						</div>

						{!isQuestionEditUnlocked ? (
							<InlineNotice tone="warning" className="mt-5">
								{challenge.status === "closed"
									? "Challenge closed. Editing is permanently locked."
									: "Questions are frozen. Use the runtime controls below if you need to unlock and edit them."}
							</InlineNotice>
						) : null}

						<div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
							<form
								className="flex flex-col gap-5"
								onSubmit={handleSaveQuestion}
							>
								<label className="flex flex-col gap-1.5">
									<span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
										Question
									</span>
									<Textarea
										ref={questionInputRef}
										value={questionText}
										onChange={(event) => setQuestionText(event.target.value)}
										onKeyDown={handleQuestionInputTab}
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
												ref={addOptionButtonRef}
												onClick={() =>
													setOptions((current) => [...current, ""])
												}
												onKeyDown={handleAddOptionButtonTab}
												disabled={!isQuestionEditUnlocked}
												className="focus-visible:ring-primary/40 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:text-primary flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold tracking-widest uppercase transition-colors outline-none focus-visible:ring-4 disabled:opacity-40"
												aria-label="Add another option"
											>
												<Plus className="h-4 w-4" />
												Add option
											</button>
										) : null}
									</div>

									{options.map((option, index) => (
										<div key={index} className="flex items-center gap-2">
											<span className="text-muted-foreground w-5 shrink-0 text-center text-xs font-bold">
												{optionLabel(index)}
											</span>
											<Input
												ref={(node) => {
													optionInputRefs.current[index] = node;
												}}
												value={option}
												onChange={(event) =>
													setOptions((current) =>
														current.map((item, itemIndex) =>
															itemIndex === index ? event.target.value : item
														)
													)
												}
												placeholder={`Option ${optionLabel(index)}`}
												onKeyDown={(event) =>
													handleOptionInputTab(event, index)
												}
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
												aria-label={`Remove option ${optionLabel(index)}`}
											>
												<X className="h-4 w-4" />
											</button>
										</div>
									))}
								</div>

								<div className="flex items-center gap-3">
									<span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
										Points
									</span>
									<div className="flex items-center">
										<button
											type="button"
											ref={decreasePointsButtonRef}
											onClick={() =>
												setPointValue((current) => Math.max(1, current - 1))
											}
											onKeyDown={handleDecreasePointsButtonTab}
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

							<div className="border-2 border-zinc-800 bg-zinc-950 p-4 sm:p-5">
								<div className="flex items-center justify-between gap-3">
									<div>
										<SectionEyebrow className="mb-2">
											Current stack
										</SectionEyebrow>
										<p className="text-sm leading-relaxed font-medium text-zinc-400 uppercase">
											Review the question set exactly as the admin workflow will
											use it.
										</p>
									</div>
								</div>

								<div className="mt-5 grid gap-3">
									{orderedQuestions.length === 0 ? (
										<InlineNotice tone="warning">
											No questions yet. Add at least one to unlock publishing.
										</InlineNotice>
									) : (
										orderedQuestions.map((question, index) => (
											<div
												key={question._id}
												className="rounded-xl border border-zinc-800 bg-black/70 p-4"
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
														<div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500 uppercase">
															<span>{question.options.length} options</span>
															<span>
																{question.pointValue}{" "}
																{question.pointValue === 1 ? "pt" : "pts"}
															</span>
															{question.correctOptionIndex !== null ? (
																<span className="text-emerald-400">
																	Marked{" "}
																	{optionLabel(question.correctOptionIndex)}
																</span>
															) : null}
														</div>
													</div>
													{isQuestionEditUnlocked ? (
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
							</div>
						</div>
					</GlassCard>
				</section>

				<GlassCard className="px-5 py-6 sm:px-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="max-w-2xl">
							<SectionEyebrow>Publish & run</SectionEyebrow>
							<h2 className="font-display text-foreground text-3xl">
								{runtimeTitle}
							</h2>
							<p className="mt-2 text-sm leading-relaxed font-medium text-zinc-400 uppercase">
								{runtimeDescription}
							</p>
						</div>
						<MetricPill
							label="Players"
							value={`${participantCount}`}
							className="sm:min-w-[12rem]"
						/>
					</div>

					<div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
						<div className="grid gap-4">
							{questionCount === 0 ? (
								<InlineNotice tone="warning">
									Add at least one question before publishing.
								</InlineNotice>
							) : null}
							{challenge.winnersAnnouncedAt ? (
								<InlineNotice tone="success">
									Winners were announced on{" "}
									{formatTimestamp(challenge.winnersAnnouncedAt)}.
								</InlineNotice>
							) : null}
							<div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
								<p className="text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">
									Runtime notes
								</p>
								<ul className="mt-3 grid gap-2 text-sm leading-relaxed font-medium text-zinc-300 uppercase">
									<li>Publishing freezes the current question set.</li>
									<li>
										Answer marking only appears after submissions are locked.
									</li>
									<li>
										Winner announcement appears only after every answer is
										marked.
									</li>
								</ul>
							</div>
						</div>

						<div className="grid gap-4">
							{showRuntimeLink ? (
								<div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
									<p className="text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">
										Live challenge link
									</p>
									<Input
										readOnly
										value={shareUrl}
										aria-label="Challenge share link"
										className="mt-3"
									/>
								</div>
							) : null}

							{canUnpublishQuestions ? (
								<Button
									variant="outline"
									className="w-full"
									onClick={() => setIsUnpublishConfirmOpen(true)}
								>
									Unpublish questions
								</Button>
							) : null}

							{canUnlockPredictions ? (
								<Button
									variant="outline"
									className="w-full"
									onClick={() => setIsUnlockConfirmOpen(true)}
								>
									<Unlock className="h-4 w-4" />
									Unlock submissions
								</Button>
							) : null}
						</div>
					</div>
				</GlassCard>

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
						<GlassCard className="px-5 py-6 sm:px-8">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<SectionEyebrow>Answer marking</SectionEyebrow>
									<h2 className="font-display text-foreground text-3xl">
										Score the board
									</h2>
									<p className="mt-2 text-sm leading-relaxed font-medium text-zinc-400 uppercase">
										Choose the correct option for each question. Results stay
										draft-only until every answer is marked.
									</p>
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
															optionIndex,
															question.correctOptionIndex
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
																	nextIndex,
																	question.correctOptionIndex
																)
														)
													}
													correct={question.correctOptionIndex === optionIndex}
												>
													<span className="flex items-center gap-2">
														{question.correctOptionIndex === optionIndex ? (
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

							{!allQuestionsScored ? (
								<InlineNotice tone="warning" className="mt-6">
									Keep marking answers below. Winner announcement stays hidden
									until every question is scored.
								</InlineNotice>
							) : submittedCount === 0 ? (
								<InlineNotice tone="warning" className="mt-6">
									All questions are scored, but at least one submitted player is
									required before winners can be announced.
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
									{canAnnounceWinners ? (
										<Button
											className="w-full sm:w-auto"
											onClick={() => setIsAnnounceConfirmOpen(true)}
										>
											Announce winners
										</Button>
									) : null}
								</div>
							</div>
						</GlassCard>
					</section>
				) : null}
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
							This hides the challenge questions from players while you edit
							them. Republish once the updated question set is ready.
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

			<AlertDialog open={isLockConfirmOpen} onOpenChange={setIsLockConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Lock predictions?</AlertDialogTitle>
						<AlertDialogDescription>
							Players will no longer be able to join or submit predictions. Use
							this when the match starts.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="w-full sm:w-auto">
							Keep open
						</AlertDialogCancel>
						<AlertDialogAction
							className="w-full sm:w-auto"
							onClick={handleLockPredictions}
							disabled={isLocking}
						>
							{isLocking ? "Locking..." : "Lock predictions"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={isUnlockConfirmOpen}
				onOpenChange={setIsUnlockConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Unlock predictions?</AlertDialogTitle>
						<AlertDialogDescription>
							Players will be able to join and submit again. Only possible when
							no answers have been marked yet.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="w-full sm:w-auto">
							Keep locked
						</AlertDialogCancel>
						<AlertDialogAction
							className="w-full sm:w-auto"
							onClick={handleUnlockPredictions}
							disabled={isUnlocking}
						>
							{isUnlocking ? "Unlocking..." : "Unlock predictions"}
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

function WorkflowStepCard({
	index,
	label,
	description,
	state,
}: {
	index: number;
	label: string;
	description: string;
	state: AdminWorkflowStepState;
}) {
	const stateClassName =
		state === "complete"
			? "border-emerald-400/50 bg-emerald-400/10"
			: state === "current"
				? "border-primary bg-primary/10"
				: "border-zinc-800 bg-black/50";
	const badgeClassName =
		state === "complete"
			? "border-emerald-400 text-emerald-400"
			: state === "current"
				? "border-primary text-primary"
				: "border-zinc-700 text-zinc-500";
	const stateLabel =
		state === "complete"
			? "Complete"
			: state === "current"
				? "Current"
				: "Upcoming";

	return (
		<div className={`rounded-xl border p-4 ${stateClassName}`}>
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-3">
					<div
						className={`flex h-9 w-9 items-center justify-center border text-sm font-black ${badgeClassName}`}
					>
						{index}
					</div>
					<div>
						<p className="text-foreground text-sm font-bold tracking-wide uppercase">
							{label}
						</p>
						<p className="mt-1 text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
							{stateLabel}
						</p>
					</div>
				</div>
			</div>
			<p className="mt-4 text-sm leading-relaxed font-medium text-zinc-300 uppercase">
				{description}
			</p>
		</div>
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
