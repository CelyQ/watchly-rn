import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
	Animated,
	FlatList,
	Image,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { XOctagon } from "react-native-feather";
import { $api } from "@/lib/api";
import { addNotInterested, removeNotInterested } from "@/lib/not-interested";

const CARD_WIDTH = 120;
const CARD_IMAGE_HEIGHT = 180;

type RecommendationItem = {
	id: string;
	titleText: {
		text: string;
	};
	primaryImage: {
		url: string;
	} | null;
	releaseYear: {
		year: number;
	} | null;
	titleType: {
		id: string;
		isSeries: boolean;
	};
	score: number;
	matchedGenres: string[];
	matchedKeywords: string[];
	reason: string;
};

type RecommendationSection = {
	type: "because_you_liked" | "top_genres" | "trending";
	title: string;
	subtitle: string;
	recommendations: RecommendationItem[];
};

// Animated card with "not interested" toggle
const RecommendationCard = ({
	item,
	onPress,
	onToggleNotInterested,
	isNotInterested,
	index,
}: {
	item: RecommendationItem;
	onPress: () => void;
	onToggleNotInterested: () => void;
	isNotInterested: boolean;
	index: number;
}) => {
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0.9)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 300,
				delay: index * 50,
				useNativeDriver: true,
			}),
			Animated.spring(scaleAnim, {
				toValue: 1,
				friction: 8,
				tension: 40,
				delay: index * 50,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, scaleAnim, index]);

	const imageUrl = item.primaryImage?.url;
	const year = item.releaseYear?.year;

	return (
		<Animated.View
			style={{
				opacity: fadeAnim,
				transform: [{ scale: scaleAnim }],
			}}
		>
			<TouchableOpacity
				onPress={onPress}
				activeOpacity={0.8}
				style={styles.mediaCard}
			>
				{/* Poster */}
				{imageUrl ? (
					<View style={styles.imageContainer}>
						<Image
							key={imageUrl}
							source={{ uri: imageUrl }}
							style={[
								styles.mediaCardImage,
								isNotInterested && styles.imageNotInterested,
							]}
							resizeMode="cover"
						/>
						{isNotInterested && (
							<View style={styles.notInterestedOverlay}>
								<XOctagon stroke="#fff" width={32} height={32} />
							</View>
						)}
					</View>
				) : (
					<View style={[styles.mediaCardImage, styles.placeholderImage]}>
						<Text style={styles.placeholderText}>?</Text>
					</View>
				)}

				{/* Not interested toggle button */}
				<TouchableOpacity
					style={[
						styles.notInterestedButton,
						isNotInterested && styles.notInterestedButtonActive,
					]}
					onPress={onToggleNotInterested}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				>
					<XOctagon
						stroke={isNotInterested ? "#fff" : "#888"}
						width={14}
						height={14}
					/>
				</TouchableOpacity>

				{/* Title */}
				<Text
					style={[
						styles.mediaCardTitle,
						isNotInterested && styles.textNotInterested,
					]}
					numberOfLines={2}
				>
					{item.titleText.text}
				</Text>

				{/* Year */}
				{year && (
					<Text
						style={[
							styles.yearText,
							isNotInterested && styles.textNotInterested,
						]}
					>
						{year}
					</Text>
				)}

				{/* Matched genres hint */}
				{item.matchedGenres.length > 0 && !isNotInterested && (
					<Text style={styles.matchHint} numberOfLines={1}>
						{item.matchedGenres.slice(0, 2).join(" • ")}
					</Text>
				)}

				{/* Not interested label */}
				{isNotInterested && (
					<Text style={styles.notInterestedLabel}>Won't recommend</Text>
				)}
			</TouchableOpacity>
		</Animated.View>
	);
};

// Skeleton card component for loading state
const MediaCardSkeleton = () => {
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
		<View style={styles.mediaCard}>
			<Animated.View style={[styles.skeletonImage, { opacity }]} />
			<Animated.View style={[styles.skeletonTitle, { opacity }]} />
			<Animated.View style={[styles.skeletonSubtitle, { opacity }]} />
		</View>
	);
};

// Section type to label mapping
const getSectionLabel = (type: RecommendationSection["type"]): string => {
	switch (type) {
		case "because_you_liked":
			return "BECAUSE YOU LIKED";
		case "top_genres":
			return "YOUR TOP GENRES";
		case "trending":
			return "TRENDING FOR YOU";
		default:
			return "RECOMMENDED";
	}
};

// Section type to color mapping
const getSectionStyle = (
	type: RecommendationSection["type"],
): { color: string } => {
	switch (type) {
		case "because_you_liked":
			return { color: "#e74c3c" };
		case "top_genres":
			return { color: "#9b59b6" };
		case "trending":
			return { color: "#f39c12" };
		default:
			return { color: "#b14aed" };
	}
};

// Single recommendation rail component
const RecommendationSectionComponent = ({
	section,
	onToggleNotInterested,
	notInterestedIds,
}: {
	section: RecommendationSection;
	onToggleNotInterested: (
		imdbId: string,
		mediaType: "movie" | "tv",
		isCurrentlyNotInterested: boolean,
	) => void;
	notInterestedIds: Set<string>;
}) => {
	const router = useRouter();
	const sectionStyle = getSectionStyle(section.type);

	if (section.recommendations.length === 0) {
		return null;
	}

	const renderItem = ({
		item,
		index,
	}: {
		item: RecommendationItem;
		index: number;
	}) => {
		const isNotInterested = notInterestedIds.has(item.id);
		return (
			<RecommendationCard
				item={item}
				index={index}
				isNotInterested={isNotInterested}
				onPress={() =>
					router.push({
						pathname: "/show-detail/[id]",
						params: { id: item.id },
					})
				}
				onToggleNotInterested={() =>
					onToggleNotInterested(
						item.id,
						item.titleType.isSeries ? "tv" : "movie",
						isNotInterested,
					)
				}
			/>
		);
	};

	const getItemLayout = (_: unknown, index: number) => ({
		length: CARD_WIDTH + 12, // card width + marginRight
		offset: (CARD_WIDTH + 12) * index,
		index,
	});

	return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<View>
					<Text style={[styles.sectionLabel, { color: sectionStyle.color }]}>
						{getSectionLabel(section.type)}
					</Text>
					<Text style={styles.sectionTitle}>{section.subtitle}</Text>
				</View>
			</View>

			<FlatList
				data={section.recommendations}
				renderItem={renderItem}
				keyExtractor={(item, index) => {
					const imageUrl = item.primaryImage?.url ?? "";
					return `${item.id}-${index}-${imageUrl}`;
				}}
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.mediaScroll}
				contentContainerStyle={styles.mediaScrollContent}
				getItemLayout={getItemLayout}
				removeClippedSubviews={true}
			/>
		</View>
	);
};

// Empty state when no recommendations
const EmptyRecommendations = () => (
	<View style={styles.emptyContainer}>
		<Text style={styles.emptyTitle}>No recommendations yet</Text>
		<Text style={styles.emptySubtitle}>
			Like some shows and movies to get personalized recommendations!
		</Text>
	</View>
);

// Main component that renders all recommendation rails
export const RecommendationRails = () => {
	const queryClient = useQueryClient();

	// Fetch not interested IDs from API
	const { data: notInterestedData } = $api.useQuery(
		"get",
		"/api/v1/media/notInterested",
	);

	// Convert to Set for efficient lookup
	const notInterestedIds = new Set(notInterestedData?.notInterested ?? []);

	// Fetch recommendations
	const {
		data: recommendationsData,
		isLoading,
		isError,
		refetch,
	} = $api.useQuery("get", "/api/v1/media/getRecommendations", {
		params: {
			query: {
				limit: 15,
			},
		},
	});

	// Handle toggle not interested
	const handleToggleNotInterested = async (
		imdbId: string,
		mediaType: "movie" | "tv",
		isCurrentlyNotInterested: boolean,
	) => {
		let success = false;
		if (isCurrentlyNotInterested) {
			success = await removeNotInterested(imdbId);
		} else {
			success = await addNotInterested(imdbId, mediaType);
		}

		if (success) {
			// Invalidate queries to get fresh data
			queryClient.invalidateQueries({
				queryKey: ["get", "/api/v1/media/notInterested"],
			});
			queryClient.invalidateQueries({
				queryKey: ["get", "/api/v1/media/getRecommendations"],
			});
		}
	};

	// Loading state
	if (isLoading) {
		return (
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<View>
						<Text style={styles.sectionLabel}>FOR YOU</Text>
						<Text style={styles.sectionTitle}>Loading...</Text>
					</View>
				</View>
				<View style={styles.skeletonRow}>
					<MediaCardSkeleton />
					<MediaCardSkeleton />
					<MediaCardSkeleton />
					<MediaCardSkeleton />
					<MediaCardSkeleton />
				</View>
			</View>
		);
	}

	// Error state
	if (isError) {
		return (
			<View style={styles.errorContainer}>
				<Text style={styles.errorText}>
					Failed to load recommendations. Tap to retry.
				</Text>
				<TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
					<Text style={styles.retryButtonText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	// No profile or empty sections
	if (
		!recommendationsData?.hasProfile ||
		!recommendationsData?.sections?.length
	) {
		return <EmptyRecommendations />;
	}

	// Render all sections
	return (
		<View>
			{recommendationsData.sections.map((section, i) => (
				<RecommendationSectionComponent
					key={`${section.type}-${i}`}
					section={section}
					onToggleNotInterested={handleToggleNotInterested}
					notInterestedIds={notInterestedIds}
				/>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	section: {
		marginTop: 28,
		paddingHorizontal: 16,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 14,
	},
	sectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 1.2,
		textTransform: "uppercase",
	},
	sectionTitle: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "700",
		marginTop: 2,
	},
	mediaScroll: {
		marginLeft: -4,
	},
	mediaScrollContent: {
		paddingRight: 16,
		paddingLeft: 4,
	},
	skeletonRow: {
		flexDirection: "row",
		marginLeft: -4,
		paddingLeft: 4,
		paddingRight: 16,
	},
	// Card styles
	mediaCard: {
		width: CARD_WIDTH,
		marginRight: 12,
		position: "relative",
	},
	imageContainer: {
		position: "relative",
	},
	mediaCardImage: {
		width: CARD_WIDTH,
		height: CARD_IMAGE_HEIGHT,
		borderRadius: 10,
		backgroundColor: "#1a1a1a",
	},
	imageNotInterested: {
		opacity: 0.3,
	},
	notInterestedOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.5)",
		borderRadius: 10,
	},
	placeholderImage: {
		justifyContent: "center",
		alignItems: "center",
	},
	placeholderText: {
		fontSize: 32,
		color: "#444",
	},
	notInterestedButton: {
		position: "absolute",
		top: 6,
		right: 6,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "rgba(0,0,0,0.6)",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.15)",
	},
	notInterestedButtonActive: {
		backgroundColor: "#dc2626",
		borderColor: "#dc2626",
	},
	mediaCardTitle: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "600",
		marginTop: 8,
		lineHeight: 18,
	},
	textNotInterested: {
		color: "#666",
	},
	yearText: {
		color: "#666",
		fontSize: 11,
		marginTop: 2,
	},
	matchHint: {
		color: "#b14aed",
		fontSize: 10,
		fontWeight: "500",
		marginTop: 2,
	},
	notInterestedLabel: {
		color: "#dc2626",
		fontSize: 10,
		fontWeight: "600",
		marginTop: 2,
	},
	// Skeleton styles
	skeletonImage: {
		width: CARD_WIDTH,
		height: CARD_IMAGE_HEIGHT,
		borderRadius: 10,
		backgroundColor: "#1a1a1a",
	},
	skeletonTitle: {
		height: 14,
		width: CARD_WIDTH * 0.8,
		borderRadius: 4,
		backgroundColor: "#1a1a1a",
		marginTop: 8,
	},
	skeletonSubtitle: {
		height: 10,
		width: CARD_WIDTH * 0.5,
		borderRadius: 4,
		backgroundColor: "#1a1a1a",
		marginTop: 4,
	},
	// Empty state
	emptyContainer: {
		alignItems: "center",
		paddingVertical: 40,
		paddingHorizontal: 32,
		marginTop: 20,
	},
	emptyTitle: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 8,
		textAlign: "center",
	},
	emptySubtitle: {
		color: "#888",
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
	// Error state
	errorContainer: {
		alignItems: "center",
		paddingVertical: 32,
		paddingHorizontal: 32,
		marginTop: 20,
	},
	errorText: {
		color: "#888",
		fontSize: 14,
		textAlign: "center",
		marginBottom: 12,
	},
	retryButton: {
		backgroundColor: "#b14aed",
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
	},
	retryButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
});
