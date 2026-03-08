import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button as ShadButton } from "#/components/ui/button";
import { Input as ShadInput } from "#/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
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
		<main
			id="main-content"
			className={cn(
				"mx-auto flex w-full max-w-5xl flex-col px-4 pb-24",
				className
			)}
		>
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
	return (
		<section
			className={cn("border-2 border-zinc-800 bg-black p-6 sm:p-10", className)}
		>
			{children}
		</section>
	);
}

export function SectionEyebrow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"text-primary mb-4 text-sm font-bold tracking-[0.2em] uppercase",
				className
			)}
		>
			{children}
		</p>
	);
}

export { ShadButton as Button, ShadInput as Input, ShadTextarea as Textarea };

export function SportBadge({ sport }: { sport: string }) {
	return (
		<Badge
			variant="outline"
			className="gap-2 rounded-none border-2 border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-bold tracking-widest text-white uppercase"
		>
			<span className="text-sm">{getSportEmoji(sport)}</span>
			<span>{sport}</span>
		</Badge>
	);
}

const statusStyles: Record<ChallengeStatus, string> = {
	draft: "border-yellow-400 bg-yellow-400/10 text-yellow-400",
	open: "border-primary bg-primary/10 text-primary",
	scoring: "border-emerald-400 bg-emerald-400/10 text-emerald-400",
	closed: "border-zinc-500 bg-zinc-800 text-zinc-400",
};

export function StatusBadge({ status }: { status: ChallengeStatus }) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"gap-2 rounded-none border-2 px-3 py-1 text-xs font-bold tracking-widest uppercase",
				statusStyles[status]
			)}
		>
			<span className="h-2 w-2 bg-current" />
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
				"border-2 border-zinc-800 bg-zinc-950 px-5 py-4",
				className
			)}
		>
			<p className="m-0 text-xs font-bold tracking-widest text-zinc-500 uppercase">
				{label}
			</p>
			<p className="mt-2 text-2xl font-bold text-white">{value}</p>
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
			data-slot="option-button"
			data-selected={selected || undefined}
			data-locked={locked || undefined}
			{...props}
			className={cn(
				"focus-visible:ring-primary/40 flex min-h-[3.5rem] w-full items-center justify-between border-2 px-5 py-3 text-left text-base font-bold tracking-wider normal-case transition-all outline-none focus-visible:ring-4",
				selected &&
					"border-primary bg-primary -translate-x-1 -translate-y-1 text-black shadow-[4px_4px_0px_0px_#ffffff]",
				!selected &&
					"hover:border-primary hover:text-primary border-zinc-700 bg-black text-white hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#ccff00]",
				correct &&
					"border-emerald-400 bg-emerald-400 text-black shadow-[4px_4px_0px_0px_#ffffff]",
				locked &&
					"cursor-default hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
				className
			)}
		>
			<span>{children}</span>
			<ChevronRight
				className={cn(
					"h-5 w-5 shrink-0",
					selected || correct ? "text-black" : "text-zinc-500"
				)}
			/>
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
		neutral: "border-zinc-700 bg-zinc-900 text-white",
		warning: "border-yellow-400 bg-yellow-400/10 text-yellow-400",
		success: "border-emerald-400 bg-emerald-400/10 text-emerald-400",
	};

	return (
		<div
			className={cn(
				"border-2 px-5 py-4 text-sm leading-relaxed font-bold tracking-wide uppercase",
				toneMap[tone],
				className
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
		<PageShell className="min-h-[calc(100vh-2rem)] justify-center py-10 sm:py-12">
			<div className="mx-auto w-full max-w-xl min-w-0 overflow-hidden border-4 border-white bg-black p-6 text-center shadow-[12px_12px_0px_0px_#ccff00] sm:p-12">
				<SectionEyebrow>SUSHIL GAMES</SectionEyebrow>
				<h1 className="font-display mb-6 text-4xl leading-none text-white uppercase sm:text-5xl">
					{title}
				</h1>
				<p className="text-lg leading-relaxed font-medium [overflow-wrap:anywhere] text-zinc-400">
					{description}
				</p>
				{children ? <div className="mt-8 min-w-0">{children}</div> : null}
			</div>
		</PageShell>
	);
}

export function SkeletonBlock({ className }: { className?: string }) {
	return (
		<Skeleton
			className={cn(
				"rounded-none border-2 border-zinc-800 bg-zinc-900",
				className
			)}
		/>
	);
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
	return (
		<Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<SheetContent
				side="bottom"
				className="max-h-[90vh] overflow-y-auto border-t-4 border-r-4 border-l-4 border-white bg-black px-6 py-6 sm:mx-auto sm:max-w-2xl"
			>
				<div className="mb-5 flex justify-center">
					<div className="h-1.5 w-12 rounded-full bg-zinc-600" />
				</div>
				<SheetHeader className="mb-8 gap-4 px-0 pt-0">
					<SheetTitle className="font-display text-4xl leading-none text-white uppercase">
						{title}
					</SheetTitle>
					{description ? (
						<SheetDescription className="text-base leading-relaxed font-medium tracking-wide text-zinc-400 uppercase">
							{description}
						</SheetDescription>
					) : null}
				</SheetHeader>
				{children}
				{footer ? <div className="mt-8 flex flex-col gap-4">{footer}</div> : null}
			</SheetContent>
		</Sheet>
	);
}
