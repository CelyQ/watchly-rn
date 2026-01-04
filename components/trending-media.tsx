import { useRouter } from "expo-router";
import {
	FlatList,
	Image,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { $api } from "@/lib/api";
import { MediaCardSkeleton } from "./media-card-skeleton";
import { MovieCard } from "./movie-card";

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
	title,
	imageUrl,
	onPress,
	progress,
}: {
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
				resizeMode="cover"
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

	const trendingItems = (() => {
		if (!trendingData?.pages) return [];
		let previousCount = 0;
		return trendingData.pages.flatMap((page) => {
			const allNodes =
				page.topMeterTitles?.edges?.map((edge) => edge.node) ?? [];
			const newNodes = allNodes.slice(previousCount);
			previousCount = allNodes.length;
			return newNodes;
		});
	})();

	// Hide section if there's an error (backend API issue)
	if (isError && !isLoading) {
		return null;
	}

	const renderItem = ({
		item,
	}: {
		item: (typeof trendingItems)[0];
		index: number;
	}) => {
		const imageUrl = item.primaryImage.url;
		const itemId = item.id;

		if (mediaType === "tv") {
			const tvProgress = tvProgressMap.get(itemId);
			return (
				<MediaCard
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
	};

	const renderFooter = () => {
		if (isFetchingNextPage) {
			return (
				<View style={styles.skeletonRow}>
					<MediaCardSkeleton />
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

	// Show skeleton loading state
	if (isLoading) {
		return (
			<View style={styles.section}>
				<Text style={styles.sectionLabel}>TRENDING</Text>
				<Text style={styles.sectionTitle}>{title}</Text>
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

	return (
		<View style={styles.section}>
			<Text style={styles.sectionLabel}>TRENDING</Text>
			<Text style={styles.sectionTitle}>{title}</Text>

			<FlatList
				data={trendingItems}
				renderItem={renderItem}
				keyExtractor={(item, index) => `${item.id}-${index}`}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.mediaScrollContent}
				style={styles.mediaScroll}
				onEndReached={() => {
					if (hasNextPage && !isFetchingNextPage) {
						void fetchNextPage();
					}
				}}
				onEndReachedThreshold={0.5}
				ListFooterComponent={renderFooter}
				getItemLayout={getItemLayout}
				removeClippedSubviews={true}
			/>
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
	// Media Card Styles (for MediaCard component)
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
