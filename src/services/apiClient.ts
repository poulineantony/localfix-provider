import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export interface ApiResult<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

type HeaderMap = Record<string, string>;

const TOKEN_KEY = 'provider_auth_token';
const REFRESH_TOKEN_KEY = 'provider_refresh_token';

let authToken: string | null = null;
let refreshToken: string | null = null;

const buildHeaders = (customHeaders?: HeaderMap, options?: { omitContentType?: boolean }): HeaderMap => {
    const headers: HeaderMap = {
        ...(!options?.omitContentType ? { 'Content-Type': 'application/json' } : {}),
        ...customHeaders,
    };

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    return headers;
};

const toApiResult = async <T>(response: Response): Promise<ApiResult<T>> => {
    const payload = await response.json();

    if (!response.ok) {
        return {
            success: false,
            error: payload.message || 'Request failed',
        };
    }

    return {
        success: true,
        data: payload.data as T,
        message: payload.message,
    };
};

const request = async <T>(endpoint: string, options: RequestInit): Promise<ApiResult<T>> => {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        return await toApiResult<T>(response);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
};

export const apiClient = {
    setTokens(token: string, nextRefreshToken?: string) {
        authToken = token;
        refreshToken = nextRefreshToken || null;
        AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
        if (nextRefreshToken) {
            AsyncStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken).catch(() => {});
        }
    },
    clearTokens() {
        authToken = null;
        refreshToken = null;
        AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]).catch(() => {});
    },
    getRefreshToken() {
        return refreshToken;
    },
    /**
     * Restore tokens from AsyncStorage into memory.
     * Returns true if a token was found.
     */
    async restoreTokens(): Promise<boolean> {
        try {
            const [[, storedToken], [, storedRefresh]] = await AsyncStorage.multiGet([
                TOKEN_KEY,
                REFRESH_TOKEN_KEY,
            ]);
            if (storedToken) {
                authToken = storedToken;
                refreshToken = storedRefresh || null;
                return true;
            }
        } catch (error) {
            console.error('Failed to restore tokens:', error);
        }
        return false;
    },
    async get<T>(endpoint: string, headers?: HeaderMap) {
        return request<T>(endpoint, {
            method: 'GET',
            headers: buildHeaders(headers),
        });
    },
    async post<T>(endpoint: string, body?: unknown, headers?: HeaderMap) {
        return request<T>(endpoint, {
            method: 'POST',
            headers: buildHeaders(headers),
            body: body ? JSON.stringify(body) : undefined,
        });
    },
    async postForm<T>(endpoint: string, body: FormData, headers?: HeaderMap) {
        return request<T>(endpoint, {
            method: 'POST',
            headers: buildHeaders(headers, { omitContentType: true }),
            body,
        });
    },
    async put<T>(endpoint: string, body?: unknown, headers?: HeaderMap) {
        return request<T>(endpoint, {
            method: 'PUT',
            headers: buildHeaders(headers),
            body: body ? JSON.stringify(body) : undefined,
        });
    },
    async patch<T>(endpoint: string, body?: unknown, headers?: HeaderMap) {
        return request<T>(endpoint, {
            method: 'PATCH',
            headers: buildHeaders(headers),
            body: body ? JSON.stringify(body) : undefined,
        });
    },
};
