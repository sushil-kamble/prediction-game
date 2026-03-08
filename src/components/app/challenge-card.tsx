import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ChallengeStatus } from "#/lib/challenge";
import { getSportEmoji, getStatusLabel } from "#/lib/challenge";

type ChallengeCardProps = {
	challengeId: string;
	title: string;
	sport: string;
	status: ChallengeStatus;
	createdAt?: number;
	to: "/prediction/admin/$challengeId" | "/prediction/c/$challengeId/leaderboard";
	label?: string;
};

const statusAccent: Record<ChallengeStatus, string> = {
	draft: "border-l-yellow-400",
	open: "border-l-primary",
	scoring: "border-l-emerald-400",
	closed: "border-l-zinc-600",
};

const statusDot: Record<ChallengeStatus, string> = {
	draft: "bg-yellow-400",
	open: "bg-primary",
	scoring: "bg-emerald-400",
	closed: "bg-zinc-600",
};

function formatRelative(createdAt: number) {
	const elapsedMs = Date.now() - createdAt;
	const elapsedDays = Math.max(
		0,
		Math.floor(elapsedMs / (1000 * 60 * 60 * 24))
	);

	if (elapsedDays === 0) return "Today";
	if (elapsedDays === 1) return "1d ago";
	return `${elapsedDays}d ago`;
}

export function ChallengeCard({
	challengeId,
	title,
	sport,
	status,
	createdAt,
	to,
}: ChallengeCardProps) {
	return (
		<Link
			to={to}
			params={{ challengeId }}
			className="focus-visible:ring-primary/40 group block no-underline outline-none focus-visible:ring-4"
		>
			<div
				className={`flex items-center gap-4 border-2 border-zinc-800 border-l-4 ${statusAccent[status]} bg-zinc-950 px-4 py-3 transition-all group-hover:border-zinc-600 group-hover:bg-zinc-900`}
			>
				{/* Sport emoji */}
				<span className="text-2xl leading-none">{getSportEmoji(sport)}</span>

				{/* Info */}
				<div className="min-w-0 flex-1">
					<h3 className="truncate text-base leading-tight font-bold tracking-wide text-white uppercase">
						{title}
					</h3>
					<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-zinc-500">
						<span className="uppercase">{sport}</span>
						<span className="text-zinc-700">·</span>
						<span className="flex items-center gap-1">
							<span
								className={`inline-block h-1.5 w-1.5 ${statusDot[status]}`}
							/>
							{getStatusLabel(status)}
						</span>
						{createdAt && createdAt > 0 ? (
							<>
								<span className="text-zinc-700">·</span>
								<span>{formatRelative(createdAt)}</span>
							</>
						) : null}
					</div>
				</div>

				{/* Arrow */}
				<ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
			</div>
		</Link>
	);
}
