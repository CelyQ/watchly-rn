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
	TextInput,
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
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [name, setName] = useState("");
	const [isSignUp, setIsSignUp] = useState(false);
	const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const insets = useSafeAreaInsets();
	const [fontsLoaded] = useFonts({
		BebasNeue_400Regular,
	});

	// Check if email/password sign-in should be shown (Android dev only)
	const showEmailPassword = Platform.OS === "android" && __DEV__;

	// Cleanup polling on unmount - must be before any early returns
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
				pollIntervalRef.current = null;
			}
		};
	}, []);

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

			// On Android, use local IP instead of localhost
			let baseURL = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;

			if (!baseURL) {
				Alert.alert(
					"Configuration Error",
					"EXPO_PUBLIC_BETTER_AUTH_URL is not set. Please configure it in your .env file.",
				);
				setIsLoading(false);
				return;
			}

			// On Android, replace localhost with actual IP address
			// This is needed because Android can't access localhost from the device
			// and adb reverse causes OAuth redirect issues
			if (Platform.OS === "android" && baseURL.includes("localhost")) {
				try {
					const { getIpAddressAsync } = await import("expo-network");
					const ipAddress = await getIpAddressAsync();
					if (ipAddress) {
						baseURL = baseURL.replace("localhost", ipAddress);
						console.log(`Android: Using IP ${ipAddress} instead of localhost`);
						console.log(`Updated Base URL: ${baseURL}`);

						// Create a temporary auth client with the correct IP for OAuth
						const { createAuthClient } = await import("better-auth/react");
						const { expoClient } = await import("@better-auth/expo/client");
						const SecureStoreModule = await import("expo-secure-store");

						const tempAuthClient = createAuthClient({
							baseURL,
							plugins: [
								expoClient({
									scheme: "watchly-rn",
									storagePrefix: "watchly-rn",
									storage: SecureStoreModule.default,
								}),
							],
						});

						// Use the temp client for this sign-in
						const callbackURL = "watchly-rn://";
						const result = await tempAuthClient.signIn.social({
							provider,
							callbackURL,
						});

						console.log("Sign-in result:", JSON.stringify(result, null, 2));

						// Handle result (same as below)
						if (result?.data?.url) {
							console.log("Redirect URL received:", result.data.url);
						}

						if (result?.error) {
							console.error("Sign-in error:", result.error);
							Alert.alert(
								"Sign In Error",
								`Error: ${result.error.message || "Unknown error"}`,
							);
						}

						setIsLoading(false);
						return;
					}
				} catch (error) {
					console.warn("Could not get local IP, using localhost:", error);
				}
			}

			console.log("Starting social sign-in with provider:", provider);
			console.log("Base URL:", baseURL);

			// Use consistent callback URL for both platforms
			// Make sure this URL is registered on your Better Auth server
			const callbackURL = "watchly-rn://";

			console.log("Callback URL:", callbackURL);

			const result = await authClient.signIn.social({
				provider,
				callbackURL,
			});

			console.log("Sign-in result:", JSON.stringify(result, null, 2));

			// Check if we got a redirect URL that we need to handle manually
			if (result?.data?.url) {
				console.log("Redirect URL received:", result.data.url);
				// The expo client should handle this, but log it for debugging
			}

			// On Android, Chrome blocks custom scheme redirects
			// Poll for session after browser opens (even if no error)
			if (Platform.OS === "android") {
				console.log(
					"Android detected - starting session polling after browser opens...",
				);

				// Clear any existing poll
				if (pollIntervalRef.current) {
					clearInterval(pollIntervalRef.current);
				}

				let pollCount = 0;
				const maxPolls = 30; // Poll for 15 seconds (30 * 500ms)

				pollIntervalRef.current = setInterval(async () => {
					pollCount++;
					console.log(
						`Polling for session (attempt ${pollCount}/${maxPolls})...`,
					);

					try {
						const sessionResult = await authClient.getSession();
						if (sessionResult?.data?.user) {
							console.log("Session found! Authentication successful.");
							if (pollIntervalRef.current) {
								clearInterval(pollIntervalRef.current);
								pollIntervalRef.current = null;
							}
							setIsLoading(false);
							// Session will be detected by useSession hook, which will redirect
							return;
						}
					} catch (error) {
						console.error("Error polling session:", error);
					}

					if (pollCount >= maxPolls) {
						console.log("Polling timeout - authentication may have failed");
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current);
							pollIntervalRef.current = null;
						}
						setIsLoading(false);
						Alert.alert(
							"Authentication Timeout",
							"Please switch back to the app manually and try again. Chrome may have blocked the redirect.",
						);
					}
				}, 500); // Poll every 500ms
			}

			// If there's an error, log detailed information
			if (result?.error) {
				console.error("Sign-in error details:", {
					status: result.error.status,
					statusText: result.error.statusText,
					message: result.error.message,
					code: result.error.code,
					fullError: result.error,
				});

				// Show user-friendly error
				if (result.error.status === 500) {
					Alert.alert(
						"Server Error",
						"The authentication server encountered an error. Please check the server logs for details.",
					);
					setIsLoading(false);
					if (pollIntervalRef.current) {
						clearInterval(pollIntervalRef.current);
						pollIntervalRef.current = null;
					}
				}
			}
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
			setIsLoading(false);
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
				pollIntervalRef.current = null;
			}
		}
	};

	const handleEmailPasswordSignIn = async () => {
		if (!email.trim() || !password.trim()) {
			Alert.alert("Validation Error", "Please enter both email and password.");
			return;
		}

		try {
			setIsLoading(true);

			const result = await authClient.signIn.email({
				email: email.trim(),
				password,
			});

			if (result?.error) {
				console.error("Email sign-in error:", result.error);
				Alert.alert(
					"Sign In Error",
					result.error.message || "Invalid email or password",
				);
				setIsLoading(false);
			} else if (result?.data) {
				console.log("Email sign-in successful");
				// Session will be detected by useSession hook, which will redirect
			}
		} catch (err) {
			console.error("Email sign-in error:", err);
			const errorMessage =
				err instanceof Error ? err.message : JSON.stringify(err);
			Alert.alert(
				"Sign In Error",
				`There was a problem signing in: ${errorMessage}`,
			);
			setIsLoading(false);
		}
	};

	const handleEmailPasswordSignUp = async () => {
		if (
			!email.trim() ||
			!password.trim() ||
			!name.trim() ||
			!confirmPassword.trim()
		) {
			Alert.alert(
				"Validation Error",
				"Please enter name, email, password, and confirm password.",
			);
			return;
		}

		if (password.length < 8) {
			Alert.alert(
				"Validation Error",
				"Password must be at least 8 characters long.",
			);
			return;
		}

		if (password !== confirmPassword) {
			Alert.alert(
				"Validation Error",
				"Passwords do not match. Please try again.",
			);
			return;
		}

		try {
			setIsLoading(true);

			const result = await authClient.signUp.email({
				email: email.trim(),
				name: name.trim(),
				password,
			});

			if (result?.error) {
				console.error("Email sign-up error:", result.error);
				Alert.alert(
					"Sign Up Error",
					result.error.message || "Failed to create account",
				);
				setIsLoading(false);
			} else if (result?.data) {
				console.log("Email sign-up successful");
				// Session will be detected by useSession hook, which will redirect
			}
		} catch (err) {
			console.error("Email sign-up error:", err);
			const errorMessage =
				err instanceof Error ? err.message : JSON.stringify(err);
			Alert.alert(
				"Sign Up Error",
				`There was a problem signing up: ${errorMessage}`,
			);
			setIsLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.brandName, { top: insets.top + 16 }]}>Watchly</Text>
			<View style={styles.content}>
				<Text style={styles.title}>Welcome</Text>
				<Text style={styles.subtitle}>
					{showEmailPassword
						? isSignUp
							? "Create an account"
							: "Sign in to continue"
						: "Sign in to continue"}
				</Text>
				{!showEmailPassword && (
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
				)}
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
				{showEmailPassword && (
					<>
						{isSignUp && (
							<TextInput
								style={styles.input}
								placeholder="Name"
								placeholderTextColor="#666"
								value={name}
								onChangeText={setName}
								autoCapitalize="words"
								autoComplete="name"
								editable={!isLoading}
							/>
						)}
						<TextInput
							style={styles.input}
							placeholder="Email"
							placeholderTextColor="#666"
							value={email}
							onChangeText={setEmail}
							autoCapitalize="none"
							autoComplete="email"
							keyboardType="email-address"
							editable={!isLoading}
						/>
						<TextInput
							style={styles.input}
							placeholder="Password"
							placeholderTextColor="#666"
							value={password}
							onChangeText={setPassword}
							secureTextEntry={true}
							autoCapitalize="none"
							autoComplete="password"
							editable={!isLoading}
						/>
						{isSignUp && (
							<TextInput
								style={styles.input}
								placeholder="Confirm Password"
								placeholderTextColor="#666"
								value={confirmPassword}
								onChangeText={setConfirmPassword}
								secureTextEntry={true}
								autoCapitalize="none"
								autoComplete="password"
								editable={!isLoading}
							/>
						)}
						<TouchableOpacity
							style={[
								styles.button,
								styles.emailButton,
								isLoading && styles.buttonDisabled,
							]}
							onPress={
								isSignUp ? handleEmailPasswordSignUp : handleEmailPasswordSignIn
							}
							disabled={isLoading}
						>
							<Text style={styles.buttonText}>
								{isSignUp ? "Sign Up" : "Sign In with Email"}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.toggleButton}
							onPress={() => {
								setIsSignUp(!isSignUp);
								setConfirmPassword("");
							}}
							disabled={isLoading}
						>
							<Text style={styles.toggleButtonText}>
								{isSignUp
									? "Already have an account? Sign in"
									: "Don't have an account? Sign up"}
							</Text>
						</TouchableOpacity>
					</>
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
	// Email/Password form styles
	input: {
		width: "100%",
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 4,
		backgroundColor: "#1a1a1a",
		color: "#fff",
		fontSize: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#333",
	},
	emailButton: {
		backgroundColor: "#a855f7",
		marginTop: 8,
	},
	toggleButton: {
		marginTop: 16,
		paddingVertical: 12,
		alignItems: "center",
	},
	toggleButtonText: {
		color: "#a855f7",
		fontSize: 14,
		fontWeight: "500",
	},
});
