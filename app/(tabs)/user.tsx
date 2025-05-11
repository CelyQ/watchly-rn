import { SignOutButton } from '@/components/sign-out-button';
import { useUser } from '@clerk/clerk-expo';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function User() {
	const { user } = useUser();

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.text}>Hello {user?.emailAddresses[0].emailAddress}</Text>
				<SignOutButton />
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
