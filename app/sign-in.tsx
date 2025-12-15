import { Redirect } from "expo-router";
import React, { useState } from "react";
import {
	Alert,
	Image,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";

export default function Page() {
	const { data: session, isPending } = authClient.useSession();
	const [isLoading, setIsLoading] = useState(false);

	if (isPending) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.content}>
					<Text style={styles.title}>Loading...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (session?.user) {
		return <Redirect href="/" />;
	}

	const handleSocialSignIn = async (provider: "google" | "apple") => {
		try {
			setIsLoading(true);
			const baseURL = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;

			if (!baseURL) {
				Alert.alert(
					"Configuration Error",
					"EXPO_PUBLIC_BETTER_AUTH_URL is not set. Please configure it in your .env file.",
				);
				setIsLoading(false);
				return;
			}

			console.log("Starting social sign-in with provider:", provider);
			console.log("Base URL:", baseURL);

			const result = await authClient.signIn.social({
				provider,
				callbackURL: "watchly-rn://",
			});

			console.log("Sign-in result:", result);
		} catch (err) {
			console.error("Sign In Error Details:", err);
			console.error(
				"Error stack:",
				err instanceof Error ? err.stack : "No stack",
			);
			const errorMessage =
				err instanceof Error ? err.message : JSON.stringify(err);
			Alert.alert(
				"Sign In Error",
				`There was a problem signing in: ${errorMessage}`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.title}>Welcome</Text>
				<Text style={styles.subtitle}>Sign in to continue</Text>
				<TouchableOpacity
					style={[styles.button, isLoading && styles.buttonDisabled]}
					onPress={() => handleSocialSignIn("google")}
					disabled={isLoading}
				>
					<Text style={styles.buttonText}>Continue with Google</Text>
					<Image
						source={require("@/assets/social/google.png")}
						style={styles.buttonIcon}
					/>
				</TouchableOpacity>
				{Platform.OS === "ios" && (
					<TouchableOpacity
						style={[styles.button, isLoading && styles.buttonDisabled]}
						onPress={() => handleSocialSignIn("apple")}
						disabled={isLoading}
					>
						<Text style={styles.buttonText}>Continue with Apple</Text>
						<Image
							source={require("@/assets/social/apple.png")}
							style={[styles.buttonIcon, styles.buttonIconApple]}
						/>
					</TouchableOpacity>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
		justifyContent: "center",
	},
	content: {
		alignItems: "center",
		// backgroundColor: 'rgba(17, 17, 17, 0.4)',
		padding: 24,
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
		marginBottom: 8,
		color: "#fff",
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		marginBottom: 32,
	},
	button: {
		width: "100%",
		paddingVertical: 14,
		borderRadius: 4,
		alignItems: "center",
		marginBottom: 16,
		flexDirection: "row",
		justifyContent: "center",
		gap: 8,
		backgroundColor: "#fff",
	},
	buttonDisabled: {
		opacity: 0.7,
	},
	buttonText: {
		color: "#000",
		fontSize: 16,
		fontWeight: "600",
	},
	buttonIcon: {
		width: 24,
		height: 24,
	},
	buttonIconApple: {
		transform: [{ translateY: -2 }],
	},
});
