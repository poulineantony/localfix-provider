import { API_ENDPOINTS } from '../config/api';
import { apiClient } from './apiClient';

export interface AddressSuggestion {
    id: string;
    placeId: string;
    label: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    latitude: number;
    longitude: number;
}

export interface ZoneValidationResult {
    allowed: boolean;
    message: string;
    zone: null | {
        _id?: string;
        zoneId: string;
        name: string;
        city: string;
        state: string;
        country: string;
        serviceTypes?: string[];
    };
    distanceKm?: number;
    services: Array<{
        _id: string;
        name: string;
        category: string;
        pricing?: {
            basePrice: number;
            currency?: string;
        };
    }>;
    categories: Array<{
        value: string;
        label: string;
        count: number;
        services: Array<{ _id: string; name: string }>;
    }>;
}

const buildQueryString = (params: Record<string, string | number | undefined>) => {
    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');

    if (entries.length === 0) {
        return '';
    }

    return entries
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
};

export const locationService = {
    async validateZone(latitude: number, longitude: number) {
        const query = buildQueryString({
            latitude: String(latitude),
            longitude: String(longitude),
        });

        return apiClient.get<ZoneValidationResult>(`${API_ENDPOINTS.zones.validate}?${query}`);
    },

    async searchAddresses(queryText: string, limit = 5) {
        const query = buildQueryString({
            query: queryText,
            limit: String(limit),
        });

        return apiClient.get<AddressSuggestion[]>(`${API_ENDPOINTS.zones.addressSuggestions}?${query}`);
    },
};
