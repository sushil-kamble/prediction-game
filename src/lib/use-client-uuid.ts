import { useState } from "react";
import { getOrCreateUUID } from "#/lib/storage";

export function useClientUUID() {
	const [uuid] = useState<string | null>(() =>
		typeof window === "undefined" ? null : getOrCreateUUID(),
	);

	return uuid;
}
