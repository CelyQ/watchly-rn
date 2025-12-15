import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
	Animated,
	Image,
	SafeAreaView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { Search } from "react-native-feather";
import { TrendingMedia } from "@/components/trending-media";
import { authClient } from "@/lib/auth-client";

const HEADER_HEIGHT = 60;

// Function to calculate string similarity (0 to 1)
const calculateSimilarity = (str1: string, str2: string): number => {
	const s1 = str1.toLowerCase();
	const s2 = str2.toLowerCase();

	// Exact match
	if (s1 === s2) return 1;

	// Contains match
	if (s1.includes(s2) || s2.includes(s1)) return 0.8;

	// Calculate Levenshtein distance
	const matrix: number[][] = [];

	for (let i = 0; i <= s1.length; i++) {
		matrix[i] = [i];
	}

	for (let j = 0; j <= s2.length; j++) {
		if (matrix[0]) {
			matrix[0][j] = j;
		}
	}

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
	const [searchQuery, setSearchQuery] = useState("");

	const { data: searchResults, isLoading: isSearchLoading } = useQuery({
		queryKey: ["search", searchQuery],
		queryFn: async () => {
			if (!searchQuery.trim()) return null;
			const cookies = authClient.getCookie();
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/search?q=${encodeURIComponent(searchQuery)}`,
				{
					headers: {
						...(cookies ? { Cookie: cookies } : {}),
					},
					credentials: "omit",
				},
			);

			if (response.status === 429) {
				throw new Error("Rate limit exceeded");
			}

			const data = await response.json();
			return data;
		},
		enabled: searchQuery.trim().length > 0,
	});

	const sortedSearchResults = useMemo(() => {
		if (!searchResults || !searchQuery.trim()) return searchResults;

		return [...searchResults].sort((a, b) => {
			const similarityA = calculateSimilarity(a.titleText.text, searchQuery);
			const similarityB = calculateSimilarity(b.titleText.text, searchQuery);
			return similarityB - similarityA;
		});
	}, [searchResults, searchQuery]);

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
						value={searchQuery}
						onChangeText={setSearchQuery}
						keyboardAppearance="dark"
						selectionColor="#b14aed"
					/>
				</View>

				{searchQuery.trim().length > 0 && (
					<View style={styles.section}>
						<Text style={styles.sectionLabel}>SEARCH RESULTS</Text>
						<Text style={styles.sectionTitle}>Found</Text>

						<View style={styles.searchResultsContainer}>
							{isSearchLoading && (
								<Text style={styles.loadingText}>Searching...</Text>
							)}
							{sortedSearchResults?.map((item, i: number) => {
								const placeholder = new URL(
									"https://via.placeholder.com/150x225/333/fff",
								);
								placeholder.searchParams.set("text", item.titleText.text);

								return (
									<TouchableOpacity
										key={`${item.id}-${i}`}
										style={styles.searchResultItem}
										onPress={() =>
											router.push({
												pathname: "/show-detail/[id]",
												params: { id: item.id },
											})
										}
									>
										<Image
											source={{
												uri: item.primaryImage?.url ?? placeholder.toString(),
											}}
											style={styles.searchResultImage}
										/>
										<View style={styles.searchResultInfo}>
											<Text style={styles.searchResultTitle}>
												{item.titleText.text}
											</Text>
											{item.releaseYear && (
												<Text style={styles.searchResultYear}>
													{item.releaseYear.year}
												</Text>
											)}
										</View>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
				)}

				{searchQuery.trim().length === 0 && (
					<>
						<TrendingMedia mediaType="tv" title="Shows" />
						<TrendingMedia mediaType="movie" title="Movies" />
					</>
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
	loadingText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "500",
	},
	searchResultsContainer: {
		marginTop: 10,
	},
	searchResultItem: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 15,
		backgroundColor: "#222",
		borderRadius: 10,
		overflow: "hidden",
	},
	searchResultImage: {
		width: 80,
		height: 120,
	},
	searchResultInfo: {
		flex: 1,
		padding: 15,
	},
	searchResultTitle: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 5,
	},
	searchResultYear: {
		color: "#999",
		fontSize: 14,
	},
});

export default App;
