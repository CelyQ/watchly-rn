import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const envBaseURL = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;

if (!envBaseURL) {
	console.error(
		"EXPO_PUBLIC_BETTER_AUTH_URL is not set. Please add it to your .env file.",
	);
}

// Ensure no trailing slash
const normalizedBaseURL = envBaseURL?.replace(/\/$/, "");

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
