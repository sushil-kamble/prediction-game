import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";
import { Button as ShadButton } from "#/components/ui/button";
import { Input as ShadInput } from "#/components/ui/input";
import { Textarea as ShadTextarea } from "#/components/ui/textarea";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import type { ChallengeStatus } from "#/lib/challenge";
import { getSportEmoji, getStatusLabel } from "#/lib/challenge";
import { cn } from "#/lib/utils";

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
		<p className={cn("mb-3 text-xs font-extrabold uppercase tracking-[0.32em] text-primary/70", className)}>
			{children}
		</p>
	);
}

export {
	ShadButton as Button,
	ShadInput as Input,
	ShadTextarea as Textarea,
};

export function SportBadge({ sport }: { sport: string }) {
	return (
		<Badge variant="outline" className="gap-1.5 border-border bg-secondary px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
			<span>{getSportEmoji(sport)}</span>
			<span>{sport}</span>
		</Badge>
	);
}

const statusStyles: Record<ChallengeStatus, string> = {
	draft: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
	open: "border-primary/30 bg-primary/10 text-primary",
	scoring: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
	closed: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: ChallengeStatus }) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"gap-1.5 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider",
				statusStyles[status],
			)}
		>
			<span className="h-1.5 w-1.5 rounded-full bg-current" />
			{getStatusLabel(status)}
		</Badge>
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
				"rounded-xl border border-border bg-secondary px-4 py-3",
				className,
			)}
		>
			<p className="m-0 text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
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
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	selected?: boolean;
	correct?: boolean;
	locked?: boolean;
}) {
	return (
		<button
			{...props}
			className={cn(
				"flex min-h-12 w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all",
				selected &&
					"border-primary/50 bg-primary/12 text-primary shadow-[0_0_20px_rgba(139,92,246,0.08)]",
				!selected &&
					"border-border bg-secondary text-foreground hover:border-primary/30 hover:bg-primary/8",
				correct &&
					"border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
				locked && "cursor-default",
				className,
			)}
		>
			<span>{children}</span>
			<ChevronRight className="h-4 w-4 opacity-40" />
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
		neutral: "border-border bg-secondary text-foreground",
		warning: "border-yellow-500/30 bg-yellow-500/8 text-yellow-300",
		success: "border-emerald-500/30 bg-emerald-500/8 text-emerald-300",
	};

	return (
		<div
			className={cn(
				"rounded-xl border px-4 py-4 text-sm font-medium leading-6",
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
				<h1 className="font-display text-4xl leading-none text-foreground">
					{title}
				</h1>
				<p className="mt-4 text-base leading-7 text-muted-foreground">
					{description}
				</p>
				{children ? <div className="mt-6">{children}</div> : null}
			</GlassCard>
		</PageShell>
	);
}

export function SkeletonBlock({ className }: { className?: string }) {
	return <Skeleton className={cn("rounded-xl", className)} />;
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
		<div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm">
			<button
				type="button"
				onClick={onClose}
				className="absolute inset-0 cursor-default"
				aria-label="Close dialog"
			/>
			<div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-[rgba(14,8,32,0.98)] px-5 py-5 shadow-[0_-18px_64px_rgba(0,0,0,0.4)] animate-[sheet-in_240ms_ease-out]">
				<div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-primary/20" />
				<div className="mb-5 flex items-start gap-4">
					<div className="flex-1">
						<h2 className="font-display text-3xl leading-none text-foreground">
							{title}
						</h2>
						{description ? (
							<p className="mt-3 text-sm leading-6 text-muted-foreground">
								{description}
							</p>
						) : null}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground hover:text-foreground"
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
