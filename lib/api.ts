import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import type { paths } from "@/types/api";
import { authClient } from "@/lib/auth-client";

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

export const $api = createClient(fetchClient);
