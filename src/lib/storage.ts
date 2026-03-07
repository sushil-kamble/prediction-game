export type StoredAdminChallenge = {
	challengeId: string;
	adminSecret: string;
	title: string;
	sport: string;
};

const ADMIN_CHALLENGES_KEY = "adminChallenges";
const UUID_KEY = "pguid";
const ADMIN_CHALLENGES_EVENT = "pg:admin-challenges";
const EMPTY_ADMIN_CHALLENGES: StoredAdminChallenge[] = [];

let memoryUuid: string | null = null;
const memoryDrafts = new Map<string, Record<string, number>>();
let cachedAdminChallengesRaw: string | null = null;
let cachedAdminChallenges: StoredAdminChallenge[] = EMPTY_ADMIN_CHALLENGES;

function hasWindow() {
	return typeof window !== "undefined";
}

function getStorage() {
	if (!hasWindow()) {
		return null;
	}

	try {
		return window.localStorage;
	} catch (error) {
		console.error("Local storage is unavailable.", error);
		return null;
	}
}

function createUuid() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `pg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readJson<T>(key: string, fallback: T) {
	const storage = getStorage();
	if (!storage) {
		return fallback;
	}

	try {
		const value = storage.getItem(key);
		return value ? (JSON.parse(value) as T) : fallback;
	} catch (error) {
		console.error(`Failed to parse ${key} from local storage.`, error);
		return fallback;
	}
}

function writeJson(key: string, value: unknown) {
	const storage = getStorage();
	if (!storage) {
		return false;
	}

	try {
		storage.setItem(key, JSON.stringify(value));
		return true;
	} catch (error) {
		console.error(`Failed to write ${key} to local storage.`, error);
		return false;
	}
}

function emitAdminChallengesChange() {
	if (!hasWindow()) {
		return;
	}

	window.dispatchEvent(new Event(ADMIN_CHALLENGES_EVENT));
}

export function getOrCreateUUID() {
	const storage = getStorage();
	if (!storage) {
		if (!memoryUuid) {
			memoryUuid = createUuid();
		}
		return memoryUuid;
	}

	try {
		const stored = storage.getItem(UUID_KEY);
		if (stored) {
			return stored;
		}

		const uuid = createUuid();
		storage.setItem(UUID_KEY, uuid);
		return uuid;
	} catch (error) {
		console.error("Failed to access UUID storage.", error);
		if (!memoryUuid) {
			memoryUuid = createUuid();
		}
		return memoryUuid;
	}
}

export function getStoredAdminChallenges() {
	const storage = getStorage();
	if (!storage) {
		return cachedAdminChallenges;
	}

	try {
		const raw = storage.getItem(ADMIN_CHALLENGES_KEY);
		const normalized = raw ?? "[]";

		if (normalized === cachedAdminChallengesRaw) {
			return cachedAdminChallenges;
		}

		cachedAdminChallengesRaw = normalized;
		cachedAdminChallenges = raw
			? (JSON.parse(raw) as StoredAdminChallenge[])
			: EMPTY_ADMIN_CHALLENGES;
		return cachedAdminChallenges;
	} catch (error) {
		console.error("Failed to read admin challenges from local storage.", error);
		return cachedAdminChallenges;
	}
}

export function upsertStoredAdminChallenge(record: StoredAdminChallenge) {
	const records = getStoredAdminChallenges();
	const next = [
		record,
		...records.filter((item) => item.challengeId !== record.challengeId),
	];
	writeJson(ADMIN_CHALLENGES_KEY, next);
	cachedAdminChallenges = next;
	cachedAdminChallengesRaw = JSON.stringify(next);
	emitAdminChallengesChange();
	return next;
}

export function getStoredAdminChallenge(challengeId: string) {
	return getStoredAdminChallenges().find(
		(challenge) => challenge.challengeId === challengeId,
	);
}

export function getParticipantStorageKey(challengeId: string) {
	return `participant_${challengeId}`;
}

export function getPredictionDraftKey(challengeId: string) {
	return `prediction_draft_${challengeId}`;
}

export function getStoredParticipantId(challengeId: string) {
	const storage = getStorage();
	if (!storage) {
		return null;
	}

	try {
		return storage.getItem(getParticipantStorageKey(challengeId));
	} catch (error) {
		console.error("Failed to read participant id.", error);
		return null;
	}
}

export function setStoredParticipantId(challengeId: string, participantId: string) {
	const storage = getStorage();
	if (!storage) {
		return;
	}

	try {
		storage.setItem(getParticipantStorageKey(challengeId), participantId);
	} catch (error) {
		console.error("Failed to store participant id.", error);
	}
}

export function clearStoredPredictionDraft(challengeId: string) {
	memoryDrafts.delete(challengeId);

	const storage = getStorage();
	if (!storage) {
		return;
	}

	try {
		storage.removeItem(getPredictionDraftKey(challengeId));
	} catch (error) {
		console.error("Failed to clear prediction draft.", error);
	}
}

export function getStoredPredictionDraft(challengeId: string) {
	const storage = getStorage();
	if (!storage) {
		return memoryDrafts.get(challengeId) ?? {};
	}

	return readJson<Record<string, number>>(getPredictionDraftKey(challengeId), {});
}

export function setStoredPredictionDraft(
	challengeId: string,
	selections: Record<string, number>,
) {
	memoryDrafts.set(challengeId, selections);
	writeJson(getPredictionDraftKey(challengeId), selections);
}

export function subscribeToAdminChallenges(callback: () => void) {
	if (!hasWindow()) {
		return () => undefined;
	}

	const onStorage = (event: Event) => {
		if (
			event.type === ADMIN_CHALLENGES_EVENT ||
			(event instanceof StorageEvent && event.key === ADMIN_CHALLENGES_KEY)
		) {
			callback();
		}
	};

	window.addEventListener("storage", onStorage);
	window.addEventListener(ADMIN_CHALLENGES_EVENT, onStorage);

	return () => {
		window.removeEventListener("storage", onStorage);
		window.removeEventListener(ADMIN_CHALLENGES_EVENT, onStorage);
	};
}
