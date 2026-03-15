import { API_ENDPOINTS } from '../config/api';
import { apiClient, ApiResult } from './apiClient';

export interface AuthUser {
    id: string;
    _id?: string;
    name: string;
    email: string;
    phone: string;
    language?: string;
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
    async sendOtp(phone: string, deviceInfo?: any): Promise<ApiResult<{ otp?: string }>> {
        return apiClient.post(API_ENDPOINTS.auth.sendOtp, {
            phone,
            ...(deviceInfo || {
                deviceId: `provider-${phone}`,
                deviceModel: 'LocalFix Provider App',
                platform: 'android',
                osVersion: 'unknown',
                manufacturer: 'unknown',
                isEmulator: false,
            }),
        });
    },

    async verifyOtp(phone: string, otp: string, deviceInfo?: any): Promise<ApiResult<AuthPayload>> {
        const result = await apiClient.post<AuthPayload>(API_ENDPOINTS.auth.verifyOtp, {
            phone,
            otp,
            ...deviceInfo,
        });
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
