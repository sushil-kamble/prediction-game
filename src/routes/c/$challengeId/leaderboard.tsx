import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Activity, ArrowRight } from "lucide-react";
import {
	FullScreenState,
	GlassCard,
	InlineNotice,
	PageShell,
	SectionEyebrow,
	SkeletonBlock,
	SportBadge,
	StatusBadge,
} from "#/components/app/ui";
import { api } from "#/lib/api";
import { useClientUUID } from "#/lib/use-client-uuid";
import { getStoredParticipantId } from "#/lib/storage";

export const Route = createFileRoute("/c/$challengeId/leaderboard")({
	head: () => ({
		meta: [{ title: "Leaderboard | PredictGame" }],
	}),
	component: LeaderboardRoute,
});

function LeaderboardRoute() {
	const { challengeId } = Route.useParams();
	const uuid = useClientUUID();
	const challenge = useQuery(api.challenges.getChallenge, { challengeId });
	const leaderboard = useQuery(api.challenges.getLeaderboard, { challengeId });
	const participant = useQuery(
		api.challenges.getParticipant,
		uuid ? { challengeId, uuid } : "skip",
	);

	const [storedParticipantId, setStoredParticipantId] = useState<
		string | null | undefined
	>(undefined);
	const [isCollapsed, setIsCollapsed] = useState(false);

	useEffect(() => {
		setStoredParticipantId(getStoredParticipantId(challengeId));
	}, [challengeId]);

	useEffect(() => {
		const onScroll = () => setIsCollapsed(window.scrollY > 32);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const participantId = participant?._id.toString() ?? (storedParticipantId ?? null);
	const participantPredictions = useQuery(
		api.challenges.getParticipantPredictions,
		participantId ? { challengeId, participantId } : "skip",
	);

	const hasSubmitted =
		participantPredictions !== undefined &&
		Object.keys(participantPredictions).length > 0;

	if (
		challenge === undefined ||
		leaderboard === undefined ||
		uuid === null ||
		storedParticipantId === undefined ||
		(participantId !== null && participantPredictions === undefined)
	) {
		return <LeaderboardSkeleton />;
	}

	if (challenge === null || leaderboard === null) {
		return (
			<FullScreenState
				title="Leaderboard unavailable"
				description="This challenge couldn't be found."
			/>
		);
	}

	const currentPlayerUuid = uuid;

	return (
		<PageShell className="gap-6 py-5 sm:py-8">
			<GlassCard
				className={`sticky top-4 z-20 px-5 transition-all ${
					isCollapsed ? "py-3" : "py-4"
				}`}
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<SectionEyebrow className={isCollapsed ? "hidden" : undefined}>
							Live leaderboard
						</SectionEyebrow>
						<h1
							className={`font-display leading-none text-[var(--ink)] transition-all ${
								isCollapsed ? "text-2xl" : "text-3xl sm:text-4xl"
							}`}
						>
							{challenge.title}
						</h1>
						<div className="mt-3 flex flex-wrap gap-2">
							<SportBadge sport={challenge.sport} />
							<StatusBadge status={leaderboard.status} />
							{leaderboard.status === "scoring" ? (
								<span className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,242,229,0.94)] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--orange-700)]">
									<Activity className="h-3.5 w-3.5" />
									Live
								</span>
							) : null}
						</div>
					</div>
					<Link
						to="/c/$challengeId"
						params={{ challengeId }}
						className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--card-stroke)] bg-white/84 px-5 text-sm font-semibold text-[var(--ink)] no-underline"
					>
						Back to picks
					</Link>
				</div>
			</GlassCard>

			{!hasSubmitted ? (
				<InlineNotice tone="warning">
					You haven't predicted yet. The leaderboard is still visible, and you can
					jump back to lock in your picks.
					<div className="mt-4">
						<Link
							to="/c/$challengeId"
							params={{ challengeId }}
							className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color:var(--card-stroke)] bg-white/84 px-4 text-sm font-semibold text-[var(--ink)] no-underline"
						>
							Make predictions
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				</InlineNotice>
			) : null}

			{leaderboard.rows.length === 0 ? (
				<GlassCard className="px-5 py-8 text-center">
					<h2 className="font-display text-3xl text-[var(--ink)]">
						No players yet
					</h2>
					<p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
						Once players join, their rows will appear here in real time.
					</p>
				</GlassCard>
			) : (
				<GlassCard className="px-5 py-6 sm:px-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<SectionEyebrow>Scoreboard</SectionEyebrow>
							<h2 className="font-display text-3xl text-[var(--ink)]">
								Current ranking
							</h2>
						</div>
						{leaderboard.answeredQuestionCount === 0 ? (
							<div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,188,96,0.58)] bg-[rgba(255,246,233,0.94)] px-4 py-2 text-sm font-semibold text-[var(--warning-ink)]">
								<span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)] animate-pulse" />
								Waiting for results...
							</div>
						) : null}
					</div>

					<div className="mt-6 grid gap-3">
						{leaderboard.rows.map((row) => {
							const isCurrentPlayer = row.uuid === currentPlayerUuid;

							return (
								<div
									key={`${row.uuid}-${row.rank}`}
									className={`rounded-[1.5rem] border px-4 py-4 shadow-[0_18px_42px_rgba(33,21,10,0.08)] transition ${
										isCurrentPlayer
											? "border-[rgba(243,145,53,0.55)] bg-[rgba(255,241,228,0.94)]"
											: "border-white/70 bg-white/74"
									}`}
								>
									<div className="flex items-center gap-4">
										<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.82)] text-lg font-extrabold text-[var(--orange-700)]">
											#{row.rank}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-base font-semibold text-[var(--ink)]">
												{row.nickname}
											</p>
											<p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
												{row.correctCount}/{leaderboard.questionCount} correct
											</p>
										</div>
										<div className="text-right">
											<p className="font-display text-3xl leading-none text-[var(--ink)]">
												{row.score}
											</p>
											<p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
												points
											</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</GlassCard>
			)}
		</PageShell>
	);
}

function LeaderboardSkeleton() {
	return (
		<PageShell className="gap-6 py-6 sm:py-8">
			<SkeletonBlock className="h-32" />
			<SkeletonBlock className="h-24" />
			<SkeletonBlock className="h-96" />
		</PageShell>
	);
}
