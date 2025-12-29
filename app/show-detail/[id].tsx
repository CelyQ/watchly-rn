import { useQueries, useQuery } from "@tanstack/react-query";
import { getLocales } from "expo-localization";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { FC } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	Dimensions,
	Image,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { ArrowLeft, Heart, XOctagon } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { queryClient } from "@/app/_layout";
import { SeasonCard } from "@/components/season-card";
import { ShowDetailSkeleton } from "@/components/show-detail-skeleton";
import { $api, fetchClient } from "@/lib/api";
import { addNotInterested, removeNotInterested } from "@/lib/not-interested";

// Get user's region code for watch providers
const userRegion = getLocales()[0]?.regionCode ?? "US";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HEADER_HEIGHT = 420;
const STICKY_HEADER_HEIGHT = 100;

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
	const insets = useSafeAreaInsets();
	const { id } = useLocalSearchParams();
	const imdbId = String(id);
	const scrollY = useRef(new Animated.Value(0)).current;
	const pulseAnim = useRef(new Animated.Value(1)).current;

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
	const [isTogglingNotInterested, setIsTogglingNotInterested] = useState(false);

	// Fetch not interested list from API
	const { data: notInterestedData } = $api.useQuery(
		"get",
		"/api/v1/media/notInterested",
	);

	// Check if this item is in the not interested list
	const isNotInterested = useMemo(() => {
		return notInterestedData?.notInterested?.includes(imdbId) ?? false;
	}, [notInterestedData?.notInterested, imdbId]);

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
				queryKey: ["get", "/api/v1/progress/tv"],
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
					queryKey: ["get", "/api/v1/progress/tv"],
				});
				queryClient.invalidateQueries({
					queryKey: ["my-shows"],
				});
			},
		},
	);

	const handleMarkAsWatched = async () => {
		try {
			const title = data?.titleText?.text;
			const posterUrl = data?.primaryImage?.url;

			if (isSeries) {
				const episodes = await fetchAllEpisodesForShow(String(id));

				if (episodes.length === 0) {
					console.warn("No episodes found for show:", id);
					return;
				}

				await markAllEpisodesAsWatched({
					body: {
						imdbId: String(id),
						episodes,
						isWatched: true,
						title,
						posterUrl,
					},
				});
			} else {
				await markMovieAsWatched({
					body: {
						imdbId: String(id),
						isWatched: true,
						title,
						posterUrl,
					},
				});
			}
		} catch (error) {
			console.error("Error marking as watched:", error);
		}
	};

	const handleRemoveFromWatched = async () => {
		setIsRemovingFromWatched(true);
		try {
			const title = data?.titleText?.text;
			const posterUrl = data?.primaryImage?.url;

			if (isSeries) {
				const episodes = await fetchAllEpisodesForShow(String(id));
				if (episodes.length === 0) {
					console.warn("No episodes found for show:", id);
					return;
				}

				await unmarkAllEpisodesAsWatched({
					body: {
						imdbId: String(id),
						episodes,
						isWatched: false,
						title,
						posterUrl,
					},
				});
			} else {
				await markMovieAsWatched({
					body: {
						imdbId: String(id),
						isWatched: false,
						title,
						posterUrl,
					},
				});
			}
		} catch (error) {
			console.error("Error removing from watched:", error);
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

	// Fetch watch providers
	const { data: watchProvidersData } = $api.useQuery(
		"get",
		"/api/v1/media/getWatchProviders",
		{
			params: {
				query: {
					tt: imdbId,
					mediaType: isSeries ? "tv" : "movie",
				},
			},
		},
		{
			enabled: !isLoading && details !== undefined,
		},
	);

	// Fetch TV-specific progress data for accurate season progress bars
	const { data: tvProgressData } = $api.useQuery(
		"get",
		"/api/v1/progress/tv",
		{
			params: {
				query: {
					imdbId,
				},
			},
		},
		{
			enabled: isSeries,
		},
	);

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
			return result.data ?? null;
		},
		enabled: shouldFetchSeasons,
	});

	// Fetch more like this recommendations
	const { data: moreLikeThisData } = $api.useQuery(
		"get",
		"/api/v1/media/getMoreLikeThis",
		{
			params: {
				query: {
					tt: imdbId,
				},
			},
		},
		{
			enabled: !isLoading && details !== undefined,
		},
	);

	// Extract recommendation IDs
	const recommendationIds = useMemo(() => {
		const edges = moreLikeThisData?.title?.moreLikeThisTitles?.edges ?? [];
		return edges.map((edge) => edge.node.id).slice(0, 12);
	}, [moreLikeThisData]);

	// Define recommendation title type
	type RecommendationTitle = {
		id: string;
		titleText?: { text: string };
		primaryImage?: { url: string };
		releaseYear?: { year: number; endYear?: number | null };
		titleType?: { isSeries?: boolean };
	};

	// Fetch details for each recommendation
	const recommendationQueries = useQueries({
		queries: recommendationIds.map((id) => ({
			queryKey: ["get", "/api/v1/media/getTitleDetails", { tt: id }],
			queryFn: async () => {
				const result = await fetchClient.GET("/api/v1/media/getTitleDetails", {
					params: {
						query: {
							tt: id,
						},
					},
				});
				// Return empty object if data is undefined to satisfy React Query
				return (
					(result.data as { title?: RecommendationTitle } | undefined) ?? {}
				);
			},
			enabled: recommendationIds.length > 0,
		})),
	});

	const recommendations = useMemo(() => {
		return recommendationQueries
			.filter((q) => q.isSuccess && q.data?.title)
			.map((q) => q.data?.title)
			.filter((t): t is RecommendationTitle => t !== undefined);
	}, [recommendationQueries]);

	const isLoadingRecommendations =
		recommendationIds.length > 0 &&
		recommendationQueries.some((q) => q.isLoading);

	const plot = plotData?.title?.plot;
	const castTitle = castData?.title;
	const seasonsTitle = seasonsData?.title;

	// Get progress for this specific show/movie
	const showEpisodes = useMemo(() => {
		if (!tvProgressData?.episodes) return [];
		return tvProgressData.episodes.filter((ep) => ep.imdbId === imdbId);
	}, [tvProgressData?.episodes, imdbId]);

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

		// Get total episodes per season from TV progress data
		const episodesPerSeason =
			tvProgressData?.tvShowProgress?.episodesPerSeason ?? [];

		for (const seasonEdge of seasonEdges) {
			const seasonNum = Number.parseInt(seasonEdge.node.season, 10);
			if (Number.isNaN(seasonNum)) continue;

			// Get total episodes for this season (array is 0-indexed, seasons are 1-indexed)
			const totalEpisodesInSeason = episodesPerSeason[seasonNum - 1] ?? 0;

			// Count watched episodes for this season
			const watchedEpisodesInSeason = showEpisodes.filter(
				(ep) => ep.seasonNumber === seasonNum && ep.isWatched,
			).length;

			// Calculate progress using total episodes from the server
			const progress =
				totalEpisodesInSeason > 0
					? watchedEpisodesInSeason / totalEpisodesInSeason
					: 0;
			const isWatched =
				totalEpisodesInSeason > 0 &&
				watchedEpisodesInSeason >= totalEpisodesInSeason;

			progressMap.set(seasonNum, { progress, isWatched });
		}

		return progressMap;
	}, [isSeries, seasonsTitle, showEpisodes, tvProgressData]);

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

	const handleToggleNotInterested = async () => {
		setIsTogglingNotInterested(true);
		const mediaType = isSeries ? "tv" : "movie";

		try {
			let success = false;
			if (isNotInterested) {
				success = await removeNotInterested(imdbId);
			} else {
				success = await addNotInterested(imdbId, mediaType);
			}

			if (success) {
				// Invalidate queries to refresh data
				queryClient.invalidateQueries({
					queryKey: ["get", "/api/v1/media/notInterested"],
				});
				queryClient.invalidateQueries({
					queryKey: ["get", "/api/v1/media/getRecommendations"],
				});
			}
		} catch (error) {
			console.error("Failed to toggle not interested:", error);
		} finally {
			setIsTogglingNotInterested(false);
		}
	};

	// Parallax animations
	// Image scale - stretches when pulling down
	const imageScale = scrollY.interpolate({
		inputRange: [-200, 0],
		outputRange: [1.5, 1],
		extrapolateRight: "clamp",
	});

	// Image translateY - parallax effect (moves at half speed)
	const imageTranslateY = scrollY.interpolate({
		inputRange: [-200, 0, HEADER_HEIGHT],
		outputRange: [-100, 0, HEADER_HEIGHT * 0.5],
		extrapolate: "clamp",
	});

	// Sticky header opacity
	const headerOpacity = scrollY.interpolate({
		inputRange: [HEADER_HEIGHT - 150, HEADER_HEIGHT - 50],
		outputRange: [0, 1],
		extrapolate: "clamp",
	});

	// Header background blur intensity simulation
	const headerBgOpacity = scrollY.interpolate({
		inputRange: [HEADER_HEIGHT - 150, HEADER_HEIGHT - 50],
		outputRange: [0, 0.95],
		extrapolate: "clamp",
	});

	// Back button on image opacity (fade out as we scroll)
	const imageBackButtonOpacity = scrollY.interpolate({
		inputRange: [0, HEADER_HEIGHT - 150],
		outputRange: [1, 0],
		extrapolate: "clamp",
	});

	return (
		<View style={styles.container}>
			{/* Parallax Hero Image */}
			<Animated.View
				style={[
					styles.heroImageContainer,
					{
						transform: [{ translateY: imageTranslateY }, { scale: imageScale }],
					},
				]}
			>
				{data?.primaryImage?.url ? (
					<Image
						source={{ uri: data.primaryImage.url }}
						style={styles.heroImage}
						resizeMode="cover"
					/>
				) : (
					<View style={[styles.heroImage, styles.placeholderImage]}>
						<Text style={styles.placeholderText}>
							{data?.titleText?.text?.[0] ?? "?"}
						</Text>
					</View>
				)}
			</Animated.View>

			{/* Sticky Header */}
			<Animated.View
				style={[
					styles.stickyHeader,
					{ paddingTop: insets.top },
					{ opacity: headerOpacity },
				]}
				pointerEvents="box-none"
			>
				<Animated.View
					style={[
						StyleSheet.absoluteFill,
						styles.stickyHeaderBg,
						{ opacity: headerBgOpacity },
					]}
					pointerEvents="none"
				/>
				<TouchableOpacity
					style={styles.headerBackButton}
					onPress={() => router.back()}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
					activeOpacity={0.7}
				>
					<ArrowLeft stroke="#fff" width={24} height={24} />
				</TouchableOpacity>
				<Text style={styles.headerTitle} numberOfLines={1}>
					{data?.titleText?.text}
				</Text>
				<View style={styles.headerSpacer} />
			</Animated.View>

			{/* Floating Back Button (visible when image is shown) */}
			<Animated.View
				style={[
					styles.floatingBackButton,
					{ top: insets.top + 10 },
					{ opacity: imageBackButtonOpacity },
				]}
				pointerEvents="box-none"
			>
				<TouchableOpacity
					style={styles.floatingBackButtonInner}
					onPress={() => router.back()}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
					activeOpacity={0.7}
				>
					<ArrowLeft stroke="#fff" width={24} height={24} />
				</TouchableOpacity>
			</Animated.View>

			{/* Like Button - Always accessible */}
			<Animated.View
				style={[
					styles.floatingLikeButton,
					{ top: insets.top + 10, right: 16 },
					{ opacity: imageBackButtonOpacity },
				]}
				pointerEvents="box-none"
			>
				<Animated.View style={{ opacity: pulseAnim }} pointerEvents="box-none">
					<TouchableOpacity
						style={[
							styles.likeButton,
							isLiked && styles.likeButtonActive,
							styles.floatingLikeButtonInner,
						]}
						onPress={handleToggleLike}
						disabled={isTogglingLike}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
						activeOpacity={0.7}
					>
						<Heart
							stroke={isLiked ? "#fff" : "#b14aed"}
							width={22}
							height={22}
							fill={isLiked ? "#fff" : "none"}
						/>
					</TouchableOpacity>
				</Animated.View>
			</Animated.View>

			{/* Scrollable Content */}
			<Animated.ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				onScroll={Animated.event(
					[{ nativeEvent: { contentOffset: { y: scrollY } } }],
					{ useNativeDriver: true },
				)}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="always"
			>
				{/* Spacer for hero image */}
				<View style={{ height: HEADER_HEIGHT - 80 }} />

				{/* Content Card */}
				<View style={styles.contentCard}>
					{isLoading ? (
						<ShowDetailSkeleton router={router} />
					) : (
						<>
							{/* Title Row */}
							<View style={styles.titleRow}>
								<Text style={styles.title}>{data?.titleText?.text}</Text>
							</View>

							{/* Meta Info */}
							<View style={styles.metaRow}>
								{data?.releaseYear && (
									<Text style={styles.year}>
										{data.releaseYear.year}
										{data.releaseYear.endYear
											? ` - ${data.releaseYear.endYear}`
											: ""}
									</Text>
								)}
								{isSeries && <View style={styles.metaDot} />}
								{isSeries && <Text style={styles.metaText}>TV Series</Text>}
							</View>

							{/* Genres */}
							<View style={styles.genresRow}>
								{data?.titleType?.categories?.map((cat) => (
									<View key={cat.id} style={styles.genreTag}>
										<Text style={styles.genreText}>{cat.text}</Text>
									</View>
								))}
							</View>

							{/* Description */}
							{plot?.plotText?.plainText && (
								<Text style={styles.description}>
									{plot.plotText.plainText}
								</Text>
							)}

							{/* Action Button */}
							{!isLoading &&
								!isProgressLoading &&
								(watched ? (
									<TouchableOpacity
										style={[
											styles.actionButton,
											styles.removeButton,
											isRemovingFromWatched && styles.actionButtonDisabled,
										]}
										onPress={() => void handleRemoveFromWatched()}
										disabled={isRemovingFromWatched}
										activeOpacity={0.7}
									>
										<Text style={styles.actionButtonText}>
											{isRemovingFromWatched
												? "Removing..."
												: "Remove from Watched"}
										</Text>
									</TouchableOpacity>
								) : (
									<TouchableOpacity
										style={[
											styles.actionButton,
											isMarkingAsWatched && styles.actionButtonDisabled,
										]}
										onPress={() => void handleMarkAsWatched()}
										disabled={isMarkingAsWatched}
										activeOpacity={0.7}
									>
										<Text style={styles.actionButtonText}>
											{isMarkingAsWatched ? "Marking..." : "Mark as Watched"}
										</Text>
									</TouchableOpacity>
								))}

							{/* Remove from Don't Recommend Button - only show if item is marked */}
							{!isLoading && isNotInterested && (
								<TouchableOpacity
									style={[
										styles.notInterestedButton,
										styles.notInterestedButtonActive,
										isTogglingNotInterested && styles.actionButtonDisabled,
									]}
									onPress={() => void handleToggleNotInterested()}
									disabled={isTogglingNotInterested}
									activeOpacity={0.7}
								>
									<XOctagon stroke="#fff" width={18} height={18} />
									<Text
										style={[
											styles.notInterestedButtonText,
											styles.notInterestedButtonTextActive,
										]}
									>
										{isTogglingNotInterested
											? "Updating..."
											: "Won't recommend this"}
									</Text>
								</TouchableOpacity>
							)}

							{/* Watch Providers Section */}
							{watchProvidersData?.results?.[userRegion] && (
								<View style={styles.section}>
									<Text style={styles.sectionTitle}>Where to Watch</Text>
									{watchProvidersData.results[userRegion].flatrate &&
										watchProvidersData.results[userRegion].flatrate.length >
											0 && (
											<View style={styles.providerCategory}>
												<Text style={styles.providerCategoryLabel}>Stream</Text>
												<View style={styles.providersRow}>
													{watchProvidersData.results[userRegion].flatrate.map(
														(provider) => (
															<View
																key={provider.provider_id}
																style={styles.providerItem}
															>
																<View style={styles.providerLogoContainer}>
																	<Image
																		source={{
																			uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}`,
																		}}
																		style={styles.providerLogo}
																		resizeMode="contain"
																	/>
																</View>
																<Text
																	style={styles.providerName}
																	numberOfLines={2}
																>
																	{provider.provider_name}
																</Text>
															</View>
														),
													)}
												</View>
											</View>
										)}
									{watchProvidersData.results[userRegion].rent &&
										watchProvidersData.results[userRegion].rent.length > 0 && (
											<View style={styles.providerCategory}>
												<Text style={styles.providerCategoryLabel}>Rent</Text>
												<View style={styles.providersRow}>
													{watchProvidersData.results[userRegion].rent.map(
														(provider) => (
															<View
																key={provider.provider_id}
																style={styles.providerItem}
															>
																<View style={styles.providerLogoContainer}>
																	<Image
																		source={{
																			uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}`,
																		}}
																		style={styles.providerLogo}
																		resizeMode="contain"
																	/>
																</View>
																<Text
																	style={styles.providerName}
																	numberOfLines={2}
																>
																	{provider.provider_name}
																</Text>
															</View>
														),
													)}
												</View>
											</View>
										)}
									{watchProvidersData.results[userRegion].buy &&
										watchProvidersData.results[userRegion].buy.length > 0 && (
											<View style={styles.providerCategory}>
												<Text style={styles.providerCategoryLabel}>Buy</Text>
												<View style={styles.providersRow}>
													{watchProvidersData.results[userRegion].buy.map(
														(provider) => (
															<View
																key={provider.provider_id}
																style={styles.providerItem}
															>
																<View style={styles.providerLogoContainer}>
																	<Image
																		source={{
																			uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}`,
																		}}
																		style={styles.providerLogo}
																		resizeMode="contain"
																	/>
																</View>
																<Text
																	style={styles.providerName}
																	numberOfLines={2}
																>
																	{provider.provider_name}
																</Text>
															</View>
														),
													)}
												</View>
											</View>
										)}
									<View style={styles.justWatchAttribution}>
										<Text style={styles.poweredByText}>Powered by</Text>
										<Image
											alt="JustWatch logo"
											source={require("@/assets/justwatch-logo-small.png")}
											style={styles.justWatchLogo}
											resizeMode="contain"
										/>
									</View>
								</View>
							)}

							{/* Seasons Section */}
							{isSeries &&
								seasonsTitle?.episodes?.displayableSeasons?.edges &&
								seasonsTitle.episodes.displayableSeasons.edges.length > 0 && (
									<View style={styles.section}>
										<Text style={styles.sectionTitle}>Seasons</Text>
										<Animated.ScrollView
											horizontal
											showsHorizontalScrollIndicator={false}
											contentContainerStyle={styles.horizontalScroll}
										>
											{seasonsTitle.episodes.displayableSeasons.edges.map(
												(seasonEdge) => {
													const seasonNum = Number.parseInt(
														seasonEdge.node.season,
														10,
													);
													const seasonProgressData =
														seasonProgress.get(seasonNum);
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
										</Animated.ScrollView>
									</View>
								)}

							{/* Cast Section */}
							{castTitle?.principalCredits &&
								castTitle.principalCredits.length > 0 && (
									<View style={styles.section}>
										<Text style={styles.sectionTitle}>Cast</Text>
										<Animated.ScrollView
											horizontal
											showsHorizontalScrollIndicator={false}
											contentContainerStyle={styles.horizontalScroll}
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
														{cast.characters.length > 0 &&
															cast.characters[0] && (
																<Text
																	style={styles.castCharacter}
																	numberOfLines={1}
																>
																	{cast.characters[0].name}
																</Text>
															)}
													</View>
												))}
										</Animated.ScrollView>
									</View>
								)}

							{/* More Like This Section */}
							{(isLoadingRecommendations || recommendations.length > 0) && (
								<View style={styles.section}>
									<Text style={styles.sectionTitle}>More Like This</Text>
									<Animated.ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.horizontalScroll}
									>
										{isLoadingRecommendations
											? Array.from({ length: 4 }).map((_, i) => (
													<View
														key={`skeleton-${i}`}
														style={styles.recommendationItem}
													>
														<View style={styles.recommendationImageSkeleton} />
														<View style={styles.recommendationTitleSkeleton} />
													</View>
												))
											: recommendations.map((rec) => (
													<TouchableOpacity
														key={rec.id}
														style={styles.recommendationItem}
														onPress={() =>
															router.push({
																pathname: "/show-detail/[id]",
																params: { id: rec.id },
															})
														}
														activeOpacity={0.7}
													>
														{rec.primaryImage?.url ? (
															<Image
																source={{ uri: rec.primaryImage.url }}
																style={styles.recommendationImage}
															/>
														) : (
															<View
																style={[
																	styles.recommendationImage,
																	styles.recommendationPlaceholder,
																]}
															>
																<Text
																	style={styles.recommendationPlaceholderText}
																>
																	{rec.titleText?.text?.[0] ?? "?"}
																</Text>
															</View>
														)}
														<Text
															style={styles.recommendationTitle}
															numberOfLines={2}
														>
															{rec.titleText?.text}
														</Text>
														{rec.releaseYear?.year && (
															<Text style={styles.recommendationYear}>
																{rec.releaseYear.year}
															</Text>
														)}
													</TouchableOpacity>
												))}
									</Animated.ScrollView>
								</View>
							)}
						</>
					)}
				</View>

				<View style={{ height: 50 }} />
			</Animated.ScrollView>
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
	scrollContent: {
		minHeight: "100%",
	},
	// Hero Image
	heroImageContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: HEADER_HEIGHT,
		zIndex: 0,
	},
	heroImage: {
		width: SCREEN_WIDTH,
		height: HEADER_HEIGHT + 100,
		backgroundColor: "#111",
	},
	placeholderImage: {
		justifyContent: "center",
		alignItems: "center",
	},
	placeholderText: {
		color: "#333",
		fontSize: 72,
		fontWeight: "bold",
	},
	// Sticky Header
	stickyHeader: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: STICKY_HEADER_HEIGHT,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		zIndex: 20,
	},
	stickyHeaderBg: {
		backgroundColor: "#0a0a0a",
	},
	headerBackButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(255,255,255,0.1)",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 25,
	},
	headerTitle: {
		flex: 1,
		color: "#fff",
		fontSize: 18,
		fontWeight: "700",
		marginLeft: 12,
	},
	headerSpacer: {
		width: 44,
	},
	// Floating Back Button
	floatingBackButton: {
		position: "absolute",
		left: 16,
		zIndex: 25,
	},
	floatingBackButtonInner: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 26,
	},
	// Floating Like Button
	floatingLikeButton: {
		position: "absolute",
		right: 16,
		zIndex: 25,
	},
	floatingLikeButtonInner: {
		width: 48,
		height: 48,
		borderRadius: 24,
	},
	// Content
	contentCard: {
		backgroundColor: "#000",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		marginTop: -24,
		paddingHorizontal: 20,
		paddingTop: 24,
		zIndex: 10,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	title: {
		flex: 1,
		color: "#fff",
		fontSize: 28,
		fontWeight: "800",
		lineHeight: 34,
		marginRight: 12,
	},
	likeButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "rgba(177,74,237,0.15)",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "#b14aed",
	},
	likeButtonActive: {
		backgroundColor: "#b14aed",
		borderColor: "#b14aed",
	},
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	year: {
		color: "#888",
		fontSize: 15,
		fontWeight: "500",
	},
	metaDot: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: "#555",
		marginHorizontal: 10,
	},
	metaText: {
		color: "#888",
		fontSize: 15,
		fontWeight: "500",
	},
	genresRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginBottom: 16,
		gap: 8,
	},
	genreTag: {
		backgroundColor: "#1a1a1a",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	genreText: {
		color: "#b14aed",
		fontSize: 13,
		fontWeight: "600",
	},
	description: {
		color: "#aaa",
		fontSize: 15,
		lineHeight: 24,
		marginBottom: 20,
	},
	actionButton: {
		backgroundColor: "#b14aed",
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: "center",
		marginBottom: 24,
	},
	actionButtonDisabled: {
		opacity: 0.6,
	},
	removeButton: {
		backgroundColor: "#dc2626",
	},
	actionButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "700",
	},
	// Sections
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "700",
		marginBottom: 14,
	},
	horizontalScroll: {
		paddingRight: 20,
	},
	// Cast
	castItem: {
		width: 90,
		marginRight: 14,
		alignItems: "center",
	},
	castImage: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: "#1a1a1a",
		marginBottom: 8,
	},
	castName: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: 2,
	},
	castCharacter: {
		color: "#666",
		fontSize: 11,
		textAlign: "center",
	},
	// Watch Providers
	providerCategory: {
		marginBottom: 16,
	},
	providerCategoryLabel: {
		color: "#888",
		fontSize: 13,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 10,
	},
	providersRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	providerItem: {
		alignItems: "center",
		width: 64,
	},
	providerLogoContainer: {
		width: 52,
		height: 52,
		borderRadius: 12,
		backgroundColor: "#1a1a1a",
		marginBottom: 6,
		overflow: "hidden",
	},
	providerLogo: {
		width: "100%",
		height: "100%",
		borderRadius: 12,
	},
	providerName: {
		color: "#aaa",
		fontSize: 10,
		textAlign: "center",
		lineHeight: 12,
	},
	justWatchAttribution: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-start",
		marginTop: 8,
		gap: 6,
	},
	poweredByText: {
		color: "#555",
		fontSize: 11,
	},
	justWatchLogo: {
		width: 80,
		height: 16,
		opacity: 0.6,
	},
	// Recommendations
	recommendationItem: {
		width: 120,
		marginRight: 14,
	},
	recommendationImage: {
		width: 120,
		height: 180,
		borderRadius: 12,
		backgroundColor: "#1a1a1a",
	},
	recommendationPlaceholder: {
		justifyContent: "center",
		alignItems: "center",
	},
	recommendationPlaceholderText: {
		color: "#444",
		fontSize: 36,
		fontWeight: "bold",
	},
	recommendationTitle: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "600",
		marginTop: 10,
		lineHeight: 18,
	},
	recommendationYear: {
		color: "#666",
		fontSize: 12,
		marginTop: 2,
	},
	recommendationImageSkeleton: {
		width: 120,
		height: 180,
		borderRadius: 12,
		backgroundColor: "#1a1a1a",
	},
	recommendationTitleSkeleton: {
		width: 90,
		height: 14,
		borderRadius: 4,
		backgroundColor: "#1a1a1a",
		marginTop: 10,
	},
	// Not Interested Button
	notInterestedButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 16,
		marginBottom: 24,
		borderWidth: 1,
		borderColor: "#333",
		gap: 8,
	},
	notInterestedButtonActive: {
		backgroundColor: "rgba(220, 38, 38, 0.15)",
		borderColor: "#dc2626",
	},
	notInterestedButtonText: {
		color: "#888",
		fontSize: 14,
		fontWeight: "600",
	},
	notInterestedButtonTextActive: {
		color: "#dc2626",
	},
});

export default ShowDetail;
