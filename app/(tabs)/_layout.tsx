import { useAuth } from "@clerk/clerk-expo";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, Tabs } from "expo-router";

export default function TabLayout() {
	const { isSignedIn } = useAuth();

	if (!isSignedIn) return <Redirect href="/sign-in" />;

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				headerTitleAlign: "left",
				tabBarActiveTintColor: "#fff",
				tabBarStyle: {
					backgroundColor: "#000",
					borderTopColor: "#00FF00",
					borderTopWidth: 2,
				},
				tabBarLabelStyle: {
					color: "#fff",
				},
				tabBarShowLabel: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color }: { color: string }) => (
						<FontAwesome size={28} name="home" color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="discover"
				options={{
					title: "Discover",
					tabBarIcon: ({ color }: { color: string }) => (
						<FontAwesome size={28} name="search" color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="user"
				options={{
					title: "User",
					tabBarIcon: ({ color }: { color: string }) => (
						<FontAwesome size={28} name="user" color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
