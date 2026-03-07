import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, Sparkles, Trophy, Zap } from "lucide-react";
import { ChallengeCard } from "#/components/app/challenge-card";
import {
	GlassCard,
	PageShell,
	SectionEyebrow,
	SkeletonBlock,
} from "#/components/app/ui";
import { Button } from "#/components/ui/button";
import { api } from "#/lib/api";
import { type ChallengeStatus, getSportEmoji } from "#/lib/challenge";
import {
	type StoredAdminChallenge,
} from "#/lib/storage";
import { useStoredAdminChallenges } from "#/lib/use-stored-admin-challenges";

type ChallengeSummary = {
	challengeId: string;
	title: string;
	sport: string;
	status: ChallengeStatus;
	createdAt: number;
};

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{
				title: "PredictGame | Live prediction challenges",
			},
		],
	}),
	component: HomeRoute,
});

function HomeRoute() {
	const storedChallenges = useStoredAdminChallenges() as StoredAdminChallenge[];

	const challengeIds = storedChallenges.map((challenge) => challenge.challengeId);
	const summaries = useQuery(
		api.challenges.getChallengeSummaries,
		challengeIds.length ? { challengeIds } : "skip",
	);

	const mergedChallenges = useMemo(() => {
		const summaryMap = new Map(
			(summaries ?? [])
				.filter((summary): summary is NonNullable<typeof summary> => Boolean(summary))
				.map((summary) => [summary.challengeId.toString(), summary]),
		);

		return storedChallenges.map((challenge) => {
			const liveSummary = summaryMap.get(challenge.challengeId);

			return {
				challengeId: challenge.challengeId,
				title: liveSummary?.title ?? challenge.title,
				sport: liveSummary?.sport ?? challenge.sport,
				status: (liveSummary?.status ?? "draft") as ChallengeStatus,
				createdAt: liveSummary?.createdAt ?? 0,
			} satisfies ChallengeSummary;
		});
	}, [storedChallenges, summaries]);

	return (
		<PageShell className="gap-6 py-6 sm:py-10">
			{/* Hero */}
			<GlassCard className="px-5 py-8 sm:px-10 sm:py-12">
				<div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
					<div>
						<SectionEyebrow>Live Sports Picks</SectionEyebrow>
						<h1 className="font-display text-[2.6rem] leading-[0.95] text-foreground sm:text-[4.5rem]">
							One link.
							<br />
							<span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
								One shot.
							</span>
							<br />
							Live ranks.
						</h1>
						<p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
							PredictGame is a mobile-first sports challenge builder for match-day
							crowds. Create a card stack of prediction questions, share the link,
							and let Convex update every leaderboard in real time while you score.
						</p>
						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<Button size="lg" asChild>
								<Link to="/admin" className="no-underline">
									Create a challenge
									<ArrowRight className="h-4 w-4" />
								</Link>
							</Button>
							<Button variant="outline" size="lg" asChild>
								<a href="#my-challenges" className="no-underline">
									My local admin cards
								</a>
							</Button>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
						{[
							{
								title: "Mobile-first",
								description: "48px tap targets and sticky bottom CTAs everywhere.",
								icon: <Zap className="h-5 w-5" />,
							},
							{
								title: "Real-time",
								description: "Every scoring change reorders the leaderboard instantly.",
								icon: <Trophy className="h-5 w-5" />,
							},
							{
								title: "Share-ready",
								description: "Clean invite links with OG previews for chat apps.",
								icon: <Sparkles className="h-5 w-5" />,
							},
						].map((item, index) => (
							<div
								key={item.title}
								className="rounded-xl border border-border bg-secondary/50 p-4 animate-[rise-in_280ms_ease-out]"
								style={{ animationDelay: `${index * 90}ms` }}
							>
								<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-700/20 text-primary">
									{item.icon}
								</div>
								<h2 className="text-sm font-semibold text-foreground">
									{item.title}
								</h2>
								<p className="mt-1.5 text-sm leading-6 text-muted-foreground">
									{item.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</GlassCard>

			{/* My Challenges */}
			<GlassCard className="px-5 py-6 sm:px-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div id="my-challenges">
						<SectionEyebrow>My Challenges</SectionEyebrow>
						<h2 className="font-display text-3xl text-foreground sm:text-4xl">
							Local admin access on this device
						</h2>
						<p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
							Admin access is stored locally in this v1. Open any saved card to
							continue editing, share the link, or score results live.
						</p>
					</div>
					<Button variant="outline" asChild>
						<Link to="/admin" className="no-underline">Open admin</Link>
					</Button>
				</div>

				<div className="mt-6 grid gap-4">
					{storedChallenges.length === 0 ? (
						<div className="rounded-xl border border-dashed border-border bg-secondary/30 px-5 py-8 text-center">
							<p className="m-0 text-sm leading-7 text-muted-foreground">
								No local admin cards yet. Start with a fresh match and build your
								first prediction board.
							</p>
							<div className="mt-5">
								<Button asChild>
									<Link to="/admin" className="no-underline">Create challenge</Link>
								</Button>
							</div>
						</div>
					) : summaries === undefined ? (
						Array.from({ length: storedChallenges.length }).map((_, index) => (
							<SkeletonBlock key={index} className="h-34" />
						))
					) : (
						mergedChallenges.map((challenge) => (
							<ChallengeCard
								key={challenge.challengeId}
								challengeId={challenge.challengeId}
								title={challenge.title}
								sport={challenge.sport}
								status={challenge.status}
								to="/admin/$challengeId"
							/>
						))
					)}
				</div>
			</GlassCard>

			{/* Sports Grid */}
			<GlassCard className="overflow-hidden px-5 py-6 sm:px-8">
				<SectionEyebrow>Sports</SectionEyebrow>
				<div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
					<div className="rounded-xl bg-gradient-to-br from-violet-600/80 via-purple-600/80 to-fuchsia-700/80 p-6 text-white shadow-[0_16px_48px_rgba(139,92,246,0.2)]">
						<p className="text-xs font-bold uppercase tracking-[0.26em] text-white/60">
							Theme
						</p>
						<h3 className="mt-3 font-display text-3xl leading-none">
							Built for game day
						</h3>
						<p className="mt-4 text-sm leading-6 text-white/75">
							Deep purples, glass panels, and real-time data keep your
							prediction board looking sharp on any screen.
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						{["Cricket", "Football", "F1", "Basketball"].map((sport) => (
							<div
								key={sport}
								className="rounded-xl border border-border bg-secondary/50 px-4 py-4"
							>
								<p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
									{sport}
								</p>
								<p className="mt-3 text-4xl">{getSportEmoji(sport)}</p>
								<p className="mt-3 text-sm leading-6 text-muted-foreground">
									Build a polished pick flow in minutes and keep the action readable
									on a 375px screen.
								</p>
							</div>
						))}
					</div>
				</div>
			</GlassCard>
		</PageShell>
	);
}
