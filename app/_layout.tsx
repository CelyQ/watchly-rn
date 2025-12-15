import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Text, View } from "react-native";
import { authClient } from "@/lib/auth-client";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 2,
			retryDelay: 1000,
			staleTime: 1000 * 60 * 5, // 5 minutes
			gcTime: 1000 * 60 * 30, // 30 minutes
		},
	},
});

function ErrorFallback({ error }: { error: Error }) {
	return (
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				alignItems: "center",
				backgroundColor: "#000",
				padding: 20,
			}}
		>
			<Text style={{ color: "#fff", textAlign: "center" }}>
				Something went wrong: {error.message}
			</Text>
		</View>
	);
}

export default function RootLayoutNav() {
	const [isInitialized, setIsInitialized] = useState(false);
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		// Initialize app
		const init = async () => {
			try {
				setIsInitialized(true);
			} catch (error) {
				console.error("Failed to initialize app:", error);
			}
		};

		init();
	}, []);

	// Listen for deep links (OAuth callbacks) - Better Auth handles this automatically
	// This is just for debugging
	useEffect(() => {
		const subscription = Linking.addEventListener("url", (event) => {
			console.log("Deep link received:", event.url);
			// Better Auth Expo client handles the session update automatically
		});

		return () => {
			subscription.remove();
		};
	}, []);

	if (!isInitialized) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					backgroundColor: "#000",
				}}
			>
				<Text style={{ color: "#fff" }}>Loading...</Text>
			</View>
		);
	}

	if (!BACKEND_BASE_URL) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					backgroundColor: "#000",
				}}
			>
				<Text style={{ color: "#fff" }}>Error: Missing Backend Base URL</Text>
			</View>
		);
	}

	return (
		<ErrorBoundary FallbackComponent={ErrorFallback}>
			<QueryClientProvider client={queryClient}>
				{isPending ? (
					<View
						style={{
							flex: 1,
							justifyContent: "center",
							alignItems: "center",
							backgroundColor: "#000",
						}}
					>
						<Text style={{ color: "#fff" }}>Loading...</Text>
					</View>
				) : session?.user ? (
					<Stack
						screenOptions={{
							headerShown: false,
							contentStyle: { backgroundColor: "#000" },
						}}
					>
						<Stack.Screen name="(tabs)" />
						<Stack.Screen name="show-detail/[id]" />
					</Stack>
				) : (
					<Stack
						screenOptions={{
							headerShown: false,
							contentStyle: { backgroundColor: "#000" },
							animation: "none",
						}}
					>
						<Stack.Screen name="sign-in" />
					</Stack>
				)}
			</QueryClientProvider>
		</ErrorBoundary>
	);
}
