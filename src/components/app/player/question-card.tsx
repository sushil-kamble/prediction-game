import type { KeyboardEvent } from "react";
import { Check, Lock } from "lucide-react";
import { OptionButton } from "#/components/app/ui";
import { optionLabel } from "#/lib/challenge";

type QuestionCardQuestion = {
	_id: string;
	text: string;
	options: string[];
};

type QuestionCardProps = {
	question: QuestionCardQuestion;
	questionIndex: number;
	selectedOptionIndex: number | undefined;
} & (
	| { mode: "locked"; lockIconClassName?: string }
	| {
			mode: "active";
			onSelect: (optionIndex: number) => void;
	  }
);

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

export function QuestionCard(props: QuestionCardProps) {
	const { question, questionIndex, selectedOptionIndex, mode } = props;
	const isAnswered = selectedOptionIndex !== undefined;
	const isActive = mode === "active";

	return (
		<fieldset
			key={question._id}
			id={isActive ? `question-${question._id}` : undefined}
			className="border-border bg-secondary/30 scroll-mt-36 rounded-xl border p-4"
			role={isActive ? "radiogroup" : undefined}
			aria-labelledby={isActive ? `question-legend-${question._id}` : undefined}
		>
			<legend
				id={isActive ? `question-legend-${question._id}` : undefined}
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
					{isActive ? (
						isAnswered ? (
							<span className="bg-primary mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
								<Check className="h-3.5 w-3.5 text-black" />
							</span>
						) : null
					) : (
						<Lock
							className={`mt-0.5 h-4 w-4 shrink-0 ${
								mode === "locked" && props.lockIconClassName
									? props.lockIconClassName
									: "text-muted-foreground"
							}`}
						/>
					)}
				</div>
			</legend>
			<div className="mt-4 grid gap-3">
				{question.options.map((option, optionIndex) => {
					const isSelected = selectedOptionIndex === optionIndex;

					if (isActive) {
						return (
							<OptionButton
								key={option}
								role="radio"
								aria-checked={isSelected}
								tabIndex={isSelected || optionIndex === 0 ? 0 : -1}
								onClick={() => props.onSelect(optionIndex)}
								onKeyDown={(event) =>
									handleRadioOptionKeyDown(
										event,
										optionIndex,
										question.options.length,
										(nextIndex) => props.onSelect(nextIndex)
									)
								}
								selected={isSelected}
							>
								<span className="flex items-center gap-2">
									<span className="text-muted-foreground mr-1 font-mono text-xs">
										{optionLabel(optionIndex)}.
									</span>
									{option}
								</span>
							</OptionButton>
						);
					}

					return (
						<OptionButton
							key={option}
							locked
							role="radio"
							aria-checked={isSelected}
							aria-readonly="true"
							selected={isSelected}
						>
							<span className="flex items-center gap-2">
								{isSelected ? <Check className="h-4 w-4" /> : null}
								<span className="text-muted-foreground mr-1 font-mono text-xs">
									{optionLabel(optionIndex)}.
								</span>
								{option}
							</span>
						</OptionButton>
					);
				})}
			</div>
		</fieldset>
	);
}
