import { API_ENDPOINTS } from '../config/api';
import { apiClient } from './apiClient';

export interface UserProfileUpdate {
    name?: string;
    email?: string;
    phone?: string;
    language?: string;
    address?: {
        street?: string;
        formattedAddress?: string;
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
        landmark?: string;
        placeId?: string;
        zoneId?: string;
        zoneName?: string;
        coordinates?: {
            latitude?: number;
            longitude?: number;
        };
    };
}

export interface AvatarUploadPayload {
    uri: string;
    name: string;
    type: string;
}

export interface AvatarUploadResponse {
    avatar: string;
    user?: {
        _id?: string;
        avatar?: string;
        name?: string;
        phone?: string;
    };
}

export const userService = {
    async updateProfile(data: UserProfileUpdate) {
        return apiClient.put(API_ENDPOINTS.users.profile, data);
    },
    async uploadAvatar(file: AvatarUploadPayload) {
        const formData = new FormData();
        formData.append('avatar', {
            uri: file.uri,
            name: file.name,
            type: file.type,
        } as any);

        return apiClient.postForm<AvatarUploadResponse>(API_ENDPOINTS.users.avatar, formData);
    },
};
