import type { KeyboardEvent } from "react";
import { Check } from "lucide-react";
import {
	Button,
	GlassCard,
	InlineNotice,
	OptionButton,
} from "#/components/app/ui";
import { optionLabel } from "#/lib/challenge";
import type { AdminQuestion } from "./admin-challenge-types";

type ScoringSectionProps = {
	orderedQuestions: AdminQuestion[];
	answeredCount: number;
	submittedCount: number;
	canAnnounceWinners: boolean;
	isClearingMarkings: boolean;
	leaderboardUrl: string;
	onMarkAnswer: (
		questionIdToScore: string,
		optionIndex: number,
		currentOptionIndex: number | null
	) => void;
	onClearMarkings: () => void;
	onAnnounceWinners: () => void;
};

export function ScoringSection({
	orderedQuestions,
	answeredCount,
	submittedCount,
	canAnnounceWinners,
	isClearingMarkings,
	leaderboardUrl,
	onMarkAnswer,
	onClearMarkings,
	onAnnounceWinners,
}: ScoringSectionProps) {
	const allQuestionsScored =
		orderedQuestions.length > 0 && answeredCount === orderedQuestions.length;

	return (
		<GlassCard className="px-5 py-5 sm:px-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-primary text-xs font-bold tracking-widest uppercase">
						Answer marking
					</p>
					<h2 className="font-display text-foreground mt-1 text-2xl leading-tight sm:text-3xl">
						Score the board
					</h2>
					<p className="mt-1 text-sm leading-relaxed text-zinc-400">
						Tap the correct option for each question.{" "}
						<span className="font-semibold text-zinc-300">
							{answeredCount}/{orderedQuestions.length}
						</span>{" "}
						scored.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" asChild className="shrink-0">
						<a href={leaderboardUrl} className="no-underline">
							Open leaderboard
						</a>
					</Button>
				</div>
			</div>

			{/* Progress bar */}
			<div className="mt-4 h-1.5 w-full overflow-hidden bg-zinc-800">
				<div
					className="h-full bg-emerald-400 transition-all duration-500 ease-out"
					style={{
						width: `${orderedQuestions.length > 0 ? (answeredCount / orderedQuestions.length) * 100 : 0}%`,
					}}
				/>
			</div>

			<div className="mt-5 grid gap-3">
				{orderedQuestions.map((question, qIndex) => {
					const isScored = question.correctOptionIndex !== null;
					return (
						<fieldset
							key={question._id}
							className={`rounded-lg border p-4 transition-colors ${
								isScored
									? "border-emerald-400/30 bg-emerald-400/5"
									: "border-zinc-800 bg-zinc-950/50"
							}`}
							role="radiogroup"
							aria-labelledby={`admin-score-${question._id}`}
						>
							<div className="flex items-start gap-3">
								<span
									className={`mt-0.5 shrink-0 text-xs font-bold ${isScored ? "text-emerald-400" : "text-zinc-600"}`}
								>
									{qIndex + 1}
								</span>
								<div className="min-w-0 flex-1">
									<h3
										id={`admin-score-${question._id}`}
										className="text-foreground text-base leading-snug font-semibold"
									>
										{question.text}
									</h3>
									<div className="mt-3 grid gap-2">
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
													onMarkAnswer(
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
															onMarkAnswer(
																question._id.toString(),
																nextIndex,
																question.correctOptionIndex
															)
													)
												}
												correct={
													question.correctOptionIndex === optionIndex
												}
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
								</div>
							</div>
						</fieldset>
					);
				})}
			</div>

			{!allQuestionsScored ? (
				<InlineNotice tone="warning" className="mt-4">
					Keep marking answers below. Winner announcement stays hidden until
					every question is scored.
				</InlineNotice>
			) : submittedCount === 0 ? (
				<InlineNotice tone="warning" className="mt-4">
					All questions are scored, but at least one submitted player is
					required before winners can be announced.
				</InlineNotice>
			) : null}

			<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
				<Button
					variant="outline"
					onClick={onClearMarkings}
					disabled={answeredCount === 0 || isClearingMarkings}
				>
					Clear answer markings
				</Button>
				{canAnnounceWinners ? (
					<Button onClick={onAnnounceWinners}>Announce winners</Button>
				) : null}
			</div>
		</GlassCard>
	);
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
