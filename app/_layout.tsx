import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Text, View } from "react-native";

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

const queryClient = new QueryClient({
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

	if (!CLERK_PUBLISHABLE_KEY) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					backgroundColor: "#000",
				}}
			>
				<Text style={{ color: "#fff" }}>
					Error: Missing Clerk Publishable Key
				</Text>
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
			<ClerkProvider
				tokenCache={tokenCache}
				publishableKey={CLERK_PUBLISHABLE_KEY}
			>
				<QueryClientProvider client={queryClient}>
					<SignedIn>
						<Stack
							screenOptions={{
								headerShown: false,
								contentStyle: { backgroundColor: "#000" },
							}}
						>
							<Stack.Screen name="(tabs)" />
							<Stack.Screen name="show-detail/[id]" />
						</Stack>
					</SignedIn>
					<SignedOut>
						<Stack
							screenOptions={{
								headerShown: false,
								contentStyle: { backgroundColor: "#000" },
								animation: "none",
							}}
						>
							<Stack.Screen name="sign-in" />
						</Stack>
					</SignedOut>
				</QueryClientProvider>
			</ClerkProvider>
		</ErrorBoundary>
	);
}
