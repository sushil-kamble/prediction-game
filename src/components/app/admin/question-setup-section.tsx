import type {
	FormEvent,
	KeyboardEvent,
	MutableRefObject,
	RefObject,
} from "react";
import {
	Button,
	GlassCard,
	InlineNotice,
	Input,
	Textarea,
} from "#/components/app/ui";
import { optionLabel } from "#/lib/challenge";
import type { AdminQuestion } from "./admin-challenge-types";
import { Minus, Pencil, Plus, Trash2, X } from "lucide-react";

type QuestionSetupSectionProps = {
	editingQuestionId: string | null;
	questionCount: number;
	isQuestionEditUnlocked: boolean;
	challengeStatus: "draft" | "open" | "scoring" | "closed";
	questionText: string;
	options: string[];
	pointValue: number;
	isSaving: boolean;
	isFormPristine: boolean;
	orderedQuestions: AdminQuestion[];
	questionInputRef: RefObject<HTMLTextAreaElement | null>;
	optionInputRefs: MutableRefObject<Array<HTMLInputElement | null>>;
	addOptionButtonRef: RefObject<HTMLButtonElement | null>;
	decreasePointsButtonRef: RefObject<HTMLButtonElement | null>;
	onQuestionTextChange: (value: string) => void;
	onQuestionInputTab: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
	onOptionChange: (index: number, value: string) => void;
	onOptionInputTab: (
		event: KeyboardEvent<HTMLInputElement>,
		index: number
	) => void;
	onAddOption: () => void;
	onAddOptionButtonTab: (event: KeyboardEvent<HTMLButtonElement>) => void;
	onRemoveOption: (index: number) => void;
	onDecreasePoints: () => void;
	onDecreasePointsButtonTab: (event: KeyboardEvent<HTMLButtonElement>) => void;
	onIncreasePoints: () => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onClear: () => void;
	onBeginEditing: (question: AdminQuestion) => void;
	onDeleteQuestion: (question: AdminQuestion) => void;
};

export function QuestionSetupSection({
	editingQuestionId,
	questionCount,
	isQuestionEditUnlocked,
	challengeStatus,
	questionText,
	options,
	pointValue,
	isSaving,
	isFormPristine,
	orderedQuestions,
	questionInputRef,
	optionInputRefs,
	addOptionButtonRef,
	decreasePointsButtonRef,
	onQuestionTextChange,
	onQuestionInputTab,
	onOptionChange,
	onOptionInputTab,
	onAddOption,
	onAddOptionButtonTab,
	onRemoveOption,
	onDecreasePoints,
	onDecreasePointsButtonTab,
	onIncreasePoints,
	onSubmit,
	onClear,
	onBeginEditing,
	onDeleteQuestion,
}: QuestionSetupSectionProps) {
	return (
		<GlassCard className="px-5 py-5 sm:px-6">
			<div className="flex items-baseline justify-between gap-3">
				<div>
					<p className="text-primary text-xs font-bold tracking-widest uppercase">
						Question setup
					</p>
					<h2 className="font-display text-foreground mt-1 text-2xl leading-tight sm:text-3xl">
						{editingQuestionId ? "Editing question" : "Build the question set"}
					</h2>
				</div>
				<span className="shrink-0 text-sm font-bold text-zinc-500">
					{questionCount} {questionCount === 1 ? "question" : "questions"}
				</span>
			</div>

			{!isQuestionEditUnlocked ? (
				<InlineNotice tone="warning" className="mt-4">
					{challengeStatus === "closed"
						? "Challenge closed. Editing is permanently locked."
						: "Questions are frozen. Use the manage section below to unlock editing."}
				</InlineNotice>
			) : null}

			{/* Composer */}
			<form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
				<label className="flex flex-col gap-1.5">
					<span className="text-xs font-semibold text-zinc-400">
						Question
					</span>
					<Textarea
						ref={questionInputRef}
						value={questionText}
						onChange={(event) => onQuestionTextChange(event.target.value)}
						onKeyDown={onQuestionInputTab}
						placeholder="Who scores first?"
						disabled={!isQuestionEditUnlocked}
					/>
				</label>

				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-zinc-400">
							Options
						</span>
						{options.length < 5 ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								ref={addOptionButtonRef}
								onClick={onAddOption}
								onKeyDown={onAddOptionButtonTab}
								disabled={!isQuestionEditUnlocked}
							>
								<Plus className="h-3.5 w-3.5" />
								Add option
							</Button>
						) : null}
					</div>

					{options.map((option, index) => (
						<div key={index} className="flex items-center gap-2">
							<span className="w-5 shrink-0 text-center text-xs font-bold text-zinc-600">
								{optionLabel(index)}
							</span>
							<Input
								ref={(node) => {
									optionInputRefs.current[index] = node;
								}}
								value={option}
								onChange={(event) =>
									onOptionChange(index, event.target.value)
								}
								placeholder={`Option ${optionLabel(index)}`}
								onKeyDown={(event) => onOptionInputTab(event, index)}
								disabled={!isQuestionEditUnlocked}
								className="flex-1"
							/>
							<button
								type="button"
								onClick={() => onRemoveOption(index)}
								disabled={!isQuestionEditUnlocked || options.length <= 2}
								className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-zinc-800 text-zinc-600 transition-colors hover:border-rose-500 hover:text-rose-400 disabled:opacity-20"
								aria-label={`Remove option ${optionLabel(index)}`}
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
					))}
				</div>

				<div className="flex items-center gap-3">
					<span className="text-xs font-semibold text-zinc-400">Points</span>
					<div className="flex items-center">
						<button
							type="button"
							ref={decreasePointsButtonRef}
							onClick={onDecreasePoints}
							onKeyDown={onDecreasePointsButtonTab}
							disabled={!isQuestionEditUnlocked || pointValue <= 1}
							className="flex h-9 w-9 items-center justify-center border-2 border-r-0 border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors hover:text-white disabled:opacity-30"
							aria-label="Decrease point value"
						>
							<Minus className="h-3.5 w-3.5" />
						</button>
						<div className="flex h-9 min-w-[2.5rem] items-center justify-center border-2 border-zinc-800 bg-zinc-900 px-2">
							<span className="text-sm font-bold tabular-nums text-white">
								{pointValue}
							</span>
						</div>
						<button
							type="button"
							onClick={onIncreasePoints}
							disabled={!isQuestionEditUnlocked}
							className="flex h-9 w-9 items-center justify-center border-2 border-l-0 border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors hover:text-white disabled:opacity-30"
							aria-label="Increase point value"
						>
							<Plus className="h-3.5 w-3.5" />
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2">
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
							onClick={onClear}
							disabled={!isQuestionEditUnlocked}
						>
							Clear
						</Button>
					) : null}
				</div>
			</form>

			{/* Question list — full height, no scroll constraint */}
			{orderedQuestions.length > 0 ? (
				<div className="mt-6 border-t border-zinc-800 pt-5">
					<span className="text-xs font-semibold text-zinc-400">
						Current stack ({questionCount})
					</span>
					<div className="mt-3 grid gap-2">
						{orderedQuestions.map((question, index) => (
							<div
								key={question._id}
								className="flex items-start gap-3 border-2 border-zinc-800 bg-zinc-950/50 px-3 py-3 transition-colors hover:border-zinc-700"
							>
								<span className="text-primary mt-0.5 shrink-0 text-xs font-bold">
									{index + 1}
								</span>
								<div className="min-w-0 flex-1">
									<p className="text-foreground text-sm leading-snug font-medium">
										{question.text}
									</p>
									<div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
										<span>{question.options.length} options</span>
										<span className="text-zinc-700">·</span>
										<span>
											{question.pointValue}{" "}
											{question.pointValue === 1 ? "pt" : "pts"}
										</span>
										{question.correctOptionIndex !== null ? (
											<>
												<span className="text-zinc-700">·</span>
												<span className="text-emerald-400">
													Answer: {optionLabel(question.correctOptionIndex)}
												</span>
											</>
										) : null}
									</div>
								</div>
								{isQuestionEditUnlocked ? (
									<div className="flex shrink-0 items-center gap-1">
										<button
											type="button"
											onClick={() => onBeginEditing(question)}
											className="flex h-8 w-8 items-center justify-center border-2 border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white"
											aria-label={`Edit question ${index + 1}`}
										>
											<Pencil className="h-3 w-3" />
										</button>
										<button
											type="button"
											onClick={() => onDeleteQuestion(question)}
											className="flex h-8 w-8 items-center justify-center border-2 border-zinc-800 text-zinc-500 transition-colors hover:border-rose-500 hover:text-rose-400"
											aria-label={`Delete question ${index + 1}`}
										>
											<Trash2 className="h-3 w-3" />
										</button>
									</div>
								) : null}
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="mt-6 border-t border-zinc-800 pt-5">
					<div className="px-2 py-6 text-center text-sm text-zinc-600">
						No questions yet. Add one to get started.
					</div>
				</div>
			)}
		</GlassCard>
	);
}
