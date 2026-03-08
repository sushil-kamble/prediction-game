import { useState } from "react";
import type { FormEvent } from "react";
import { Button, GlassCard, Input, SectionEyebrow } from "#/components/app/ui";

type JoinFormErrors = {
	nickname?: string;
	username?: string;
};

function focusField(fieldId: string) {
	if (typeof document === "undefined") {
		return;
	}

	const field = document.getElementById(fieldId);
	if (field instanceof HTMLElement) {
		field.focus();
	}
}

export function JoinChallengeForm({
	challengeTitle,
	onJoin,
	onRecover,
	isJoining,
	isRecovering,
	showToast,
}: {
	challengeTitle: string;
	onJoin: (nickname: string, username: string | undefined) => Promise<void>;
	onRecover: (username: string) => Promise<void>;
	isJoining: boolean;
	isRecovering: boolean;
	showToast: (message: string, type: "error" | "success") => void;
}) {
	const [nickname, setNickname] = useState("");
	const [username, setUsername] = useState("");
	const [recoveryUsername, setRecoveryUsername] = useState("");
	const [joinErrors, setJoinErrors] = useState<JoinFormErrors>({});
	const [recoveryError, setRecoveryError] = useState<string | null>(null);

	async function handleJoin(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedNickname = nickname.trim();
		const trimmedUsername = username.trim();
		const nextErrors: JoinFormErrors = {};

		if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
			nextErrors.nickname = "Nickname must be between 2 and 20 characters.";
		}

		if (
			trimmedUsername &&
			trimmedUsername.toLowerCase() === trimmedNickname.toLowerCase()
		) {
			nextErrors.username = "Username and nickname must be different.";
		}

		if (nextErrors.nickname || nextErrors.username) {
			setJoinErrors(nextErrors);
			focusField(nextErrors.nickname ? "player-nickname" : "player-username");
			showToast(
				nextErrors.nickname ??
					nextErrors.username ??
					"Check the highlighted fields.",
				"error"
			);
			return;
		}

		setJoinErrors({});
		await onJoin(trimmedNickname, trimmedUsername || undefined);
	}

	async function handleRecoverParticipant(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedUsername = recoveryUsername.trim();
		if (!trimmedUsername) {
			setRecoveryError("Enter the username you saved for this challenge.");
			focusField("player-recovery-username");
			showToast("Enter the username you saved for this challenge.", "error");
			return;
		}

		setRecoveryError(null);
		await onRecover(trimmedUsername);
	}

	return (
		<GlassCard className="px-5 py-6 sm:px-8">
			<SectionEyebrow>Join the challenge</SectionEyebrow>
			<h1 className="font-display text-foreground text-4xl leading-none sm:text-5xl">
				{challengeTitle}
			</h1>
			<p className="text-muted-foreground mt-4 text-base leading-7">
				One shot. No changes. Lock your picks before the results start moving.
			</p>
			<form className="mt-6 flex flex-col gap-4" onSubmit={handleJoin}>
				<label className="flex flex-col gap-2">
					<span className="text-foreground text-sm font-semibold">
						Nickname
					</span>
					<Input
						id="player-nickname"
						value={nickname}
						onChange={(event) => {
							setNickname(event.target.value);
							setJoinErrors((current) => ({
								...current,
								nickname: undefined,
							}));
						}}
						placeholder="Pick a name everyone will recognise"
						maxLength={20}
						autoComplete="nickname"
						autoCapitalize="words"
						enterKeyHint="go"
						spellCheck={false}
						aria-invalid={Boolean(joinErrors.nickname)}
						aria-describedby={
							joinErrors.nickname ? "player-nickname-error" : undefined
						}
					/>
					{joinErrors.nickname ? (
						<p
							id="player-nickname-error"
							className="text-sm leading-6 text-rose-300"
						>
							{joinErrors.nickname}
						</p>
					) : null}
				</label>
				<label className="flex flex-col gap-2">
					<span className="text-foreground text-sm font-semibold">
						Private username <span className="text-zinc-400">(optional)</span>
					</span>
					<Input
						id="player-username"
						value={username}
						onChange={(event) => {
							setUsername(event.target.value);
							setJoinErrors((current) => ({
								...current,
								username: undefined,
							}));
						}}
						placeholder="Only for logging in from another device"
						maxLength={20}
						autoComplete="username"
						autoCapitalize="none"
						enterKeyHint="go"
						spellCheck={false}
						aria-invalid={Boolean(joinErrors.username)}
						aria-describedby={
							joinErrors.username ? "player-username-error" : undefined
						}
					/>
					{joinErrors.username ? (
						<p
							id="player-username-error"
							className="text-sm leading-6 text-rose-300"
						>
							{joinErrors.username}
						</p>
					) : null}
					<p className="text-sm leading-6 text-zinc-400">
						This never appears on the leaderboard. Use it only if you want to
						recover this same entry on another device later.
					</p>
				</label>
				<Button type="submit" className="w-full" disabled={isJoining}>
					{isJoining ? "Joining..." : "Let's go"}
				</Button>
			</form>

			<div className="mt-8 border-t border-zinc-800 pt-6">
				<p className="text-sm font-semibold text-white">
					Already joined from another device?
				</p>
				<p className="mt-2 text-sm leading-6 text-zinc-400">
					Use your private username to reconnect this device to your picks.
				</p>
				<form
					className="mt-4 flex flex-col gap-3 sm:flex-row"
					onSubmit={handleRecoverParticipant}
				>
					<Input
						id="player-recovery-username"
						value={recoveryUsername}
						onChange={(event) => {
							setRecoveryUsername(event.target.value);
							setRecoveryError(null);
						}}
						placeholder="Enter your private username"
						autoComplete="username"
						autoCapitalize="none"
						spellCheck={false}
						aria-invalid={Boolean(recoveryError)}
						aria-describedby={
							recoveryError ? "player-recovery-error" : undefined
						}
					/>
					<Button
						type="submit"
						variant="outline"
						disabled={isRecovering}
						className="shrink-0 whitespace-nowrap"
					>
						{isRecovering ? "Checking..." : "Recover my entry"}
					</Button>
				</form>
				{recoveryError ? (
					<p
						id="player-recovery-error"
						className="mt-3 text-sm leading-6 text-rose-300"
					>
						{recoveryError}
					</p>
				) : null}
			</div>
		</GlassCard>
	);
}
