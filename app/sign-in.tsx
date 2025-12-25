import { BebasNeue_400Regular, useFonts } from "@expo-google-fonts/bebas-neue";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
	Alert,
	Animated,
	Image,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";

// Loading skeleton component
const SignInSkeleton = ({ topInset }: { topInset: number }) => {
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
		<>
			<Animated.View
				style={[styles.skeletonBrandName, { opacity, top: topInset + 16 }]}
			/>
			<View style={styles.content}>
				<Animated.View style={[styles.skeletonTitle, { opacity }]} />
				<Animated.View style={[styles.skeletonSubtitle, { opacity }]} />
				<Animated.View style={[styles.skeletonButton, { opacity }]} />
				<Animated.View style={[styles.skeletonButton, { opacity }]} />
			</View>
		</>
	);
};

export default function Page() {
	const { data: session, isPending } = authClient.useSession();
	const [isLoading, setIsLoading] = useState(false);
	const insets = useSafeAreaInsets();
	const [fontsLoaded] = useFonts({
		BebasNeue_400Regular,
	});

	if (isPending || !fontsLoaded) {
		return (
			<View style={styles.container}>
				<SignInSkeleton topInset={insets.top} />
			</View>
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
		<View style={styles.container}>
			<Text style={[styles.brandName, { top: insets.top + 16 }]}>Watchly</Text>
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
		</View>
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
		padding: 24,
	},
	brandName: {
		position: "absolute",
		alignSelf: "center",
		fontSize: 48,
		fontFamily: "BebasNeue_400Regular",
		color: "#a855f7",
		letterSpacing: 4,
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
	// Skeleton styles
	skeletonBrandName: {
		position: "absolute",
		alignSelf: "center",
		width: 200,
		height: 56,
		backgroundColor: "#222",
		borderRadius: 8,
	},
	skeletonTitle: {
		width: 150,
		height: 32,
		backgroundColor: "#222",
		borderRadius: 8,
		marginBottom: 8,
	},
	skeletonSubtitle: {
		width: 180,
		height: 18,
		backgroundColor: "#1a1a1a",
		borderRadius: 4,
		marginBottom: 32,
	},
	skeletonButton: {
		width: "100%",
		height: 52,
		backgroundColor: "#1a1a1a",
		borderRadius: 4,
		marginBottom: 16,
	},
});
