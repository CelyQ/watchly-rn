/**
 * Paywall component for subscription management
 *
 * This component creates Stripe subscriptions using better-auth's subscription.upgrade() method.
 * The method creates a Stripe Checkout session and redirects the user to complete payment.
 *
 * Subscription flow:
 * 1. User selects a plan (monthly/yearly)
 * 2. authClient.subscription.upgrade() creates a subscription and checkout session
 * 3. User is redirected to Stripe Checkout to complete payment
 * 4. On successful payment, user is redirected back to the app
 * 5. Subscription status becomes 'active' (via webhook)
 * 6. Subscription continues to bill automatically based on the plan interval
 */

import { useMutation } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { LogOut } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";

const MONTHLY_PRICE = 2.5;
const YEARLY_PRICE = 25;
const MONTHLY_YEARLY_COST = MONTHLY_PRICE * 12; // $30
const YEARLY_DISCOUNT = MONTHLY_YEARLY_COST - YEARLY_PRICE; // $5
const YEARLY_DISCOUNT_PERCENT = Math.round(
	(YEARLY_DISCOUNT / MONTHLY_YEARLY_COST) * 100,
); // 17%

type SubscriptionPlan = "monthly" | "yearly";

interface SubscriptionUpgradeParams {
	plan: string; // Plan name from backend config (e.g., "Base")
	annual: boolean;
	successUrl: string;
	cancelUrl: string;
	disableRedirect: boolean;
}

export default function Paywall() {
	const router = useRouter();
	const params = useLocalSearchParams<{
		success?: string;
		canceled?: string;
	}>();
	const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("yearly");
	const browserRef = useRef<WebBrowser.WebBrowserAuthSessionResult | null>(
		null,
	);
	const hasProcessedRedirect = useRef(false);

	// Helper function to close browser aggressively (especially for Android)
	const closeBrowser = useCallback(async () => {
		try {
			await WebBrowser.dismissBrowser();
			// On Android, sometimes we need to try multiple times
			if (Platform.OS === "android") {
				// Give it a moment and try again
				await new Promise((resolve) => setTimeout(resolve, 100));
				try {
					await WebBrowser.dismissBrowser();
				} catch {
					// Ignore second attempt errors
				}
			}
		} catch (error) {
			// Browser might already be closed, ignore error
			console.log("Browser already closed or error dismissing:", error);
		}
		// Clear the browser reference
		browserRef.current = null;
	}, []);

	// React Query mutation for subscription upgrade
	const { mutateAsync: upgradeSubscription, isPending: isUpgrading } =
		useMutation({
			mutationFn: async (params: SubscriptionUpgradeParams) => {
				const { data, error } = await authClient.subscription.upgrade({
					plan: "Base", // Plan name from backend config
					annual: params.annual,
					successUrl: params.successUrl,
					cancelUrl: params.cancelUrl,
					disableRedirect: params.disableRedirect,
				});

				if (error) {
					throw new Error(error.message || "Failed to create subscription");
				}

				return data;
			},
			onError: (error: Error) => {
				console.error("Subscription upgrade error:", error);
				Alert.alert("Error", error.message || "Failed to create subscription");
			},
			onSuccess: async (data) => {
				// Don't open browser if we're already processing a redirect
				if (hasProcessedRedirect.current) {
					console.log("Already processed redirect, skipping browser open");
					return;
				}

				// Don't open browser if we already have success/cancel params
				// This prevents reopening on Android when deep link redirects
				if (params.success === "true" || params.canceled === "true") {
					console.log("Redirect params already present, skipping browser open");
					return;
				}

				// Extract the checkout URL from the response
				// The response is a Stripe checkout session object with a url field
				const checkoutUrl = (data as { url?: string })?.url;

				if (checkoutUrl && typeof checkoutUrl === "string") {
					console.log("Opening Stripe Checkout:", checkoutUrl);
					// Open the Stripe Checkout URL in the browser
					// The deep link will redirect back to the app after payment
					try {
						browserRef.current = await WebBrowser.openBrowserAsync(
							checkoutUrl,
							{
								showInRecents: true,
							},
						);
					} catch (error) {
						console.error("Error opening checkout URL:", error);
						Alert.alert(
							"Error",
							"Failed to open checkout page. Please try again.",
						);
					}
				} else {
					console.error("No checkout URL found in response:", data);
					Alert.alert("Error", "Checkout URL not found. Please try again.");
				}
			},
		});

	// Handle redirect from Stripe Checkout
	useEffect(() => {
		// Prevent processing redirect multiple times
		if (hasProcessedRedirect.current) {
			return;
		}

		const handleSuccess = async () => {
			// Mark as processed to prevent re-processing
			// Note: useFocusEffect might have already set this, but that's fine
			hasProcessedRedirect.current = true;

			// Browser should already be closed by useFocusEffect, but ensure it's closed
			await closeBrowser();

			// On Android, add a longer delay to ensure browser is fully closed
			// and app has fully loaded before processing the redirect
			if (Platform.OS === "android") {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			// Refetch subscription list to update state
			try {
				const { data: subscriptions } = await authClient.subscription.list();
				console.log("Refetched subscriptions after success:", subscriptions);

				const activeSubscription = subscriptions?.find(
					(sub) => sub.status === "active" || sub.status === "trialing",
				);

				if (activeSubscription) {
					// Subscription is active, redirect to home
					// The tabs layout will handle the redirect automatically
					router.replace("/");
				} else {
					// Show success message but subscription might still be processing
					Alert.alert(
						"Success",
						"Your subscription has been created! You'll receive access once payment is confirmed.",
						[
							{
								text: "OK",
								onPress: () => {
									router.replace("/");
								},
							},
						],
					);
				}
			} catch (error) {
				console.error("Error refetching subscriptions:", error);
				// Still redirect even if refetch fails
				Alert.alert(
					"Success",
					"Your subscription has been created! You'll receive access once payment is confirmed.",
					[
						{
							text: "OK",
							onPress: () => {
								router.replace("/");
							},
						},
					],
				);
			}
		};

		const handleCancel = async () => {
			// Mark as processed to prevent re-processing
			hasProcessedRedirect.current = true;

			// User canceled - close browser and silently return
			console.log("Subscription checkout was canceled");
			await closeBrowser();
		};

		if (params.success === "true") {
			void handleSuccess();
		} else if (params.canceled === "true") {
			void handleCancel();
		}
	}, [params.success, params.canceled, router, closeBrowser]);

	// Close browser IMMEDIATELY when component gains focus with redirect params
	// This must happen BEFORE any other processing to prevent browser from reopening
	useFocusEffect(
		useCallback(() => {
			// If we have redirect params, close browser immediately and synchronously
			if (params.success === "true" || params.canceled === "true") {
				// Mark as processed immediately to prevent any other code from opening browser
				hasProcessedRedirect.current = true;

				// Close browser immediately - don't wait for async operations
				// On Android, this must happen synchronously to prevent browser from reopening
				WebBrowser.dismissBrowser().catch(() => {
					// Ignore errors - browser might already be closed
				});

				// On Android, try multiple times to ensure it's closed
				if (Platform.OS === "android") {
					setTimeout(() => {
						WebBrowser.dismissBrowser().catch(() => {});
					}, 50);
					setTimeout(() => {
						WebBrowser.dismissBrowser().catch(() => {});
					}, 150);
				}
			}
		}, [params.success, params.canceled]),
	);

	const handleSubscribe = async (plan: SubscriptionPlan) => {
		if (isUpgrading) return;

		// Reset the redirect flag when starting a new subscription
		hasProcessedRedirect.current = false;

		setSelectedPlan(plan);

		await upgradeSubscription({
			plan: "Base", // Plan name from backend config
			annual: plan === "yearly",
			successUrl: "watchly-rn://paywall?success=true",
			cancelUrl: "watchly-rn://paywall?canceled=true",
			disableRedirect: false, // Allow redirect to Stripe Checkout
		});
	};

	const handleSignOut = async () => {
		try {
			await authClient.signOut();
		} catch (err) {
			console.error("Sign out error:", JSON.stringify(err, null, 2));
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
				<LogOut size={20} color="#666" />
			</TouchableOpacity>
			<View style={styles.content}>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>Unlock </Text>
					<Text style={[styles.title, styles.titleHighlight]}>Watchly</Text>
				</View>
				<Text style={styles.subtitle}>
					Select your preferred subscription plan
				</Text>

				<View style={styles.plansContainer}>
					{/* Monthly Plan */}
					<TouchableOpacity
						style={[
							styles.planCard,
							selectedPlan === "monthly" && styles.planCardSelected,
							isUpgrading && styles.planCardDisabled,
						]}
						onPress={() => setSelectedPlan("monthly")}
						disabled={isUpgrading}
					>
						{selectedPlan === "monthly" && (
							<View style={styles.selectedIndicator}>
								<Text style={styles.selectedIndicatorText}>✓</Text>
							</View>
						)}
						<View style={styles.planHeader}>
							<Text style={styles.planName}>Monthly</Text>
						</View>
						<View style={styles.priceContainer}>
							<Text style={styles.price}>${MONTHLY_PRICE}</Text>
							<Text style={styles.pricePeriod}>/month</Text>
						</View>
						<View style={styles.planSpacer} />
					</TouchableOpacity>

					{/* Yearly Plan */}
					<TouchableOpacity
						style={[
							styles.planCard,
							selectedPlan === "yearly" && styles.planCardSelected,
							isUpgrading && styles.planCardDisabled,
						]}
						onPress={() => setSelectedPlan("yearly")}
						disabled={isUpgrading}
					>
						<View style={styles.badge}>
							<Text style={styles.badgeText}>
								Save {YEARLY_DISCOUNT_PERCENT}%
							</Text>
						</View>
						{selectedPlan === "yearly" && (
							<View style={styles.selectedIndicator}>
								<Text style={styles.selectedIndicatorText}>✓</Text>
							</View>
						)}
						<View style={styles.planHeader}>
							<Text style={styles.planName}>Yearly</Text>
						</View>
						<View style={styles.priceContainer}>
							<Text style={styles.price}>${YEARLY_PRICE}</Text>
							<Text style={styles.pricePeriod}>/year</Text>
						</View>
						<Text style={styles.yearlySavings}>
							${MONTHLY_PRICE}/month billed annually
						</Text>
						<Text style={styles.discountText}>
							Save ${YEARLY_DISCOUNT} per year
						</Text>
					</TouchableOpacity>
				</View>

				{selectedPlan && (
					<TouchableOpacity
						style={[
							styles.confirmButton,
							isUpgrading && styles.confirmButtonDisabled,
						]}
						onPress={() => handleSubscribe(selectedPlan)}
						disabled={isUpgrading}
					>
						{isUpgrading ? (
							<ActivityIndicator size="small" color="#000" />
						) : (
							<Text style={styles.confirmButtonText}>
								Subscribe to {selectedPlan === "monthly" ? "Monthly" : "Yearly"}{" "}
								Plan
							</Text>
						)}
					</TouchableOpacity>
				)}

				<Text style={styles.trialText}>Includes 14-day free trial</Text>
				<Text style={styles.trialInfoText}>
					No charges until after your trial period
				</Text>
				<Text style={styles.footerText}>
					Secure payment processing via Stripe. Cancel your subscription at any
					time.
				</Text>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	signOutButton: {
		position: "absolute",
		top: 52,
		right: 36,
		zIndex: 10,
		padding: 12,
		borderRadius: 8,
		backgroundColor: "#1a1a1a",
	},
	content: {
		flex: 1,
		padding: 24,
		justifyContent: "center",
		alignItems: "center",
	},
	titleContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#fff",
		textAlign: "center",
	},
	titleHighlight: {
		color: "#b14aed",
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		marginBottom: 8,
		textAlign: "center",
	},
	trialText: {
		fontSize: 14,
		color: "#b14aed",
		fontWeight: "600",
		marginTop: 24,
		marginBottom: 4,
		textAlign: "center",
	},
	trialInfoText: {
		fontSize: 12,
		color: "#888",
		marginBottom: 8,
		textAlign: "center",
	},
	plansContainer: {
		width: "100%",
		maxWidth: 400,
		gap: 16,
	},
	planCard: {
		backgroundColor: "#1a1a1a",
		borderRadius: 12,
		padding: 20,
		borderWidth: 2,
		borderColor: "#333",
		position: "relative",
		minHeight: 140,
	},
	planSpacer: {
		height: 40,
	},
	planCardSelected: {
		borderColor: "#b14aed",
		backgroundColor: "#1a0a2a",
		borderWidth: 3,
	},
	selectedIndicator: {
		position: "absolute",
		top: 12,
		right: 12,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "#b14aed",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 10,
	},
	selectedIndicatorText: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "bold",
	},
	planCardDisabled: {
		opacity: 0.6,
	},
	badge: {
		position: "absolute",
		top: -12,
		right: 20,
		backgroundColor: "#b14aed",
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
	},
	badgeText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
	},
	planHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	planName: {
		fontSize: 20,
		fontWeight: "600",
		color: "#fff",
	},
	priceContainer: {
		flexDirection: "row",
		alignItems: "baseline",
		marginBottom: 8,
	},
	price: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#fff",
	},
	pricePeriod: {
		fontSize: 16,
		color: "#666",
		marginLeft: 4,
	},
	yearlySavings: {
		fontSize: 14,
		color: "#888",
		marginTop: 4,
	},
	discountText: {
		fontSize: 14,
		color: "#b14aed",
		fontWeight: "600",
		marginTop: 4,
	},
	confirmButton: {
		width: "100%",
		maxWidth: 400,
		backgroundColor: "#b14aed",
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 24,
	},
	confirmButtonDisabled: {
		opacity: 0.6,
	},
	confirmButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	footerText: {
		fontSize: 12,
		color: "#666",
		marginTop: 24,
		textAlign: "center",
	},
});
