import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ChallengeStatus } from "#/lib/challenge";
import { getSportEmoji } from "#/lib/challenge";
import { SportBadge, StatusBadge } from "#/components/app/ui";

type ChallengeCardProps = {
	challengeId: string;
	title: string;
	sport: string;
	status: ChallengeStatus;
	to: "/admin/$challengeId" | "/c/$challengeId/leaderboard";
	label?: string;
};

export function ChallengeCard({
	challengeId,
	title,
	sport,
	status,
	to,
	label = "Open challenge",
}: ChallengeCardProps) {
	return (
		<Link
			to={to}
			params={{ challengeId }}
			className="block no-underline"
		>
			<div className="glass-card group px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_24px_72px_rgba(139,92,246,0.12)]">
				<div className="flex items-start gap-4">
					<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-700/20 text-2xl ring-1 ring-primary/20">
						{getSportEmoji(sport)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap gap-2">
							<SportBadge sport={sport} />
							<StatusBadge status={status} />
						</div>
						<h3 className="mt-3 text-lg font-semibold leading-7 text-foreground">
							{title}
						</h3>
						<p className="mt-2 flex items-center gap-2 text-sm font-semibold text-primary">
							{label}
							<ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
						</p>
					</div>
				</div>
			</div>
		</Link>
	);
}
