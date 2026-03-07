import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ChallengeStatus } from "#/lib/challenge";
import { getSportEmoji } from "#/lib/challenge";
import { GlassCard, SportBadge, StatusBadge } from "#/components/app/ui";

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
			<GlassCard className="group px-5 py-5 transition hover:-translate-y-0.5">
				<div className="flex items-start gap-4">
					<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.3rem] bg-[linear-gradient(135deg,rgba(255,191,111,0.9),rgba(243,145,53,0.9))] text-2xl shadow-[0_16px_40px_rgba(224,110,27,0.22)]">
						{getSportEmoji(sport)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap gap-2">
							<SportBadge sport={sport} />
							<StatusBadge status={status} />
						</div>
						<h3 className="mt-3 text-lg font-semibold leading-7 text-[var(--ink)]">
							{title}
						</h3>
						<p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--orange-700)]">
							{label}
							<ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
						</p>
					</div>
				</div>
			</GlassCard>
		</Link>
	);
}
