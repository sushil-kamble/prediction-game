import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Crosshair, Gamepad2, Trophy, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{
				title: "The Game Hub | Compete & Win",
			},
		],
	}),
	component: GamesHubRoute,
});

function GamesHubRoute() {
	return (
		<div id="main-content" className="flex w-full flex-col">
			{/* ─── HERO ─── full-bleed atmospheric */}
			<section className="relative w-full overflow-hidden">
				{/* Atmospheric layers — NOT clipped by any container */}
				<div
					className="pointer-events-none absolute inset-0 -z-10"
					aria-hidden="true"
				>
					{/* Wide radial glow — 160% wide so it bleeds to viewport edges */}
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_160%_80%_at_50%_-10%,rgba(204,255,0,0.16),transparent_60%)]" />
					{/* Left-side depth glow */}
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_-5%_40%,rgba(204,255,0,0.06),transparent)]" />
					{/* Top edge accent */}
					<div className="via-primary absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent opacity-70" />
					{/* Bottom fade into next section */}
					<div className="to-background absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent" />
				</div>

				<div className="mx-auto max-w-6xl px-4 pt-16 pb-28 sm:px-8 sm:pt-24 sm:pb-36">
					<div className="flex flex-col items-start gap-6">
						<h1
							className="font-display leading-[0.88] tracking-tight uppercase"
							style={{ fontSize: "clamp(3.5rem, 11vw, 8.5rem)" }}
						>
							<span className="text-foreground block">Play.</span>
							<span className="text-primary block">Dominate.</span>
						</h1>

						<p className="text-muted-foreground mt-2 max-w-lg text-lg leading-relaxed sm:text-xl">
							Step into the arena. A curated collection of competitive
							experiences designed to turn match days into battlegrounds and
							friends into rivals.
						</p>
					</div>
				</div>
			</section>

			{/* ─── ARENAS ─── edge-to-edge band */}
			<section className="border-border w-full border-t-2">
				{/* Section header — content-width inner container */}
				<div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-8">
					<h2 className="font-display text-foreground flex items-center gap-3 text-3xl tracking-tight uppercase sm:text-4xl">
						<Zap className="text-primary fill-primary/20 h-7 w-7 shrink-0" />
						Active Arenas
					</h2>
					<p className="text-muted-foreground mt-2 pl-10 text-xs font-bold tracking-[0.2em] uppercase">
						Select your proving ground
					</p>
				</div>

				{/* Cards — constrained to same max-width as content above */}
				<div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-8">
					<div className="border-border grid border-2 lg:grid-cols-2">
						{/* ── Prediction Game ── */}
						<Link
							to="/prediction"
							className="group focus-visible:ring-primary border-border lg:border-r-border relative block overflow-hidden border-b-2 no-underline outline-none focus-visible:ring-2 focus-visible:ring-inset lg:border-r-2 lg:border-b-0"
						>
							{/* Left lime accent stripe */}
							<div className="bg-primary absolute top-0 bottom-0 left-0 w-[3px]" />

							{/* Hover atmosphere — radiates from left */}
							<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_0%_50%,rgba(204,255,0,0.08),transparent)] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

							<div className="relative flex min-h-[380px] flex-col gap-10 px-8 py-12 sm:px-12 sm:py-14">
								{/* Header row */}
								<div className="flex items-start justify-between">
									<div className="border-border bg-card group-hover:border-primary/30 group-hover:bg-primary/10 rounded-xl border p-4 transition-colors">
										<Crosshair className="text-primary h-8 w-8" />
									</div>
									<div className="border-primary/20 bg-primary/10 text-primary flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-extrabold tracking-widest uppercase">
										<div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
										Live Now
									</div>
								</div>

								{/* Content */}
								<div className="flex-1">
									<h3
										className="font-display text-foreground group-hover:text-primary leading-none uppercase transition-colors"
										style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)" }}
									>
										Prediction
										<br />
										Game
									</h3>
									<p className="text-muted-foreground mt-4 max-w-sm text-base leading-relaxed">
										Call the shots. Create custom sports prediction challenges,
										rally your crew with a single link, and watch the real-time
										leaderboard separate the visionaries from the rookies.
									</p>
								</div>

								{/* Footer */}
								<div className="border-border group-hover:border-primary/30 flex items-center justify-between border-t pt-6 transition-colors">
									<span className="text-foreground group-hover:text-primary text-sm font-bold tracking-wider uppercase transition-colors">
										Enter Arena
									</span>
									<div className="border-border bg-card group-hover:border-primary group-hover:bg-primary rounded-full border p-2 transition-all duration-300 group-hover:rotate-45 group-hover:text-black">
										<ArrowUpRight className="h-5 w-5" />
									</div>
								</div>
							</div>
						</Link>

						{/* ── Coming Soon ── */}
						<div className="relative overflow-hidden opacity-50 grayscale-[0.4]">
							{/* Diagonal hazard texture */}
							<div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_14px,rgba(255,255,255,0.015)_14px,rgba(255,255,255,0.015)_28px)]" />
							{/* Left muted accent stripe */}
							<div className="absolute top-0 bottom-0 left-0 w-[3px] bg-zinc-700" />

							<div className="relative flex min-h-[380px] flex-col gap-10 px-8 py-12 sm:px-12 sm:py-14">
								<div className="flex items-start justify-between">
									<div className="border-border bg-card rounded-xl border p-4">
										<Gamepad2 className="h-8 w-8 text-zinc-500" />
									</div>
									<div className="border-border bg-card flex items-center rounded border px-2.5 py-1 text-[11px] font-extrabold tracking-widest text-zinc-500 uppercase">
										In Development
									</div>
								</div>

								<div className="flex-1">
									<h3
										className="font-display leading-none text-zinc-600 uppercase"
										style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)" }}
									>
										Mystery
										<br />
										Challenge
									</h3>
									<p className="mt-4 max-w-sm text-base leading-relaxed text-zinc-600">
										The forge is burning. Our engineers are constructing new
										competitive formats. Keep your skills sharp, the next
										battleground drops soon.
									</p>
								</div>

								<div className="border-border flex items-center justify-between border-t pt-6">
									<span className="text-sm font-bold tracking-wider text-zinc-700 uppercase">
										Locked
									</span>
									<Trophy className="h-5 w-5 text-zinc-700" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
