import { authClient } from "@/lib/auth-client";
import { LogOut } from "lucide-react-native";
import { Text, TouchableOpacity, StyleSheet } from "react-native";

export const SignOutButton = () => {
	const handleSignOut = async () => {
		try {
			await authClient.signOut();
		} catch (err) {
			console.error("Sign out error:", JSON.stringify(err, null, 2));
		}
	};

	return (
		<TouchableOpacity onPress={handleSignOut} style={styles.button}>
			<Text style={styles.text}>Sign out</Text>
			<LogOut size={24} color="#fff" />
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	button: {
		padding: 16,
		borderRadius: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	text: {
		color: "#fff",
	},
});
