import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Crosshair,
	Gamepad2,
	Sparkles,
	Trophy,
	Zap,
} from "lucide-react";
import { PageShell } from "#/components/app/ui";

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
		<PageShell className="mx-auto max-w-6xl gap-16 py-12 sm:py-24">
			{/* Hero Section */}
			<div className="relative isolate">
				{/* Decorative background elements */}
				<div className="absolute -inset-x-4 -inset-y-8 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(204,255,0,0.15),transparent)]" />
				<div className="absolute top-0 right-10 -z-10 hidden opacity-20 md:block">
					<div className="grid grid-cols-6 gap-2">
						{Array.from({ length: 36 }).map((_, i) => (
							<div
								key={`dot-${i}`}
								className="bg-primary h-1.5 w-1.5 rounded-full"
							/>
						))}
					</div>
				</div>

				<div className="relative flex flex-col items-start gap-6">
					<div className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
						<Sparkles className="h-3.5 w-3.5" />
						<span>The Game Hub</span>
					</div>

					<h1 className="font-display text-[4rem] leading-[0.85] tracking-tight text-white uppercase sm:text-[6.5rem] md:text-[8rem]">
						Play. <br />
						<span className="from-primary bg-gradient-to-r via-[#e6ff66] to-white bg-clip-text text-transparent">
							Dominate.
						</span>
					</h1>

					<p className="mt-4 max-w-xl text-lg leading-relaxed font-medium text-zinc-400 sm:text-xl">
						Step into the arena. A curated collection of competitive experiences
						designed to turn match days into battlegrounds and friends into
						rivals.
					</p>
				</div>
			</div>

			{/* Divider */}
			<div className="from-primary/50 h-px w-full bg-gradient-to-r via-zinc-800 to-transparent" />

			{/* Games Grid Section */}
			<div className="flex flex-col gap-10">
				<div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
					<div>
						<h2 className="font-display flex items-center gap-3 text-4xl tracking-tight text-white uppercase sm:text-5xl">
							<Zap className="text-primary fill-primary/20 h-8 w-8" />
							Active Arenas
						</h2>
						<p className="mt-2 text-sm font-medium tracking-wide text-zinc-500 uppercase">
							Select your proving ground
						</p>
					</div>
				</div>

				<div className="grid gap-8 lg:grid-cols-2">
					{/* Prediction Game Card */}
					<Link
						to="/prediction"
						className="group relative block no-underline outline-none"
					>
						{/* Card Background / Shadow layer */}
						<div className="bg-primary absolute inset-0 translate-x-2 translate-y-2 transition-transform duration-300 ease-out group-hover:translate-x-3 group-hover:translate-y-3 group-focus-visible:translate-x-3 group-focus-visible:translate-y-3" />

						{/* Card Main Surface */}
						<div className="group-hover:border-primary group-focus-visible:border-primary relative flex h-full flex-col border-2 border-zinc-800 bg-zinc-950 p-8 transition-colors duration-300">
							{/* Card Header */}
							<div className="mb-12 flex items-start justify-between">
								<div className="group-hover:bg-primary/10 group-hover:border-primary/30 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors">
									<Crosshair className="text-primary h-8 w-8" />
								</div>
								<div className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-extrabold tracking-widest uppercase">
									<div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
									Live Now
								</div>
							</div>

							{/* Card Content */}
							<div className="flex-1">
								<h3 className="font-display group-hover:text-primary mb-4 text-4xl leading-none text-white uppercase transition-colors">
									Prediction <br /> Game
								</h3>
								<p className="text-base leading-relaxed text-zinc-400">
									Call the shots. Create custom sports prediction challenges,
									rally your crew with a single link, and watch the real-time
									leaderboard separate the visionaries from the rookies.
								</p>
							</div>

							{/* Card Footer */}
							<div className="group-hover:border-primary/30 mt-10 flex items-center justify-between border-t border-zinc-800 pt-6 transition-colors">
								<span className="group-hover:text-primary text-sm font-bold tracking-wider text-white uppercase transition-colors">
									Enter Arena
								</span>
								<div className="group-hover:bg-primary rounded-full bg-zinc-900 p-2 transition-all duration-300 group-hover:rotate-45 group-hover:text-black">
									<ArrowUpRight className="h-5 w-5" />
								</div>
							</div>
						</div>
					</Link>

					{/* Coming Soon Card */}
					<div className="group relative block opacity-80 grayscale-[0.5]">
						{/* Card Background / Shadow layer */}
						<div className="absolute inset-0 translate-x-2 translate-y-2 bg-zinc-800" />

						{/* Card Main Surface */}
						<div className="relative flex h-full flex-col overflow-hidden border-2 border-zinc-800 bg-zinc-950 p-8">
							{/* Diagonal hazard stripes overlay */}
							<div className="pointer-events-none absolute -inset-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]" />

							{/* Card Header */}
							<div className="relative z-10 mb-12 flex items-start justify-between">
								<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
									<Gamepad2 className="h-8 w-8 text-zinc-600" />
								</div>
								<div className="flex items-center rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-extrabold tracking-widest text-zinc-500 uppercase">
									In Development
								</div>
							</div>

							{/* Card Content */}
							<div className="relative z-10 flex-1">
								<h3 className="font-display mb-4 text-4xl leading-none text-zinc-600 uppercase">
									Mystery <br /> Challenge
								</h3>
								<p className="text-base leading-relaxed text-zinc-500">
									The forge is burning. Our engineers are constructing new
									competitive formats. Keep your skills sharp, the next
									battleground drops soon.
								</p>
							</div>

							{/* Card Footer */}
							<div className="relative z-10 mt-10 flex items-center justify-between border-t border-zinc-800 pt-6">
								<span className="text-sm font-bold tracking-wider text-zinc-600 uppercase">
									Locked
								</span>
								<Trophy className="h-5 w-5 text-zinc-700" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</PageShell>
	);
}
