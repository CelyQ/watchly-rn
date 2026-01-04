import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CARD_WIDTH = 120;
const CARD_IMAGE_HEIGHT = 180;

type MovieCardProps = {
	title: string;
	imageUrl: string;
	onPress: () => void;
	isWatched?: boolean;
};

export const MovieCard = ({
	title,
	imageUrl,
	onPress,
	isWatched,
}: MovieCardProps) => {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={styles.mediaCard}
		>
			<Image
				source={{ uri: imageUrl }}
				style={[styles.mediaCardImage, isWatched && styles.imageWatched]}
				resizeMode="cover"
				defaultSource={require("@/assets/1024.png")}
			/>

			{isWatched && (
				<View style={styles.completedBadge}>
					<Text style={styles.completedBadgeText}>✓</Text>
				</View>
			)}

			<Text style={styles.mediaCardTitle} numberOfLines={2}>
				{title}
			</Text>

			{isWatched && <Text style={styles.episodeInfo}>Watched</Text>}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	mediaCard: {
		width: CARD_WIDTH,
		marginRight: 12,
	},
	mediaCardImage: {
		width: CARD_WIDTH,
		height: CARD_IMAGE_HEIGHT,
		borderRadius: 10,
		backgroundColor: "#1a1a1a",
	},
	imageWatched: {
		opacity: 0.7,
	},
	completedBadge: {
		position: "absolute",
		top: 8,
		right: 8,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: "#b14aed",
		justifyContent: "center",
		alignItems: "center",
	},
	completedBadgeText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "bold",
	},
	mediaCardTitle: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "600",
		marginTop: 8,
		lineHeight: 18,
	},
	episodeInfo: {
		color: "#888",
		fontSize: 11,
		marginTop: 2,
	},
});

