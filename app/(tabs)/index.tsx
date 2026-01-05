import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	FlatList,
	Image,
	Keyboard,
	Pressable,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { Search, X } from "react-native-feather";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { RecommendationRails } from "@/components/recommendation-rail";
import { TrendingMedia } from "@/components/trending-media";
import { $api } from "@/lib/api";

// Custom hook for debouncing values
const useDebouncedValue = <T,>(value: T, delay: number): T => {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => clearTimeout(timer);
	}, [value, delay]);

	return debouncedValue;
};

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

// Animated search result item component
const AnimatedSearchResult = ({
	item,
	index,
	onPress,
	tvProgress,
	movieProgress,
}: {
	item: {
		id: string;
		media_type: "movie" | "tv";
		title?: string;
		name?: string;
		poster_path: string | null;
		release_date?: string;
		first_air_date?: string;
		vote_average: number;
	};
	index: number;
	onPress: () => void;
	tvProgress?: TvShowProgress | null;
	movieProgress?: MovieProgress | null;
}) => {
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(20)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 300,
				delay: index * 50,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 300,
				delay: index * 50,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim, index]);

	const title = item.media_type === "movie" ? item.title : item.name;
	const releaseDate =
		item.media_type === "movie" ? item.release_date : item.first_air_date;
	const year = releaseDate?.split("-")[0];
	const posterUrl = item.poster_path
		? `https://image.tmdb.org/t/p/w500${item.poster_path}`
		: null;

	// Progress info
	const hasProgress =
		item.media_type === "tv"
			? tvProgress && tvProgress.watchedEpisodes > 0
			: movieProgress?.isWatched;
	const isCompleted =
		item.media_type === "tv"
			? tvProgress?.isFullyWatched
			: movieProgress?.isWatched;
	const progressPercent =
		tvProgress && tvProgress.totalEpisodes > 0
			? tvProgress.watchedEpisodes / tvProgress.totalEpisodes
			: 0;

	return (
		<Animated.View
			style={{
				opacity: fadeAnim,
				transform: [{ translateY: slideAnim }],
			}}
		>
			<TouchableOpacity
				style={styles.searchResultItem}
				onPress={onPress}
				activeOpacity={0.7}
			>
				{posterUrl ? (
					<View style={styles.posterContainer}>
						<Image
							key={posterUrl}
							source={{ uri: posterUrl }}
							style={[
								styles.searchResultImage,
								isCompleted && styles.imageWatched,
							]}
							resizeMode="cover"
						/>
						{isCompleted && (
							<View style={styles.completedBadge}>
								<Text style={styles.completedBadgeText}>✓</Text>
							</View>
						)}
					</View>
				) : (
					<View style={[styles.searchResultImage, styles.posterPlaceholder]}>
						<Search stroke="#444" width={24} height={24} />
					</View>
				)}
				<View style={styles.searchResultInfo}>
					<Text style={styles.searchResultTitle} numberOfLines={2}>
						{title}
					</Text>
					<View style={styles.searchResultMeta}>
						{year && <Text style={styles.searchResultYear}>{year}</Text>}
						<View style={styles.mediaTypeBadge}>
							<Text style={styles.mediaTypeText}>
								{item.media_type === "movie" ? "Movie" : "TV"}
							</Text>
						</View>
					</View>

					{/* Progress info for TV shows */}
					{item.media_type === "tv" && tvProgress && hasProgress && (
						<View style={styles.progressInfoContainer}>
							<Text style={styles.episodeInfo}>
								{tvProgress.watchedEpisodes}/{tvProgress.totalEpisodes} episodes
							</Text>
							{!tvProgress.isFullyWatched &&
								tvProgress.lastWatchedSeason !== null &&
								tvProgress.lastWatchedEpisode !== null && (
									<Text style={styles.lastWatchedInfo}>
										S{tvProgress.lastWatchedSeason} E
										{tvProgress.lastWatchedEpisode}
									</Text>
								)}
							{!tvProgress.isFullyWatched && (
								<View style={styles.progressBarContainer}>
									<View
										style={[
											styles.progressBar,
											{ width: `${Math.min(progressPercent * 100, 100)}%` },
										]}
									/>
								</View>
							)}
						</View>
					)}

					{/* Watched status for movies */}
					{item.media_type === "movie" && movieProgress?.isWatched && (
						<View style={styles.progressInfoContainer}>
							<Text style={styles.watchedStatus}>Watched</Text>
						</View>
					)}

					{/* Rating (only show if no progress info) */}
					{!hasProgress && item.vote_average > 0 && (
						<View style={styles.ratingContainer}>
							<Text style={styles.ratingText}>
								★ {item.vote_average.toFixed(1)}
							</Text>
						</View>
					)}
				</View>
			</TouchableOpacity>
		</Animated.View>
	);
};

// Loading skeleton for search results
const SearchResultSkeleton = () => {
	const shimmerAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(shimmerAnim, {
					toValue: 1,
					duration: 800,
					useNativeDriver: true,
				}),
				Animated.timing(shimmerAnim, {
					toValue: 0,
					duration: 800,
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
		<View style={styles.searchResultItem}>
			<Animated.View
				style={[styles.searchResultImage, styles.skeletonImage, { opacity }]}
			/>
			<View style={styles.searchResultInfo}>
				<Animated.View style={[styles.skeletonTitle, { opacity }]} />
				<Animated.View style={[styles.skeletonMeta, { opacity }]} />
			</View>
		</View>
	);
};

// Function to calculate string similarity (0 to 1)
const calculateSimilarity = (str1: string, str2: string): number => {
	const s1 = str1.toLowerCase();
	const s2 = str2.toLowerCase();

	if (s1 === s2) return 1;
	if (s1.includes(s2) || s2.includes(s1)) return 0.8;

	const matrix: number[][] = [];
	for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
	for (let j = 0; j <= s2.length; j++) if (matrix[0]) matrix[0][j] = j;

	for (let i = 1; i <= s1.length; i++) {
		for (let j = 1; j <= s2.length; j++) {
			const row = matrix[i];
			const prevRow = matrix[i - 1];
			if (row && prevRow) {
				if (s1[i - 1] === s2[j - 1]) {
					row[j] = prevRow[j - 1] ?? 0;
				} else {
					row[j] = Math.min(
						(prevRow[j - 1] ?? 0) + 1,
						(row[j - 1] ?? 0) + 1,
						(prevRow[j] ?? 0) + 1,
					);
				}
			}
		}
	}

	const maxLength = Math.max(s1.length, s2.length);
	const finalRow = matrix[s1.length];
	const finalValue = finalRow?.[s2.length] ?? 0;
	return 1 - finalValue / maxLength;
};

const App = () => {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedSearchQuery = useDebouncedValue(searchQuery, 400);
	const inputRef = useRef<TextInput>(null);
	const searchBarRef = useRef<View>(null);

	const { data: searchResults, isLoading: isSearchLoading } = $api.useQuery(
		"get",
		"/api/v1/media/search",
		{
			params: {
				query: {
					query: debouncedSearchQuery,
					page: 1,
				},
			},
		},
		{
			enabled: debouncedSearchQuery.trim().length > 0,
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

	const sortedSearchResults = (() => {
		if (!searchResults?.results || !debouncedSearchQuery.trim())
			return searchResults?.results;

		// Limit sorting to first 50 results for performance
		const resultsToSort = searchResults.results.slice(0, 50);
		const rest = searchResults.results.slice(50);

		const sorted = [...resultsToSort].sort((a, b) => {
			const titleA = a.media_type === "movie" ? a.title : a.name;
			const titleB = b.media_type === "movie" ? b.title : b.name;
			const similarityA = calculateSimilarity(titleA, debouncedSearchQuery);
			const similarityB = calculateSimilarity(titleB, debouncedSearchQuery);
			return similarityB - similarityA;
		});

		return [...sorted, ...rest];
	})();

	const isSearchActive = searchQuery.trim().length > 0;

	const clearSearch = useCallback(() => {
		setSearchQuery("");
		inputRef.current?.blur();
		Keyboard.dismiss();
	}, []);

	const renderSearchResult = useCallback(
		({
			item,
			index,
		}: {
			item: NonNullable<typeof sortedSearchResults>[number];
			index: number;
		}) => (
			<AnimatedSearchResult
				item={item}
				index={index}
				onPress={() =>
					router.push({
						pathname: "/show-detail/[id]",
						params: { id: item.id },
					})
				}
				tvProgress={tvProgressMap.get(item.id)}
				movieProgress={movieProgressMap.get(item.id)}
			/>
		),
		[tvProgressMap, movieProgressMap, router],
	);

	const renderSearchHeader = useCallback(
		() => (
			<View style={styles.searchResultsSection}>
				<View style={styles.resultsHeader}>
					<Text style={styles.resultsTitle}>Results</Text>
					{sortedSearchResults && sortedSearchResults.length > 0 && (
						<Text style={styles.resultsCount}>
							{sortedSearchResults.length} found
						</Text>
					)}
				</View>

				{isSearchLoading && (
					<View>
						<SearchResultSkeleton />
						<SearchResultSkeleton />
						<SearchResultSkeleton />
					</View>
				)}

				{!isSearchLoading && sortedSearchResults?.length === 0 && (
					<View style={styles.emptyState}>
						<Search stroke="#333" width={48} height={48} />
						<Text style={styles.emptyStateText}>No results found</Text>
						<Text style={styles.emptyStateSubtext}>
							Try a different search term
						</Text>
					</View>
				)}
			</View>
		),
		[sortedSearchResults, isSearchLoading],
	);

	const renderMainContent = useCallback(
		() => (
			<>
				<TrendingMedia mediaType="tv" title="Shows" />
				<TrendingMedia mediaType="movie" title="Movies" />
				<RecommendationRails />
			</>
		),
		[],
	);

	const listData = useMemo(
		() => (isSearchActive ? (sortedSearchResults ?? []) : []),
		[isSearchActive, sortedSearchResults],
	);

	const renderItem = useCallback(
		({ item, index }: { item: unknown; index: number }) => {
			if (isSearchActive && item) {
				return renderSearchResult({
					item: item as NonNullable<typeof sortedSearchResults>[number],
					index,
				});
			}
			return null;
		},
		[isSearchActive, renderSearchResult],
	);

	const listHeaderComponent = useCallback(
		() => <>{isSearchActive ? renderSearchHeader() : renderMainContent()}</>,
		[isSearchActive, renderSearchHeader, renderMainContent],
	);

	return (
		<SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
			<StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

			{/* Search Bar - Always rendered outside FlatList to maintain focus */}
			<View ref={searchBarRef} style={styles.searchBarWrapper}>
				<View style={styles.searchBarContainer}>
					<Search
						stroke="#666"
						width={20}
						height={20}
						style={styles.searchBarIcon}
					/>
					<TextInput
						ref={inputRef}
						style={styles.searchInput}
						placeholder="Search movies & shows..."
						placeholderTextColor="#555"
						value={searchQuery}
						onChangeText={setSearchQuery}
						keyboardAppearance="dark"
						selectionColor="#b14aed"
						returnKeyType="search"
					/>
					{searchQuery.length > 0 && (
						<Pressable onPress={clearSearch} style={styles.clearButton}>
							<X stroke="#666" width={18} height={18} />
						</Pressable>
					)}
				</View>
				{isSearchActive && (
					<Pressable onPress={clearSearch} style={styles.cancelButton}>
						<Text style={styles.cancelButtonText}>Cancel</Text>
					</Pressable>
				)}
			</View>

			<FlatList
				style={styles.scrollView}
				data={listData}
				renderItem={renderItem}
				keyExtractor={(item, index) =>
					isSearchActive ? `${item.id}-${index}` : `empty-${index}`
				}
				ListHeaderComponent={listHeaderComponent}
				contentContainerStyle={{
					paddingBottom: 49 + insets.bottom, // Tab bar height (49px) + safe area only
				}}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="always"
				removeClippedSubviews={isSearchActive}
				initialNumToRender={isSearchActive ? 10 : 1}
				maxToRenderPerBatch={isSearchActive ? 10 : 1}
				windowSize={isSearchActive ? 10 : 5}
				getItemLayout={
					isSearchActive
						? (_, index) => ({
								length: 152, // Approximate height of search result item (128 image + 24 margin)
								offset: 152 * index,
								index,
							})
						: undefined
				}
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
	searchBarWrapper: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	searchBarContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#161616",
		borderRadius: 12,
		paddingHorizontal: 14,
		height: 48,
		flex: 1,
	},
	cancelButton: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		justifyContent: "center",
	},
	cancelButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "500",
	},
	searchBarIcon: {
		marginRight: 10,
	},
	searchInput: {
		flex: 1,
		color: "#fff",
		fontSize: 16,
	},
	clearButton: {
		padding: 6,
		marginLeft: 4,
		borderRadius: 10,
		backgroundColor: "#252525",
	},
	searchResultsSection: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	resultsHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	resultsTitle: {
		color: "#fff",
		fontSize: 24,
		fontWeight: "700",
	},
	resultsCount: {
		color: "#666",
		fontSize: 14,
	},
	searchResultItem: {
		flexDirection: "row",
		backgroundColor: "#161616",
		borderRadius: 12,
		marginBottom: 12,
		overflow: "hidden",
	},
	posterContainer: {
		position: "relative",
	},
	searchResultImage: {
		width: 85,
		height: 128,
		backgroundColor: "#1a1a1a",
	},
	imageWatched: {
		opacity: 0.7,
	},
	completedBadge: {
		position: "absolute",
		top: 6,
		right: 6,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: "#b14aed",
		justifyContent: "center",
		alignItems: "center",
	},
	completedBadgeText: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "bold",
	},
	posterPlaceholder: {
		justifyContent: "center",
		alignItems: "center",
	},
	searchResultInfo: {
		flex: 1,
		padding: 14,
		justifyContent: "center",
	},
	searchResultTitle: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 6,
		lineHeight: 22,
	},
	searchResultMeta: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	searchResultYear: {
		color: "#888",
		fontSize: 14,
	},
	mediaTypeBadge: {
		backgroundColor: "#252525",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	mediaTypeText: {
		color: "#888",
		fontSize: 11,
		fontWeight: "600",
		textTransform: "uppercase",
	},
	progressInfoContainer: {
		marginTop: 8,
	},
	episodeInfo: {
		color: "#888",
		fontSize: 12,
	},
	lastWatchedInfo: {
		color: "#b14aed",
		fontSize: 12,
		fontWeight: "600",
		marginTop: 2,
	},
	progressBarContainer: {
		width: "100%",
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
	watchedStatus: {
		color: "#b14aed",
		fontSize: 12,
		fontWeight: "600",
	},
	ratingContainer: {
		marginTop: 8,
	},
	ratingText: {
		color: "#f5c518",
		fontSize: 13,
		fontWeight: "600",
	},
	emptyState: {
		alignItems: "center",
		paddingVertical: 60,
	},
	emptyStateText: {
		color: "#666",
		fontSize: 18,
		fontWeight: "600",
		marginTop: 16,
	},
	emptyStateSubtext: {
		color: "#444",
		fontSize: 14,
		marginTop: 4,
	},
	skeletonImage: {
		backgroundColor: "#1f1f1f",
	},
	skeletonTitle: {
		height: 18,
		width: "70%",
		backgroundColor: "#1f1f1f",
		borderRadius: 4,
		marginBottom: 8,
	},
	skeletonMeta: {
		height: 14,
		width: "40%",
		backgroundColor: "#1f1f1f",
		borderRadius: 4,
	},
});

export default App;
