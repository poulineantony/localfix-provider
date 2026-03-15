import { API_ENDPOINTS } from '../config/api';
import { apiClient } from './apiClient';

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

export const serviceService = {
    async getAll(params?: { latitude?: number; longitude?: number; limit?: number }) {
        const query = new URLSearchParams();
        query.set('limit', String(params?.limit ?? 250));

        if (params?.latitude !== undefined) {
            query.set('latitude', String(params.latitude));
        }

        if (params?.longitude !== undefined) {
            query.set('longitude', String(params.longitude));
        }

        const suffix = query.toString() ? `?${query.toString()}` : '';
        return apiClient.get<ServiceItem[]>(`${API_ENDPOINTS.services.list}${suffix}`);
    },

    async getCategories(params?: { latitude?: number; longitude?: number }) {
        const query = new URLSearchParams();

        if (params?.latitude !== undefined) {
            query.set('latitude', String(params.latitude));
        }

        if (params?.longitude !== undefined) {
            query.set('longitude', String(params.longitude));
        }

        const suffix = query.toString() ? `?${query.toString()}` : '';
        return apiClient.get<ServiceCategoryItem[]>(`${API_ENDPOINTS.services.categories}${suffix}`);
    },
};
