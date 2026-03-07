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
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
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
		uuid ? { challengeId, uuid } : "skip"
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

	const participantId =
		participant?._id.toString() ?? storedParticipantId ?? null;
	const participantPredictions = useQuery(
		api.challenges.getParticipantPredictions,
		participantId ? { challengeId, participantId } : "skip"
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
		<PageShell className="gap-6 pt-0 pb-8">
			<div className="sticky top-0 z-20 -mx-4 mb-2 border-b-2 border-zinc-800 bg-black px-4 pt-4 pb-4 sm:pt-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<SectionEyebrow className={isCollapsed ? "hidden" : "mb-2"}>
							Live leaderboard
						</SectionEyebrow>
						<h1
							className={`font-display leading-none text-white uppercase transition-all ${
								isCollapsed ? "text-2xl" : "text-3xl"
							}`}
						>
							{challenge.title}
						</h1>
						<div className="mt-3 flex flex-wrap gap-2">
							<SportBadge sport={challenge.sport} />
							<StatusBadge status={leaderboard.status} />
							{leaderboard.status === "scoring" ? (
								<Badge
									variant="outline"
									className="gap-2 rounded-none border-2 border-emerald-400 bg-emerald-400/10 px-3 py-1 text-xs font-bold tracking-widest text-emerald-400 uppercase"
								>
									<Activity className="h-4 w-4" />
									Live
								</Badge>
							) : null}
						</div>
					</div>
					<Button variant="outline" asChild className="w-full sm:w-auto">
						<Link
							to="/c/$challengeId"
							params={{ challengeId }}
							className="no-underline"
						>
							BACK TO PICKS
						</Link>
					</Button>
				</div>
			</div>

			{!hasSubmitted ? (
				<InlineNotice tone="warning">
					You haven't predicted yet. The leaderboard is still visible, and you
					can jump back to lock in your picks.
					<div className="mt-4">
						<Button variant="outline" size="sm" asChild>
							<Link
								to="/c/$challengeId"
								params={{ challengeId }}
								className="no-underline"
							>
								Make predictions
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>
					</div>
				</InlineNotice>
			) : null}

			{leaderboard.rows.length === 0 ? (
				<GlassCard className="px-5 py-8 text-center">
					<h2 className="font-display text-foreground text-3xl">
						No players yet
					</h2>
					<p className="text-muted-foreground mt-3 text-sm leading-7">
						Once players join, their rows will appear here in real time.
					</p>
				</GlassCard>
			) : (
				<GlassCard className="px-5 py-6 sm:px-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<SectionEyebrow>Scoreboard</SectionEyebrow>
							<h2 className="font-display text-foreground text-3xl">
								Current ranking
							</h2>
						</div>
						{leaderboard.answeredQuestionCount === 0 ? (
							<Badge
								variant="outline"
								className="gap-1.5 border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-sm font-semibold text-yellow-300"
							>
								<span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
								Waiting for results...
							</Badge>
						) : null}
					</div>

					<div className="mt-6 grid gap-3">
						{leaderboard.rows.map((row) => {
							const isCurrentPlayer = row.uuid === currentPlayerUuid;
							const isTopThree = row.rank <= 3;

							return (
								<div
									key={`${row.uuid}-${row.rank}`}
									className={`rounded-xl border px-4 py-4 transition ${
										isCurrentPlayer
											? "border-primary/40 bg-primary/8 shadow-[0_0_24px_rgba(139,92,246,0.08)]"
											: "border-border bg-secondary/30"
									}`}
								>
									<div className="flex items-center gap-4">
										<div
											className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold ${
												isTopThree
													? "text-primary bg-gradient-to-br from-violet-500/20 to-purple-700/20"
													: "bg-secondary text-muted-foreground"
											}`}
										>
											#{row.rank}
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-foreground truncate text-base font-semibold">
												{row.nickname}
											</p>
											<p className="text-muted-foreground mt-1 text-xs font-bold tracking-[0.22em] uppercase">
												{row.correctCount}/{leaderboard.questionCount} correct
											</p>
										</div>
										<div className="text-right">
											<p className="font-display text-foreground text-3xl leading-none">
												{row.score}
											</p>
											<p className="text-muted-foreground mt-1 text-xs font-bold tracking-[0.22em] uppercase">
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
