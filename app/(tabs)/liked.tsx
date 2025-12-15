import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
		data: myShows,
		isLoading: isMyShowsLoading,
		error: showsError,
	} = useQuery<
		Array<{
			id: string;
			titleText: { text: string };
			primaryImage?: { url: string };
		}>
	>({
		queryKey: ["my-shows"],
		queryFn: async () => {
			// Endpoint removed - return empty array
			return [];
		},
		retry: 2,
		enabled: false, // Disabled - endpoint removed
	});

	const {
		data: myMovies,
		isLoading: isMyMoviesLoading,
		error: moviesError,
	} = useQuery<
		Array<{
			id: string;
			titleText: { text: string };
			primaryImage?: { url: string };
		}>
	>({
		queryKey: ["my-movies"],
		queryFn: async () => {
			// Endpoint removed - return empty array
			return [];
		},
		retry: 2,
		enabled: false, // Disabled - endpoint removed
	});

	useFocusEffect(
		useCallback(() => {
			// Both refetchShows and refetchMovies removed - endpoints disabled
		}, []),
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
						{!isMyShowsLoading &&
							!showsError &&
							(!myShows || myShows.length === 0) && (
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
									<Pressable onPress={() => router.push("/")}>
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
