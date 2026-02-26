import axios, { AxiosInstance, AxiosResponse } from "axios";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_TIMEOUT_MS = 10000;

const normalizeBaseUrl = (value?: string): string => {
    const candidate = value?.trim() || DEFAULT_API_BASE_URL;
    return candidate.replace(/\/+$/, "");
};

let apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const apiClient: AxiosInstance = axios.create({
    baseURL: apiBaseUrl,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

const hasContentsEnvelope = (
    data: unknown,
): data is { contents: unknown } => {
    return (
        typeof data === "object" &&
        data !== null &&
        Object.prototype.hasOwnProperty.call(data, "contents")
    );
};

apiClient.interceptors.response.use((response: AxiosResponse) => {
    if (!hasContentsEnvelope(response.data)) {
        return response;
    }

    return {
        ...response,
        data: response.data.contents,
    };
});

export const getApiBaseUrl = (): string => apiBaseUrl;

export const setApiBaseUrl = (baseUrl: string): void => {
    apiBaseUrl = normalizeBaseUrl(baseUrl);
    apiClient.defaults.baseURL = apiBaseUrl;
};

export const buildApiUrl = (path: string): string => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${apiBaseUrl}${normalizedPath}`;
};
