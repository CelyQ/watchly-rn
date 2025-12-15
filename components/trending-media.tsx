import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MediaItem } from "@/components/media-item";
import { $api } from "@/lib/api";

interface TrendingMediaProps {
	mediaType: "tv" | "movie";
	title: string;
}

export const TrendingMedia = ({ mediaType, title }: TrendingMediaProps) => {
	const router = useRouter();

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
				// Calculate next limit: 20 * (page number + 1)
				const nextLimit = 20 * (allPages.length + 1);
				// Stop at limit 100
				if (nextLimit > 100) {
					return undefined;
				}
				return nextLimit;
			},
		},
	);

	const trendingItems = useMemo(() => {
		if (!trendingData?.pages) return [];
		// Since API returns cumulative results, only take new items from each page
		let previousCount = 0;
		return trendingData.pages.flatMap((page) => {
			const allNodes =
				page.topMeterTitles?.edges?.map((edge) => edge.node) ?? [];
			// Only take new items (skip items we've already seen)
			const newNodes = allNodes.slice(previousCount);
			previousCount = allNodes.length;
			return newNodes;
		});
	}, [trendingData]);

	return (
		<View style={styles.section}>
			<Text style={styles.sectionLabel}>TRENDING</Text>
			<Text style={styles.sectionTitle}>{title}</Text>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.mediaScroll}
				onScroll={(event) => {
					const { contentOffset, contentSize, layoutMeasurement } =
						event.nativeEvent;
					const scrollPosition = contentOffset.x;
					const scrollWidth = contentSize.width;
					const containerWidth = layoutMeasurement.width;
					const distanceFromEnd =
						scrollWidth - scrollPosition - containerWidth;

					// Load more when within 2x container width of the end (more aggressive prefetching)
					const threshold = containerWidth * 2;
					if (
						distanceFromEnd < threshold &&
						hasNextPage &&
						!isFetchingNextPage
					) {
						void fetchNextPage();
					}
				}}
				scrollEventThrottle={16}
			>
				{isLoading && <Text style={styles.loadingText}>Loading...</Text>}
				{isError && (
					<Text style={styles.loadingText}>
						Error loading trending {mediaType === "tv" ? "shows" : "movies"}
					</Text>
				)}
				{trendingItems?.map((item, i) => {
					const imageUrl = item.primaryImage.url;

					return (
						<MediaItem
							key={`${item.id}-${i}`}
							title={item.titleText.text}
							imageUrl={imageUrl}
							onPress={() =>
								router.push({
									pathname: "/show-detail/[id]",
									params: { id: item.id },
								})
							}
						/>
					);
				})}
				{isFetchingNextPage && (
					<View style={styles.loadingMoreContainer}>
						<Text style={styles.loadingText}>Loading more...</Text>
					</View>
				)}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
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
	loadingMoreContainer: {
		width: 150,
		height: 225,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 15,
	},
});


