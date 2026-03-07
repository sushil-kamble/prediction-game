import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, Sparkles, Trophy, Zap } from "lucide-react";
import { ChallengeCard } from "#/components/app/challenge-card";
import { PageShell, SkeletonBlock } from "#/components/app/ui";
import { Button } from "#/components/ui/button";
import { api } from "#/lib/api";
import { type ChallengeStatus, getSportEmoji } from "#/lib/challenge";
import { type StoredAdminChallenge } from "#/lib/storage";
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

	const challengeIds = storedChallenges.map(
		(challenge) => challenge.challengeId
	);
	const summaries = useQuery(
		api.challenges.getChallengeSummaries,
		challengeIds.length ? { challengeIds } : "skip"
	);

	const mergedChallenges = useMemo(() => {
		const summaryMap = new Map(
			(summaries ?? [])
				.filter((summary): summary is NonNullable<typeof summary> =>
					Boolean(summary)
				)
				.map((summary) => [summary.challengeId.toString(), summary])
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
		<PageShell className="gap-8 py-8 sm:py-16">
			{/* Hero */}
			<div className="relative border-4 border-white bg-black p-6 shadow-[12px_12px_0px_0px_#ccff00] sm:p-12">
				<div className="bg-primary absolute top-0 right-0 border-b-4 border-l-4 border-white px-4 py-1 text-xs font-bold tracking-widest text-black">
					V1.0.0
				</div>
				<div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
					<div className="flex flex-col justify-center">
						<div className="mb-6 inline-block w-max border-2 border-black bg-white px-3 py-1 text-xs font-bold tracking-widest text-black uppercase">
							Live Sports Picks
						</div>
						<h1 className="font-display mb-8 text-[3.5rem] leading-[0.9] text-white uppercase sm:text-[6rem]">
							One Link.
							<br />
							<span
								className="text-primary"
								style={{ textShadow: "4px 4px 0 #fff" }}
							>
								One Shot.
							</span>
							<br />
							Live Ranks.
						</h1>
						<p className="border-primary mt-2 max-w-xl border-l-4 pl-4 text-lg leading-relaxed font-medium text-zinc-300 sm:text-xl">
							PredictGame is a brutal, high-contrast sports challenge builder
							for match-day crowds. Create a stack of prediction questions,
							share the link, and watch the leaderboard burn up in real time.
						</p>
						<div className="mt-10 flex flex-col gap-4 sm:flex-row">
							<Button size="lg" asChild>
								<Link to="/admin" className="no-underline">
									START CHALLENGE
									<ArrowRight className="ml-2 h-5 w-5" />
								</Link>
							</Button>
							<Button variant="outline" size="lg" asChild>
								<a href="#my-challenges" className="no-underline">
									LOCAL ADMIN
								</a>
							</Button>
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
						{[
							{
								title: "MOBILE FIRST",
								description:
									"Massive targets. Sticky actions. Built for thumbs.",
								icon: <Zap className="h-6 w-6 text-black" />,
							},
							{
								title: "REAL-TIME",
								description:
									"Scoring changes reorder the board instantly. No delays.",
								icon: <Trophy className="h-6 w-6 text-black" />,
							},
							{
								title: "SHARE READY",
								description:
									"Clean links. Sharp previews. Ready for group chats.",
								icon: <Sparkles className="h-6 w-6 text-black" />,
							},
						].map((item) => (
							<div
								key={item.title}
								className="border-2 border-white bg-zinc-900 p-5 transition-colors hover:bg-zinc-800"
							>
								<div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center border-2 border-white shadow-[2px_2px_0px_0px_#fff]">
									{item.icon}
								</div>
								<h2 className="mb-2 text-lg font-bold tracking-wider text-white uppercase">
									{item.title}
								</h2>
								<p className="text-sm leading-relaxed font-medium text-zinc-400">
									{item.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* My Challenges */}
			<div className="relative mt-8 border-2 border-zinc-800 bg-black p-6 sm:p-10">
				<div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
					<div id="my-challenges">
						<div className="text-primary mb-2 text-sm font-bold tracking-widest uppercase">
							My Challenges
						</div>
						<h2 className="font-display text-4xl text-white uppercase sm:text-5xl">
							LOCAL ADMIN
						</h2>
						<p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
							Admin access is stored locally. Open any saved card to continue
							editing, share the link, or score results live.
						</p>
					</div>
					<Button variant="secondary" asChild>
						<Link to="/admin" className="no-underline">
							OPEN ADMIN
						</Link>
					</Button>
				</div>

				<div className="grid gap-6">
					{storedChallenges.length === 0 ? (
						<div className="flex flex-col items-center border-2 border-dashed border-zinc-700 bg-zinc-950 p-10 text-center">
							<p className="mb-6 max-w-md text-lg font-medium text-zinc-400">
								NO LOCAL ADMIN CARDS YET. START A FRESH MATCH.
							</p>
							<Button asChild>
								<Link to="/admin" className="no-underline">
									CREATE NOW
								</Link>
							</Button>
						</div>
					) : summaries === undefined ? (
						Array.from({ length: storedChallenges.length }).map((_, index) => (
							<SkeletonBlock
								key={index}
								className="h-34 border-2 border-zinc-800 bg-zinc-900"
							/>
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
			</div>

			{/* Sports Grid */}
			<div className="mt-8 grid gap-6 sm:grid-cols-[1fr_1.5fr]">
				<div className="border-primary bg-primary border-2 p-8 text-black shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
					<p className="mb-4 text-sm font-extrabold tracking-[0.2em] uppercase">
						THEME // AESTHETIC
					</p>
					<h3 className="font-display mb-6 text-4xl leading-tight uppercase">
						BUILT FOR GAME DAY
					</h3>
					<p className="text-base leading-relaxed font-bold">
						High contrast. Massive typography. Unapologetic design. Keep the
						action readable on any screen, even in direct sunlight.
					</p>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					{["Cricket", "Football", "F1", "Basketball"].map((sport) => (
						<div
							key={sport}
							className="hover:border-primary flex flex-col justify-between border-2 border-zinc-800 bg-black p-6 transition-colors"
						>
							<div>
								<p className="mb-4 text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">
									{sport}
								</p>
								<p className="mb-4 text-5xl">{getSportEmoji(sport)}</p>
							</div>
							<p className="text-sm leading-relaxed font-medium text-zinc-400">
								Polished pick flow in minutes. Readable on a 375px screen.
							</p>
						</div>
					))}
				</div>
			</div>
		</PageShell>
	);
}
