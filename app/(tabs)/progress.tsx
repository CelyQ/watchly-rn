import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Pressable,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MediaItem } from "@/components/media-item";
import { $api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const HEADER_HEIGHT = 60;

// Skeleton card component for loading state
const MediaItemSkeleton = () => {
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
		<View style={skeletonStyles.mediaItem}>
			<Animated.View style={[skeletonStyles.mediaImage, { opacity }]} />
			<Animated.View style={[skeletonStyles.mediaTitle, { opacity }]} />
		</View>
	);
};

const skeletonStyles = StyleSheet.create({
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
	mediaTitle: {
		height: 16,
		width: 100,
		borderRadius: 4,
		backgroundColor: "#333",
		marginTop: 8,
		alignSelf: "center",
	},
});

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

const Index = () => {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [isAuthReady, setIsAuthReady] = useState(false);

	useEffect(() => {
		if (!isPending) {
			setIsAuthReady(true);
		}
	}, [isPending]);

	const {
		data: progressData,
		isLoading: isProgressLoading,
		error: progressError,
		refetch: refetchProgress,
	} = $api.useQuery("get", "/api/v1/progress/all");

	const movies = (progressData?.movies ?? []) as Movie[];
	const tvShows = (progressData?.tvShows ?? []) as TvShow[];

	// Categorize items into groups
	const { progressTvShows, finishedSeries, finishedMovies } = useMemo(() => {
		const progressTv: TvShow[] = [];
		const finishedTv: TvShow[] = [];
		const finishedMov: Movie[] = [];

		// Categorize TV shows
		tvShows.forEach((show) => {
			if (show.isFullyWatched) {
				finishedTv.push(show);
			} else if (show.watchedEpisodes > 0) {
				progressTv.push(show);
			}
		});

		// Categorize movies (only finished movies)
		movies.forEach((movie) => {
			if (movie.isWatched) {
				finishedMov.push(movie);
			}
		});

		return {
			progressTvShows: progressTv,
			finishedSeries: finishedTv,
			finishedMovies: finishedMov,
		};
	}, [movies, tvShows]);

	useFocusEffect(
		useCallback(() => {
			void refetchProgress();
		}, [refetchProgress]),
	);

	if (!isAuthReady) {
		return (
			<SafeAreaView style={styles.container}>
				<StatusBar barStyle="light-content" backgroundColor="#000" />
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Loading...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!session?.user) {
		return (
			<SafeAreaView style={styles.container}>
				<StatusBar barStyle="light-content" backgroundColor="#000" />
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Please sign in to continue</Text>
				</View>
			</SafeAreaView>
		);
	}

	const renderTvShowSection = (
		label: string,
		title: string,
		items: TvShow[],
		sectionKey: string,
	) => {
		return (
			<View style={styles.section} key={sectionKey}>
				<Text style={styles.sectionLabel}>{label}</Text>
				<Text style={styles.sectionTitle}>{title}</Text>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.mediaScroll}
				>
					{isProgressLoading && (
						<>
							<MediaItemSkeleton />
							<MediaItemSkeleton />
							<MediaItemSkeleton />
						</>
					)}
					{!isProgressLoading && !progressError && items.length === 0 && (
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
					)}
					{!isProgressLoading &&
						items.map((item, i) => {
							const titleText = item.title ?? "";
							const imageUrl = item.posterUrl;
							const placeholder = new URL(
								"https://via.placeholder.com/150x225/333/fff",
							);
							placeholder.searchParams.set("text", titleText || "No Title");

							return (
								<MediaItem
									key={`${item.imdbId}-${i}`}
									title={titleText}
									imageUrl={
										imageUrl && imageUrl.trim() !== ""
											? imageUrl
											: placeholder.toString()
									}
									onPress={() =>
										router.push({
											pathname: "/show-detail/[id]",
											params: { id: item.imdbId },
										})
									}
								/>
							);
						})}
				</ScrollView>
			</View>
		);
	};

	const renderMovieSection = (
		label: string,
		title: string,
		items: Movie[],
		sectionKey: string,
	) => {
		return (
			<View style={styles.section} key={sectionKey}>
				<Text style={styles.sectionLabel}>{label}</Text>
				<Text style={styles.sectionTitle}>{title}</Text>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.mediaScroll}
				>
					{isProgressLoading && (
						<>
							<MediaItemSkeleton />
							<MediaItemSkeleton />
							<MediaItemSkeleton />
						</>
					)}
					{!isProgressLoading && !progressError && items.length === 0 && (
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
					)}
					{!isProgressLoading &&
						items.map((item, i) => {
							const titleText = item.title ?? "";
							const imageUrl = item.posterUrl;
							const placeholder = new URL(
								"https://via.placeholder.com/150x225/333/fff",
							);
							placeholder.searchParams.set("text", titleText || "No Title");

							return (
								<MediaItem
									key={`${item.imdbId}-${i}`}
									title={titleText}
									imageUrl={
										imageUrl && imageUrl.trim() !== ""
											? imageUrl
											: placeholder.toString()
									}
									onPress={() =>
										router.push({
											pathname: "/show-detail/[id]",
											params: { id: item.imdbId },
										})
									}
								/>
							);
						})}
				</ScrollView>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor="#000" />

			<Animated.ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
			>
				{renderTvShowSection(
					"PROGRESS",
					"TV Shows",
					progressTvShows,
					"progress-tv",
				)}
				{renderTvShowSection(
					"WATCHED",
					"TV Shows",
					finishedSeries,
					"finished-tv",
				)}
				{renderMovieSection(
					"WATCHED",
					"Movies",
					finishedMovies,
					"finished-movies",
				)}
				<View style={{ height: 80 }} />
			</Animated.ScrollView>
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
		marginTop: 30,
		paddingHorizontal: 20,
	},
	sectionLabel: {
		color: "#666",
		fontSize: 14,
		fontWeight: "500",
	},
	sectionTitle: {
		color: "#fff",
		fontSize: 28,
		fontWeight: "bold",
		marginBottom: 15,
	},
	mediaScroll: {
		marginLeft: -10,
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
});

export default Index;
