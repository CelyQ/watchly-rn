import { useFocusEffect } from "@react-navigation/native";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { $api, fetchClient } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const HEADER_HEIGHT = 60;

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
		data: likesData,
		isLoading: isLikesLoading,
		error: likesError,
		refetch: refetchLikes,
	} = $api.useQuery("get", "/api/v1/likes/list");

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
	const { shows, movies } = useMemo(() => {
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
	}, [detailQueries]);

	const isMyShowsLoading = isLikesLoading || isLoadingDetails;
	const isMyMoviesLoading = isLikesLoading || isLoadingDetails;
	const showsError =
		likesError ||
		(hasDetailsError ? new Error("Failed to load show details") : null);
	const moviesError =
		likesError ||
		(hasDetailsError ? new Error("Failed to load movie details") : null);

	useFocusEffect(
		useCallback(() => {
			void refetchLikes();
		}, [refetchLikes]),
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

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor="#000" />

			<Animated.ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
			>
				<View style={styles.section}>
					<Text style={styles.sectionLabel}>MY LIST</Text>
					<Text style={styles.sectionTitle}>Shows</Text>

					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.mediaScroll}
					>
						{isMyShowsLoading && (
							<Text style={styles.loadingText}>Loading...</Text>
						)}
						{showsError && (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>
									Error loading shows: {showsError.message}
								</Text>
							</View>
						)}
						{!isMyShowsLoading && !showsError && shows.length === 0 && (
							<View style={styles.emptyStateContainer}>
								<Text style={styles.emptyStateText}>
									Your shows list is empty
								</Text>
								<Pressable onPress={() => router.push("/")}>
									<Text style={styles.discoveryLinkText}>
										Discover new shows →
									</Text>
								</Pressable>
							</View>
						)}
						{shows.map((item, i) => {
							const title = item.details?.title?.titleText?.text ?? "";
							const imageUrl = item.details?.title?.primaryImage?.url;
							const placeholder = new URL(
								"https://via.placeholder.com/150x225/333/fff",
							);
							placeholder.searchParams.set("text", title);

							return (
								<MediaItem
									key={`${item.like.id}-${i}`}
									title={title}
									imageUrl={imageUrl ?? placeholder.toString()}
									onPress={() =>
										router.push({
											pathname: "/show-detail/[id]",
											params: { id: item.like.imdbId },
										})
									}
								/>
							);
						})}
					</ScrollView>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionLabel}>MY LIST</Text>
					<Text style={styles.sectionTitle}>Movies</Text>

					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.mediaScroll}
					>
						{isMyMoviesLoading && (
							<Text style={styles.loadingText}>Loading...</Text>
						)}
						{moviesError && (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>
									Error loading movies: {moviesError.message}
								</Text>
							</View>
						)}
						{!isMyMoviesLoading && !moviesError && movies.length === 0 && (
							<View style={styles.emptyStateContainer}>
								<Text style={styles.emptyStateText}>
									Your movies list is empty
								</Text>
								<Pressable onPress={() => router.push("/")}>
									<Text style={styles.discoveryLinkText}>
										Discover new movies →
									</Text>
								</Pressable>
							</View>
						)}
						{movies.map((item, i) => {
							const title = item.details?.title?.titleText?.text ?? "";
							const imageUrl = item.details?.title?.primaryImage?.url;
							const placeholder = new URL(
								"https://via.placeholder.com/150x225/333/fff",
							);
							placeholder.searchParams.set("text", title);

							return (
								<MediaItem
									key={`${item.like.id}-${i}`}
									title={title}
									imageUrl={imageUrl ?? placeholder.toString()}
									onPress={() =>
										router.push({
											pathname: "/show-detail/[id]",
											params: { id: item.like.imdbId },
										})
									}
								/>
							);
						})}
					</ScrollView>
				</View>
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
