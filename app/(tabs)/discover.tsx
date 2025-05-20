import type { RapidAPIIMDBSearchResponseDataEntity } from "@/types/rapidapi.type";
import { useQuery } from "@tanstack/react-query";
import {
	SafeAreaView,
	StatusBar,
	StyleSheet,
	Text,
	View,
	ScrollView,
	TextInput,
	Animated,
	TouchableOpacity,
} from "react-native";
import { Search } from "react-native-feather";
import { useRouter } from "expo-router";
import { MediaItem } from "@/components/media-item";
import { useAuth } from "@clerk/clerk-expo";

const HEADER_HEIGHT = 60;

const App = () => {
	const router = useRouter();
	const { getToken } = useAuth();

	const { data: trendingTv, isLoading: isTrendingTvLoading } = useQuery({
		queryKey: ["trending-tv"],
		queryFn: async () => {
			const token = await getToken();
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/tv/trending`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (response.status === 429) {
				throw new Error("Rate limit exceeded");
			}

			const data = (await response.json()) as {
				tvshows: RapidAPIIMDBSearchResponseDataEntity[];
			};
			console.log({ data });
			return data.tvshows ?? null;
		},
		retry: true,
	});
	const { data: trendingMovies, isLoading: isTrendingMoviesLoading } = useQuery(
		{
			queryKey: ["trending-movies"],
			queryFn: async () => {
				const token = await getToken();
				console.log({ token });
				const response = await fetch(
					`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/movie/trending`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				);

				if (response.status === 429) {
					throw new Error("Rate limit exceeded");
				}

				const data = (await response.json()) as {
					movies: RapidAPIIMDBSearchResponseDataEntity[];
				};

				return data.movies ?? null;
			},
			retry: true,
		},
	);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor="#000" />

			<Animated.ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
				// onScroll={scrollHandler}
				scrollEventThrottle={16}
				contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
			>
				{/* Search Bar */}
				<View style={styles.searchBarContainer}>
					<Search
						stroke="#999"
						width={20}
						height={20}
						style={styles.searchBarIcon}
					/>
					<TextInput
						style={styles.searchInput}
						placeholder="Search"
						placeholderTextColor="#999"
					/>
				</View>
				<View style={styles.section}>
					<Text style={styles.sectionLabel}>TRENDING</Text>
					<Text style={styles.sectionTitle}>Shows</Text>

					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.mediaScroll}
					>
						{isTrendingTvLoading && (
							<Text style={styles.loadingText}>Loading...</Text>
						)}
						{trendingTv?.map((t, i) => {
							const placeholder = new URL(
								"https://via.placeholder.com/150x225/333/fff",
							);
							placeholder.searchParams.set("text", t.titleText.text);

							return (
								<MediaItem
									key={`${t.id}-${i}`}
									title={t.titleText.text}
									imageUrl={t.primaryImage?.url ?? placeholder.toString()}
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

				{/* Trending Movies */}
				<View style={styles.section}>
					<Text style={styles.sectionLabel}>TRENDING</Text>
					<Text style={styles.sectionTitle}>Movies</Text>

					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.mediaScroll}
					>
						{isTrendingMoviesLoading && (
							<Text style={styles.loadingText}>Loading...</Text>
						)}
						{trendingMovies?.map((m, i) => {
							const placeholder = new URL(
								"https://via.placeholder.com/150x225/333/fff",
							);
							placeholder.searchParams.set("text", m.titleText.text);

							return (
								<MediaItem
									key={`${m.id}-${i}`}
									title={m.titleText.text}
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
	searchBarContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#333",
		borderRadius: 10,
		marginHorizontal: 20,
		paddingHorizontal: 15,
		height: 50,
		marginTop: 20,
	},
	searchBarIcon: {
		marginRight: 10,
	},
	searchInput: {
		flex: 1,
		color: "#fff",
		fontSize: 16,
	},
	quickActions: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginHorizontal: 20,
		marginTop: 20,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#222",
		borderRadius: 10,
		paddingVertical: 15,
		paddingHorizontal: 20,
		width: "48%",
	},
	actionText: {
		color: "#b14aed",
		fontSize: 16,
		fontWeight: "500",
		marginLeft: 10,
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
	selectedBadge: {
		position: "absolute",
		top: 10,
		left: 10,
		backgroundColor: "#b14aed",
		borderRadius: 15,
		width: 30,
		height: 30,
		alignItems: "center",
		justifyContent: "center",
	},
	mediaTitle: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "500",
		marginTop: 8,
		textAlign: "center",
	},
	tabBar: {
		flexDirection: "row",
		justifyContent: "space-around",
		backgroundColor: "#000",
		paddingVertical: 10,
		borderTopWidth: 0,
		position: "absolute",
		bottom: 30,
		left: 0,
		right: 0,
	},
	tabItem: {
		alignItems: "center",
		justifyContent: "center",
		height: 50,
		width: 50,
	},
	homeIndicator: {
		width: 134,
		height: 5,
		backgroundColor: "#fff",
		borderRadius: 3,
		alignSelf: "center",
		position: "absolute",
		bottom: 8,
	},
	loadingText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "500",
	},
});

export default App;
