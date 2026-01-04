import { useFocusEffect } from "@react-navigation/native";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
	Animated,
	FlatList,
	Image,
	Pressable,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { $api, fetchClient } from "@/lib/api";

const HEADER_HEIGHT = 60;
const CARD_WIDTH = 120;
const CARD_IMAGE_HEIGHT = 180;

type TvShowProgress = {
	imdbId: string;
	title: string | null;
	posterUrl: string | null;
	watchedEpisodes: number;
	totalEpisodes: number;
	totalSeasons: number | null;
	lastWatchedSeason: number | null;
	lastWatchedEpisode: number | null;
	isFullyWatched: boolean;
};

type MovieProgress = {
	imdbId: string;
	isWatched: boolean;
};

// Media card with optional progress info for TV shows
const TvMediaCard = ({
	title,
	imageUrl,
	onPress,
	progress,
}: {
	title: string;
	imageUrl: string;
	onPress: () => void;
	progress?: TvShowProgress | null;
}) => {
	const hasProgress = progress && progress.watchedEpisodes > 0;
	const progressPercent =
		progress && progress.totalEpisodes > 0
			? progress.watchedEpisodes / progress.totalEpisodes
			: 0;

	// Check if imageUrl is a placeholder URL
	const isPlaceholder = imageUrl.includes("via.placeholder.com");
	const hasRealImage = imageUrl && !isPlaceholder;

	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={styles.mediaCard}
		>
			{/* Poster */}
			{hasRealImage ? (
				<Image
					key={imageUrl} // Force re-render when URL changes
					source={{ uri: imageUrl }}
					style={[
						styles.mediaCardImage,
						progress?.isFullyWatched && styles.imageWatched,
					]}
					defaultSource={require("@/assets/1024.png")}
				/>
			) : (
				<View style={[styles.mediaCardImage, styles.imagePlaceholder]}>
					<Text style={styles.placeholderText}>{title[0] ?? "?"}</Text>
				</View>
			)}

			{/* Progress bar (only for in-progress shows) */}
			{hasProgress && !progress.isFullyWatched && (
				<View style={styles.progressBarContainer}>
					<View
						style={[
							styles.progressBar,
							{ width: `${Math.min(progressPercent * 100, 100)}%` },
						]}
					/>
				</View>
			)}

			{/* Completed badge */}
			{progress?.isFullyWatched && (
				<View style={styles.completedBadge}>
					<Text style={styles.completedBadgeText}>✓</Text>
				</View>
			)}

			{/* Title */}
			<Text style={styles.mediaCardTitle} numberOfLines={2}>
				{title}
			</Text>

			{/* Episode info (only if has progress) */}
			{hasProgress && (
				<Text style={styles.episodeInfo}>
					{progress.watchedEpisodes}/{progress.totalEpisodes} episodes
				</Text>
			)}

			{/* Last watched (only for in-progress shows) */}
			{hasProgress &&
				!progress.isFullyWatched &&
				progress.lastWatchedSeason !== null &&
				progress.lastWatchedEpisode !== null && (
					<Text style={styles.lastWatchedInfo}>
						S{progress.lastWatchedSeason} E{progress.lastWatchedEpisode}
					</Text>
				)}
		</TouchableOpacity>
	);
};

// Movie card with watched status
const MovieMediaCard = ({
	title,
	imageUrl,
	onPress,
	isWatched,
}: {
	title: string;
	imageUrl: string;
	onPress: () => void;
	isWatched?: boolean;
}) => {
	// Check if imageUrl is a placeholder URL
	const isPlaceholder = imageUrl.includes("via.placeholder.com");
	const hasRealImage = imageUrl && !isPlaceholder;

	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={styles.mediaCard}
		>
			{hasRealImage ? (
				<Image
					key={imageUrl} // Force re-render when URL changes
					source={{ uri: imageUrl }}
					style={[styles.mediaCardImage, isWatched && styles.imageWatched]}
					resizeMode="cover"
					defaultSource={require("@/assets/1024.png")}
				/>
			) : (
				<View
					style={[
						styles.mediaCardImage,
						styles.imagePlaceholder,
						isWatched && styles.imageWatched,
					]}
				>
					<Text style={styles.placeholderText}>{title[0] ?? "?"}</Text>
				</View>
			)}

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

// Skeleton card component for loading state
const MediaCardSkeleton = () => {
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

const Index = () => {
	const router = useRouter();

	const {
		data: likesData,
		isLoading: isLikesLoading,
		error: likesError,
		refetch: refetchLikes,
	} = $api.useQuery("get", "/api/v1/likes/list");

	// Fetch progress data
	const { data: progressData, refetch: refetchProgress } = $api.useQuery(
		"get",
		"/api/v1/progress/all",
	);

	// Create lookup maps for progress
	const tvProgressMap = (() => {
		const map = new Map<string, TvShowProgress>();
		if (progressData?.tvShows) {
			for (const show of progressData.tvShows as TvShowProgress[]) {
				map.set(show.imdbId, show);
			}
		}
		return map;
	})();

	const movieProgressMap = (() => {
		const map = new Map<string, MovieProgress>();
		if (progressData?.movies) {
			for (const movie of progressData.movies as MovieProgress[]) {
				map.set(movie.imdbId, movie);
			}
		}
		return map;
	})();

	const likes = likesData?.likes ?? [];

	// Fetch details for all liked items in parallel
	const detailQueries = useQueries({
		queries: likes.map(
			(like: {
				id: number;
				userId: string;
				imdbId: string;
				mediaType: "movie" | "tv";
				createdAt: string | number | Record<string, never>;
			}) => ({
				queryKey: ["title-details", like.imdbId],
				queryFn: async () => {
					const result = await fetchClient.GET(
						"/api/v1/media/getTitleDetails",
						{
							params: {
								query: {
									tt: like.imdbId,
								},
							},
						},
					);
					return {
						like,
						details: result.data,
					};
				},
				enabled: likes.length > 0,
				retry: 2,
			}),
		),
	});

	const isLoadingDetails = detailQueries.some((query) => query.isLoading);
	const hasDetailsError = detailQueries.some((query) => query.error);

	// Group liked items by media type
	const { shows, movies } = (() => {
		const showsList: Array<{
			like: { id: number; imdbId: string; mediaType: "movie" | "tv" };
			details:
				| {
						title?: {
							titleText?: { text?: string };
							primaryImage?: { url?: string };
						};
				  }
				| undefined;
		}> = [];
		const moviesList: Array<{
			like: { id: number; imdbId: string; mediaType: "movie" | "tv" };
			details:
				| {
						title?: {
							titleText?: { text?: string };
							primaryImage?: { url?: string };
						};
				  }
				| undefined;
		}> = [];

		detailQueries.forEach((query) => {
			if (query.data?.like && query.data?.details) {
				if (query.data.like.mediaType === "tv") {
					showsList.push(query.data);
				} else {
					moviesList.push(query.data);
				}
			}
		});

		return { shows: showsList, movies: moviesList };
	})();

	const isMyShowsLoading = isLikesLoading || isLoadingDetails;
	const isMyMoviesLoading = isLikesLoading || isLoadingDetails;
	const showsError =
		likesError ||
		(hasDetailsError ? new Error("Failed to load show details") : null);
	const moviesError =
		likesError ||
		(hasDetailsError ? new Error("Failed to load movie details") : null);

	useFocusEffect(() => {
		void refetchLikes();
		void refetchProgress();
	});

	const sections = [
		{
			type: "shows",
			label: "MY LIST",
			title: "Shows",
			items: shows,
			isLoading: isMyShowsLoading,
			error: showsError,
		},
		{
			type: "movies",
			label: "MY LIST",
			title: "Movies",
			items: movies,
			isLoading: isMyMoviesLoading,
			error: moviesError,
		},
	];

	const renderSection = ({
		item: section,
	}: {
		item: (typeof sections)[number];
	}) => {
		const renderItem = ({
			item,
		}: {
			item: (typeof section.items)[number];
			index: number;
		}) => {
			const title = item.details?.title?.titleText?.text ?? "";
			const imageUrl = item.details?.title?.primaryImage?.url ?? "";

			if (section.type === "shows") {
				const tvProgress = tvProgressMap.get(item.like.imdbId);
				return (
					<TvMediaCard
						title={title}
						imageUrl={imageUrl}
						onPress={() =>
							router.push({
								pathname: "/show-detail/[id]",
								params: { id: item.like.imdbId },
							})
						}
						progress={tvProgress}
					/>
				);
			}

			const movieProgress = movieProgressMap.get(item.like.imdbId);
			return (
				<MovieMediaCard
					title={title}
					imageUrl={imageUrl}
					onPress={() =>
						router.push({
							pathname: "/show-detail/[id]",
							params: { id: item.like.imdbId },
						})
					}
					isWatched={movieProgress?.isWatched}
				/>
			);
		};

		const renderHeader = () => {
			if (section.isLoading) {
				return (
					<View style={styles.skeletonRow}>
						<MediaCardSkeleton />
						<MediaCardSkeleton />
						<MediaCardSkeleton />
						<MediaCardSkeleton />
						<MediaCardSkeleton />
					</View>
				);
			}
			return null;
		};

		const renderEmpty = () => {
			if (!section.isLoading && !section.error && section.items.length === 0) {
				return (
					<View style={styles.emptyStateContainer}>
						<Text style={styles.emptyStateText}>
							Your {section.type} list is empty
						</Text>
						<Pressable onPress={() => router.push("/")}>
							<Text style={styles.discoveryLinkText}>
								Discover new {section.type} →
							</Text>
						</Pressable>
					</View>
				);
			}
			return null;
		};

		const getItemLayout = (_: unknown, index: number) => ({
			length: CARD_WIDTH + 12, // card width + marginRight
			offset: (CARD_WIDTH + 12) * index,
			index,
		});

		// Show loading state with horizontal skeleton row
		if (section.isLoading) {
			return (
				<View style={styles.section}>
					<Text style={styles.sectionLabel}>{section.label}</Text>
					<Text style={styles.sectionTitle}>{section.title}</Text>
					<View style={styles.skeletonRow}>
						<MediaCardSkeleton />
						<MediaCardSkeleton />
						<MediaCardSkeleton />
						<MediaCardSkeleton />
						<MediaCardSkeleton />
					</View>
				</View>
			);
		}

		// Show error state
		if (section.error) {
			return (
				<View style={styles.section}>
					<Text style={styles.sectionLabel}>{section.label}</Text>
					<Text style={styles.sectionTitle}>{section.title}</Text>
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>
							Error loading {section.type}: {section.error.message}
						</Text>
					</View>
				</View>
			);
		}

		return (
			<View style={styles.section}>
				<Text style={styles.sectionLabel}>{section.label}</Text>
				<Text style={styles.sectionTitle}>{section.title}</Text>

				{section.items.length === 0 ? (
					renderEmpty()
				) : (
					<FlatList
						data={section.items}
						renderItem={renderItem}
						keyExtractor={(item, index) => {
							const imageUrl = item.details?.title?.primaryImage?.url ?? "";
							return `${item.like.id}-${index}-${imageUrl}`;
						}}
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.mediaScroll}
						contentContainerStyle={styles.mediaScrollContent}
						getItemLayout={getItemLayout}
						removeClippedSubviews={true}
						ListHeaderComponent={renderHeader}
					/>
				)}
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor="#000" />

			<FlatList
				style={styles.scrollView}
				data={sections}
				renderItem={renderSection}
				keyExtractor={(item) => item.type}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
				removeClippedSubviews={true}
				initialNumToRender={2}
				maxToRenderPerBatch={2}
				windowSize={5}
				ListFooterComponent={<View style={{ height: 80 }} />}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	scrollView: {
		flex: 1,
	},
	section: {
		marginTop: 24,
		paddingHorizontal: 16,
	},
	sectionLabel: {
		color: "#666",
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 1,
	},
	sectionTitle: {
		color: "#fff",
		fontSize: 24,
		fontWeight: "700",
		marginBottom: 14,
	},
	mediaScroll: {
		marginLeft: -4,
	},
	mediaScrollContent: {
		paddingRight: 16,
		paddingLeft: 4,
	},
	skeletonRow: {
		flexDirection: "row",
		marginLeft: -4,
		paddingLeft: 4,
		paddingRight: 16,
	},
	loadingText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "500",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	// Skeleton Styles
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
	skeletonLabel: {
		width: 60,
		height: 12,
		backgroundColor: "#1a1a1a",
		borderRadius: 4,
		marginBottom: 4,
	},
	skeletonSectionTitle: {
		width: 100,
		height: 24,
		backgroundColor: "#1a1a1a",
		borderRadius: 6,
		marginBottom: 14,
	},
	emptyStateContainer: {
		padding: 20,
		alignItems: "center",
	},
	emptyStateText: {
		color: "#666",
		fontSize: 16,
		marginBottom: 10,
	},
	discoveryLinkText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "500",
		textDecorationLine: "underline",
	},
	errorContainer: {
		padding: 20,
		alignItems: "center",
	},
	errorText: {
		color: "#ff4444",
		fontSize: 16,
		textAlign: "center",
	},
	// Media Card Styles
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
	imagePlaceholder: {
		justifyContent: "center",
		alignItems: "center",
	},
	placeholderText: {
		color: "#333",
		fontSize: 32,
		fontWeight: "bold",
	},
	imageWatched: {
		opacity: 0.7,
	},
	progressBarContainer: {
		width: CARD_WIDTH,
		height: 3,
		backgroundColor: "rgba(255,255,255,0.15)",
		borderRadius: 1.5,
		marginTop: 6,
		overflow: "hidden",
	},
	progressBar: {
		height: "100%",
		backgroundColor: "#b14aed",
		borderRadius: 1.5,
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
	lastWatchedInfo: {
		color: "#b14aed",
		fontSize: 11,
		fontWeight: "600",
		marginTop: 2,
	},
});

export default Index;
