import { startTransition, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Plus, ShieldCheck } from "lucide-react";
import { ChallengeCard } from "#/components/app/challenge-card";
import {
	BottomSheet,
	Button,
	GlassCard,
	Input,
	PageShell,
	SectionEyebrow,
	SkeletonBlock,
} from "#/components/app/ui";
import { useToast } from "#/components/app/use-toast";
import { api } from "#/lib/api";
import { SPORT_SUGGESTIONS, type ChallengeStatus } from "#/lib/challenge";
import {
	type StoredAdminChallenge,
	upsertStoredAdminChallenge,
} from "#/lib/storage";
import { useStoredAdminChallenges } from "#/lib/use-stored-admin-challenges";

type ChallengeSummary = {
	challengeId: string;
	title: string;
	sport: string;
	status: ChallengeStatus;
	createdAt: number;
};

export const Route = createFileRoute("/admin/")({
	head: () => ({
		meta: [{ title: "Admin | PredictGame" }],
	}),
	component: AdminHomeRoute,
});

function AdminHomeRoute() {
	const navigate = useNavigate();
	const createChallenge = useMutation(api.challenges.createChallenge);
	const { showToast } = useToast();

	const storedChallenges = useStoredAdminChallenges() as StoredAdminChallenge[];
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [sport, setSport] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

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

	async function handleCreateChallenge(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedTitle = title.trim();
		const trimmedSport = sport.trim();

		if (!trimmedTitle) {
			showToast("Challenge title is required.", "error");
			return;
		}

		if (!trimmedSport) {
			showToast("Pick or type a sport before creating the challenge.", "error");
			return;
		}

		setIsSubmitting(true);
		try {
			const result = await createChallenge({
				title: trimmedTitle,
				sport: trimmedSport,
			});

			upsertStoredAdminChallenge({
				challengeId: result.challengeId.toString(),
				adminSecret: result.adminSecret,
				title: result.title,
				sport: result.sport,
			});
			setIsSheetOpen(false);
			setTitle("");
			setSport("");

			startTransition(() => {
				navigate({
					to: "/admin/$challengeId",
					params: { challengeId: result.challengeId.toString() },
				});
			});
		} catch (error) {
			showToast(getErrorMessage(error), "error");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			<PageShell className="gap-6 py-6 sm:py-8">
				<GlassCard className="px-5 py-6 sm:px-8">
					<div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<SectionEyebrow>Admin Mode</SectionEyebrow>
							<h1 className="font-display text-4xl leading-none text-[var(--ink)] sm:text-5xl">
								Build the board
							</h1>
							<p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
								Create prediction questions on this device, publish the challenge,
								and score results from the same orange control room.
							</p>
						</div>
						<div className="rounded-[1.4rem] border border-white/70 bg-white/72 px-4 py-4 text-sm leading-6 text-[var(--ink-soft)] shadow-[0_18px_42px_rgba(33,21,10,0.08)]">
							<div className="flex items-center gap-2 text-[var(--ink)]">
								<ShieldCheck className="h-4 w-4" />
								<span className="font-semibold">Device-specific admin access</span>
							</div>
							<p className="mt-2 mb-0">
								Secrets live in local storage in v1. If you switch browsers, you can
								still view the challenge but not edit it.
							</p>
						</div>
					</div>
				</GlassCard>

				<GlassCard className="px-5 py-6 sm:px-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<SectionEyebrow>Saved Locally</SectionEyebrow>
							<h2 className="font-display text-3xl text-[var(--ink)]">
								My challenges
							</h2>
						</div>
						<Button onClick={() => setIsSheetOpen(true)} className="sm:w-auto">
							<Plus className="h-4 w-4" />
							New challenge
						</Button>
					</div>

					<div className="mt-6 grid gap-4">
						{storedChallenges.length === 0 ? (
							<div className="rounded-[1.5rem] border border-dashed border-[color:var(--card-stroke)] bg-white/50 px-5 py-8 text-center">
								<p className="m-0 text-sm leading-7 text-[var(--ink-soft)]">
									You haven't created anything on this device yet.
								</p>
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

				<Link
					to="/"
					className="inline-flex items-center justify-center text-sm font-semibold text-[var(--ink-soft)]"
				>
					Back to landing
				</Link>
			</PageShell>

			<div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
				<div className="mx-auto max-w-5xl bg-gradient-to-t from-[rgba(255,244,232,0.96)] via-[rgba(255,244,232,0.88)] to-transparent pt-6">
					<Button
						fullWidth
						onClick={() => setIsSheetOpen(true)}
						className="pointer-events-auto"
					>
						<Plus className="h-4 w-4" />
						New challenge
					</Button>
				</div>
			</div>

			<BottomSheet
				open={isSheetOpen}
				onClose={() => {
					if (!isSubmitting) {
						setIsSheetOpen(false);
					}
				}}
				title="New challenge"
				description="Start with a title and sport. You can add questions on the next screen."
			>
				<form className="flex flex-col gap-4" onSubmit={handleCreateChallenge}>
					<label className="flex flex-col gap-2">
						<span className="text-sm font-semibold text-[var(--ink)]">
							Challenge title
						</span>
						<Input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="Sunday derby predictions"
							maxLength={80}
						/>
					</label>

					<div className="flex flex-col gap-3">
						<label className="text-sm font-semibold text-[var(--ink)]">
							Sport
						</label>
						<div className="flex flex-wrap gap-2">
							{SPORT_SUGGESTIONS.map((suggestion) => (
								<button
									key={suggestion}
									type="button"
									onClick={() => setSport(suggestion === "Other" ? "" : suggestion)}
									className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--card-stroke)] bg-white/78 px-4 text-sm font-semibold text-[var(--ink)]"
								>
									{suggestion}
								</button>
							))}
						</div>
						<Input
							value={sport}
							onChange={(event) => setSport(event.target.value)}
							placeholder="Cricket"
							maxLength={32}
						/>
					</div>

					<div className="flex flex-col gap-3 pt-2">
						<Button type="submit" fullWidth disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create challenge"}
						</Button>
						<Button
							type="button"
							variant="secondary"
							fullWidth
							onClick={() => setIsSheetOpen(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
					</div>
				</form>
			</BottomSheet>
		</>
	);
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "Something went wrong. Please try again.";
}
