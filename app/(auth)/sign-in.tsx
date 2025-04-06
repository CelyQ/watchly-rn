import React, { useCallback, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSSO } from '@clerk/clerk-expo';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
	Image,
	Platform
} from 'react-native';

export const useWarmUpBrowser = () => {
	useEffect(() => {
		void WebBrowser.warmUpAsync();
		return () => {
			void WebBrowser.coolDownAsync();
		};
	}, []);
};

WebBrowser.maybeCompleteAuthSession();

export default function Page() {
	useWarmUpBrowser();
	const { startSSOFlow } = useSSO();

	const handleSSO = useCallback(
		(strategy: 'oauth_google' | 'oauth_apple') => async () => {
			try {
				const { createdSessionId, setActive } = await startSSOFlow({
					strategy,
					redirectUrl: AuthSession.makeRedirectUri()
				});

				if (createdSessionId) {
					setActive!({ session: createdSessionId });
				}
			} catch (err) {
				console.error(JSON.stringify(err, null, 2));
			}
		},
		[startSSOFlow]
	);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.title}>Welcome</Text>
				<Text style={styles.subtitle}>Sign in to continue</Text>
				<TouchableOpacity style={styles.button} onPress={handleSSO('oauth_google')}>
					<Text style={styles.buttonText}>Continue with Google</Text>
					<Image source={require('@/assets/social/google.png')} style={styles.buttonIcon} />
				</TouchableOpacity>
				{Platform.OS === 'ios' && (
					<TouchableOpacity style={styles.button} onPress={handleSSO('oauth_apple')}>
						<Text style={styles.buttonText}>Continue with Apple</Text>
						<Image
							source={require('@/assets/social/apple.png')}
							style={[styles.buttonIcon, styles.buttonIconApple]}
						/>
					</TouchableOpacity>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
		justifyContent: 'center'
	},
	content: {
		alignItems: 'center',
		// backgroundColor: 'rgba(17, 17, 17, 0.4)',
		padding: 24
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 8,
		color: '#fff'
	},
	subtitle: {
		fontSize: 16,
		color: '#666',
		marginBottom: 32
	},
	button: {
		width: '100%',
		paddingVertical: 14,
		borderRadius: 4,
		alignItems: 'center',
		marginBottom: 16,
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 8,
		backgroundColor: '#fff'
	},
	buttonText: {
		color: '#000',
		fontSize: 16,
		fontWeight: '600'
	},
	buttonIcon: {
		width: 24,
		height: 24
	},
	buttonIconApple: {
		transform: [{ translateY: -2 }]
	}
});
