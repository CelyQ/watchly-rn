import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export function AppLoadingSkeleton() {
	const shimmerAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(shimmerAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(shimmerAnim, {
					toValue: 0,
					duration: 1000,
					useNativeDriver: true,
				}),
			]),
		).start();
	}, [shimmerAnim]);

	const opacity = shimmerAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [0.3, 0.6],
	});

	return (
		<View style={layoutStyles.container}>
			<View style={layoutStyles.skeletonContent}>
				<Animated.View style={[layoutStyles.skeletonLogo, { opacity }]} />
				<Animated.View style={[layoutStyles.skeletonText, { opacity }]} />
			</View>
		</View>
	);
}

const layoutStyles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
		padding: 20,
	},
	skeletonContent: {
		alignItems: "center",
	},
	skeletonLogo: {
		width: 80,
		height: 80,
		borderRadius: 16,
		backgroundColor: "#1a1a1a",
		marginBottom: 16,
	},
	skeletonText: {
		width: 120,
		height: 16,
		borderRadius: 4,
		backgroundColor: "#1a1a1a",
	},
});
