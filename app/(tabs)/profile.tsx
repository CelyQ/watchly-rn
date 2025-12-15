import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignOutButton } from "@/components/sign-out-button";
import { authClient } from "@/lib/auth-client";

export default function User() {
	const { data: session } = authClient.useSession();

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.text}>Hello {session?.user?.email}</Text>
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
	},
	text: {
		color: "#fff",
	},
});
