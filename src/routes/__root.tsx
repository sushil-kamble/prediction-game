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
			<body className="font-sans antialiased selection:bg-primary/30 selection:text-primary-foreground">
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
					<Button variant="outline" asChild>
						<Link to="/" className="no-underline">Back home</Link>
					</Button>
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
			<Button asChild>
				<Link to="/" className="no-underline">Go home</Link>
			</Button>
		</FullScreenState>
	);
}
