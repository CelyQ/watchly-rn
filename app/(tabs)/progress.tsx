import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Progress() {
	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.text}>Progress</Text>
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
		fontSize: 18,
	},
});
