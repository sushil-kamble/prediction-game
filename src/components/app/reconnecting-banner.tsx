import { useConvexConnectionState } from "convex/react";

export function ReconnectingBanner() {
	const connection = useConvexConnectionState();

	if (!connection.hasEverConnected || connection.isWebSocketConnected) {
		return null;
	}

	return (
		<div className="fixed inset-x-0 top-0 z-[95] px-4 pt-3">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-[rgba(255,191,111,0.8)] bg-[rgba(255,247,236,0.96)] px-4 py-2 text-sm font-semibold text-[color:var(--warning-ink)] shadow-[0_18px_60px_rgba(94,53,12,0.18)] backdrop-blur-xl">
				<span>Reconnecting...</span>
				<span className="h-2.5 w-2.5 rounded-full bg-[color:var(--warning)] animate-pulse" />
			</div>
		</div>
	);
}
