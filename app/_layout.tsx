import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Slot } from 'expo-router';

export default function RootLayoutNav() {
	return (
		<ClerkProvider tokenCache={tokenCache}>
			<Slot />
		</ClerkProvider>
	);
}
