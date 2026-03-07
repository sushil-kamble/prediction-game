import type { ReactNode } from "react";
import {
	HeadContent,
	Link,
	Outlet,
	Scripts,
	createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReconnectingBanner } from "#/components/app/reconnecting-banner";
import { ToastProvider } from "#/components/app/toast";
import { Button, FullScreenState } from "#/components/app/ui";
import ConvexProvider from "#/integrations/convex/provider";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "PredictGame",
			},
			{
				name: "description",
				content:
					"Create sports prediction challenges, share one link, and watch the leaderboard update live.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	errorComponent: RootErrorBoundary,
	notFoundComponent: RootNotFound,
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="font-sans antialiased selection:bg-[rgba(243,145,53,0.24)]">
				<ConvexProvider>
					<ToastProvider>
						<ReconnectingBanner />
						{children}
						<TanStackDevtools
							config={{
								position: "bottom-right",
							}}
							plugins={[
								{
									name: "TanStack Router",
									render: <TanStackRouterDevtoolsPanel />,
								},
							]}
						/>
					</ToastProvider>
				</ConvexProvider>
				<Scripts />
			</body>
		</html>
	);
}

function RootErrorBoundary({
	error,
	reset,
}: {
	error: Error;
	reset: () => void;
}) {
	return (
		<RootDocument>
			<FullScreenState
				title="Something went wrong"
				description={error.message || "The app hit an unexpected issue."}
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button onClick={() => reset()}>Try again</Button>
					<Link
						to="/"
						className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--card-stroke)] bg-white/84 px-5 text-sm font-semibold text-[var(--ink)] no-underline"
					>
						Back home
					</Link>
				</div>
			</FullScreenState>
		</RootDocument>
	);
}

function RootNotFound() {
	return (
		<FullScreenState
			title="Route not found"
			description="The page you're looking for doesn't exist in this version."
		>
			<Link
				to="/"
				className="inline-flex min-h-12 items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--orange-500),var(--orange-700))] px-5 text-sm font-semibold text-white no-underline shadow-[0_18px_42px_rgba(224,110,27,0.28)]"
			>
				Go home
			</Link>
		</FullScreenState>
	);
}
