import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignOutButton } from "@/components/sign-out-button";
import { authClient } from "@/lib/auth-client";

export default function User() {
	const { data: session } = authClient.useSession();
	const [activeSubscription, setActiveSubscription] = useState<any>(null);
	const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

	useEffect(() => {
		const fetchSubscription = async () => {
			if (!session?.user?.id) {
				setIsLoadingSubscription(false);
				return;
			}

			try {
				const { data: subscriptions, error } = await authClient.subscription.list({
					query: {
						referenceId: session.user.id,
					},
				});

				if (error) {
					console.error("Error fetching subscriptions:", error);
					setIsLoadingSubscription(false);
					return;
				}

				// Get the active subscription
				const active = subscriptions?.find(
					(sub) => sub.status === "active" || sub.status === "trialing",
				);

				setActiveSubscription(active || null);
			} catch (err) {
				console.error("Error fetching subscription:", err);
			} finally {
				setIsLoadingSubscription(false);
			}
		};

		fetchSubscription();
	}, [session?.user?.id]);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.text}>Hello {session?.user?.email}</Text>
				
				{isLoadingSubscription ? (
					<Text style={styles.subscriptionText}>Loading subscription...</Text>
				) : activeSubscription ? (
					<View style={styles.subscriptionContainer}>
						<Text style={styles.subscriptionLabel}>Current Subscription</Text>
						<Text style={styles.subscriptionStatus}>
							Status: {activeSubscription.status}
						</Text>
						{activeSubscription.planId && (
							<Text style={styles.subscriptionPlan}>
								Plan: {activeSubscription.planId}
							</Text>
						)}
					</View>
				) : (
					<Text style={styles.subscriptionText}>No active subscription</Text>
				)}

				<SignOutButton />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
		justifyContent: "center",
		alignItems: "center",
	},
	content: {
		alignItems: "center",
		padding: 24,
		gap: 16,
	},
	text: {
		color: "#fff",
		fontSize: 18,
	},
	subscriptionContainer: {
		backgroundColor: "#1a1a1a",
		padding: 16,
		borderRadius: 8,
		width: "100%",
		maxWidth: 400,
		marginTop: 8,
	},
	subscriptionLabel: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 8,
	},
	subscriptionStatus: {
		color: "#b14aed",
		fontSize: 14,
		marginBottom: 4,
		textTransform: "capitalize",
	},
	subscriptionPlan: {
		color: "#888",
		fontSize: 14,
	},
	subscriptionText: {
		color: "#666",
		fontSize: 14,
	},
});
