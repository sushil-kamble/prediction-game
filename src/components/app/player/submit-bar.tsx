import { useState } from "react";
import { BottomSheet, Button } from "#/components/app/ui";

export function SubmitBar({
	answeredCount,
	totalQuestions,
	challengeTitle,
	challengeSport,
	onSubmit,
	isSubmitting,
}: {
	answeredCount: number;
	totalQuestions: number;
	challengeTitle: string;
	challengeSport: string;
	onSubmit: () => Promise<boolean>;
	isSubmitting: boolean;
}) {
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const hasAtLeastOne = answeredCount > 0;
	const isPartial = hasAtLeastOne && answeredCount < totalQuestions;
	const unansweredCount = totalQuestions - answeredCount;

	return (
		<>
			<div
				className="fixed inset-x-0 bottom-0 z-40 px-4"
				style={{
					paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
				}}
			>
				<div className="border-border bg-card/95 mx-auto max-w-5xl overflow-hidden rounded-xl border shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
					<div className="h-1 w-full bg-zinc-800/60">
						<div
							className="bg-primary h-full transition-all duration-500 ease-out"
							style={{
								width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
							}}
						/>
					</div>
					<div className="flex items-center gap-3 px-4 py-3">
						<div className="flex-1">
							<p className="text-foreground m-0 text-sm font-semibold">
								{answeredCount}/{totalQuestions} picked
							</p>
							{isPartial ? (
								<p className="m-0 text-xs text-amber-400">
									{unansweredCount} unanswered —{" "}
									you can still submit
								</p>
							) : null}
						</div>
						<Button
							onClick={() => setIsConfirmOpen(true)}
							disabled={!hasAtLeastOne}
						>
							{isPartial ? "Submit" : "Submit all"}
						</Button>
					</div>
				</div>
			</div>

			<BottomSheet
				open={isConfirmOpen}
				onClose={() => setIsConfirmOpen(false)}
				title={isPartial ? "Submit with unanswered questions?" : "Lock in your predictions?"}
				description={isPartial
					? `You have ${unansweredCount} unanswered question${unansweredCount === 1 ? "" : "s"}. Unanswered questions will be scored as incorrect. You can't change picks after submitting.`
					: "You can't change them after this. Make sure every answer looks right before you confirm."}
				footer={
					<>
						<Button
							className="w-full"
							onClick={async () => {
								const success = await onSubmit();
								if (success) setIsConfirmOpen(false);
							}}
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
						{challengeTitle}
					</p>
					<div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs font-semibold">
						<span>{challengeSport}</span>
						<span>•</span>
						<span>
							{answeredCount}/{totalQuestions} answered
						</span>
					</div>
					</div>
			</BottomSheet>
		</>
	);
}
