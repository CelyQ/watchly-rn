import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import { authClient } from "@/lib/auth-client";
import type { paths } from "@/types/api";

export const fetchClient = createFetchClient<paths>({
	baseUrl: process.env.EXPO_PUBLIC_BACKEND_BASE_URL,
});

fetchClient.use({
	onRequest({ request }) {
		const cookies = authClient.getCookie();
		if (cookies) {
			request.headers.set("Cookie", cookies);
		}
		return request;
	},
});

// Helper to create query keys for custom useQuery calls
export function createQueryKey(...parts: unknown[]): unknown[] {
	return parts;
}

export const $api = createClient(fetchClient);
