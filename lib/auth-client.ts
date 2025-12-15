import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const baseURL = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;

if (!baseURL) {
	console.error(
		"EXPO_PUBLIC_BETTER_AUTH_URL is not set. Please add it to your .env file.",
	);
}

// Ensure baseURL doesn't have a trailing slash and includes the full path if needed
const normalizedBaseURL =
	baseURL?.replace(/\/$/, "") || "http://localhost:3000";

export const authClient = createAuthClient({
	baseURL: normalizedBaseURL,
	plugins: [
		expoClient({
			scheme: "watchly-rn",
			storagePrefix: "watchly-rn",
			storage: SecureStore,
		}),
	],
});
