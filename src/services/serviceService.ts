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

export const serviceService = {
    async getAll() {
        return apiClient.get<ServiceItem[]>(API_ENDPOINTS.services.list);
    },
};
