import type {
	ButtonHTMLAttributes,
	InputHTMLAttributes,
	ReactNode,
	TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";
import type { ChallengeStatus } from "#/lib/challenge";
import { getSportEmoji, getStatusLabel } from "#/lib/challenge";
import { cn } from "#/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "ghost" | "danger";
	fullWidth?: boolean;
};

const buttonClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
	primary:
		"border-transparent bg-[linear-gradient(135deg,var(--orange-500),var(--orange-700))] text-white shadow-[0_18px_42px_rgba(224,110,27,0.28)]",
	secondary:
		"border-[color:var(--card-stroke)] bg-white/88 text-[var(--ink)] shadow-[0_16px_40px_rgba(33,21,10,0.08)]",
	ghost: "border-transparent bg-transparent text-[var(--ink-soft)] shadow-none",
	danger:
		"border-transparent bg-[linear-gradient(135deg,#fb7185,#e11d48)] text-white shadow-[0_18px_42px_rgba(190,24,93,0.2)]",
};

const statusClasses: Record<ChallengeStatus, string> = {
	draft: "bg-[rgba(255,247,236,0.9)] text-[color:var(--warning-ink)]",
	open: "bg-[rgba(255,255,255,0.9)] text-[color:var(--ink)]",
	scoring: "bg-[rgba(255,242,229,0.94)] text-[color:var(--orange-700)]",
	closed: "bg-[rgba(40,28,18,0.92)] text-white",
};

export function PageShell({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<main className={cn("mx-auto flex w-full max-w-5xl flex-col px-4 pb-24", className)}>
			{children}
		</main>
	);
}

export function GlassCard({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return <section className={cn("glass-card", className)}>{children}</section>;
}

export function SectionEyebrow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p className={cn("mb-3 text-xs font-extrabold uppercase tracking-[0.32em] text-[color:var(--ink-soft)]", className)}>
			{children}
		</p>
	);
}

export function Button({
	className,
	variant = "primary",
	fullWidth = false,
	...props
}: ButtonProps) {
	return (
		<button
			{...props}
			className={cn(
				"inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
				buttonClasses[variant],
				fullWidth && "w-full",
				className,
			)}
		/>
	);
}

export function Input(
	props: InputHTMLAttributes<HTMLInputElement> & { className?: string },
) {
	return (
		<input
			{...props}
			className={cn(
				"field-shell w-full rounded-[1.2rem] border px-4 py-3 text-base text-[var(--ink)] outline-none placeholder:text-[color:var(--ink-soft)]",
				props.className,
			)}
		/>
	);
}

export function Textarea(
	props: TextareaHTMLAttributes<HTMLTextAreaElement> & {
		className?: string;
	},
) {
	return (
		<textarea
			{...props}
			className={cn(
				"field-shell min-h-30 w-full rounded-[1.2rem] border px-4 py-3 text-base text-[var(--ink)] outline-none placeholder:text-[color:var(--ink-soft)]",
				props.className,
			)}
		/>
	);
}

export function SportBadge({ sport }: { sport: string }) {
	return (
		<span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.54)] bg-white/72 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
			<span>{getSportEmoji(sport)}</span>
			<span>{sport}</span>
		</span>
	);
}

export function StatusBadge({ status }: { status: ChallengeStatus }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em]",
				statusClasses[status],
			)}
		>
			<span className="h-2 w-2 rounded-full bg-current" />
			{getStatusLabel(status)}
		</span>
	);
}

export function MetricPill({
	label,
	value,
	className,
}: {
	label: string;
	value: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"rounded-[1.25rem] border border-white/60 bg-white/68 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
				className,
			)}
		>
			<p className="m-0 text-[11px] font-bold uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
				{label}
			</p>
			<p className="mt-1 text-lg font-semibold text-[var(--ink)]">{value}</p>
		</div>
	);
}

export function OptionButton({
	children,
	selected = false,
	correct = false,
	locked = false,
	className,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	selected?: boolean;
	correct?: boolean;
	locked?: boolean;
}) {
	return (
		<button
			{...props}
			className={cn(
				"flex min-h-12 w-full items-center justify-between rounded-[1.15rem] border px-4 py-3 text-left text-sm font-semibold transition",
				selected &&
					"border-[rgba(243,132,43,0.65)] bg-[rgba(255,241,228,0.9)] text-[var(--orange-700)]",
				!selected &&
					"border-[color:var(--card-stroke)] bg-white/78 text-[var(--ink)]",
				correct &&
					"border-emerald-300 bg-[rgba(232,255,240,0.95)] text-[color:var(--success-ink)]",
				locked && "cursor-default",
				className,
			)}
		>
			<span>{children}</span>
			<ChevronRight className="h-4 w-4 opacity-60" />
		</button>
	);
}

export function InlineNotice({
	children,
	tone = "neutral",
	className,
}: {
	children: ReactNode;
	tone?: "neutral" | "warning" | "success";
	className?: string;
}) {
	const toneMap = {
		neutral: "border-white/60 bg-white/76 text-[var(--ink)]",
		warning:
			"border-[rgba(255,188,96,0.58)] bg-[rgba(255,246,233,0.94)] text-[color:var(--warning-ink)]",
		success:
			"border-emerald-200 bg-[rgba(239,255,246,0.92)] text-[color:var(--success-ink)]",
	};

	return (
		<div
			className={cn(
				"rounded-[1.4rem] border px-4 py-4 text-sm font-medium leading-6",
				toneMap[tone],
				className,
			)}
		>
			{children}
		</div>
	);
}

export function FullScreenState({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children?: ReactNode;
}) {
	return (
		<PageShell className="min-h-[calc(100vh-2rem)] justify-center py-10">
			<GlassCard className="mx-auto max-w-xl px-6 py-8 text-center">
				<SectionEyebrow>PredictGame</SectionEyebrow>
				<h1 className="font-display text-4xl leading-none text-[var(--ink)]">
					{title}
				</h1>
				<p className="mt-4 text-base leading-7 text-[var(--ink-soft)]">
					{description}
				</p>
				{children ? <div className="mt-6">{children}</div> : null}
			</GlassCard>
		</PageShell>
	);
}

export function SkeletonBlock({
	className,
}: {
	className?: string;
}) {
	return <div className={cn("rounded-2xl bg-[rgba(255,255,255,0.58)] shimmer", className)} />;
}

export function BottomSheet({
	open,
	onClose,
	title,
	description,
	children,
	footer,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children?: ReactNode;
	footer?: ReactNode;
}) {
	if (!open || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgba(24,13,4,0.36)] p-0 backdrop-blur-sm">
			<button
				type="button"
				onClick={onClose}
				className="absolute inset-0 cursor-default"
				aria-label="Close dialog"
			/>
			<div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-white/70 bg-[rgba(255,248,241,0.98)] px-5 py-5 shadow-[0_-18px_64px_rgba(20,13,6,0.18)] animate-[sheet-in_240ms_ease-out]">
				<div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-black/10" />
				<div className="mb-5 flex items-start gap-4">
					<div className="flex-1">
						<h2 className="font-display text-3xl leading-none text-[var(--ink)]">
							{title}
						</h2>
						{description ? (
							<p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
								{description}
							</p>
						) : null}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--card-stroke)] bg-white/84 text-[var(--ink-soft)]"
						aria-label="Dismiss"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
				{children}
				{footer ? <div className="mt-6 flex flex-col gap-3">{footer}</div> : null}
			</div>
		</div>,
		document.body,
	);
}
