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
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{
				title: "PredictGame",
			},
			{
				name: "description",
				content:
					"Create sports prediction challenges, share one link, and watch the leaderboard update live.",
			},
			{ name: "theme-color", content: "#000000" },
			{ name: "apple-mobile-web-app-capable", content: "yes" },
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{ name: "format-detection", content: "telephone=no" },
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml",
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
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
	const showDevtools = import.meta.env.DEV;

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="selection:bg-primary/30 selection:text-primary-foreground font-sans antialiased">
				<a
					href="#main-content"
					className="bg-primary text-primary-foreground sr-only fixed top-4 left-4 z-[110] px-4 py-2 font-bold uppercase focus:not-sr-only"
				>
					Skip to content
				</a>
				<ConvexProvider>
					<ToastProvider>
						<ReconnectingBanner />
						{children}
						{showDevtools ? (
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
						) : null}
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
	function handleTryAgain() {
		if (typeof window !== "undefined") {
			window.location.reload();
			return;
		}

		reset();
	}

	return (
		<RootDocument>
			<FullScreenState
				title="Something went wrong"
				description={error.message || "The app hit an unexpected issue."}
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button onClick={handleTryAgain}>Try again</Button>
					<Button variant="outline" asChild>
						<Link to="/" className="no-underline">
							Back home
						</Link>
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
				<Link to="/" className="no-underline">
					Go home
				</Link>
			</Button>
		</FullScreenState>
	);
}
