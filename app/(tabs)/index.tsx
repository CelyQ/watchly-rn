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
} from "react-native";
import { useRouter } from "expo-router";
import { MediaItem } from "@/components/media-item";

const HEADER_HEIGHT = 60;

const Index = () => {
	const router = useRouter();
	const { data: myShows, isLoading: isMyShowsLoading } = useQuery({
		queryKey: ["my-shows"],
		queryFn: async () => {
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/user/shows`,
			);

			if (response.status === 429) {
				throw new Error("Rate limit exceeded");
			}

			const data = (await response.json()) as {
				shows: RapidAPIIMDBSearchResponseDataEntity[];
			};

			return data.shows ?? null;
		},
		retry: true,
	});

	const { data: myMovies, isLoading: isMyMoviesLoading } = useQuery({
		queryKey: ["my-movies"],
		queryFn: async () => {
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/user/movies`,
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
	});

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
						{myShows?.map((t, i) => {
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
						{myMovies?.map((m, i) => {
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
});

export default Index;
