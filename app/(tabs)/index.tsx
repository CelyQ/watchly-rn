import type { RapidAPIIMDBSearchResponseDataEntity } from "@/types/rapidapi.type";
import { useQuery } from "@tanstack/react-query";
import {
	SafeAreaView,
	StatusBar,
	StyleSheet,
	Text,
	View,
	ScrollView,
	Animated,
	Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { MediaItem } from "@/components/media-item";
import { useAuth } from "@clerk/clerk-expo";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

const HEADER_HEIGHT = 60;

const Index = () => {
	const router = useRouter();
	const { getToken, isLoaded, isSignedIn } = useAuth();
	const [isAuthReady, setIsAuthReady] = useState(false);

	useEffect(() => {
		if (isLoaded) {
			setIsAuthReady(true);
		}
	}, [isLoaded]);

	const {
		data: myShows,
		isLoading: isMyShowsLoading,
		error: showsError,
		refetch: refetchShows,
	} = useQuery({
		queryKey: ["my-shows"],
		queryFn: async () => {
			if (!isSignedIn) {
				throw new Error("Not authenticated");
			}

			const token = await getToken();
			if (!token) {
				throw new Error("No auth token available");
			}

			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/tv/saved`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (response.status === 429) {
				throw new Error("Rate limit exceeded");
			}

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			const data = (await response.json()) as {
				tvShows: {
					overview: RapidAPIIMDBSearchResponseDataEntity;
				}[];
			};

			return data.tvShows.map((t) => t.overview);
		},
		retry: 2,
		enabled: isAuthReady && isSignedIn,
	});

	const {
		data: myMovies,
		isLoading: isMyMoviesLoading,
		error: moviesError,
		refetch: refetchMovies,
	} = useQuery({
		queryKey: ["my-movies"],
		queryFn: async () => {
			if (!isSignedIn) {
				throw new Error("Not authenticated");
			}

			const token = await getToken();
			if (!token) {
				throw new Error("No auth token available");
			}

			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/movie/saved`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (response.status === 429) {
				throw new Error("Rate limit exceeded");
			}

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			const data = (await response.json()) as {
				movies: {
					overview: RapidAPIIMDBSearchResponseDataEntity;
				}[];
			};

			return data.movies.map((m) => m.overview);
		},
		retry: 2,
		enabled: isAuthReady && isSignedIn,
	});

	useFocusEffect(
		useCallback(() => {
			if (isAuthReady && isSignedIn) {
				void refetchShows();
				void refetchMovies();
			}
		}, [isAuthReady, isSignedIn, refetchShows, refetchMovies]),
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

	if (!isSignedIn) {
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
						{!isMyShowsLoading &&
							!showsError &&
							(!myShows || myShows.length === 0) && (
								<View style={styles.emptyStateContainer}>
									<Text style={styles.emptyStateText}>
										Your shows list is empty
									</Text>
									<Pressable onPress={() => router.push("/discover")}>
										<Text style={styles.discoveryLinkText}>
											Discover new shows →
										</Text>
									</Pressable>
								</View>
							)}
						{myShows?.map((t, i) => {
							const placeholder = new URL(
								"https://via.placeholder.com/150x225/333/fff",
							);
							placeholder.searchParams.set("text", t.titleText.text);

							return (
								<MediaItem
									key={`${t.id}-${i}`}
									title={t?.titleText?.text ?? ""}
									imageUrl={t?.primaryImage?.url ?? placeholder.toString()}
									onPress={() =>
										router.push({
											pathname: "/show-detail/[id]",
											params: { id: t.id },
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
						{!isMyMoviesLoading &&
							!moviesError &&
							(!myMovies || myMovies.length === 0) && (
								<View style={styles.emptyStateContainer}>
									<Text style={styles.emptyStateText}>
										Your movies list is empty
									</Text>
									<Pressable onPress={() => router.push("/discover")}>
										<Text style={styles.discoveryLinkText}>
											Discover new movies →
										</Text>
									</Pressable>
								</View>
							)}
						{myMovies?.map((m, i) => {
							const placeholder = new URL(
								"https://via.placeholder.com/150x225/333/fff",
							);
							placeholder.searchParams.set("text", m?.titleText?.text ?? "");

							return (
								<MediaItem
									key={`${m.id}-${i}`}
									title={m?.titleText?.text ?? ""}
									imageUrl={m.primaryImage?.url ?? placeholder.toString()}
									onPress={() =>
										router.push({
											pathname: "/show-detail/[id]",
											params: { id: m.id },
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
