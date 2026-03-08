import { Check } from "lucide-react";
import { Button } from "#/components/app/ui";
import type {
	AdminWorkflowAction,
	AdminWorkflowModel,
	AdminWorkflowStepState,
} from "#/lib/challenge";

type WorkflowCardProps = {
	workflow: AdminWorkflowModel;
	workflowActionBusy: boolean;
	workflowActionLabel?: string;
	onWorkflowAction: (action: AdminWorkflowAction | null) => void;
};

export function WorkflowCard({
	workflow,
	workflowActionBusy,
	workflowActionLabel,
	onWorkflowAction,
}: WorkflowCardProps) {
	return (
		<section className="border-2 border-primary/30 bg-black p-5 sm:p-6 shadow-[0_0_24px_-4px_rgba(204,255,0,0.12)]">
			{/* Edge-to-edge segmented stepper */}
			<div className="flex">
				{workflow.steps.map((step, index) => (
					<StepSegment
						key={step.key}
						index={index + 1}
						label={step.label}
						state={step.state}
						isFirst={index === 0}
					/>
				))}
			</div>

			{/* Current step info + action */}
			<div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<p className="text-primary text-xs font-bold tracking-widest uppercase">
						{workflow.eyebrow}
					</p>
					<h2 className="font-display text-foreground mt-1 text-2xl leading-tight sm:text-3xl">
						{workflow.title}
					</h2>
					<p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
						{workflow.description}
					</p>
				</div>
				{workflow.primaryAction ? (
					<Button
						className="w-full shrink-0 sm:w-auto"
						onClick={() =>
							onWorkflowAction(workflow.primaryAction?.type ?? null)
						}
						disabled={workflow.primaryAction.disabled || workflowActionBusy}
					>
						{workflowActionLabel}
					</Button>
				) : null}
			</div>
		</section>
	);
}

function StepSegment({
	index,
	label,
	state,
	isFirst,
}: {
	index: number;
	label: string;
	state: AdminWorkflowStepState;
	isFirst: boolean;
}) {
	const isComplete = state === "complete";
	const isCurrent = state === "current";
	const isHighlighted = isComplete || isCurrent;

	return (
		<div
			className={`relative flex flex-1 items-center gap-2 border-2 px-2 py-2.5 sm:px-3 sm:py-3 ${
				isComplete
					? "z-10 border-emerald-400/40 bg-emerald-400/10"
					: isCurrent
						? "z-20 border-primary bg-primary/10"
						: "z-0 border-zinc-800 bg-zinc-950"
			} ${!isFirst && !isHighlighted ? "-ml-[2px]" : !isFirst ? "-ml-[2px]" : ""}`}
		>
			{/* Step indicator */}
			<span
				className={`flex h-6 w-6 shrink-0 items-center justify-center text-[10px] font-bold ${
					isComplete
						? "bg-emerald-400 text-black"
						: isCurrent
							? "border-primary text-primary border-2"
							: "border border-zinc-700 text-zinc-600"
				}`}
			>
				{isComplete ? <Check className="h-3 w-3" /> : index}
			</span>
			{/* Label — hidden on very small screens to prevent overflow */}
			<span
				className={`hidden text-xs font-bold leading-tight sm:block ${
					isComplete
						? "text-emerald-400"
						: isCurrent
							? "text-primary"
							: "text-zinc-600"
				}`}
			>
				{label}
			</span>
		</div>
	);
}
