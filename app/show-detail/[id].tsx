import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RapidAPIIMDBSearchResponseDataEntity } from '@/types/rapidapi.type';
import { ArrowLeft } from 'react-native-feather';

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

const ShowDetail: React.FC = () => {
	// In a real app, get the show/movie ID from params and fetch data
	// const { id } = useLocalSearchParams();
	// Fetch show/movie details using the id
	const router = useRouter();
	const { id } = useLocalSearchParams();
	console.log({ id });
	const show = dummyShow; // Replace with fetched data

	return (
		<ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<ArrowLeft stroke="#fff" width={28} height={28} />
				</TouchableOpacity>
				<Image source={{ uri: show.primaryImage?.url }} style={styles.poster} resizeMode="cover" />
			</View>
			<View style={styles.content}>
				<Text style={styles.title}>{show.titleText.text}</Text>
				<View style={styles.genresRow}>
					{show.titleType.categories.map((cat) => (
						<View key={cat.id} style={styles.genreTag}>
							<Text style={styles.genreText}>{cat.text}</Text>
						</View>
					))}
				</View>
				<Text style={styles.rating}>⭐ 4.33 (3,377 votes)</Text>
				<Text style={styles.description}>
					They say whatever doesn't kill you makes you stronger, but that's not the case for the
					world's weakest hunter Sung Jinwoo. After being brutally s...
				</Text>
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
		borderBottomLeftRadius: 30,
		borderBottomRightRadius: 30
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
	}
});

export default ShowDetail;
