import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import { Search } from "react-native-feather";

type MediaItemProps = {
	title: string;
	imageUrl: string;
	isSelected?: boolean;
	onPress?: () => void;
};

export const MediaItem: React.FC<MediaItemProps> = ({
	title,
	imageUrl,
	isSelected,
	onPress,
}) => {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={styles.mediaItem}
		>
			<Image source={{ uri: imageUrl }} style={styles.mediaImage} />
			{isSelected && (
				<View style={styles.selectedBadge}>
					<Search stroke="#fff" width={16} height={16} />
				</View>
			)}
			<Text style={styles.mediaTitle} numberOfLines={2}>
				{title}
			</Text>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	mediaItem: {
		width: 150,
		marginRight: 15,
	},
	mediaImage: {
		width: 150,
		height: 225,
		borderRadius: 10,
		backgroundColor: "#333",
	},
	selectedBadge: {
		position: "absolute",
		top: 10,
		left: 10,
		backgroundColor: "#b14aed",
		borderRadius: 15,
		width: 30,
		height: 30,
		alignItems: "center",
		justifyContent: "center",
	},
	mediaTitle: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "500",
		marginTop: 8,
		textAlign: "center",
	},
});
