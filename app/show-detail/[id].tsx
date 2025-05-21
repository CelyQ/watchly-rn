import {
	View,
	Text,
	Image,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { RapidAPIIMDBOverviewResponseData } from "@/types/rapidapi.type";
import { ArrowLeft, Bookmark } from "react-native-feather";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import React from "react";

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
	const queryClient = useQueryClient();
	const pulseAnim = new Animated.Value(1);

	const { data: status } = useQuery({
		queryKey: ["show-status", id],
		queryFn: async () => {
			const token = await getToken();
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/status/${id}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (response.status === 200) {
				const { status } = (await response.json()) as {
					status: "WATCHED" | "PLAN_TO_WATCH" | null;
				};
				return status;
			}

			return null;
		},
	});

	const { mutateAsync: save, isPending: isSaving } = useMutation({
		mutationFn: async () => {
			const token = await getToken();
			const type = isSeries ? "tv" : "movie";
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/${type}/save`,
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

			return response.json();
		},
		onSuccess: () => {
			queryClient.setQueryData(["show-status", id], "PLAN_TO_WATCH");
			queryClient.invalidateQueries({
				queryKey: isSeries ? ["my-shows"] : ["my-movies"],
			});
		},
	});

	const { mutateAsync: unsave, isPending: isUnsaving } = useMutation({
		mutationFn: async () => {
			const token = await getToken();
			const type = isSeries ? "tv" : "movie";
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/${type}/save`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						imdbId: id,
						status: null,
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Failed to unsave");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.setQueryData(["show-status", id], null);
			queryClient.invalidateQueries({
				queryKey: isSeries ? ["my-shows"] : ["my-movies"],
			});
		},
	});

	const { mutateAsync: markAsWatched, isPending: isMarkingAsWatched } =
		useMutation({
			mutationFn: async () => {
				const token = await getToken();
				const type = isSeries ? "tv" : "movie";
				const response = await fetch(
					`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/${type}/save`,
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

				return response.json();
			},
			onSuccess: () => {
				queryClient.setQueryData(["show-status", id], "WATCHED");
				queryClient.invalidateQueries({
					queryKey: isSeries ? ["my-shows"] : ["my-movies"],
				});
			},
		});

	const { mutateAsync: removeFromWatched, isPending: isRemovingFromWatched } =
		useMutation({
			mutationFn: async () => {
				const token = await getToken();
				const type = isSeries ? "tv" : "movie";
				const response = await fetch(
					`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/${type}/save`,
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
					throw new Error("Failed to remove from watched");
				}

				return response.json();
			},
			onSuccess: () => {
				queryClient.setQueryData(["show-status", id], "PLAN_TO_WATCH");
				queryClient.invalidateQueries({
					queryKey: isSeries ? ["my-shows"] : ["my-movies"],
				});
			},
		});

	React.useEffect(() => {
		if (isSaving || isUnsaving) {
			Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 0.5,
						duration: 1500,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 1500,
						useNativeDriver: true,
					}),
				]),
			).start();
		} else {
			pulseAnim.setValue(1);
		}
	}, [isSaving, isUnsaving, pulseAnim]);

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

	const isSeries = data?.titleType?.isSeries;

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
					{status === "PLAN_TO_WATCH" && (
						<Animated.View style={{ opacity: pulseAnim }}>
							<TouchableOpacity
								style={[styles.actionButton, styles.savedButton]}
								onPress={() => unsave()}
								disabled={isUnsaving}
							>
								<Bookmark stroke="#fff" width={20} height={20} />
								<Text style={styles.actionButtonText}>Remove</Text>
							</TouchableOpacity>
						</Animated.View>
					)}
					{status !== "PLAN_TO_WATCH" && status !== "WATCHED" && (
						<Animated.View style={{ opacity: pulseAnim }}>
							<TouchableOpacity
								style={[styles.actionButton, styles.saveButton]}
								onPress={() => save()}
								disabled={isSaving}
							>
								<Bookmark stroke="#fff" width={20} height={20} />
								<Text style={styles.actionButtonText}>Save</Text>
							</TouchableOpacity>
						</Animated.View>
					)}
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
				{status === "WATCHED" ? (
					<TouchableOpacity
						style={[styles.markWatchedButton, styles.removeWatchedButton]}
						onPress={() => removeFromWatched()}
						disabled={isRemovingFromWatched}
					>
						<Text style={styles.markWatchedButtonText}>
							{isRemovingFromWatched ? "Removing..." : "Remove from Watched"}
						</Text>
					</TouchableOpacity>
				) : (
					<TouchableOpacity
						style={styles.markWatchedButton}
						onPress={() => markAsWatched()}
						disabled={isMarkingAsWatched}
					>
						<Text style={styles.markWatchedButtonText}>
							{isMarkingAsWatched ? "Marking..." : "Mark as Watched"}
						</Text>
					</TouchableOpacity>
				)}
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
	savedButton: {
		backgroundColor: "#b14aed",
	},
	disabledButton: {
		opacity: 1,
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
	removeWatchedButton: {
		backgroundColor: "#ff4444",
	},
});

export default ShowDetail;
