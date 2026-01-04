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
import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
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

	// Helper function to close browser
	const closeBrowser = async () => {
		try {
			await WebBrowser.dismissBrowser();
		} catch {
			// Browser might already be closed, ignore error
		}
		// Clear the browser reference
		browserRef.current = null;
	};

	// Handle subscription success - extracted so it can be called from multiple places
	const handleSuccess = async () => {
		try {
			// Prevent processing redirect multiple times
			if (hasProcessedRedirect.current) {
				return;
			}

			// Mark as processed to prevent re-processing
			hasProcessedRedirect.current = true;

			// Browser should already be closed, but ensure it's closed
			// Don't block on this - close in background
			closeBrowser().catch(() => {
				// Ignore errors
			});

			// Poll for subscription status with retries
			// Subscription might not be active immediately due to webhook processing
			let retries = 0;
			const maxRetries = 20; // Try for up to 10 seconds (20 * 500ms)
			const checkInterval = 500; // Check every 500ms

			const checkSubscription = async (): Promise<boolean> => {
				try {
					const { data: subscriptions } = await authClient.subscription.list();

					const activeSubscription = subscriptions?.find(
						(sub) => sub.status === "active" || sub.status === "trialing",
					);

					if (activeSubscription) {
						router.replace("/");
						return true;
					}
					return false;
				} catch {
					return false;
				}
			};

			// Navigate immediately - the tabs layout will check subscription on focus
			// and redirect back to paywall if not ready, but this gives it a chance to update
			router.replace("/");

			// Also check subscription in the background and navigate again if needed
			// This handles the case where subscription becomes active after navigation
			const found = await checkSubscription();
			if (found) {
				return;
			}

			// If not found, poll with retries in background
			const pollSubscription = async () => {
				retries++;

				const found = await checkSubscription();
				if (found) {
					return;
				}

				if (retries < maxRetries) {
					setTimeout(pollSubscription, checkInterval);
				}
			};

			// Start polling in background
			setTimeout(pollSubscription, checkInterval);
		} catch {
			// Still try to navigate
			try {
				router.replace("/");
			} catch {
				// Ignore navigation errors
			}
		}
	};

	const handleCancel = async () => {
		// Mark as processed to prevent re-processing
		hasProcessedRedirect.current = true;

		// User canceled - close browser and silently return
		await closeBrowser();
	};

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
				Alert.alert("Error", error.message || "Failed to create subscription");
			},
			onSuccess: async (data) => {
				// Don't open browser if we're already processing a redirect
				if (hasProcessedRedirect.current) {
					return;
				}

				// Don't open browser if we already have success/cancel params
				if (params.success === "true" || params.canceled === "true") {
					return;
				}

				// Extract the checkout URL from the response
				// The response is a Stripe checkout session object with a url field
				const checkoutUrl = (data as { url?: string })?.url;

				if (checkoutUrl && typeof checkoutUrl === "string") {
					// Use openAuthSessionAsync for proper deep link handling
					// This method is designed to handle redirects to custom URL schemes
					// It properly handles the redirect from Stripe back to our app
					try {
						const result = await WebBrowser.openAuthSessionAsync(
							checkoutUrl,
							"watchly-rn://",
						);

						// Handle the redirect result directly
						if (result.type === "success" && result.url) {
							// Directly trigger the success handler when we get the success URL
							if (result.url.includes("success=true")) {
								void handleSuccess();
							} else if (result.url.includes("canceled=true")) {
								void handleCancel();
							}
						}
					} catch {
						Alert.alert(
							"Error",
							"Failed to open checkout page. Please try again.",
						);
					}
				} else {
					Alert.alert("Error", "Checkout URL not found. Please try again.");
				}
			},
		});

	// Check for active subscription and redirect away from paywall if found
	// This handles the case where subscription becomes active and user is still on paywall
	const checkAndRedirect = async () => {
		try {
			const { data: subscriptions } = await authClient.subscription.list();
			const activeSubscription = subscriptions?.find(
				(sub) => sub.status === "active" || sub.status === "trialing",
			);
			if (activeSubscription) {
				router.replace("/");
			}
		} catch {
			// Ignore errors
		}
	};

	useEffect(() => {
		// Check on mount
		void checkAndRedirect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Also check when component gains focus (e.g., after returning from browser)
	useFocusEffect(() => {
		void checkAndRedirect();
	});

	// Handle redirect from Stripe Checkout via URL params
	useEffect(() => {
		if (params.success === "true") {
			void handleSuccess();
		} else if (params.canceled === "true") {
			void handleCancel();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.success, params.canceled]);

	// Close browser IMMEDIATELY when component gains focus with redirect params
	// This must happen BEFORE any other processing to prevent browser from reopening
	useFocusEffect(() => {
		// If we have redirect params, close browser immediately
		if (params.success === "true" || params.canceled === "true") {
			// Don't mark as processed here - let the useEffect handle it
			// This ensures the useEffect can still process the redirect

			// Close browser immediately
			WebBrowser.dismissBrowser().catch(() => {
				// Ignore errors - browser might already be closed
			});
		}
	});

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
		} catch {
			// Ignore sign out errors
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
