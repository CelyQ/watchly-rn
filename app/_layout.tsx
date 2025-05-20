import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

const queryClient = new QueryClient();

export default function RootLayoutNav() {
	return (
		<ClerkProvider tokenCache={tokenCache}>
			<QueryClientProvider client={queryClient}>
				<SignedIn>
					<Stack
						screenOptions={{
							headerShown: false,
							contentStyle: { backgroundColor: "#000" },
							// animation: 'none'
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
	);
}
