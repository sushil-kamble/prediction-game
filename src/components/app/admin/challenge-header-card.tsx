import { Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Share2, Users, HelpCircle, CheckCircle2, Send } from "lucide-react";
import { Button, GlassCard, SportBadge, StatusBadge } from "#/components/app/ui";
import type { ChallengeStatus } from "#/lib/challenge";

type ChallengeHeaderCardProps = {
	challengeId: string;
	title: string;
	sport: string;
	status: ChallengeStatus;
	runtimeDescription: string;
	questionCount: number;
	answeredCount: number;
	submittedCount: number;
	participantCount: number;
	showUtilityActions: boolean;
	onOpenShareSheet: () => void;
	onCopyShareLink: () => void | Promise<void>;
};

export function ChallengeHeaderCard({
	challengeId,
	title,
	sport,
	status,
	runtimeDescription,
	questionCount,
	answeredCount,
	submittedCount,
	participantCount,
	showUtilityActions,
	onOpenShareSheet,
	onCopyShareLink,
}: ChallengeHeaderCardProps) {
	return (
		<GlassCard className="px-5 py-5 sm:px-6">
			<div className="flex items-center justify-between gap-3">
				<Button variant="outline" size="sm" asChild>
					<Link to="/prediction/admin" className="no-underline">
						<ArrowLeft className="h-4 w-4" />
						Back
					</Link>
				</Button>
				{showUtilityActions ? (
					<div className="flex items-center gap-1.5">
						<Button variant="outline" size="sm" asChild>
							<Link
								to="/prediction/c/$challengeId/leaderboard"
								params={{ challengeId }}
								className="no-underline"
							>
								Preview leaderboard
							</Link>
						</Button>
						<Button variant="outline" size="sm" onClick={onOpenShareSheet}>
							<Share2 className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => void onCopyShareLink()}
						>
							<Copy className="h-4 w-4" />
						</Button>
					</div>
				) : null}
			</div>

			<div className="mt-5">
				<h1 className="font-display text-foreground text-3xl leading-none sm:text-4xl">
					{title}
				</h1>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<SportBadge sport={sport} />
					<StatusBadge status={status} />
				</div>
				<p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
					{runtimeDescription}
				</p>
			</div>

			<div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-800 pt-4 text-sm">
				<Stat icon={<HelpCircle className="h-3.5 w-3.5" />} label="Questions" value={questionCount} />
				<Stat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Scored" value={`${answeredCount}/${questionCount}`} />
				<Stat icon={<Users className="h-3.5 w-3.5" />} label="Players" value={participantCount} />
				<Stat icon={<Send className="h-3.5 w-3.5" />} label="Submitted" value={`${submittedCount}/${participantCount}`} />
			</div>
		</GlassCard>
	);
}

function Stat({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
}) {
	return (
		<span className="flex items-center gap-1.5 text-zinc-500">
			{icon}
			<span className="text-xs font-medium">{label}</span>
			<span className="font-bold text-white">{value}</span>
		</span>
	);
}
