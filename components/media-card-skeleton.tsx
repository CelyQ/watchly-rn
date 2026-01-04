import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const CARD_WIDTH = 120;
const CARD_IMAGE_HEIGHT = 180;

export const MediaCardSkeleton = () => {
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
		<View style={styles.mediaCard}>
			<Animated.View style={[styles.skeletonImage, { opacity }]} />
			<Animated.View style={[styles.skeletonTitle, { opacity }]} />
			<Animated.View style={[styles.skeletonSubtitle, { opacity }]} />
		</View>
	);
};

const styles = StyleSheet.create({
	mediaCard: {
		width: CARD_WIDTH,
		marginRight: 12,
	},
	skeletonImage: {
		width: CARD_WIDTH,
		height: CARD_IMAGE_HEIGHT,
		borderRadius: 10,
		backgroundColor: "#1a1a1a",
	},
	skeletonTitle: {
		height: 14,
		width: CARD_WIDTH * 0.8,
		borderRadius: 4,
		backgroundColor: "#1a1a1a",
		marginTop: 8,
	},
	skeletonSubtitle: {
		height: 10,
		width: CARD_WIDTH * 0.5,
		borderRadius: 4,
		backgroundColor: "#1a1a1a",
		marginTop: 4,
	},
});

