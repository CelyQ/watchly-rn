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

type TvShow = {
	imdbId: string;
	title: string | null;
	posterUrl: string | null;
	watchedEpisodes: number;
	totalEpisodes: number;
	totalSeasons: number | null;
	lastWatchedSeason: number | null;
	lastWatchedEpisode: number | null;
	isFullyWatched: boolean;
	updatedAt: string | number | Record<string, never>;
};

type Movie = {
	id: number;
	userId: string;
	imdbId: string;
	isWatched: boolean;
	updatedAt: string | number | Record<string, never>;
	title: string | null;
	posterUrl: string | null;
};

// Progress card for TV shows with episode info
const TvProgressCard = ({
	item,
	onPress,
	showProgress = true,
}: {
	item: TvShow;
	onPress: () => void;
	showProgress?: boolean;
}) => {
	const titleText = item.title ?? "Unknown";
	const imageUrl = item.posterUrl;
	const progress =
		item.totalEpisodes > 0 ? item.watchedEpisodes / item.totalEpisodes : 0;

	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={styles.progressCard}
		>
			{/* Poster */}
			{imageUrl ? (
				<Image
					key={imageUrl} // Force re-render when URL changes
					source={{ uri: imageUrl }}
					style={[
						styles.progressCardImage,
						item.isFullyWatched && styles.imageWatched,
					]}
					resizeMode="cover"
				/>
			) : (
				<View style={[styles.progressCardImage, styles.imagePlaceholder]}>
					<Text style={styles.placeholderText}>{titleText[0] ?? "?"}</Text>
				</View>
			)}

			{/* Progress bar */}
			{showProgress && !item.isFullyWatched && (
				<View style={styles.progressBarContainer}>
					<View
						style={[
							styles.progressBar,
							{ width: `${Math.min(progress * 100, 100)}%` },
						]}
					/>
				</View>
			)}

			{/* Completed badge */}
			{item.isFullyWatched && (
				<View style={styles.completedBadge}>
					<Text style={styles.completedBadgeText}>✓</Text>
				</View>
			)}

			{/* Title */}
			<Text style={styles.progressCardTitle} numberOfLines={2}>
				{titleText}
			</Text>

			{/* Episode info */}
			<Text style={styles.episodeInfo}>
				{item.watchedEpisodes}/{item.totalEpisodes} episodes
			</Text>

			{/* Last watched (only for in-progress shows) */}
			{!item.isFullyWatched &&
				item.lastWatchedSeason !== null &&
				item.lastWatchedEpisode !== null && (
					<Text style={styles.lastWatchedInfo}>
						S{item.lastWatchedSeason} E{item.lastWatchedEpisode}
					</Text>
				)}
		</TouchableOpacity>
	);
};

// Movie card (simpler, no progress info)
const MovieCard = ({ item, onPress }: { item: Movie; onPress: () => void }) => {
	const titleText = item.title ?? "Unknown";
	const imageUrl = item.posterUrl;

	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={styles.progressCard}
		>
			{imageUrl ? (
				<Image
					key={imageUrl} // Force re-render when URL changes
					source={{ uri: imageUrl }}
					style={styles.progressCardImage}
					resizeMode="cover"
				/>
			) : (
				<View style={[styles.progressCardImage, styles.imagePlaceholder]}>
					<Text style={styles.placeholderText}>{titleText[0] ?? "?"}</Text>
				</View>
			)}

			<View style={styles.completedBadge}>
				<Text style={styles.completedBadgeText}>✓</Text>
			</View>

			<Text style={styles.progressCardTitle} numberOfLines={2}>
				{titleText}
			</Text>

			<Text style={styles.episodeInfo}>Watched</Text>
		</TouchableOpacity>
	);
};

// Skeleton card component for loading state
const ProgressCardSkeleton = () => {
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
		<View style={styles.progressCard}>
			<Animated.View style={[styles.skeletonImage, { opacity }]} />
			<Animated.View style={[styles.skeletonTitle, { opacity }]} />
			<Animated.View style={[styles.skeletonSubtitle, { opacity }]} />
		</View>
	);
};

const Index = () => {
	const router = useRouter();

	const {
		data: progressData,
		isLoading: isProgressLoading,
		error: progressError,
	} = $api.useQuery("get", "/api/v1/progress/all", {
		staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
	});

	const movies = (progressData?.movies ?? []) as Movie[];
	const tvShows = (progressData?.tvShows ?? []) as TvShow[];

	// Get all unique imdbIds that need title details (missing title or posterUrl)
	const allImdbIds = (() => {
		const ids = new Set<string>();
		tvShows.forEach((show) => {
			if (!show.title || !show.posterUrl) {
				ids.add(show.imdbId);
			}
		});
		movies.forEach((movie) => {
			if (!movie.title || !movie.posterUrl) {
				ids.add(movie.imdbId);
			}
		});
		return Array.from(ids);
	})();

	// Fetch title details for ALL items that need them (React Query handles caching)
	// Use unique query key "progress-title-details" to avoid conflicts with liked.tsx
	const detailQueries = useQueries({
		queries: allImdbIds.map((imdbId) => ({
			queryKey: ["progress-title-details", imdbId],
			queryFn: async () => {
				const result = await fetchClient.GET("/api/v1/media/getTitleDetails", {
					params: { query: { tt: imdbId } },
				});
				return {
					imdbId,
					title: result.data?.title?.titleText?.text ?? null,
					posterUrl: result.data?.title?.primaryImage?.url ?? null,
				};
			},
			enabled: allImdbIds.length > 0,
			retry: 2,
			staleTime: 1000 * 60 * 60, // Cache for 1 hour
			gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
		})),
	});

	// Check if detail queries are still loading
	const isLoadingDetails = detailQueries.some((query) => query.isLoading);

	// Create a lookup map from the query results
	const detailsMap = (() => {
		const map = new Map<
			string,
			{ title: string | null; posterUrl: string | null }
		>();
		detailQueries.forEach((query) => {
			if (query.data?.imdbId) {
				map.set(query.data.imdbId, {
					title: query.data.title,
					posterUrl: query.data.posterUrl,
				});
			}
		});
		return map;
	})();

	// Categorize items into groups with enriched data
	const { progressTvShows, finishedSeries, finishedMovies } = (() => {
		const progressTv: TvShow[] = [];
		const finishedTv: TvShow[] = [];
		const finishedMov: Movie[] = [];

		// Categorize TV shows
		tvShows.forEach((show) => {
			const details = detailsMap.get(show.imdbId);
			const enrichedShow: TvShow = {
				...show,
				title: show.title ?? details?.title ?? null,
				posterUrl: show.posterUrl ?? details?.posterUrl ?? null,
			};

			if (show.isFullyWatched) {
				finishedTv.push(enrichedShow);
			} else if (show.watchedEpisodes > 0) {
				progressTv.push(enrichedShow);
			}
		});

		// Categorize movies (only finished movies)
		movies.forEach((movie) => {
			if (movie.isWatched) {
				const details = detailsMap.get(movie.imdbId);
				finishedMov.push({
					...movie,
					title: movie.title ?? details?.title ?? null,
					posterUrl: movie.posterUrl ?? details?.posterUrl ?? null,
				});
			}
		});

		return {
			progressTvShows: progressTv,
			finishedSeries: finishedTv,
			finishedMovies: finishedMov,
		};
	})();

	const renderTvShowSection = (
		label: string,
		title: string,
		items: TvShow[],
		sectionKey: string,
		showProgress = true,
	) => {
		const isLoading = isProgressLoading || isLoadingDetails;

		const renderItem = ({ item }: { item: TvShow; index: number }) => (
			<TvProgressCard
				item={item}
				showProgress={showProgress}
				onPress={() =>
					router.push({
						pathname: "/show-detail/[id]",
						params: { id: item.imdbId },
					})
				}
			/>
		);

		const renderHeader = () => {
			if (isLoading) {
				return (
					<View style={styles.skeletonRow}>
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
					</View>
				);
			}
			return null;
		};

		const renderEmpty = () => {
			if (!isLoading && !progressError && items.length === 0) {
				return (
					<View style={styles.emptyStateContainer}>
						<Text style={styles.emptyStateText}>
							No {title.toLowerCase()} yet
						</Text>
						<Pressable onPress={() => router.push("/")}>
							<Text style={styles.discoveryLinkText}>
								Discover new content →
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
		if (isLoading) {
			return (
				<View style={styles.section} key={sectionKey}>
					<Text style={styles.sectionLabel}>{label}</Text>
					<Text style={styles.sectionTitle}>{title}</Text>
					<View style={styles.skeletonRow}>
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
					</View>
				</View>
			);
		}

		return (
			<View style={styles.section} key={sectionKey}>
				<Text style={styles.sectionLabel}>{label}</Text>
				<Text style={styles.sectionTitle}>{title}</Text>

				{items.length === 0 ? (
					renderEmpty()
				) : (
					<FlatList
						data={items}
						renderItem={renderItem}
						keyExtractor={(item, index) =>
							`${item.imdbId}-${index}-${item.posterUrl ?? ""}`
						}
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

	const renderMovieSection = (
		label: string,
		title: string,
		items: Movie[],
		sectionKey: string,
	) => {
		const isLoading = isProgressLoading || isLoadingDetails;

		const renderItem = ({ item }: { item: Movie; index: number }) => (
			<MovieCard
				item={item}
				onPress={() =>
					router.push({
						pathname: "/show-detail/[id]",
						params: { id: item.imdbId },
					})
				}
			/>
		);

		const renderHeader = () => {
			if (isLoading) {
				return (
					<View style={styles.skeletonRow}>
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
					</View>
				);
			}
			return null;
		};

		const renderEmpty = () => {
			if (!isLoading && !progressError && items.length === 0) {
				return (
					<View style={styles.emptyStateContainer}>
						<Text style={styles.emptyStateText}>
							No {title.toLowerCase()} yet
						</Text>
						<Pressable onPress={() => router.push("/")}>
							<Text style={styles.discoveryLinkText}>
								Discover new content →
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
		if (isLoading) {
			return (
				<View style={styles.section} key={sectionKey}>
					<Text style={styles.sectionLabel}>{label}</Text>
					<Text style={styles.sectionTitle}>{title}</Text>
					<View style={styles.skeletonRow}>
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
						<ProgressCardSkeleton />
					</View>
				</View>
			);
		}

		return (
			<View style={styles.section} key={sectionKey}>
				<Text style={styles.sectionLabel}>{label}</Text>
				<Text style={styles.sectionTitle}>{title}</Text>

				{items.length === 0 ? (
					renderEmpty()
				) : (
					<FlatList
						data={items}
						renderItem={renderItem}
						keyExtractor={(item, index) =>
							`${item.imdbId}-${index}-${item.posterUrl ?? ""}`
						}
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

	const sections = [
		{
			type: "tv-progress",
			label: "IN PROGRESS",
			title: "TV Shows",
			items: progressTvShows,
			showProgress: true,
		},
		{
			type: "tv-finished",
			label: "COMPLETED",
			title: "TV Shows",
			items: finishedSeries,
			showProgress: false,
		},
		{
			type: "movies",
			label: "WATCHED",
			title: "Movies",
			items: finishedMovies,
			showProgress: false,
		},
	];

	const renderSection = ({
		item: section,
	}: {
		item: (typeof sections)[number];
	}) => {
		if (section.type === "movies") {
			return renderMovieSection(
				section.label,
				section.title,
				section.items,
				section.type,
			);
		}
		return renderTvShowSection(
			section.label,
			section.title,
			section.items,
			section.type,
			section.showProgress,
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
				initialNumToRender={3}
				maxToRenderPerBatch={3}
				windowSize={5}
				ListFooterComponent={<View style={{ height: 80 }} />}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0a0a0a",
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
	emptyStateContainer: {
		padding: 20,
		alignItems: "center",
	},
	emptyStateText: {
		color: "#666",
		fontSize: 14,
		marginBottom: 8,
	},
	discoveryLinkText: {
		color: "#b14aed",
		fontSize: 14,
		fontWeight: "600",
	},
	// Progress Card Styles
	progressCard: {
		width: CARD_WIDTH,
		marginRight: 12,
	},
	progressCardImage: {
		width: CARD_WIDTH,
		height: CARD_IMAGE_HEIGHT,
		borderRadius: 10,
		backgroundColor: "#1a1a1a",
	},
	imageWatched: {
		opacity: 0.7,
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
	progressCardTitle: {
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
		width: 80,
		height: 12,
		backgroundColor: "#1a1a1a",
		borderRadius: 4,
		marginBottom: 4,
	},
	skeletonSectionTitle: {
		width: 120,
		height: 24,
		backgroundColor: "#1a1a1a",
		borderRadius: 6,
		marginBottom: 14,
	},
});

export default Index;
