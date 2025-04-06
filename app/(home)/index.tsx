import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo';

import { View } from 'react-native';
import { SignOutButton } from '@/components/sign-out-button';

export default function Page() {
	const { user } = useUser();

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<SignedIn>
					<Text style={styles.text}>Hello {user?.emailAddresses[0].emailAddress}</Text>
					<SignOutButton />
				</SignedIn>
				<SignedOut>
					<Redirect href="/sign-in" />
				</SignedOut>
			</View>
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
		alignItems: 'center',
		padding: 24
	},
	text: {
		color: '#fff'
	}
});
