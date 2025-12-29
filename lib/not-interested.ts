import { fetchClient } from "@/lib/api";

// Fetch all not interested IDs from the API
export const fetchNotInterestedIds = async (): Promise<string[]> => {
	try {
		const response = await fetchClient.GET("/api/v1/media/notInterested");
		return response.data?.notInterested ?? [];
	} catch (error) {
		console.error("Failed to fetch not interested IDs:", error);
		return [];
	}
};

// Check if a specific ID is in the not interested list
export const checkNotInterested = async (imdbId: string): Promise<boolean> => {
	const ids = await fetchNotInterestedIds();
	return ids.includes(imdbId);
};

// Add an ID to the not interested list
export const addNotInterested = async (
	imdbId: string,
	mediaType: "movie" | "tv",
): Promise<boolean> => {
	try {
		const response = await fetchClient.POST("/api/v1/media/notInterested", {
			body: {
				imdbId,
				mediaType,
			},
		});
		return response.data?.success ?? false;
	} catch (error) {
		console.error("Failed to add not interested:", error);
		return false;
	}
};

// Remove an ID from the not interested list
export const removeNotInterested = async (imdbId: string): Promise<boolean> => {
	try {
		const response = await fetchClient.DELETE("/api/v1/media/notInterested", {
			body: {
				imdbId,
			},
		});
		return response.data?.success ?? false;
	} catch (error) {
		console.error("Failed to remove not interested:", error);
		return false;
	}
};
