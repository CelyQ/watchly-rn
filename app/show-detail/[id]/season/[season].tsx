import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
	ActivityIndicator,
	Alert,
	Animated,
	Image,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { ArrowLeft } from "react-native-feather";
import { SafeAreaView } from "react-native-safe-area-context";
import { queryClient } from "@/app/_layout";
import { $api } from "@/lib/api";

// Episode skeleton component
const EpisodeSkeleton = ({ index }: { index: number }) => {
	const shimmerAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(shimmerAnim, {
					toValue: 1,
					duration: 1000,
					delay: index * 50,
					useNativeDriver: true,
				}),
				Animated.timing(shimmerAnim, {
					toValue: 0,
					duration: 1000,
					useNativeDriver: true,
				}),
			]),
		).start();
	}, [shimmerAnim, index]);

	const opacity = shimmerAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [0.3, 0.6],
	});

	return (
		<View style={styles.episodeRow}>
			<Animated.View style={[styles.skeletonCircle, { opacity }]} />
			<View style={styles.episodeInfo}>
				<Animated.View style={[styles.skeletonEpisodeNumber, { opacity }]} />
				<Animated.View style={[styles.skeletonEpisodeTitle, { opacity }]} />
			</View>
		</View>
	);
};

const SeasonScreen: React.FC = () => {
	const router = useRouter();
	const { id, season } = useLocalSearchParams<{
		id: string;
		season: string;
	}>();

	const imdbId = String(id);
	const seasonNumber = Number.parseInt(String(season), 10) || 1;

	const { data: detailsData } = $api.useQuery(
		"get",
		"/api/v1/media/getTitleDetails",
		{
			params: {
				query: {
					tt: imdbId,
				},
			},
		},
	);

	const { data: episodesData, isLoading: isEpisodesLoading } = $api.useQuery(
		"get",
		"/api/v1/media/getTitleEpisodes",
		{
			params: {
				query: {
					tt: imdbId,
					seasonNumber,
				},
			},
		},
	);

	const { data: seasonImagesData } = $api.useQuery(
		"get",
		"/api/v1/media/getSeasonImages",
		{
			params: {
				query: {
					tt: imdbId,
					seasonNumber,
				},
			},
		},
	);

	const {
		data: progressData,
		isLoading: isProgressLoading,
		refetch: refetchProgress,
	} = $api.useQuery("get", "/api/v1/progress/tv", {
		params: {
			query: {
				imdbId,
			},
		},
	});

	const { mutateAsync: updateEpisodeProgress, isPending: isUpdatingEpisode } =
		$api.useMutation("put", "/api/v1/progress/episode", {
			onSuccess: () => {
				void refetchProgress();
				queryClient.invalidateQueries({
					queryKey: ["get", "/api/v1/progress/all"],
				});
			},
		});

	const { mutateAsync: markManyEpisodes, isPending: isMarkingMany } =
		$api.useMutation("post", "/api/v1/progress/mark-all-tv", {
			onSuccess: () => {
				void refetchProgress();
				queryClient.invalidateQueries({
					queryKey: ["get", "/api/v1/progress/all"],
				});
			},
		});

	const title = detailsData?.title?.titleText?.text ?? "";

	type EpisodeEdge = {
		node: {
			id: string;
			plot?: {
				plotText: {
					plainText: string;
				};
			} | null;
		};
		position: number;
	};

	const episodeEdges: EpisodeEdge[] =
		episodesData?.title?.episodes?.episodes?.edges ?? [];

	const progressEpisodes = useMemo(
		() => progressData?.episodes ?? [],
		[progressData?.episodes],
	);

	// Local optimistic state for episode watched flags to avoid flicker
	const [episodeState, setEpisodeState] = React.useState<Map<string, boolean>>(
		new Map(),
	);

	// Sync local state from server progress
	React.useEffect(() => {
		const map = new Map<string, boolean>();
		for (const ep of progressEpisodes) {
			const key = `${ep.seasonNumber}-${ep.episodeNumber}`;
			map.set(key, ep.isWatched);
		}
		setEpisodeState(map);
	}, [progressEpisodes]);

	const pulseAnim = useRef(new Animated.Value(1)).current;
	const animationRef = useRef<Animated.CompositeAnimation | null>(null);
	const [updatingEpisode, setUpdatingEpisode] = React.useState<number | null>(
		null,
	);

	const handleToggleEpisode = async (episodeNumber: number) => {
		// Avoid overlapping updates which can cause UI/server sync issues
		if (isUpdatingEpisode || isMarkingMany || updatingEpisode !== null) {
			return;
		}

		const key = `${seasonNumber}-${episodeNumber}`;
		const currentlyWatched = episodeState.get(key) ?? false;
		animationRef.current?.stop();
		pulseAnim.setValue(1);
		setUpdatingEpisode(episodeNumber);

		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 0.8,
					duration: 160,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 160,
					useNativeDriver: true,
				}),
			]),
		);
		animationRef.current = animation;
		animation.start();

		try {
			await updateEpisodeProgress({
				body: {
					imdbId,
					seasonNumber,
					episodeNumber,
					isWatched: !currentlyWatched,
				},
			});
			// Optimistically update local episode state so the circle color
			// jumps directly to the final value once processing ends.
			setEpisodeState((prev) => {
				const next = new Map(prev);
				next.set(key, !currentlyWatched);
				return next;
			});
		} catch (error) {
			// On error, stop animation and reset immediately
			animationRef.current?.stop();
			pulseAnim.setValue(1);
			setUpdatingEpisode(null);
			throw error;
		} finally {
			// End processing state; color is already correct via optimistic state
			animationRef.current?.stop();
			pulseAnim.setValue(1);
			setUpdatingEpisode(null);
		}
	};

	// When progress data refreshes after a successful mutation, stop the
	// processing state so the circle jumps directly from gray to its final color
	React.useEffect(() => {
		if (updatingEpisode !== null && !isUpdatingEpisode) {
			animationRef.current?.stop();
			pulseAnim.setValue(1);
			setUpdatingEpisode(null);
		}
	}, [isUpdatingEpisode, updatingEpisode, pulseAnim]);

	const handleMarkUntil = async (episodeNumber: number) => {
		// Avoid overlapping bulk + single updates
		if (isUpdatingEpisode || isMarkingMany || updatingEpisode !== null) {
			return;
		}
		const episodesToMark: { seasonNumber: number; episodeNumber: number }[] =
			[];

		// 1) All episodes from previous seasons (1..seasonNumber-1)
		const episodesPerSeason =
			progressData?.tvShowProgress?.episodesPerSeason ?? [];

		for (let s = 1; s < seasonNumber; s++) {
			const totalEpisodesInSeason = episodesPerSeason[s - 1];
			if (!totalEpisodesInSeason) continue;

			for (let ep = 1; ep <= totalEpisodesInSeason; ep++) {
				episodesToMark.push({
					seasonNumber: s,
					episodeNumber: ep,
				});
			}
		}

		// 2) Episodes in the current season up to the pressed one
		const currentSeasonEpisodes = episodeEdges
			.filter((edge): edge is NonNullable<EpisodeEdge> => Boolean(edge))
			.filter((edge) => edge.position <= episodeNumber)
			.map((edge) => ({
				seasonNumber,
				episodeNumber: edge.position,
			}));

		episodesToMark.push(...currentSeasonEpisodes);

		if (episodesToMark.length === 0) return;

		await markManyEpisodes({
			body: {
				imdbId,
				episodes: episodesToMark,
				isWatched: true,
			},
		});

		// Optimistically mark all affected episodes (including previous seasons) as watched locally
		setEpisodeState((prev) => {
			const next = new Map(prev);
			for (const ep of episodesToMark) {
				const key = `${ep.seasonNumber}-${ep.episodeNumber}`;
				next.set(key, true);
			}
			return next;
		});
	};

	const showEpisodeActions = (episodeNumber: number) => {
		if (Platform.OS === "ios") {
			Alert.alert(
				`Episode ${episodeNumber}`,
				"",
				[
					{
						text: "Mark as watched",
						onPress: () => {
							void handleToggleEpisode(episodeNumber);
						},
					},
					{
						text: "Mark all until this as watched",
						onPress: () => {
							void handleMarkUntil(episodeNumber);
						},
					},
					{
						text: "Cancel",
						style: "cancel",
					},
				],
				{ cancelable: true },
			);
		} else {
			Alert.alert(
				`Episode ${episodeNumber}`,
				"",
				[
					{
						text: "Mark as watched",
						onPress: () => {
							void handleToggleEpisode(episodeNumber);
						},
					},
					{
						text: "Mark all until this as watched",
						onPress: () => {
							void handleMarkUntil(episodeNumber);
						},
					},
					{
						text: "Cancel",
						style: "cancel",
					},
				],
				{ cancelable: true },
			);
		}
	};

	const isLoading = isEpisodesLoading || isProgressLoading;

	const posterUrl =
		seasonImagesData?.posters &&
		seasonImagesData.posters.length > 0 &&
		seasonImagesData.posters[0]
			? `https://image.tmdb.org/t/p/w500${seasonImagesData.posters[0].file_path}`
			: null;

	// Get episode title from plot if available
	const getEpisodeTitle = (edge: EpisodeEdge): string => {
		if (!edge) return "";
		const plot = edge.node.plot?.plotText?.plainText;
		if (!plot) return "";
		// Try to extract title from plot (first line or first sentence)
		const lineParts = plot.split("\n");
		const firstLine = lineParts[0] ?? "";
		if (firstLine && firstLine.length < 100) return firstLine;
		const sentenceParts = plot.split(".");
		const firstSentence = sentenceParts[0] ?? "";
		return firstSentence && firstSentence.length < 100 ? firstSentence : "";
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				>
					<ArrowLeft stroke="#fff" width={24} height={24} />
				</TouchableOpacity>

				{/* Season Thumbnail */}
				{posterUrl ? (
					<Image source={{ uri: posterUrl }} style={styles.seasonThumbnail} />
				) : (
					<View style={[styles.seasonThumbnail, styles.thumbnailPlaceholder]}>
						<Text style={styles.thumbnailPlaceholderText}>
							Season {seasonNumber}
						</Text>
					</View>
				)}

				{/* Show Info */}
				<View style={styles.showInfo}>
					<TouchableOpacity style={styles.showNamePill}>
						<Text style={styles.showNameText}>{title}</Text>
					</TouchableOpacity>
					<Text style={styles.seasonText}>Season {seasonNumber}</Text>
				</View>
			</View>

			{/* Episodes List */}
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				scrollEnabled={!isMarkingMany}
			>
				<Text style={styles.episodesTitle}>Episodes</Text>

				{isLoading ? (
					<>
						<EpisodeSkeleton index={0} />
						<EpisodeSkeleton index={1} />
						<EpisodeSkeleton index={2} />
						<EpisodeSkeleton index={3} />
						<EpisodeSkeleton index={4} />
						<EpisodeSkeleton index={5} />
					</>
				) : episodeEdges.length === 0 ? (
					<Text style={styles.loadingText}>
						No episodes found for this season.
					</Text>
				) : (
					episodeEdges.map((edge) => {
						if (!edge) return null;
						const episodeNumber = edge.position;
						const key = `${seasonNumber}-${episodeNumber}`;
						const isWatched = episodeState.get(key) ?? false;
						const episodeTitle =
							getEpisodeTitle(edge) || `Episode ${episodeNumber}`;

						return (
							<TouchableOpacity
								key={edge.node.id}
								activeOpacity={0.7}
								onPress={() => void handleToggleEpisode(episodeNumber)}
								onLongPress={() => showEpisodeActions(episodeNumber)}
								delayLongPress={250}
								disabled={isMarkingMany}
							>
								<View style={styles.episodeRow}>
									{/* Status Circle */}
									<Animated.View
										style={[
											styles.statusCircle,
											isWatched && styles.statusCircleWatched,
											episodeNumber === updatingEpisode &&
												styles.statusCircleProcessing,
											episodeNumber === updatingEpisode && {
												transform: [{ scale: pulseAnim }],
											},
										]}
									/>

									{/* Episode Info */}
									<View style={styles.episodeInfo}>
										<Text style={styles.episodeNumber}>
											Episode {episodeNumber}
										</Text>
										<Text style={styles.episodeTitleText} numberOfLines={1}>
											{episodeTitle}
										</Text>
									</View>
								</View>
							</TouchableOpacity>
						);
					})
				)}

				{/* Per-episode saving indicator (for single toggles only) */}
				{isUpdatingEpisode && !isMarkingMany && (
					<View style={styles.savingContainer}>
						<ActivityIndicator size="small" color="#f97316" />
						<Text style={styles.savingText}>Saving progress…</Text>
					</View>
				)}
			</ScrollView>

			{/* Fullscreen overlay when marking many episodes */}
			{isMarkingMany && (
				<View style={styles.fullscreenOverlay} pointerEvents="auto">
					<View style={styles.fullscreenContent}>
						<ActivityIndicator size="large" color="#f97316" />
						<Text style={styles.fullscreenText}>Updating episodes…</Text>
					</View>
				</View>
			)}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	header: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 16,
		gap: 12,
	},
	backButton: {
		width: 44,
		height: 44,
		backgroundColor: "rgba(255,255,255,0.1)",
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
		marginTop: 4,
	},
	seasonThumbnail: {
		width: 100,
		height: 150,
		borderRadius: 8,
		backgroundColor: "#222",
	},
	thumbnailPlaceholder: {
		justifyContent: "center",
		alignItems: "center",
	},
	thumbnailPlaceholderText: {
		color: "#666",
		fontSize: 12,
		fontWeight: "600",
		textAlign: "center",
	},
	showInfo: {
		flex: 1,
		paddingTop: 4,
	},
	showNamePill: {
		backgroundColor: "#1a1a1a",
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 6,
		alignSelf: "flex-start",
		marginBottom: 8,
	},
	showNameText: {
		color: "#b14aed",
		fontSize: 14,
		fontWeight: "600",
	},
	seasonText: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "700",
		marginBottom: 8,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 32,
	},
	episodesTitle: {
		color: "#fff",
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 16,
	},
	loadingText: {
		color: "#a1a1aa",
		fontSize: 14,
		marginTop: 20,
	},
	// Skeleton styles
	skeletonCircle: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: "#222",
	},
	skeletonEpisodeNumber: {
		width: 80,
		height: 16,
		backgroundColor: "#222",
		borderRadius: 4,
		marginBottom: 4,
	},
	skeletonEpisodeTitle: {
		width: 150,
		height: 14,
		backgroundColor: "#1a1a1a",
		borderRadius: 4,
	},
	savingContainer: {
		marginTop: 16,
		alignSelf: "center",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	savingText: {
		color: "#71717a",
		fontSize: 12,
	},
	fullscreenOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.55)",
		justifyContent: "center",
		alignItems: "center",
	},
	fullscreenContent: {
		backgroundColor: "#111827",
		paddingHorizontal: 24,
		paddingVertical: 20,
		borderRadius: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	fullscreenText: {
		color: "#e5e7eb",
		fontSize: 14,
		fontWeight: "600",
	},
	episodeRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		gap: 12,
	},
	statusCircle: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: "#b14aed",
		backgroundColor: "#fff",
	},
	statusCircleWatched: {
		backgroundColor: "#b14aed",
		borderColor: "#b14aed",
	},
	statusCircleProcessing: {
		backgroundColor: "#555",
		borderColor: "#777",
	},
	episodeInfo: {
		flex: 1,
	},
	episodeNumber: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 2,
	},
	episodeTitleText: {
		color: "#fff",
		fontSize: 14,
		marginBottom: 4,
	},
	airDate: {
		color: "#999",
		fontSize: 12,
	},
});

export default SeasonScreen;
