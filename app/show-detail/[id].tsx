import {
	View,
	Text,
	Image,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type {
	RapidAPIIMDBOverviewResponseData,
	RapidAPIIMDBSearchResponseDataEntity,
	RapidAPIIMDBTitleGetBaseResponseData
} from '@/types/rapidapi.type';
import { ArrowLeft } from 'react-native-feather';
import { useQuery } from '@tanstack/react-query';

// Dummy data for preview; replace with real data fetching logic
const dummyShow: RapidAPIIMDBSearchResponseDataEntity = {
	id: 'tt1234567',
	__typename: '',
	titleText: { text: 'Solo Leveling', isOriginalTitle: true },
	originalTitleText: { text: 'Solo Leveling', isOriginalTitle: true },
	releaseYear: { __typename: '', year: 2024, endYear: null },
	releaseDate: {
		__typename: '',
		month: 1,
		day: 6,
		year: 2024,
		country: { id: 'KR' },
		restriction: null,
		attributes: [],
		displayableProperty: { qualifiersInMarkdownList: null }
	},
	titleType: {
		__typename: '',
		id: 'tvSeries',
		text: 'TV Series',
		categories: [
			{ id: 'anime', text: 'Anime', value: 'anime' },
			{ id: 'action', text: 'Action', value: 'action' }
		],
		canHaveEpisodes: true,
		isEpisode: false,
		isSeries: true,
		displayableProperty: { value: { plainText: 'Anime, Action' } }
	},
	primaryImage: {
		__typename: '',
		id: 'img1',
		url: 'https://static.wikia.nocookie.net/sololeveling/images/7/7e/Sung_Jinwoo_Anime.png',
		height: 800,
		width: 600
	},
	episodes: null,
	series: null,
	principalCredits: [
		{
			credits: [
				{
					name: {
						__typename: '',
						id: 'nm123',
						nameText: { text: 'Shunsuke Nakashige' },
						primaryImage: null
					}
				}
			]
		}
	]
};

const ShowDetailSkeleton: React.FC<{ router: ReturnType<typeof useRouter> }> = ({ router }) => {
	return (
		<ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<ArrowLeft stroke="#fff" width={28} height={28} />
				</TouchableOpacity>
				<View style={[styles.poster, { backgroundColor: '#222' }]} />
			</View>
			<View style={styles.content}>
				<View style={[styles.skeletonTitle, { backgroundColor: '#222', width: '70%' }]} />
				<View style={styles.genresRow}>
					{[1, 2, 3].map((i) => (
						<View key={i} style={[styles.genreTag, { backgroundColor: '#222' }]}>
							<View style={{ width: 60, height: 14, backgroundColor: '#333' }} />
						</View>
					))}
				</View>
				<View style={[styles.skeletonText, { backgroundColor: '#222', width: '40%' }]} />
				<View
					style={[styles.skeletonText, { backgroundColor: '#222', width: '100%', height: 100 }]}
				/>
				<View style={styles.section}>
					<View style={[styles.skeletonText, { backgroundColor: '#222', width: '30%' }]} />
					<View style={styles.seasonsRow}>
						{[1, 2].map((i) => (
							<View key={i} style={[styles.seasonCard, { backgroundColor: '#222' }]}>
								<View style={{ width: 80, height: 20, backgroundColor: '#333' }} />
							</View>
						))}
					</View>
				</View>
			</View>
		</ScrollView>
	);
};

const ShowDetail: React.FC = () => {
	// In a real app, get the show/movie ID from params and fetch data
	// const { id } = useLocalSearchParams();
	// Fetch show/movie details using the id
	const router = useRouter();
	const { id } = useLocalSearchParams();

	const { data, isLoading } = useQuery({
		queryKey: ['show-detail', id],
		queryFn: async () => {
			const response = await fetch(
				`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/search/imdb/${id}`
			);

			if (response.status === 429) {
				throw new Error('Rate limit exceeded');
			}

			const data = (await response.json()) as {
				overview: RapidAPIIMDBOverviewResponseData['data']['title'];
			};

			return data.overview;
		}
	});

	if (isLoading) return <ShowDetailSkeleton router={router} />;

	return (
		<ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<ArrowLeft stroke="#fff" width={28} height={28} />
				</TouchableOpacity>
				<Image source={{ uri: data?.primaryImage?.url }} style={styles.poster} resizeMode="cover" />
			</View>
			<View style={styles.content}>
				<Text style={styles.title}>{data?.titleText?.text}</Text>
				<View style={styles.genresRow}>
					{data?.titleType?.categories.map((cat) => (
						<View key={cat.id} style={styles.genreTag}>
							<Text style={styles.genreText}>{cat.text}</Text>
						</View>
					))}
				</View>
				<Text style={styles.rating}>
					⭐ {data?.ratingsSummary?.aggregateRating} ({data?.ratingsSummary?.voteCount} votes)
				</Text>
				<Text style={styles.description}>{data?.plot?.plotText?.plainText}</Text>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Seasons</Text>
					<View style={styles.seasonsRow}>
						<View style={styles.seasonCard}>
							<Text style={styles.seasonText}>Season 1</Text>
						</View>
						<View style={styles.seasonCard}>
							<Text style={styles.seasonText}>Specials</Text>
						</View>
					</View>
				</View>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000'
	},
	header: {
		position: 'relative',
		width: '100%',
		height: 340,
		backgroundColor: '#111',
		marginBottom: -40
	},
	backButton: {
		position: 'absolute',
		top: 40,
		left: 20,
		zIndex: 2,
		backgroundColor: 'rgba(0,0,0,0.6)',
		borderRadius: 20,
		padding: 6
	},
	poster: {
		width: '100%',
		height: 340,
		resizeMode: 'cover'
	},
	content: {
		paddingHorizontal: 24,
		marginTop: 24
	},
	title: {
		color: '#fff',
		fontSize: 32,
		fontWeight: 'bold',
		marginBottom: 10
	},
	genresRow: {
		flexDirection: 'row',
		marginBottom: 10,
		flexWrap: 'wrap'
	},
	genreTag: {
		backgroundColor: '#222',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 4,
		marginRight: 8,
		marginBottom: 6
	},
	genreText: {
		color: '#b14aed',
		fontSize: 14,
		fontWeight: '600'
	},
	rating: {
		color: '#fff',
		fontSize: 16,
		marginBottom: 16
	},
	description: {
		color: '#ccc',
		fontSize: 16,
		marginBottom: 24
	},
	section: {
		marginTop: 10
	},
	sectionTitle: {
		color: '#fff',
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 10
	},
	seasonsRow: {
		flexDirection: 'row',
		gap: 12
	},
	seasonCard: {
		backgroundColor: '#222',
		borderRadius: 10,
		paddingHorizontal: 18,
		paddingVertical: 10,
		marginRight: 12
	},
	seasonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600'
	},
	skeletonTitle: {
		height: 40,
		borderRadius: 8,
		marginBottom: 10
	},
	skeletonText: {
		height: 20,
		borderRadius: 4,
		marginBottom: 16
	}
});

export default ShowDetail;
