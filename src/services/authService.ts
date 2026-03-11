import { DEFAULT_DEVICE_INFO, API_ENDPOINTS } from '../config/api';
import { apiClient, ApiResult } from './apiClient';

export interface AuthUser {
    id: string;
    _id?: string;
    name: string;
    email: string;
    phone: string;
    role: 'customer' | 'provider' | 'admin';
    roles: string[];
    avatar?: string;
    isVerified?: boolean;
}

interface AuthPayload {
    user: AuthUser;
    token: string;
    refreshToken: string;
}

export const authService = {
    async sendOtp(phone: string): Promise<ApiResult<{ otp?: string }>> {
        return apiClient.post(API_ENDPOINTS.auth.sendOtp, {
            phone,
            deviceId: `provider-${phone}`,
            ...DEFAULT_DEVICE_INFO,
        });
    },

    async verifyOtp(phone: string, otp: string): Promise<ApiResult<AuthPayload>> {
        const result = await apiClient.post<AuthPayload>(API_ENDPOINTS.auth.verifyOtp, { phone, otp });
        if (result.success && result.data) {
            apiClient.setTokens(result.data.token, result.data.refreshToken);
        }
        return result;
    },

    async getMe() {
        return apiClient.get<AuthUser>(API_ENDPOINTS.auth.me);
    },

    async logout() {
        const result = await apiClient.post(API_ENDPOINTS.auth.logout);
        apiClient.clearTokens();
        return result;
    },
};
