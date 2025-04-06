import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Text, View, TextInput, Button } from 'react-native';
import React, { useState } from 'react';

export default function Page() {
	const router = useRouter();
	const { signIn, isLoaded: signInLoaded } = useSignIn();
	const { signUp, isLoaded: signUpLoaded } = useSignUp();

	const [email, setEmail] = useState('');
	const [code, setCode] = useState('');
	const [pendingVerification, setPendingVerification] = useState(false);
	const [isSignUpFlow, setIsSignUpFlow] = useState(false);

	// Send code for either sign-in or sign-up
	const onSendCode = async () => {
		if (!signInLoaded || !signUpLoaded) return;

		try {
			await signIn.create({
				strategy: 'email_code',
				identifier: email
			});
			setIsSignUpFlow(false); // It's a sign-in flow
			setPendingVerification(true);
			console.log('Sign-in code sent');
		} catch (err: any) {
			const errorCode = err?.errors?.[0]?.code;
			if (errorCode === 'form_identifier_not_found') {
				// Fallback to sign-up
				try {
					await signUp.create({
						emailAddress: email
					});
					await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
					setIsSignUpFlow(true); // It's a sign-up flow
					setPendingVerification(true);
					console.log('Sign-up code sent');
				} catch (e) {
					console.error('Sign-up error:', JSON.stringify(e, null, 2));
				}
			} else {
				console.error('Unexpected error:', JSON.stringify(err, null, 2));
			}
		}
	};

	// Verify the code
	const onVerifyCode = async () => {
		if (!signInLoaded || !signUpLoaded) return;
		if (isSignUpFlow) {
			try {
				const result = await signUp.attemptEmailAddressVerification({ code });
				if (result.status === 'complete') {
					await signIn.create({
						identifier: email,
						strategy: 'email_code'
					});
					console.log('Sign-up and sign-in complete');
					router.replace('/');
				}
			} catch (err) {
				console.error('Verification error (sign-up):', JSON.stringify(err, null, 2));
			}
		} else {
			try {
				const result = await signIn.attemptFirstFactor({
					strategy: 'email_code',
					code
				});
				if (result.status === 'complete') {
					console.log('Sign-in complete');
					router.replace('/');
				}
			} catch (err) {
				console.error('Verification error (sign-in):', JSON.stringify(err, null, 2));
			}
		}
	};

	return (
		<View style={{ padding: 16 }}>
			<Text style={{ fontSize: 24, marginBottom: 12 }}>Welcome</Text>

			<TextInput
				value={email}
				onChangeText={setEmail}
				placeholder="Enter your email"
				autoCapitalize="none"
				keyboardType="email-address"
				style={{
					borderWidth: 1,
					borderColor: '#ccc',
					padding: 10,
					marginBottom: 12,
					borderRadius: 8
				}}
			/>

			{pendingVerification ? (
				<>
					<TextInput
						value={code}
						onChangeText={setCode}
						placeholder="Enter verification code"
						keyboardType="number-pad"
						style={{
							borderWidth: 1,
							borderColor: '#ccc',
							padding: 10,
							marginBottom: 12,
							borderRadius: 8
						}}
					/>
					<Button title="Verify Code" onPress={onVerifyCode} />
				</>
			) : (
				<Button title="Send Code" onPress={onSendCode} />
			)}
		</View>
	);
}
