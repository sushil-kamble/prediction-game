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
				title: "PredictGame | Orange-hot prediction challenges",
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
		<PageShell className="gap-6 py-6 sm:py-8">
			<GlassCard className="px-5 py-6 sm:px-8 sm:py-8">
				<div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
					<div>
						<SectionEyebrow>Live Sports Picks</SectionEyebrow>
						<h1 className="font-display text-[2.8rem] leading-[0.95] text-[var(--ink)] sm:text-[4.8rem]">
							One link.
							<br />
							One shot.
							<br />
							Live ranks.
						</h1>
						<p className="mt-5 max-w-xl text-base leading-7 text-[var(--ink-soft)] sm:text-lg">
							PredictGame is a mobile-first sports challenge builder for match-day
							crowds. Create a card stack of prediction questions, share the link,
							and let Convex update every leaderboard in real time while you score.
						</p>
						<div className="mt-6 flex flex-col gap-3 sm:flex-row">
							<Link
								to="/admin"
								className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-transparent bg-[linear-gradient(135deg,var(--orange-500),var(--orange-700))] px-5 text-sm font-semibold text-white no-underline shadow-[0_18px_42px_rgba(224,110,27,0.28)]"
							>
								Create a challenge
								<ArrowRight className="h-4 w-4" />
							</Link>
							<a
								href="#my-challenges"
								className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--card-stroke)] bg-white/84 px-5 text-sm font-semibold text-[var(--ink)] no-underline"
							>
								My local admin cards
							</a>
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
								className="rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-[0_18px_48px_rgba(33,21,10,0.08)] animate-[rise-in_280ms_ease-out]"
								style={{ animationDelay: `${index * 90}ms` }}
							>
								<div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(255,191,111,0.9),rgba(243,145,53,0.92))] text-[var(--ink)]">
									{item.icon}
								</div>
								<h2 className="text-base font-semibold text-[var(--ink)]">
									{item.title}
								</h2>
								<p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
									{item.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</GlassCard>

			<GlassCard className="px-5 py-6 sm:px-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div id="my-challenges">
						<SectionEyebrow>My Challenges</SectionEyebrow>
						<h2 className="font-display text-3xl text-[var(--ink)] sm:text-4xl">
							Local admin access on this device
						</h2>
						<p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-soft)] sm:text-base">
							Admin access is stored locally in this v1. Open any saved card to
							continue editing, share the link, or score results live.
						</p>
					</div>
					<Link
						to="/admin"
						className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--card-stroke)] bg-white/84 px-5 text-sm font-semibold text-[var(--ink)] no-underline"
					>
						Open admin
					</Link>
				</div>

				<div className="mt-6 grid gap-4">
					{storedChallenges.length === 0 ? (
						<div className="rounded-[1.5rem] border border-dashed border-[color:var(--card-stroke)] bg-white/48 px-5 py-8 text-center">
							<p className="m-0 text-sm leading-7 text-[var(--ink-soft)]">
								No local admin cards yet. Start with a fresh match and build your
								first orange-hot prediction board.
							</p>
							<div className="mt-5">
								<Link
									to="/admin"
									className="inline-flex min-h-12 items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--orange-500),var(--orange-700))] px-5 text-sm font-semibold text-white no-underline shadow-[0_18px_42px_rgba(224,110,27,0.28)]"
								>
									Create challenge
								</Link>
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

			<GlassCard className="overflow-hidden px-5 py-6 sm:px-8">
				<SectionEyebrow>Visual Hook</SectionEyebrow>
				<div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
					<div className="rounded-[1.7rem] bg-[linear-gradient(160deg,rgba(255,191,111,0.85),rgba(243,145,53,0.92),rgba(188,79,8,0.96))] p-6 text-white shadow-[0_20px_60px_rgba(170,75,14,0.26)]">
						<p className="text-xs font-bold uppercase tracking-[0.26em] text-white/72">
							Theme
						</p>
						<h3 className="mt-3 font-display text-3xl leading-none">
							Modern orange
						</h3>
						<p className="mt-4 text-sm leading-6 text-white/88">
							Warm neutrals, bold gradients, and glassy panels keep the interface
							lively without drifting into gimmick territory.
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						{["Cricket", "Football", "F1", "Basketball"].map((sport) => (
							<div
								key={sport}
								className="rounded-[1.4rem] border border-white/70 bg-white/74 px-4 py-4 shadow-[0_16px_40px_rgba(33,21,10,0.08)]"
							>
								<p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--ink-soft)]">
									{sport}
								</p>
								<p className="mt-3 text-4xl">{getSportEmoji(sport)}</p>
								<p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
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
