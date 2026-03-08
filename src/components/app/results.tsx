import type { ReactNode } from "react";
import { Crown, Medal, Sparkles, Trophy } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button, GlassCard, Input, SectionEyebrow } from "#/components/app/ui";
import { formatAccuracy } from "#/lib/results";
import { cn } from "#/lib/utils";

type MedalTier = "gold" | "silver" | "bronze";

type PodiumEntry = {
	rank: number;
	medal: MedalTier;
	nickname: string;
	score: number;
	correctCount: number;
	totalAnswered: number;
	accuracy: number | null;
	isCurrentPlayer: boolean;
};

type CurrentParticipantSummary = {
	nickname: string;
	rank: number;
	medal: MedalTier | null;
	score: number;
	correctCount: number;
	totalAnswered: number;
	accuracy: number | null;
	isWinner: boolean;
};

type CelebrationMessage = {
	medal: MedalTier;
	title: string;
	body: string;
} | null;

/* ── Medal theme system ── */

const medalTheme = {
	gold: {
		label: "Gold",
		rank: "1st",
		border: "border-yellow-400/80",
		bg: "bg-gradient-to-b from-yellow-400/20 via-yellow-900/15 to-black",
		shadow: "shadow-[0_0_40px_rgba(250,204,21,0.12)]",
		accent: "text-yellow-300",
		muted: "text-yellow-200/60",
		badgeBg: "border-yellow-400/60 bg-yellow-400/15 text-yellow-200",
		icon: "text-yellow-400",
		bar: "bg-yellow-400",
		ring: "ring-yellow-400/50",
	},
	silver: {
		label: "Silver",
		rank: "2nd",
		border: "border-slate-300/60",
		bg: "bg-gradient-to-b from-slate-300/15 via-slate-700/10 to-black",
		shadow: "shadow-[0_0_30px_rgba(226,232,240,0.08)]",
		accent: "text-slate-200",
		muted: "text-slate-300/50",
		badgeBg: "border-slate-400/50 bg-slate-300/10 text-slate-200",
		icon: "text-slate-300",
		bar: "bg-slate-300",
		ring: "ring-slate-300/50",
	},
	bronze: {
		label: "Bronze",
		rank: "3rd",
		border: "border-amber-600/60",
		bg: "bg-gradient-to-b from-amber-700/20 via-amber-900/12 to-black",
		shadow: "shadow-[0_0_28px_rgba(180,83,9,0.10)]",
		accent: "text-amber-300",
		muted: "text-amber-300/50",
		badgeBg: "border-amber-600/50 bg-amber-600/10 text-amber-200",
		icon: "text-amber-500",
		bar: "bg-amber-500",
		ring: "ring-amber-500/50",
	},
};

/* ── Medal Badge ── */

export function MedalBadge({
	medal,
	children,
	className,
}: {
	medal: MedalTier;
	children?: ReactNode;
	className?: string;
}) {
	const theme = medalTheme[medal];
	return (
		<Badge
			variant="outline"
			className={cn(
				"rounded-none border-2 px-3 py-1 text-[0.65rem] font-extrabold tracking-[0.28em] uppercase",
				theme.badgeBg,
				className
			)}
		>
			{children ?? theme.label}
		</Badge>
	);
}

/* ── Result Hero (player's personal result card) ── */

export function ResultHero({
	challengeTitle,
	currentParticipant,
	celebrationMessage,
	participantCount,
}: {
	challengeTitle: string;
	currentParticipant: CurrentParticipantSummary;
	celebrationMessage: CelebrationMessage;
	participantCount: number;
}) {
	const medal = currentParticipant.medal;
	const theme = medal ? medalTheme[medal] : null;

	return (
		<div
			className={cn(
				"winner-hero relative animate-[rise-in_600ms_ease-out_both] overflow-hidden border-2",
				theme
					? `${theme.border} ${theme.bg} ${theme.shadow}`
					: "border-zinc-700 bg-zinc-950"
			)}
		>
			{/* Top accent bar — thicker for medal winners */}
			<div
				className={cn(
					"absolute inset-x-0 top-0",
					medal ? "h-1.5" : "h-1",
					theme ? theme.bar : "bg-zinc-700"
				)}
			/>

			{/* ── Rank block — dramatic oversized callout ── */}
			<div
				className={cn(
					"relative flex items-center justify-between gap-4 border-b-2 border-white/10 px-5 py-5 sm:px-8",
					medal && "border-white/15"
				)}
			>
				<div className="flex items-center gap-4">
					<div
						className={cn(
							"flex h-14 w-14 shrink-0 items-center justify-center border-2",
							theme
								? `${theme.border} bg-black/40`
								: "border-zinc-600 bg-black/40"
						)}
					>
						{medal ? (
							<Trophy className={cn("h-7 w-7", theme!.icon)} />
						) : (
							<Sparkles className="h-7 w-7 text-zinc-400" />
						)}
					</div>
					<div>
						<p className="text-[0.6rem] font-extrabold tracking-[0.3em] text-white/50 uppercase">
							Your finish
						</p>
						<p
							className={cn(
								"font-display text-4xl leading-none sm:text-5xl",
								theme ? theme.accent : "text-white"
							)}
						>
							#{currentParticipant.rank}
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{medal ? (
						<MedalBadge medal={medal}>{theme!.label}</MedalBadge>
					) : (
						<Badge
							variant="outline"
							className="rounded-none border-2 border-zinc-600 bg-zinc-900/80 px-3 py-1 text-[0.65rem] font-extrabold tracking-[0.28em] text-zinc-200 uppercase"
						>
							Finished
						</Badge>
					)}
				</div>
			</div>

			{/* ── Content area ── */}
			<div className="relative flex flex-col gap-5 px-5 pt-5 pb-6 sm:px-8 sm:pb-8">
				<div>
					<p className="text-[0.6rem] font-extrabold tracking-[0.3em] text-white/40 uppercase">
						{challengeTitle}
					</p>
					<h1 className="font-display mt-3 text-3xl leading-[1.05] text-white sm:text-4xl">
						{celebrationMessage?.title ??
							(currentParticipant.isWinner
								? "You left your mark on this challenge."
								: "You were part of the finish everyone watched.")}
					</h1>
					<p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
						{celebrationMessage?.body ??
							(currentParticipant.totalAnswered > 0
								? "Your predictions are locked into the final board. Here is how your game stacked up."
								: "You joined the action, and the final table is locked in.")}
					</p>
				</div>

				{/* ── Stats strip — single horizontal row ── */}
				<div
					className={cn(
						"flex items-stretch divide-x-2 border-2",
						theme
							? "divide-white/10 border-white/10"
							: "divide-zinc-800 border-zinc-800"
					)}
				>
					<HeroStat
						label="PTS"
						value={String(currentParticipant.score)}
						accent={theme?.accent}
					/>
					<HeroStat
						label="Correct"
						value={`${currentParticipant.correctCount}/${currentParticipant.totalAnswered}`}
					/>
					<HeroStat
						label="Acc"
						value={formatAccuracy(currentParticipant.accuracy)}
					/>
					<HeroStat
						label="Field"
						value={`${currentParticipant.rank}/${participantCount}`}
					/>
				</div>
			</div>
		</div>
	);
}

function HeroStat({
	label,
	value,
	accent,
}: {
	label: string;
	value: string;
	accent?: string;
}) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center bg-black/20 px-2 py-3 sm:px-4">
			<p className="text-[0.55rem] font-extrabold tracking-[0.24em] text-white/40 uppercase sm:text-[0.6rem]">
				{label}
			</p>
			<p
				className={cn(
					"mt-1 text-lg font-bold tabular-nums sm:text-xl",
					accent ?? "text-white"
				)}
			>
				{value}
			</p>
		</div>
	);
}

/* ── Podium Section ── */

export function PodiumSection({
	podium,
	winnersAnnounced,
	title,
	elevateGold = true,
}: {
	podium: PodiumEntry[];
	winnersAnnounced: boolean;
	title?: string;
	elevateGold?: boolean;
}) {
	if (podium.length === 0) {
		return null;
	}

	return (
		<GlassCard className="px-5 py-6 sm:px-8">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<SectionEyebrow>
						{winnersAnnounced ? "Official podium" : "Current leaders"}
					</SectionEyebrow>
					<h2 className="font-display text-3xl text-white">
						{title ??
							(winnersAnnounced ? "The medal table" : "The board to chase")}
					</h2>
				</div>
				{!winnersAnnounced ? (
					<p className="max-w-sm text-xs font-bold tracking-widest text-zinc-500 uppercase">
						Preview only. Final winners locked on announcement.
					</p>
				) : null}
			</div>

			<div className="mt-6 grid gap-4 sm:grid-cols-3">
				{podium.map((entry, index) => (
					<PodiumCard
						key={`${entry.medal}-${entry.nickname}-${entry.rank}`}
						entry={entry}
						isCurrentPlayer={entry.isCurrentPlayer}
						index={index}
						elevateGold={elevateGold}
					/>
				))}
			</div>
		</GlassCard>
	);
}

/* ── Individual podium card ── */

function PodiumCard({
	entry,
	isCurrentPlayer,
	index,
	elevateGold,
}: {
	entry: PodiumEntry;
	isCurrentPlayer: boolean;
	index: number;
	elevateGold: boolean;
}) {
	const theme = medalTheme[entry.medal];
	const isGold = entry.medal === "gold";

	return (
		<div
			className={cn(
				"relative overflow-hidden border-2 px-5 pt-6 pb-5",
				theme.border,
				theme.bg,
				theme.shadow,
				/* Gold is visually promoted on larger screens */
				isGold && elevateGold && "sm:-translate-y-3",
				isCurrentPlayer &&
					`ring-2 ${theme.ring} ring-offset-2 ring-offset-black`
			)}
			style={{
				animationDelay: `${index * 100}ms`,
			}}
		>
			{/* Top accent line */}
			<div className={cn("absolute inset-x-0 top-0 h-1", theme.bar)} />

			{/* Header: medal badge + icon */}
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-3">
					<MedalBadge medal={entry.medal} />
					<h3 className="font-display text-2xl leading-none text-white sm:text-3xl">
						{entry.nickname}
					</h3>
				</div>
				<div
					className={cn(
						"flex h-10 w-10 shrink-0 items-center justify-center border-2 border-white/15 bg-black/30",
						theme.icon
					)}
				>
					{isGold ? (
						<Crown className="h-5 w-5" />
					) : (
						<Medal className="h-5 w-5" />
					)}
				</div>
			</div>

			{/* Score — the hero number */}
			<div className="mt-5 flex items-baseline gap-2">
				<span
					className={cn("font-display text-4xl leading-none", theme.accent)}
				>
					{entry.score}
				</span>
				<span
					className={cn(
						"text-xs font-bold tracking-widest uppercase",
						theme.muted
					)}
				>
					pts
				</span>
			</div>

			{/* Compact stats row */}
			<div
				className={cn(
					"mt-4 flex items-center gap-4 border-t-2 pt-4 text-xs font-bold tracking-widest uppercase",
					theme.muted
				)}
				style={{ borderColor: "rgba(255,255,255,0.1)" }}
			>
				<span>
					<span className="text-white">{entry.correctCount}</span>/
					{entry.totalAnswered} right
				</span>
				<span className="text-white/10">|</span>
				<span>
					<span className="text-white">{formatAccuracy(entry.accuracy)}</span>{" "}
					acc
				</span>
			</div>

			{/* "This is you" marker */}
			{isCurrentPlayer ? (
				<div
					className={cn(
						"mt-3 inline-block border-2 px-2.5 py-1 text-[0.6rem] font-extrabold tracking-[0.3em] uppercase",
						theme.badgeBg
					)}
				>
					This is you
				</div>
			) : null}
		</div>
	);
}

/* ── Results Recovery Card ── */

export function ResultsRecoveryCard({
	title,
	description,
	username,
	onUsernameChange,
	onSubmit,
	isSubmitting,
	showLeaderboardAction,
}: {
	title: string;
	description: string;
	username: string;
	onUsernameChange: (value: string) => void;
	onSubmit: () => void;
	isSubmitting: boolean;
	showLeaderboardAction?: ReactNode;
}) {
	return (
		<GlassCard className="px-5 py-6 sm:px-8">
			<SectionEyebrow>Find your result</SectionEyebrow>
			<h2 className="font-display text-4xl leading-none text-white sm:text-5xl">
				{title}
			</h2>
			<p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
				{description}
			</p>
			<form
				className="mt-6 flex flex-col gap-4"
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit();
				}}
			>
				<label className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
						Username
					</span>
					<Input
						value={username}
						onChange={(event) => onUsernameChange(event.target.value)}
						placeholder="Enter the private username you saved earlier"
						autoCapitalize="none"
						autoComplete="username"
						spellCheck={false}
					/>
				</label>
				<div className="flex flex-col gap-3 sm:flex-row">
					<Button
						type="submit"
						className="sm:flex-1"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Checking..." : "Show my result"}
					</Button>
					{showLeaderboardAction}
				</div>
			</form>
		</GlassCard>
	);
}
