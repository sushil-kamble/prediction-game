import { startTransition, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { ChallengeCard } from "#/components/app/challenge-card";
import {
	BottomSheet,
	Button,
	PageShell,
	SkeletonBlock,
} from "#/components/app/ui";
import { Input } from "#/components/ui/input";
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

type CreateChallengeErrors = {
	title?: string;
	sport?: string;
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
	const [errors, setErrors] = useState<CreateChallengeErrors>({});
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
		const nextErrors: CreateChallengeErrors = {};

		if (!trimmedTitle) {
			nextErrors.title = "Challenge title is required.";
		}

		if (!trimmedSport) {
			nextErrors.sport = "Pick or type a sport before creating the challenge.";
		}

		if (nextErrors.title || nextErrors.sport) {
			setErrors(nextErrors);
			showToast(
				nextErrors.title ?? nextErrors.sport ?? "Check the highlighted fields.",
				"error"
			);
			return;
		}

		setErrors({});
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
			<PageShell className="gap-8 py-8 sm:py-12">
				<div className="border-4 border-white bg-black p-6 sm:p-10">
					<div>
						<div>
							<div className="inline-block bg-primary text-black font-bold uppercase tracking-widest px-3 py-1 text-xs mb-4">
								ADMIN MODE
							</div>
							<h1 className="font-display text-5xl leading-none text-white sm:text-7xl uppercase mb-4">
								Control
								<br />
								Room
							</h1>
							<p className="max-w-xl text-lg leading-relaxed text-zinc-300 font-medium">
								Create prediction questions, publish the challenge,
								and score results live.
							</p>
						</div>
					</div>
				</div>

				<div className="border-2 border-zinc-800 bg-black p-6 sm:p-10">
					<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-8">
						<div>
							<div className="text-primary font-bold tracking-widest text-sm uppercase mb-2">
								SAVED LOCALLY
							</div>
							<h2 className="font-display text-4xl text-white uppercase">
								MY CHALLENGES
							</h2>
						</div>
						<Button onClick={() => setIsSheetOpen(true)} className="sm:w-auto text-lg px-8">
							<Plus className="h-6 w-6 mr-2" />
							NEW CHALLENGE
						</Button>
					</div>

					<div className="grid gap-6">
						{storedChallenges.length === 0 ? (
							<div className="border-2 border-dashed border-zinc-700 bg-zinc-950 p-10 text-center flex flex-col items-center">
								<p className="text-lg font-medium text-zinc-400 mb-6 max-w-md">
									YOU HAVEN'T CREATED ANYTHING ON THIS DEVICE YET.
								</p>
							</div>
						) : summaries === undefined ? (
							Array.from({ length: storedChallenges.length }).map((_, index) => (
								<SkeletonBlock key={index} className="h-34 bg-zinc-900 border-2 border-zinc-800" />
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

				<div className="flex justify-center pt-4 pb-12">
					<Link
						to="/"
						className="inline-flex items-center justify-center text-sm font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors"
					>
						← BACK TO LANDING
					</Link>
				</div>
			</PageShell>

			<BottomSheet
				open={isSheetOpen}
				onClose={() => {
					if (!isSubmitting) {
						setIsSheetOpen(false);
					}
				}}
				title="NEW CHALLENGE"
				description="START WITH A TITLE AND SPORT. ADD QUESTIONS NEXT."
			>
				<form className="flex flex-col gap-6 pt-4" onSubmit={handleCreateChallenge}>
					<label className="flex flex-col gap-3">
						<span className="text-sm font-bold text-white uppercase tracking-wider">
							CHALLENGE TITLE
						</span>
						<Input
							id="admin-challenge-title"
							value={title}
							onChange={(event) => {
								setTitle(event.target.value);
								setErrors((current) => ({ ...current, title: undefined }));
							}}
							placeholder="SUNDAY DERBY PREDICTIONS"
							maxLength={80}
							className="h-14 text-lg border-2 border-zinc-700 focus-visible:border-primary focus-visible:ring-0 rounded-none bg-zinc-950 placeholder:text-zinc-600"
							aria-invalid={Boolean(errors.title)}
							aria-describedby={
								errors.title ? "admin-challenge-title-error" : undefined
							}
						/>
						{errors.title ? (
							<p
								id="admin-challenge-title-error"
								className="text-sm leading-6 text-rose-300"
							>
								{errors.title}
							</p>
						) : null}
					</label>

					<div className="flex flex-col gap-3">
						<label
							htmlFor="admin-challenge-sport"
							className="text-sm font-bold text-white uppercase tracking-wider"
						>
							SPORT
						</label>
						<div className="flex flex-wrap gap-3 mb-2">
							{SPORT_SUGGESTIONS.map((suggestion) => {
								const isSelected =
									sport === suggestion ||
									(suggestion === "Other" &&
										sport !== "" &&
										!SPORT_SUGGESTIONS.includes(
											sport as (typeof SPORT_SUGGESTIONS)[number],
										));
								return (
									<button
										key={suggestion}
										type="button"
										onClick={() => {
											setSport(suggestion === "Other" ? "" : suggestion);
											setErrors((current) => ({ ...current, sport: undefined }));
										}}
										aria-pressed={isSelected}
										className={`focus-visible:ring-primary/40 inline-flex min-h-12 items-center border-2 px-5 text-sm font-bold uppercase tracking-wide transition-colors outline-none focus-visible:ring-4 ${
											isSelected
												? "border-primary bg-primary text-black"
												: "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-primary hover:text-white"
										}`}
									>
										{suggestion}
									</button>
								);
							})}
						</div>
						<Input
							id="admin-challenge-sport"
							value={sport}
							onChange={(event) => {
								setSport(event.target.value);
								setErrors((current) => ({ ...current, sport: undefined }));
							}}
							placeholder="CRICKET"
							maxLength={32}
							className="h-14 text-lg border-2 border-zinc-700 focus-visible:border-primary focus-visible:ring-0 rounded-none bg-zinc-950 placeholder:text-zinc-600"
							aria-invalid={Boolean(errors.sport)}
							aria-describedby={
								errors.sport ? "admin-challenge-sport-error" : undefined
							}
						/>
						{errors.sport ? (
							<p
								id="admin-challenge-sport-error"
								className="text-sm leading-6 text-rose-300"
							>
								{errors.sport}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-4 mt-4">
						<Button type="submit" size="lg" className="w-full text-lg" disabled={isSubmitting}>
							{isSubmitting ? "CREATING..." : "CREATE CHALLENGE"}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="lg"
							className="w-full text-lg border-zinc-800 text-zinc-400 hover:text-white"
							onClick={() => setIsSheetOpen(false)}
							disabled={isSubmitting}
						>
							CANCEL
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
