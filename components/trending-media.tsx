import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
	Animated,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { $api } from "@/lib/api";

const CARD_WIDTH = 120;
const CARD_IMAGE_HEIGHT = 180;

interface TrendingMediaProps {
	mediaType: "tv" | "movie";
	title: string;
}

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

// Media card with optional progress info
const MediaCard = ({
	id,
	title,
	imageUrl,
	onPress,
	progress,
}: {
	id: string;
	title: string;
	imageUrl: string;
	onPress: () => void;
	progress?: {
		watchedEpisodes: number;
		totalEpisodes: number;
		lastWatchedSeason: number | null;
		lastWatchedEpisode: number | null;
		isFullyWatched: boolean;
	} | null;
}) => {
	const hasProgress = progress && progress.watchedEpisodes > 0;
	const progressPercent =
		progress && progress.totalEpisodes > 0
			? progress.watchedEpisodes / progress.totalEpisodes
			: 0;

	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={styles.mediaCard}
		>
			{/* Poster */}
			<Image
				source={{ uri: imageUrl }}
				style={[
					styles.mediaCardImage,
					progress?.isFullyWatched && styles.imageWatched,
				]}
			/>

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

// Movie card with watched status
const MovieCard = ({
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
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={styles.mediaCard}
		>
			<Image
				source={{ uri: imageUrl }}
				style={[styles.mediaCardImage, isWatched && styles.imageWatched]}
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

export const TrendingMedia = ({ mediaType, title }: TrendingMediaProps) => {
	const router = useRouter();

	// Fetch trending data
	const {
		data: trendingData,
		isLoading: isLoading,
		isError: isError,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = $api.useInfiniteQuery(
		"get",
		"/api/v1/media/getMostPopular",
		{
			params: {
				query: {
					limit: 20,
					mediaType,
				},
			},
		},
		{
			pageParamName: "limit",
			initialPageParam: 20,
			getNextPageParam: (_lastPage, allPages) => {
				const nextLimit = 20 * (allPages.length + 1);
				if (nextLimit > 100) {
					return undefined;
				}
				return nextLimit;
			},
		},
	);

	// Fetch progress data
	const { data: progressData } = $api.useQuery("get", "/api/v1/progress/all");

	// Create lookup maps for progress
	const tvProgressMap = useMemo(() => {
		const map = new Map<string, TvShowProgress>();
		if (progressData?.tvShows) {
			for (const show of progressData.tvShows as TvShowProgress[]) {
				map.set(show.imdbId, show);
			}
		}
		return map;
	}, [progressData?.tvShows]);

	const movieProgressMap = useMemo(() => {
		const map = new Map<string, MovieProgress>();
		if (progressData?.movies) {
			for (const movie of progressData.movies as MovieProgress[]) {
				map.set(movie.imdbId, movie);
			}
		}
		return map;
	}, [progressData?.movies]);

	const trendingItems = useMemo(() => {
		if (!trendingData?.pages) return [];
		let previousCount = 0;
		return trendingData.pages.flatMap((page) => {
			const allNodes =
				page.topMeterTitles?.edges?.map((edge) => edge.node) ?? [];
			const newNodes = allNodes.slice(previousCount);
			previousCount = allNodes.length;
			return newNodes;
		});
	}, [trendingData]);

	// Hide section if there's an error (backend API issue)
	if (isError && !isLoading) {
		return null;
	}

	return (
		<View style={styles.section}>
			<Text style={styles.sectionLabel}>TRENDING</Text>
			<Text style={styles.sectionTitle}>{title}</Text>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.mediaScroll}
				contentContainerStyle={styles.mediaScrollContent}
				onScroll={(event) => {
					const { contentOffset, contentSize, layoutMeasurement } =
						event.nativeEvent;
					const scrollPosition = contentOffset.x;
					const scrollWidth = contentSize.width;
					const containerWidth = layoutMeasurement.width;
					const distanceFromEnd = scrollWidth - scrollPosition - containerWidth;

					const threshold = containerWidth * 2;
					if (
						distanceFromEnd < threshold &&
						hasNextPage &&
						!isFetchingNextPage
					) {
						void fetchNextPage();
					}
				}}
				scrollEventThrottle={16}
			>
				{isLoading && (
					<>
						<MediaCardSkeleton />
						<MediaCardSkeleton />
						<MediaCardSkeleton />
					</>
				)}
				{trendingItems?.map((item, i) => {
					const imageUrl = item.primaryImage.url;
					const itemId = item.id;

					if (mediaType === "tv") {
						const tvProgress = tvProgressMap.get(itemId);
						return (
							<MediaCard
								key={`${itemId}-${i}`}
								id={itemId}
								title={item.titleText.text}
								imageUrl={imageUrl}
								onPress={() =>
									router.push({
										pathname: "/show-detail/[id]",
										params: { id: itemId },
									})
								}
								progress={
									tvProgress
										? {
												watchedEpisodes: tvProgress.watchedEpisodes,
												totalEpisodes: tvProgress.totalEpisodes,
												lastWatchedSeason: tvProgress.lastWatchedSeason,
												lastWatchedEpisode: tvProgress.lastWatchedEpisode,
												isFullyWatched: tvProgress.isFullyWatched,
											}
										: null
								}
							/>
						);
					}

					// Movie
					const movieProgress = movieProgressMap.get(itemId);
					return (
						<MovieCard
							key={`${itemId}-${i}`}
							title={item.titleText.text}
							imageUrl={imageUrl}
							onPress={() =>
								router.push({
									pathname: "/show-detail/[id]",
									params: { id: itemId },
								})
							}
							isWatched={movieProgress?.isWatched}
						/>
					);
				})}
				{isFetchingNextPage && <MediaCardSkeleton />}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
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
	},
	loadingText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "500",
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
