import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { FC } from "react";
import React, { useEffect, useMemo, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import {
	Animated,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { ArrowLeft, Heart } from "react-native-feather";
import { queryClient } from "@/app/_layout";
import { SeasonCard } from "@/components/season-card";
import { ShowDetailSkeleton } from "@/components/show-detail-skeleton";
import { $api, fetchClient } from "@/lib/api";

async function fetchAllEpisodesForShow(imdbId: string) {
	const seasonsResult = await fetchClient.GET("/api/v1/media/getTitleSeasons", {
		params: {
			query: {
				tt: imdbId,
			},
		},
	});

	const seasonsJson = seasonsResult.data;

	if (!seasonsJson) {
		return [];
	}

	const seasonEdges =
		seasonsJson.title?.episodes?.displayableSeasons?.edges ?? [];
	const seasonNumbers = seasonEdges
		.map((edge) => edge?.node?.season)
		.filter((s): s is string => Boolean(s))
		.map((s) => Number.parseInt(s, 10))
		.filter((n) => !Number.isNaN(n));

	const episodeResults = await Promise.all(
		seasonNumbers.map((seasonNumber) =>
			fetchClient.GET("/api/v1/media/getTitleEpisodes", {
				params: {
					query: {
						tt: imdbId,
						seasonNumber,
					},
				},
			}),
		),
	);

	const episodes: { seasonNumber: number; episodeNumber: number }[] = [];

	for (let index = 0; index < episodeResults.length; index++) {
		const result = episodeResults[index];
		if (!result || !result.data) continue;

		const seasonNumber = seasonNumbers[index];
		if (seasonNumber === undefined) continue;

		const episodeEdges = result.data.title?.episodes?.episodes?.edges ?? [];

		for (const edge of episodeEdges) {
			if (!edge) continue;
			episodes.push({
				seasonNumber,
				episodeNumber: edge.position,
			});
		}
	}

	return episodes;
}

const ShowDetail: FC = () => {
	const router = useRouter();
	const { id } = useLocalSearchParams();
	const imdbId = String(id);
	const pulseAnim = new Animated.Value(1);

	// Animation values for sticky header
	const scrollY = new Animated.Value(0);
	const headerHeight = 340;
	const maxHeaderHeight = 500;

	const { data: likedData, refetch: refetchLiked } = $api.useQuery(
		"get",
		"/api/v1/likes/check",
		{
			params: {
				query: {
					imdbId,
				},
			},
		},
	);

	const isLiked = likedData?.liked ?? false;
	const [watched, setWatched] = useState(false);
	const [isRemovingFromWatched, setIsRemovingFromWatched] = useState(false);

	const { mutateAsync: toggleLike, isPending: isTogglingLike } =
		$api.useMutation("post", "/api/v1/likes/toggle");

	const { data: allProgressData, isLoading: isProgressLoading } = $api.useQuery(
		"get",
		"/api/v1/progress/all",
	);

	const {
		mutateAsync: markMovieAsWatched,
		isPending: isMarkingMovieAsWatched,
	} = $api.useMutation("put", "/api/v1/progress/movie", {
		onSuccess: () => {
			setWatched(true);
			queryClient.invalidateQueries({
				queryKey: ["get", "/api/v1/progress/all"],
			});
			queryClient.invalidateQueries({
				queryKey: ["my-movies"],
			});
		},
	});

	const {
		mutateAsync: markAllEpisodesAsWatched,
		isPending: isMarkingAllEpisodesAsWatched,
	} = $api.useMutation("post", "/api/v1/progress/mark-all-tv", {
		onSuccess: () => {
			setWatched(true);
			queryClient.invalidateQueries({
				queryKey: ["get", "/api/v1/progress/all"],
			});
			queryClient.invalidateQueries({
				queryKey: ["my-shows"],
			});
		},
	});

	const { mutateAsync: unmarkAllEpisodesAsWatched } = $api.useMutation(
		"post",
		"/api/v1/progress/mark-all-tv",
		{
			onSuccess: () => {
				setWatched(false);
				queryClient.invalidateQueries({
					queryKey: ["get", "/api/v1/progress/all"],
				});
				queryClient.invalidateQueries({
					queryKey: ["my-shows"],
				});
			},
		},
	);

	const handleMarkAsWatched = async () => {
		if (isSeries) {
			const episodes = await fetchAllEpisodesForShow(String(id));

			if (episodes.length === 0) return;

			await markAllEpisodesAsWatched({
				body: {
					imdbId: String(id),
					episodes,
					isWatched: true,
				},
			});
		} else {
			await markMovieAsWatched({
				body: {
					imdbId: String(id),
					isWatched: true,
				},
			});
		}
	};

	const handleRemoveFromWatched = async () => {
		setIsRemovingFromWatched(true);
		try {
			if (isSeries) {
				const episodes = await fetchAllEpisodesForShow(String(id));
				if (episodes.length === 0) return;

				await unmarkAllEpisodesAsWatched({
					body: {
						imdbId: String(id),
						episodes,
						isWatched: false,
					},
				});
			} else {
				await markMovieAsWatched({
					body: {
						imdbId: String(id),
						isWatched: false,
					},
				});
			}
		} finally {
			setIsRemovingFromWatched(false);
		}
	};

	useEffect(() => {
		if (isTogglingLike) {
			Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 0.5,
						duration: 1500,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 1500,
						useNativeDriver: true,
					}),
				]),
			).start();
		} else {
			pulseAnim.setValue(1);
		}
	}, [isTogglingLike, pulseAnim]);

	const { data: details, isLoading } = $api.useQuery(
		"get",
		"/api/v1/media/getTitleDetails",
		{
			params: {
				query: {
					tt: imdbId,
				},
			},
		},
	);

	const { data: plotData } = $api.useQuery(
		"get",
		"/api/v1/media/getTitlePlot",
		{
			params: {
				query: {
					tt: imdbId,
				},
			},
		},
	);

	const { data: castData } = $api.useQuery(
		"get",
		"/api/v1/media/getTopCastCrew",
		{
			params: {
				query: {
					tt: imdbId,
				},
			},
		},
	);

	const data = details?.title;
	const isSeries = data?.titleType?.isSeries === true;

	const shouldFetchSeasons =
		!isLoading && details !== undefined && data?.titleType?.isSeries === true;

	const { data: seasonsData } = useQuery({
		queryKey: ["get", "/api/v1/media/getTitleSeasons", { tt: imdbId }],
		queryFn: async () => {
			const result = await fetchClient.GET("/api/v1/media/getTitleSeasons", {
				params: {
					query: {
						tt: imdbId,
					},
				},
			});
			return result.data;
		},
		enabled: shouldFetchSeasons,
	});

	const plot = plotData?.title?.plot;
	const castTitle = castData?.title;
	const seasonsTitle = seasonsData?.title;

	// Get progress for this specific show/movie
	const showEpisodes = useMemo(() => {
		if (!allProgressData?.episodes) return [];
		return allProgressData.episodes.filter((ep) => ep.imdbId === imdbId);
	}, [allProgressData?.episodes, imdbId]);

	const showMovieProgress = useMemo(() => {
		if (!allProgressData?.movies) return null;
		return allProgressData.movies.find((m) => m.imdbId === imdbId);
	}, [allProgressData?.movies, imdbId]);

	// Calculate season progress and watched status
	const seasonProgress = useMemo(() => {
		if (!isSeries || !seasonsTitle?.episodes?.displayableSeasons?.edges) {
			return new Map<number, { progress: number; isWatched: boolean }>();
		}

		const seasonEdges = seasonsTitle.episodes.displayableSeasons.edges;
		const progressMap = new Map<
			number,
			{ progress: number; isWatched: boolean }
		>();

		// Fetch episode counts for each season to calculate accurate progress
		// For now, we'll calculate based on episodes we know about
		for (const seasonEdge of seasonEdges) {
			const seasonNum = Number.parseInt(seasonEdge.node.season, 10);
			if (Number.isNaN(seasonNum)) continue;

			const seasonEpisodes = showEpisodes.filter(
				(ep) => ep.seasonNumber === seasonNum,
			);
			const watchedEpisodes = seasonEpisodes.filter((ep) => ep.isWatched);

			// Calculate progress: if we have episodes, use them; otherwise 0
			// Note: This is based on episodes we know about, not total episodes
			// For accurate progress, we'd need to fetch episode counts per season
			const progress =
				seasonEpisodes.length > 0
					? watchedEpisodes.length / seasonEpisodes.length
					: 0;
			const isWatched =
				seasonEpisodes.length > 0 &&
				watchedEpisodes.length === seasonEpisodes.length;

			progressMap.set(seasonNum, { progress, isWatched });
		}

		return progressMap;
	}, [isSeries, seasonsTitle, showEpisodes]);

	const watchedSeasons = useMemo(() => {
		const watchedSet = new Set<number>();
		seasonProgress.forEach((value, seasonNum) => {
			if (value.isWatched) {
				watchedSet.add(seasonNum);
			}
		});
		return watchedSet;
	}, [seasonProgress]);

	// Check if all episodes are watched (fast check)
	const allEpisodesWatched = useMemo(() => {
		if (!isSeries) {
			return Boolean(showMovieProgress?.isWatched);
		}

		if (showEpisodes.length === 0) return false;
		return showEpisodes.every((ep) => ep.isWatched);
	}, [isSeries, showEpisodes, showMovieProgress]);

	useEffect(() => {
		setWatched(allEpisodesWatched);
	}, [allEpisodesWatched]);

	const isMarkingAsWatched = isSeries
		? isMarkingAllEpisodesAsWatched
		: isMarkingMovieAsWatched;

	const handleToggleLike = async () => {
		await toggleLike({
			body: {
				imdbId: String(id),
				mediaType: isSeries ? "tv" : "movie",
			},
		});
		refetchLiked();
	};

	if (isLoading) return <ShowDetailSkeleton router={router} />;

	// Animation values for sticky header effects
	const imageHeight = scrollY.interpolate({
		inputRange: [-maxHeaderHeight, 0],
		outputRange: [maxHeaderHeight, headerHeight],
		extrapolate: "clamp",
	});

	const imageTranslateY = scrollY.interpolate({
		inputRange: [0, headerHeight],
		outputRange: [0, -headerHeight],
		extrapolate: "clamp",
	});

	const headerOpacity = scrollY.interpolate({
		inputRange: [0, headerHeight - 50],
		outputRange: [0, 1],
		extrapolate: "clamp",
	});

	const headerTranslateY = scrollY.interpolate({
		inputRange: [0, headerHeight],
		outputRange: [0, -headerHeight],
		extrapolate: "clamp",
	});

	// Handle scroll events
	const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		scrollY.setValue(offsetY);
	};

	return (
		<View style={styles.container}>
			{/* Sticky Header with Title and Back Button */}
			<Animated.View
				style={[
					styles.stickyHeader,
					{
						opacity: headerOpacity,
						transform: [{ translateY: headerTranslateY }],
					},
				]}
			>
				<TouchableOpacity
					style={styles.stickyBackButton}
					onPress={() => router.back()}
				>
					<ArrowLeft stroke="#fff" width={24} height={24} />
				</TouchableOpacity>
				<Text style={styles.stickyTitle} numberOfLines={1}>
					{data?.titleText?.text}
				</Text>
				<View style={styles.stickyHeaderSpacer} />
			</Animated.View>

			{/* Sticky Image Header - Scrolls until it reaches top, then sticks */}
			<Animated.View
				style={[
					styles.stickyImageContainer,
					{
						height: imageHeight,
						transform: [{ translateY: imageTranslateY }],
					},
				]}
			>
				{data?.primaryImage?.url ? (
					<Image
						source={{ uri: data.primaryImage.url }}
						style={styles.stickyImage}
						resizeMode="cover"
						onError={(e) => {
							console.log("Image load error:", e.nativeEvent.error);
						}}
					/>
				) : (
					<View style={[styles.stickyImage, styles.placeholderImage]}>
						<Text style={styles.placeholderText}>
							{data?.titleText?.text?.[0] ?? "?"}
						</Text>
					</View>
				)}

				{/* Back Button Overlay */}
				<TouchableOpacity
					style={styles.imageBackButton}
					onPress={() => router.back()}
				>
					<ArrowLeft stroke="#fff" width={28} height={28} />
				</TouchableOpacity>

				{/* Action Buttons Overlay */}
				<View style={styles.imageActionButtons}>
					<Animated.View style={{ opacity: pulseAnim }}>
						<TouchableOpacity
							style={[
								styles.actionButton,
								isLiked ? styles.likedButton : styles.likeButton,
							]}
							onPress={handleToggleLike}
							disabled={isTogglingLike}
						>
							<Heart
								stroke="#fff"
								width={20}
								height={20}
								fill={isLiked ? "#fff" : "none"}
							/>
							<Text style={styles.actionButtonText}>
								{isLiked ? "Liked" : "Like"}
							</Text>
						</TouchableOpacity>
					</Animated.View>
				</View>
			</Animated.View>

			{/* Scrollable Content */}
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={{ paddingBottom: 40 }}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				bounces={true}
				alwaysBounceVertical={true}
				showsVerticalScrollIndicator={false}
			>
				{/* Spacer to push content below sticky image */}
				<View style={{ height: headerHeight }} />

				{/* Content */}
				<View style={styles.content}>
					<Text style={styles.title}>{data?.titleText?.text}</Text>
					<View style={styles.genresRow}>
						{data?.titleType?.categories?.map((cat) => (
							<View key={cat.id} style={styles.genreTag}>
								<Text style={styles.genreText}>{cat.text}</Text>
							</View>
						))}
					</View>
					{data?.releaseYear && (
						<Text style={styles.rating}>
							{data.releaseYear.year}
							{data.releaseYear.endYear ? ` - ${data.releaseYear.endYear}` : ""}
						</Text>
					)}
					{plot?.plotText?.plainText && (
						<Text style={styles.description}>{plot.plotText.plainText}</Text>
					)}
					{!isLoading &&
						!isProgressLoading &&
						(watched ? (
							<TouchableOpacity
								style={[styles.markWatchedButton, styles.removeWatchedButton]}
								onPress={handleRemoveFromWatched}
								disabled={isRemovingFromWatched}
							>
								<Text style={styles.markWatchedButtonText}>
									{isRemovingFromWatched
										? "Removing..."
										: "Remove from Watched"}
								</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity
								style={styles.markWatchedButton}
								onPress={handleMarkAsWatched}
								disabled={isMarkingAsWatched}
							>
								<Text style={styles.markWatchedButtonText}>
									{isMarkingAsWatched ? "Marking..." : "Mark as Watched"}
								</Text>
							</TouchableOpacity>
						))}

					{/* Seasons Section */}
					{isSeries &&
						seasonsTitle?.episodes?.displayableSeasons?.edges &&
						seasonsTitle.episodes.displayableSeasons.edges.length > 0 && (
							<View style={styles.section}>
								<Text style={styles.sectionTitle}>Seasons</Text>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									style={styles.seasonsScroll}
								>
									{seasonsTitle.episodes.displayableSeasons.edges.map(
										(seasonEdge) => {
											const seasonNum = Number.parseInt(
												seasonEdge.node.season,
												10,
											);
											const seasonProgressData = seasonProgress.get(seasonNum);
											const isSeasonWatched = watchedSeasons.has(seasonNum);
											return (
												<SeasonCard
													key={seasonEdge.node.id}
													showId={String(id)}
													seasonNumber={seasonEdge.node.season}
													seasonText={seasonEdge.node.text}
													isWatched={isSeasonWatched}
													progress={seasonProgressData?.progress ?? 0}
												/>
											);
										},
									)}
								</ScrollView>
							</View>
						)}

					{/* Cast Section */}
					{castTitle?.principalCredits &&
						castTitle.principalCredits.length > 0 && (
							<View style={styles.section}>
								<Text style={styles.sectionTitle}>Cast</Text>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									style={styles.castScroll}
								>
									{castTitle.principalCredits
										.flatMap((creditGroup) => creditGroup.credits)
										.filter(
											(
												credit,
											): credit is Extract<
												typeof credit,
												{ __typename: "Cast" }
											> => credit.__typename === "Cast",
										)
										.slice(0, 10)
										.map((cast, i) => (
											<View
												key={`${cast.name.id}-${i}`}
												style={styles.castItem}
											>
												<Image
													source={{
														uri:
															cast.name.primaryImage?.url ??
															"https://via.placeholder.com/100x100/333/fff?text=?",
													}}
													style={styles.castImage}
												/>
												<Text style={styles.castName} numberOfLines={1}>
													{cast.name.nameText.text}
												</Text>
												{cast.characters.length > 0 && cast.characters[0] && (
													<Text style={styles.castCharacter} numberOfLines={1}>
														{cast.characters[0].name}
													</Text>
												)}
											</View>
										))}
								</ScrollView>
							</View>
						)}
				</View>
			</ScrollView>
		</View>
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
	// Sticky Header Styles
	stickyHeader: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 100,
		backgroundColor: "rgba(0,0,0,0.9)",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingTop: 40,
		zIndex: 10,
	},
	stickyBackButton: {
		backgroundColor: "rgba(0,0,0,0.6)",
		borderRadius: 20,
		padding: 8,
		marginRight: 16,
	},
	stickyTitle: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "bold",
		flex: 1,
	},
	stickyHeaderSpacer: {
		width: 40, // Same width as back button to center title
	},
	// Sticky Image Container - Scrolls until it reaches top, then sticks
	stickyImageContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		width: "100%",
		overflow: "visible",
		zIndex: 1,
	},
	stickyImage: {
		width: "100%",
		height: "100%",
		resizeMode: "cover",
	},
	imageBackButton: {
		position: "absolute",
		top: 40,
		left: 20,
		zIndex: 2,
		backgroundColor: "rgba(0,0,0,0.6)",
		borderRadius: 20,
		padding: 6,
	},
	imageActionButtons: {
		position: "absolute",
		right: 20,
		bottom: -15,
		zIndex: 2,
		flexDirection: "row",
		gap: 4,
	},
	// Legacy styles for backward compatibility
	header: {
		position: "relative",
		width: "100%",
		height: 340,
		backgroundColor: "#111",
		marginBottom: -40,
	},
	backButton: {
		position: "absolute",
		top: 40,
		left: 20,
		zIndex: 2,
		backgroundColor: "rgba(0,0,0,0.6)",
		borderRadius: 20,
		padding: 6,
	},
	poster: {
		width: "100%",
		height: 340,
		resizeMode: "cover",
	},
	content: {
		paddingHorizontal: 24,
		marginTop: 0,
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	title: {
		color: "#fff",
		fontSize: 32,
		fontWeight: "bold",
		flex: 1,
		marginRight: 16,
	},
	actionButtons: {
		position: "absolute",
		right: 20,
		bottom: -20,
		zIndex: 2,
		flexDirection: "row",
		gap: 4,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	likeButton: {
		backgroundColor: "#3c3c3c",
	},
	likedButton: {
		backgroundColor: "#b14aed",
	},
	disabledButton: {
		opacity: 1,
	},
	watchedButton: {
		backgroundColor: "#b14aed",
	},
	actionButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginLeft: 4,
	},
	genresRow: {
		flexDirection: "row",
		marginBottom: 10,
		flexWrap: "wrap",
	},
	genreTag: {
		backgroundColor: "#222",
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 4,
		marginRight: 8,
		marginBottom: 6,
	},
	genreText: {
		color: "#b14aed",
		fontSize: 14,
		fontWeight: "600",
	},
	rating: {
		color: "#fff",
		fontSize: 16,
		marginBottom: 16,
	},
	description: {
		color: "#ccc",
		fontSize: 16,
		marginBottom: 24,
	},
	section: {
		marginTop: 10,
	},
	sectionTitle: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 10,
	},
	markWatchedButton: {
		backgroundColor: "#3c3c3c",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 12,
		borderRadius: 10,
		marginBottom: 24,
	},
	markWatchedButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
		marginLeft: 8,
	},
	removeWatchedButton: {
		backgroundColor: "#ff4444",
	},
	placeholderImage: {
		backgroundColor: "#222",
		justifyContent: "center",
		alignItems: "center",
	},
	placeholderText: {
		color: "#666",
		fontSize: 48,
		fontWeight: "bold",
	},
	castScroll: {
		marginLeft: -10,
	},
	castItem: {
		width: 100,
		marginRight: 15,
		alignItems: "center",
	},
	castImage: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: "#222",
		marginBottom: 8,
	},
	castName: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: 4,
	},
	castCharacter: {
		color: "#999",
		fontSize: 12,
		textAlign: "center",
	},
	seasonsScroll: {
		marginLeft: -10,
	},
});

export default ShowDetail;
