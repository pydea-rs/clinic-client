import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import {
    StartConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    ApiError,
} from "../types/chat";

export class ApiService {
    private api!: AxiosInstance;
    private static instance: ApiService;

    public static get() {
        if (ApiService.instance) {
            return ApiService.instance;
        }
        return new ApiService();
    }

    private constructor(private baseURL: string = "http://localhost:8080") {
        if (ApiService.instance) {
            return ApiService.instance;
        }
        this.api = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: {
                "Content-Type": "application/json",
            },
            withCredentials: true,
        });

        // Response interceptor for error handling
        this.api.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                const apiError: ApiError = {
                    message: error.message || "An error occurred",
                    status: error.response?.status,
                };

                if (
                    error.response?.data &&
                    typeof error.response.data === "object"
                ) {
                    const data = error.response.data as any;
                    apiError.message =
                        data.message || data.error || apiError.message;
                }

                return Promise.reject(apiError);
            }
        );
        ApiService.instance = this;
    }

    // Auth endpoints (cookie-based)
    async login(payload: { email: string; password: string }): Promise<void> {
        await this.api.post("/auth/login", payload);
    }

    async register(payload: {
        name?: string;
        email: string;
        password: string;
    }): Promise<void> {
        await this.api.post("/auth/register", payload);
    }

    async me<TUser = any>(): Promise<TUser> {
        const response: AxiosResponse<any> = await this.api.get("/user", {
            withCredentials: true,
        });
        return (response.data as any).contents as TUser;
    }

    async logout(): Promise<void> {
        await this.api.post("/auth/logout");
    }

    async startConversation(): Promise<string> {
        const response: AxiosResponse<StartConversationResponse> =
            await this.api.post("/ai-agents/start");

        if (!(response.data as any).contents?.id) {
            throw Error(
                "Something went wrong while starting the conversation! Please try again..."
            );
        }
        return (response.data as any).contents?.id;
    }

    async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
        const response: AxiosResponse<SendMessageResponse> =
            await this.api.post("/ai-agents/message", data);
        // if (!(response.data as any).contents) {
        //     throw Error(
        //         "Something went wrong while sending the message! Please try again..."
        //     );
        // }
        return (response.data as any).contents;
    }

    getStreamUrl(conversationId: string): string {
        return `${this.baseURL}/ai-agents/stream/${conversationId}`;
    }

    setBaseURL(baseURL: string): void {
        this.baseURL = baseURL;
        this.api.defaults.baseURL = baseURL;
    }

    getBaseURL(): string {
        return this.baseURL;
    }

    getAxiosInstance(): AxiosInstance {
        return this.api;
    }
}
