import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
	return (
		<NativeTabs>
			<NativeTabs.Trigger name="index">
				<Icon sf="safari.fill" drawable="ic_search" />
				<Label>Discover</Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="progress">
				<Icon sf="clock.fill" drawable="ic_clock" />
				<Label>Progress</Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="liked">
				<Icon sf="heart.fill" drawable="ic_favorite" />
				<Label>Liked</Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="profile">
				<Icon sf="person.fill" drawable="ic_person" />
				<Label>Profile</Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	);
}
