import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
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
