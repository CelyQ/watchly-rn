import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { $api } from "@/lib/api";

interface SeasonCardProps {
	showId: string;
	seasonNumber: string;
	seasonText: string;
	isWatched?: boolean;
	progress?: number; // 0 to 1
}

export const SeasonCard: React.FC<SeasonCardProps> = ({
	showId,
	seasonNumber,
	seasonText,
	isWatched = false,
	progress = 0,
}) => {
	const router = useRouter();
	const { data: seasonImagesData } = $api.useQuery(
		"get",
		"/api/v1/media/getSeasonImages",
		{
			params: {
				query: {
					tt: showId,
					seasonNumber: Number.parseInt(seasonNumber, 10) || 1,
				},
			},
		},
	);

	const posterUrl =
		seasonImagesData?.posters &&
		seasonImagesData.posters.length > 0 &&
		seasonImagesData.posters[0]
			? `https://image.tmdb.org/t/p/w500${seasonImagesData.posters[0].file_path}`
			: null;

	return (
		<TouchableOpacity
			style={styles.seasonCard}
			onPress={() =>
				router.push(
					`/show-detail/${showId}/season/${Number.parseInt(seasonNumber, 10) || 1}`,
				)
			}
		>
		<View style={styles.posterContainer}>
			{posterUrl ? (
				<Image
					source={{ uri: posterUrl }}
					style={[
						styles.seasonPoster,
						isWatched && styles.seasonPosterWatched,
					]}
					resizeMode="cover"
					defaultSource={require("@/assets/1024.png")}
				/>
			) : (
				<View
					style={[
						styles.seasonPoster,
						styles.seasonPosterPlaceholder,
						isWatched && styles.seasonPosterWatched,
					]}
				>
					<Text style={styles.seasonPosterText}>{seasonText}</Text>
				</View>
			)}
			{/* Progress bar underneath poster */}
			<View style={styles.progressBarContainer}>
				<View
					style={[
						styles.progressBar,
						{ width: `${Math.min(progress * 100, 100)}%` },
					]}
				/>
			</View>
		</View>
			<View style={styles.textContainer}>
				<Text style={styles.seasonText}>{seasonText}</Text>
				{isWatched && <View style={styles.underline} />}
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	seasonCard: {
		width: 150,
		marginRight: 15,
	},
	posterContainer: {
		width: 150,
	},
	seasonPoster: {
		width: 150,
		height: 225,
		borderRadius: 10,
		backgroundColor: "#222",
		marginBottom: 4,
	},
	progressBarContainer: {
		width: 150,
		height: 3,
		backgroundColor: "rgba(255, 255, 255, 0.2)",
		borderRadius: 1.5,
		overflow: "hidden",
		marginBottom: 4,
	},
	progressBar: {
		height: "100%",
		backgroundColor: "#b14aed",
	},
	seasonPosterWatched: {
		opacity: 0.6,
	},
	seasonPosterPlaceholder: {
		justifyContent: "center",
		alignItems: "center",
	},
	seasonPosterText: {
		color: "#666",
		fontSize: 16,
		fontWeight: "600",
		textAlign: "center",
	},
	textContainer: {
		position: "relative",
	},
	seasonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
		textAlign: "center",
	},
	underline: {
		position: "absolute",
		bottom: -2,
		left: 0,
		right: 0,
		height: 2,
		backgroundColor: "#b14aed",
		borderRadius: 1,
	},
});


