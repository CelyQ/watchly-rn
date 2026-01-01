import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { StyleSheet, Text, View } from "react-native";
import { AppLoadingSkeleton } from "@/components/app-loading-skeleton";
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

if (!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
	throw new Error("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
}

export default function RootLayoutNav() {
	const { isPending } = authClient.useSession();
	if (isPending) return <AppLoadingSkeleton />;

	return (
		<StripeProvider
			publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY as string}
			merchantIdentifier="merchant.com.popmann.watchly"
			urlScheme="watchly-rn"
		>
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				<QueryClientProvider client={queryClient}>
					<Suspense fallback={<AppLoadingSkeleton />}>
						<Stack
							screenOptions={{
								headerShown: false,
								contentStyle: { backgroundColor: "#000" },
							}}
						>
							<Stack.Screen name="(tabs)" />
							<Stack.Screen name="sign-in" options={{ animation: "none" }} />
							<Stack.Screen name="paywall" options={{ animation: "none" }} />
							<Stack.Screen name="show-detail/[id]" />
						</Stack>
					</Suspense>
				</QueryClientProvider>
			</ErrorBoundary>
		</StripeProvider>
	);
}

function ErrorFallback({ error }: { error: Error }) {
	return (
		<View style={layoutStyles.container}>
			<Text style={{ color: "#fff", textAlign: "center" }}>
				Something went wrong: {error.message}
			</Text>
		</View>
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
});
