import { useConvexConnectionState } from "convex/react";

export function ReconnectingBanner() {
	const connection = useConvexConnectionState();

	if (!connection.hasEverConnected || connection.isWebSocketConnected) {
		return null;
	}

	return (
		<div className="fixed inset-x-0 top-0 z-[95] px-4 pt-3">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-300 shadow-[0_12px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl">
				<span>Reconnecting...</span>
				<span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
			</div>
		</div>
	);
}
