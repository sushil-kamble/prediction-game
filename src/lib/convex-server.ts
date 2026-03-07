import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export async function fetchChallengePreview(challengeId: string) {
	const convexUrl = import.meta.env.VITE_CONVEX_URL;
	if (!convexUrl) {
		return null;
	}

	try {
		const client = new ConvexHttpClient(convexUrl);
		const challenge = await client.query(api.challenges.getChallenge, {
			challengeId,
		});

		if (!challenge) {
			return null;
		}

		return {
			title: challenge.title,
			sport: challenge.sport,
		};
	} catch (error) {
		console.error("Failed to fetch challenge preview.", error);
		return null;
	}
}
