import { Info, Link2, Unlock, XCircle } from "lucide-react";
import { Button, GlassCard, InlineNotice, Input } from "#/components/app/ui";

type RuntimeSectionProps = {
	runtimeTitle: string;
	runtimeDescription: string;
	participantCount: number;
	questionCount: number;
	winnersAnnouncedAt: number | null;
	showRuntimeLink: boolean;
	shareUrl: string;
	canUnpublishQuestions: boolean;
	canUnlockPredictions: boolean;
	canCancelChallenge: boolean;
	onUnpublishQuestions: () => void;
	onUnlockSubmissions: () => void;
	onCancelChallenge: () => void;
	formatTimestamp: (timestamp: number) => string;
};

export function RuntimeSection({
	runtimeTitle,
	runtimeDescription,
	participantCount,
	questionCount,
	winnersAnnouncedAt,
	showRuntimeLink,
	shareUrl,
	canUnpublishQuestions,
	canUnlockPredictions,
	canCancelChallenge,
	onUnpublishQuestions,
	onUnlockSubmissions,
	onCancelChallenge,
	formatTimestamp,
}: RuntimeSectionProps) {
	const hasActions =
		canUnpublishQuestions || canUnlockPredictions || canCancelChallenge;

	return (
		<GlassCard className="px-5 py-5 sm:px-6">
			<div>
				<p className="text-primary text-xs font-bold tracking-widest uppercase">
					Manage challenge
				</p>
				<h2 className="font-display text-foreground mt-1 text-2xl leading-tight sm:text-3xl">
					{runtimeTitle}
				</h2>
				<p className="mt-1 text-sm leading-relaxed text-zinc-400">
					{runtimeDescription}
				</p>
			</div>

			<div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500">
				<span className="flex items-center gap-1.5">
					<span className="text-xs font-medium">Players</span>
					<span className="font-bold text-white">{participantCount}</span>
				</span>
				<span className="flex items-center gap-1.5">
					<span className="text-xs font-medium">Questions</span>
					<span className="font-bold text-white">{questionCount}</span>
				</span>
			</div>

			{questionCount === 0 ? (
				<InlineNotice tone="warning" className="mt-4">
					Add at least one question before publishing.
				</InlineNotice>
			) : null}

			{winnersAnnouncedAt ? (
				<InlineNotice tone="success" className="mt-4">
					Winners were announced on {formatTimestamp(winnersAnnouncedAt)}.
				</InlineNotice>
			) : null}

			{showRuntimeLink ? (
				<div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
					<p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
						<Link2 className="h-3.5 w-3.5" />
						Live challenge link
					</p>
					<Input
						readOnly
						value={shareUrl}
						aria-label="Challenge share link"
						className="mt-2"
					/>
				</div>
			) : null}

			<div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
				<p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
					<Info className="h-3.5 w-3.5" />
					How it works
				</p>
				<ul className="mt-2 grid gap-1.5 text-sm leading-relaxed text-zinc-300">
					<li>Publishing freezes the current question set.</li>
					<li>Answer marking only appears after submissions are locked.</li>
					<li>
						Winner announcement appears only after every answer is marked.
					</li>
				</ul>
			</div>

			{hasActions ? (
				<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
					{canUnpublishQuestions ? (
						<Button variant="outline" onClick={onUnpublishQuestions}>
							Unpublish questions
						</Button>
					) : null}

					{canUnlockPredictions ? (
						<Button variant="outline" onClick={onUnlockSubmissions}>
							<Unlock className="h-4 w-4" />
							Unlock submissions
						</Button>
					) : null}

					{canCancelChallenge ? (
						<Button variant="destructive" onClick={onCancelChallenge}>
							<XCircle className="h-4 w-4" />
							Cancel challenge
						</Button>
					) : null}
				</div>
			) : null}
		</GlassCard>
	);
}
