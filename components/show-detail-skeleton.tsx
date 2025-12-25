import { useRouter } from "expo-router";
import React from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { ArrowLeft } from "react-native-feather";

export const ShowDetailSkeleton: React.FC<{
	router: ReturnType<typeof useRouter>;
}> = ({ router }) => {
	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={{ paddingBottom: 40 }}
		>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				>
					<ArrowLeft stroke="#fff" width={24} height={24} />
				</TouchableOpacity>
				<View style={[styles.poster, { backgroundColor: "#222" }]} />
			</View>
			<View style={styles.content}>
				<View
					style={[
						styles.skeletonTitle,
						{ backgroundColor: "#222", width: "70%" },
					]}
				/>
				<View style={styles.genresRow}>
					{[1, 2, 3].map((i) => (
						<View
							key={i}
							style={[styles.genreTag, { backgroundColor: "#222" }]}
						>
							<View
								style={{ width: 60, height: 14, backgroundColor: "#333" }}
							/>
						</View>
					))}
				</View>
				<View
					style={[
						styles.skeletonText,
						{ backgroundColor: "#222", width: "40%" },
					]}
				/>
				<View
					style={[
						styles.skeletonText,
						{ backgroundColor: "#222", width: "100%", height: 100 },
					]}
				/>
				<View style={styles.section}>
					<View
						style={[
							styles.skeletonText,
							{ backgroundColor: "#222", width: "30%" },
						]}
					/>
					<View style={styles.seasonsRow}>
						{[1, 2].map((i) => (
							<View
								key={i}
								style={[styles.seasonCard, { backgroundColor: "#222" }]}
							>
								<View
									style={{ width: 80, height: 20, backgroundColor: "#333" }}
								/>
							</View>
						))}
					</View>
				</View>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
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
		left: 16,
		zIndex: 2,
		width: 44,
		height: 44,
		backgroundColor: "rgba(0,0,0,0.6)",
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
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
	section: {
		marginTop: 10,
	},
	seasonsRow: {
		flexDirection: "row",
		gap: 12,
	},
	seasonCard: {
		width: 150,
		marginRight: 15,
	},
	skeletonTitle: {
		height: 40,
		borderRadius: 8,
		marginBottom: 10,
	},
	skeletonText: {
		height: 20,
		borderRadius: 4,
		marginBottom: 16,
	},
});


