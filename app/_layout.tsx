import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { ErrorBoundary } from "react-error-boundary";
import { Animated, StyleSheet, Text, View } from "react-native";
import { authClient } from "@/lib/auth-client";

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
		<View style={layoutStyles.container}>
			<Text style={{ color: "#fff", textAlign: "center" }}>
				Something went wrong: {error.message}
			</Text>
		</View>
	);
}

// App loading skeleton
function AppLoadingSkeleton() {
	const shimmerAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(shimmerAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(shimmerAnim, {
					toValue: 0,
					duration: 1000,
					useNativeDriver: true,
				}),
			]),
		).start();
	}, [shimmerAnim]);

	const opacity = shimmerAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [0.3, 0.6],
	});

	return (
		<View style={layoutStyles.container}>
			<View style={layoutStyles.skeletonContent}>
				<Animated.View style={[layoutStyles.skeletonLogo, { opacity }]} />
				<Animated.View style={[layoutStyles.skeletonText, { opacity }]} />
			</View>
		</View>
	);
}

export default function RootLayoutNav() {
	const [isInitialized, setIsInitialized] = useState(false);
	const { isPending } = authClient.useSession();

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

	// Handle deep links (OAuth callbacks) - critical for Android
	useEffect(() => {
		const handleURL = async (url: string) => {
			console.log("Processing deep link:", url);
			// Better Auth Expo client should handle this automatically,
			// but we ensure it's processed by checking the URL
			if (url?.startsWith("watchly-rn://")) {
				console.log("OAuth callback detected:", url);
				// Force a session refresh to ensure Better Auth processes the callback
				try {
					await authClient.getSession();
				} catch (error) {
					console.error("Error refreshing session after callback:", error);
				}
			}
		};

		// Check for initial URL (when app is opened from a deep link)
		const checkInitialURL = async () => {
			try {
				const initialURL = await Linking.getInitialURL();
				if (initialURL) {
					console.log("Initial URL received:", initialURL);
					await handleURL(initialURL);
				}
			} catch (error) {
				console.error("Error getting initial URL:", error);
			}
		};

		// Check for URL when app comes back to foreground (critical for Android)
		// Chrome blocks automatic redirects, so we need to check when app becomes active
		const handleAppStateChange = async (nextAppState: AppStateStatus) => {
			if (nextAppState === "active") {
				console.log("App became active, checking for deep link...");
				// Re-check for initial URL when app comes to foreground
				// This handles the case where Chrome redirects to the app
				await checkInitialURL();
				
				// Also try to refresh session in case OAuth completed
				// The server might have set cookies even if redirect was blocked
				try {
					console.log("Refreshing session after app became active...");
					await authClient.getSession();
				} catch (error) {
					console.error("Error refreshing session:", error);
				}
			}
		};

		// Initial check
		checkInitialURL();

		// Listen for app state changes (when app comes back from background)
		const appStateSubscription = AppState.addEventListener(
			"change",
			handleAppStateChange,
		);

		// Listen for deep links while app is running
		const linkingSubscription = Linking.addEventListener("url", async (event) => {
			console.log("Deep link received while running:", event.url);
			await handleURL(event.url);
		});

		return () => {
			appStateSubscription.remove();
			linkingSubscription.remove();
		};
	}, []);

	if (!isInitialized) {
		return <AppLoadingSkeleton />;
	}

	return (
		<ErrorBoundary FallbackComponent={ErrorFallback}>
			<QueryClientProvider client={queryClient}>
				{isPending ? (
					<AppLoadingSkeleton />
				) : (
					<Stack
						screenOptions={{
							headerShown: false,
							contentStyle: { backgroundColor: "#000" },
						}}
					>
						<Stack.Screen name="(tabs)" />
						<Stack.Screen name="sign-in" options={{ animation: "none" }} />
						<Stack.Screen name="show-detail/[id]" />
					</Stack>
				)}
			</QueryClientProvider>
		</ErrorBoundary>
	);
}

const layoutStyles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
		padding: 20,
	},
	skeletonContent: {
		alignItems: "center",
	},
	skeletonLogo: {
		width: 80,
		height: 80,
		borderRadius: 16,
		backgroundColor: "#1a1a1a",
		marginBottom: 16,
	},
	skeletonText: {
		width: 120,
		height: 16,
		borderRadius: 4,
		backgroundColor: "#1a1a1a",
	},
});
