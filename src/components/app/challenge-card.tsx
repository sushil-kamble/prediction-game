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
	to: "/prediction/admin/$challengeId" | "/prediction/c/$challengeId/leaderboard";
	label?: string;
};

export function ChallengeCard({
	challengeId,
	title,
	sport,
	status,
	to,
	label = "OPEN CHALLENGE",
}: ChallengeCardProps) {
	return (
		<Link
			to={to}
			params={{ challengeId }}
			className="focus-visible:ring-primary/40 group block no-underline outline-none focus-visible:ring-4"
		>
			<div className="group-hover:border-primary border-2 border-zinc-800 bg-zinc-950 p-6 transition-all group-hover:-translate-y-1 group-hover:bg-zinc-900 group-hover:shadow-[6px_6px_0px_0px_#ccff00]">
				<div className="flex items-start gap-5">
					<div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-white bg-black text-3xl">
						{getSportEmoji(sport)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="mb-3 flex flex-wrap gap-2">
							<SportBadge sport={sport} />
							<StatusBadge status={status} />
						</div>
						<h3 className="text-xl leading-tight font-bold tracking-wide text-white uppercase">
							{title}
						</h3>
						<p className="text-primary mt-4 flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
							{label}
							<ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
						</p>
					</div>
				</div>
			</div>
		</Link>
	);
}
