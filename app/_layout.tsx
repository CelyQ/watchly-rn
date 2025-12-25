import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Animated, StyleSheet, Text, View } from "react-native";
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
		return <AppLoadingSkeleton />;
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
