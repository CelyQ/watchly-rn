import React from 'react';
import { SafeAreaView, Text, StyleSheet, ScrollView } from 'react-native';

export default function Page() {
	return (
		<SafeAreaView style={styles.container}>
			<ScrollView
				style={styles.content}
				contentContainerStyle={styles.contentContainer}
				showsVerticalScrollIndicator={false}
			>
				<Text style={styles.text}>Hello</Text>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
		justifyContent: 'center',
		alignItems: 'center'
	},
	content: {
		padding: 24
	},
	contentContainer: {
		alignItems: 'center'
	},
	text: {
		color: '#fff'
	}
});
