import { API_ENDPOINTS } from '../config/api';
import { apiClient, ApiResult } from './apiClient';

export interface ServiceItem {
    _id: string;
    name: string;
    category: string;
    pricing: {
        basePrice: number;
        currency?: string;
    };
}

export interface ServiceCategoryItem {
    value: string;
    label: string;
    count: number;
    services: Array<{
        _id: string;
        name: string;
    }>;
}

const SERVICE_REQUEST_TIMEOUT_MS = 12000;

const buildQueryString = (params: Record<string, string | number | undefined>) => {
    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');

    if (entries.length === 0) {
        return '';
    }

    return `?${entries
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')}`;
};

const withRequestTimeout = async <T>(
    requestPromise: Promise<ApiResult<T>>,
    timeoutError: string
): Promise<ApiResult<T>> => {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    try {
        return await Promise.race([
            requestPromise,
            new Promise<ApiResult<T>>((resolve) => {
                timeoutHandle = setTimeout(() => {
                    resolve({
                        success: false,
                        error: timeoutError,
                    });
                }, SERVICE_REQUEST_TIMEOUT_MS);
            }),
        ]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
};

export const serviceService = {
    async getAll(params?: { latitude?: number; longitude?: number; limit?: number }) {
        const suffix = buildQueryString({
            limit: params?.limit ?? 250,
            latitude: params?.latitude,
            longitude: params?.longitude,
        });
        return withRequestTimeout(
            apiClient.get<ServiceItem[]>(`${API_ENDPOINTS.services.list}${suffix}`),
            'Service request timed out'
        );
    },

    async getCategories(params?: { latitude?: number; longitude?: number }) {
        const suffix = buildQueryString({
            latitude: params?.latitude,
            longitude: params?.longitude,
        });
        return withRequestTimeout(
            apiClient.get<ServiceCategoryItem[]>(`${API_ENDPOINTS.services.categories}${suffix}`),
            'Category request timed out'
        );
    },
};
