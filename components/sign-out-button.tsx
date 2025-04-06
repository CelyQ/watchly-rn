import { useClerk } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import { LogOut } from 'lucide-react-native';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

export const SignOutButton = () => {
	// Use `useClerk()` to access the `signOut()` function
	const { signOut } = useClerk();

	const handleSignOut = async () => {
		try {
			await signOut();
			// Redirect to your desired page
			Linking.openURL(Linking.createURL('/'));
		} catch (err) {
			// See https://clerk.com/docs/custom-flows/error-handling
			// for more info on error handling
			console.error(JSON.stringify(err, null, 2));
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
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	text: {
		color: '#fff'
	}
});
