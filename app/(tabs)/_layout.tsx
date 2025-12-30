import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import { Clock, Heart, Search, User } from "react-native-feather";
import { authClient } from "@/lib/auth-client";

export default function TabLayout() {
	const { data: session, isPending } = authClient.useSession();

	// While checking auth state, show nothing (root layout shows loading)
	if (isPending) {
		return null;
	}

	// If not authenticated, redirect to sign-in
	if (!session?.user) {
		return <Redirect href="/sign-in" />;
	}

	// Use regular Tabs on Android, NativeTabs on iOS
	if (Platform.OS === "android") {
		return (
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: "#b14aed",
					tabBarInactiveTintColor: "#fff",
					tabBarStyle: {
						backgroundColor: "#000",
						borderTopWidth: 0,
					},
					headerShown: false,
				}}
			>
				<Tabs.Screen
					name="index"
					options={{
						title: "Discover",
						tabBarIcon: ({ color, size }) => (
							<Search stroke={color} width={size} height={size} />
						),
					}}
				/>
				<Tabs.Screen
					name="progress"
					options={{
						title: "Progress",
						tabBarIcon: ({ color, size }) => (
							<Clock stroke={color} width={size} height={size} />
						),
					}}
				/>
				<Tabs.Screen
					name="liked"
					options={{
						title: "Liked",
						tabBarIcon: ({ color, size }) => (
							<Heart stroke={color} width={size} height={size} />
						),
					}}
				/>
				<Tabs.Screen
					name="profile"
					options={{
						title: "Profile",
						tabBarIcon: ({ color, size }) => (
							<User stroke={color} width={size} height={size} />
						),
					}}
				/>
			</Tabs>
		);
	}

	// iOS: Use NativeTabs
	return (
		<NativeTabs>
			<NativeTabs.Trigger name="index">
				<Icon sf="safari.fill" drawable="ic_search" selectedColor="#b14aed" />
				<Label>Discover</Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="progress">
				<Icon sf="clock.fill" drawable="ic_clock" selectedColor="#b14aed" />
				<Label>Progress</Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="liked">
				<Icon sf="heart.fill" drawable="ic_favorite" selectedColor="#b14aed" />
				<Label>Liked</Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="profile">
				<Icon sf="person.fill" drawable="ic_person" selectedColor="#b14aed" />
				<Label>Profile</Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	);
}
