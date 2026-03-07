import { useSyncExternalStore } from "react";
import {
	getStoredAdminChallenges,
	subscribeToAdminChallenges,
} from "#/lib/storage";

const EMPTY_ADMIN_CHALLENGES: ReturnType<typeof getStoredAdminChallenges> = [];

export function useStoredAdminChallenges() {
	return useSyncExternalStore(
		subscribeToAdminChallenges,
		getStoredAdminChallenges,
		() => EMPTY_ADMIN_CHALLENGES,
	);
}
