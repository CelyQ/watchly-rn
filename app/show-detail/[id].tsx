import {
	View,
	Text,
	Image,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { RapidAPIIMDBOverviewResponseData } from "@/types/rapidapi.type";
import { ArrowLeft, Plus, Bookmark } from "react-native-feather";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";

const ShowDetailSkeleton: React.FC<{
	router: ReturnType<typeof useRouter>;
}> = ({ router }) => {
	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={{ paddingBottom: 40 }}
		>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<ArrowLeft stroke="#fff" width={28} height={28} />
				</TouchableOpacity>
				<View style={[styles.poster, { backgroundColor: "#222" }]} />
			</View>
			<View style={styles.content}>
				<View
					style={[
						styles.skeletonTitle,
						{ backgroundColor: "#222", width: "70%" },
					]}
				/>
				<View style={styles.genresRow}>
					{[1, 2, 3].map((i) => (
						<View
							key={i}
							style={[styles.genreTag, { backgroundColor: "#222" }]}
						>
							<View
								style={{ width: 60, height: 14, backgroundColor: "#333" }}
							/>
						</View>
					))}
				</View>
				<View
					style={[
						styles.skeletonText,
						{ backgroundColor: "#222", width: "40%" },
					]}
				/>
				<View
					style={[
						styles.skeletonText,
						{ backgroundColor: "#222", width: "100%", height: 100 },
					]}
				/>
				<View style={styles.section}>
					<View
						style={[
							styles.skeletonText,
							{ backgroundColor: "#222", width: "30%" },
						]}
					/>
					<View style={styles.seasonsRow}>
						{[1, 2].map((i) => (
							<View
								key={i}
								style={[styles.seasonCard, { backgroundColor: "#222" }]}
							>
								<View
									style={{ width: 80, height: 20, backgroundColor: "#333" }}
								/>
							</View>
						))}
					</View>
				</View>
			</View>
		</ScrollView>
	);
};

const ShowDetail: React.FC = () => {
	const router = useRouter();
	const { id } = useLocalSearchParams();
	const { getToken } = useAuth();

	const { data, isLoading } = useQuery({
		queryKey: ["show-detail", id],
		queryFn: async () => {
			const token = await getToken();
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/search/imdb/${id}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (response.status === 429) {
				throw new Error("Rate limit exceeded");
			}

			const data = (await response.json()) as {
				overview: RapidAPIIMDBOverviewResponseData["data"]["title"];
			};

			return data.overview;
		},
	});

	const handleMarkAsWatched = async () => {
		try {
			const token = await getToken();
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/movie/save`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						imdbId: id,
						status: "WATCHED",
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Failed to mark as watched");
			}
		} catch (error) {
			console.error("Error marking as watched:", error);
		}
	};

	const handleSave = async () => {
		try {
			const token = await getToken();
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/movie/save`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						imdbId: id,
						status: "PLAN_TO_WATCH",
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Failed to save");
			}
		} catch (error) {
			console.error("Error saving:", error);
		}
	};

	if (isLoading) return <ShowDetailSkeleton router={router} />;

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={{ paddingBottom: 40 }}
		>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<ArrowLeft stroke="#fff" width={28} height={28} />
				</TouchableOpacity>
				<Image
					source={{ uri: data?.primaryImage?.url }}
					style={styles.poster}
					resizeMode="cover"
				/>
				<View style={styles.actionButtons}>
					<TouchableOpacity
						style={[styles.actionButton, styles.saveButton]}
						onPress={handleSave}
					>
						<Bookmark stroke="#fff" width={20} height={20} />
						<Text style={styles.actionButtonText}>Save</Text>
					</TouchableOpacity>
				</View>
			</View>
			<View style={styles.content}>
				<Text style={styles.title}>{data?.titleText?.text}</Text>
				<View style={styles.genresRow}>
					{data?.titleType?.categories.map((cat) => (
						<View key={cat.id} style={styles.genreTag}>
							<Text style={styles.genreText}>{cat.text}</Text>
						</View>
					))}
				</View>
				<Text style={styles.rating}>
					⭐ {data?.ratingsSummary?.aggregateRating} (
					{data?.ratingsSummary?.voteCount} votes)
				</Text>
				<Text style={styles.description}>
					{data?.plot?.plotText?.plainText}
				</Text>
				<TouchableOpacity
					style={styles.markWatchedButton}
					onPress={handleMarkAsWatched}
				>
					<Text style={styles.markWatchedButtonText}>Mark as Watched</Text>
				</TouchableOpacity>
				{/* {data?.titleType?.isSeries && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Seasons</Text>
						<View style={styles.seasonsRow}>
							<View style={styles.seasonCard}>
								<Text style={styles.seasonText}>Season 1</Text>
							</View>
							<View style={styles.seasonCard}>
								<Text style={styles.seasonText}>Specials</Text>
							</View>
						</View>
					</View>
				)} */}
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	header: {
		position: "relative",
		width: "100%",
		height: 340,
		backgroundColor: "#111",
		marginBottom: -40,
	},
	backButton: {
		position: "absolute",
		top: 40,
		left: 20,
		zIndex: 2,
		backgroundColor: "rgba(0,0,0,0.6)",
		borderRadius: 20,
		padding: 6,
	},
	poster: {
		width: "100%",
		height: 340,
		resizeMode: "cover",
	},
	content: {
		paddingHorizontal: 24,
		marginTop: 56,
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	title: {
		color: "#fff",
		fontSize: 32,
		fontWeight: "bold",
		flex: 1,
		marginRight: 16,
	},
	actionButtons: {
		position: "absolute",
		right: 20,
		bottom: -20,
		zIndex: 2,
		flexDirection: "row",
		gap: 4,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	saveButton: {
		backgroundColor: "#3c3c3c",
	},
	watchedButton: {
		backgroundColor: "#b14aed",
	},
	actionButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginLeft: 4,
	},
	genresRow: {
		flexDirection: "row",
		marginBottom: 10,
		flexWrap: "wrap",
	},
	genreTag: {
		backgroundColor: "#222",
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 4,
		marginRight: 8,
		marginBottom: 6,
	},
	genreText: {
		color: "#b14aed",
		fontSize: 14,
		fontWeight: "600",
	},
	rating: {
		color: "#fff",
		fontSize: 16,
		marginBottom: 16,
	},
	description: {
		color: "#ccc",
		fontSize: 16,
		marginBottom: 24,
	},
	section: {
		marginTop: 10,
	},
	sectionTitle: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 10,
	},
	seasonsRow: {
		flexDirection: "row",
		gap: 12,
	},
	seasonCard: {
		backgroundColor: "#222",
		borderRadius: 10,
		paddingHorizontal: 18,
		paddingVertical: 10,
		marginRight: 12,
	},
	seasonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	skeletonTitle: {
		height: 40,
		borderRadius: 8,
		marginBottom: 10,
	},
	skeletonText: {
		height: 20,
		borderRadius: 4,
		marginBottom: 16,
	},
	markWatchedButton: {
		backgroundColor: "#3c3c3c",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 12,
		borderRadius: 10,
		marginBottom: 24,
	},
	markWatchedButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginLeft: 8,
	},
});

export default ShowDetail;
