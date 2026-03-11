import { API_ENDPOINTS } from '../config/api';
import { apiClient } from './apiClient';

export interface UserProfileUpdate {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        landmark?: string;
    };
}

export const userService = {
    async updateProfile(data: UserProfileUpdate) {
        return apiClient.put(API_ENDPOINTS.users.profile, data);
    },
};
